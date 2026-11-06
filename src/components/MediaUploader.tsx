import React, { useRef, useState, useEffect } from 'react';
import { MediaAttachment, MediaUploadConfig, MediaType } from '../types/quizEngine';
import { Mic, FileText, X, Play, Pause, Trash2, Plus, Video } from 'lucide-react';
import {
  normalizeRecordingMime,
  pickSupportedRecordingMime,
  recordingExtension,
} from '../utils/recordingFormat';
import { resolveMediaFileInfo } from '../utils/mediaFileInfo';
import { compressImage } from '../utils/imageCompress';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';

interface MediaUploaderProps {
  config: MediaUploadConfig;
  attachments: MediaAttachment[];
  onChange: (attachments: MediaAttachment[]) => void;
  disabled?: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  config,
  attachments,
  onChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attachmentsRef = useRef(attachments);

  // 保证回调（录音结束/文件读取完成）里拿到的是最新附件列表，避免旧闭包覆盖
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // 录音中直接卸载组件（关闭弹窗/切页）时，强制停止录音并释放麦克风轨道
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // 忽略停止异常，轨道由 onstop 统一释放
        }
      }
    };
  }, []);

  const maxTotalSizeBytes = config.maxTotalSizeBytes ?? (30 * 1024 * 1024);

  // accept descriptor
  const getAcceptTypes = () => {
    const accepts: string[] = [];
    if (config.allowedTypes.includes('image')) accepts.push('image/*', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic');
    if (config.allowedTypes.includes('audio')) accepts.push('audio/*', '.mp3', '.wav', '.m4a', '.aac', '.webm', '.ogg');
    if (config.allowedTypes.includes('video')) accepts.push('video/*', '.mp4', '.mov', '.webm', '.m4v', '.avi');
    if (config.allowedTypes.includes('document')) accepts.push('text/plain', 'application/pdf', '.pdf', '.txt');
    return accepts.join(',');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > config.maxFileCount) {
      setErrorMsg(`最多仅支持添加 ${config.maxFileCount} 个附件`);
      return;
    }

    const currentTotalBytes = attachments.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    const incomingTotalBytes = Array.from(files).reduce((sum, f) => sum + f.size, 0);

    // 客户端提前拦截总量超限，杜绝选完后提交才被 413 / 400 拒绝的糟糕体验
    if (currentTotalBytes + incomingTotalBytes > maxTotalSizeBytes) {
      setErrorMsg(`附件总大小累计超过上限 (${(maxTotalSizeBytes / 1024 / 1024).toFixed(0)}MB)，请精简文件后重试`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newAttachments: MediaAttachment[] = [];
    let hasError = false;

    for (const file of Array.from(files)) {
      if (file.size > config.maxSizeBytes) {
        setErrorMsg(`文件 "${file.name}" 单个大小超过限制 (${(config.maxSizeBytes / 1024 / 1024).toFixed(0)}MB)`);
        hasError = true;
        break;
      }

      const { type, mimeType } = resolveMediaFileInfo(file);

      // 运行时强制核对允许上传的媒体类型，防止拖拽/控制台绕过 accept 属性注入不支持格式
      if (!config.allowedTypes.includes(type)) {
        setErrorMsg(`不支持的文件格式，仅允许上传: ${config.allowedTypes.join(', ')}`);
        hasError = true;
        break;
      }

      try {
        let finalDataUrl = '';
        let finalMimeType = mimeType;
        let finalSizeBytes = file.size;

        if (type === 'image') {
          // 图片走高画质 1080P/Retina 平滑压缩（0.82 黄金质量，保留细腻暗部细节，体积大幅瘦身）
          finalDataUrl = await compressImage(file);
          // compressImage 对 GIF 等会原样透传，MIME 必须按实际 dataUrl 前缀声明，
          // 否则服务端「附件数据与声明类型不一致」校验会拒绝提交
          const prefixMime = finalDataUrl.slice(5, finalDataUrl.indexOf(';'));
          finalMimeType = prefixMime || 'image/jpeg';
          finalSizeBytes = Math.round((finalDataUrl.length - finalDataUrl.indexOf(',') - 1) * 3 / 4);
        } else {
          // 视频、音频、文档等走原生异步读取
          finalDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              let dataUrl = (event.target?.result as string) || '';
              if (dataUrl.startsWith('data:;') || dataUrl.startsWith('data:application/octet-stream;')) {
                dataUrl = `data:${mimeType};${dataUrl.split(';').slice(1).join(';')}`;
              }
              resolve(dataUrl);
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
          });
        }

        const attachment: MediaAttachment = {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type,
          mimeType: finalMimeType,
          sizeBytes: finalSizeBytes,
          dataUrl: finalDataUrl,
        };
        newAttachments.push(attachment);
      } catch (err: any) {
        setErrorMsg(`处理文件 "${file.name}" 失败: ${err.message || '格式异常'}`);
        hasError = true;
        break;
      }
    }

    if (!hasError && newAttachments.length > 0) {
      onChange([...attachmentsRef.current, ...newAttachments]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Direct Audio Recording
  const startRecording = async () => {
    setErrorMsg(null);
    if (!config.allowedTypes.includes('audio')) {
      setErrorMsg('该题不支持语音记录，仅允许上传: ' + config.allowedTypes.join(', '));
      return;
    }
    if (attachments.length >= config.maxFileCount) {
      setErrorMsg(`最多仅支持添加 ${config.maxFileCount} 个附件`);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMime = pickSupportedRecordingMime();
      const mediaRecorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingStream(stream);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // 立即释放麦克风轨道，避免下方任一提前返回路径造成设备占用泄漏
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);

        const baseMime = normalizeRecordingMime(mediaRecorder.mimeType || supportedMime || '');
        const audioBlob = new Blob(chunksRef.current, { type: baseMime });
        const currentTotal = attachmentsRef.current.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);

        if (audioBlob.size > config.maxSizeBytes) {
          setErrorMsg(`录音超过单文件上限 (${(config.maxSizeBytes / 1024 / 1024).toFixed(0)}MB)，请缩短录音后重试`);
          return;
        }
        if (currentTotal + audioBlob.size > maxTotalSizeBytes) {
          setErrorMsg(`附件总大小累计超过上限 (${(maxTotalSizeBytes / 1024 / 1024).toFixed(0)}MB)，请删除部分附件或缩短录音`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const attachment: MediaAttachment = {
            id: `media_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: `录音成果.${recordingExtension(baseMime)}`,
            type: 'audio',
            mimeType: baseMime,
            sizeBytes: audioBlob.size,
            dataUrl,
          };
          onChange([...attachmentsRef.current, attachment]);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setRecordingStream(null);
      setErrorMsg('无法访问麦克风，请检查录音设备及浏览器权限。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStream(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleRemove = (id: string) => {
    if (playingAudioId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudioId(null);
    }
    onChange(attachments.filter((item) => item.id !== id));
  };

  const toggleAudioPlay = (item: MediaAttachment) => {
    setErrorMsg(null);
    if (playingAudioId === item.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(item.dataUrl);
      audioRef.current = audio;
      audio.onerror = () => {
        setErrorMsg('语音播放失败：浏览器可能不支持该录音格式，或文件已损坏。');
      };
      audio.play().catch(() => {
        setErrorMsg('语音播放失败：浏览器可能不支持该录音格式，或文件已损坏。');
      });
      setPlayingAudioId(item.id);
      audio.onended = () => {
        setPlayingAudioId(null);
        setErrorMsg(null);
      };
    }
  };

  const imageAttachments = attachments.filter(a => a.type === 'image');
  const audioAttachments = attachments.filter(a => a.type === 'audio');
  const videoAttachments = attachments.filter(a => a.type === 'video');
  const otherAttachments = attachments.filter(a => a.type === 'document');

  return (
    <div style={{ width: '100%', marginTop: '0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      {/* File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept={getAcceptTypes()}
        multiple={config.maxFileCount > 1}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || attachments.length >= config.maxFileCount}
      />

      {/* 1. Chat-like Audio Recording Trigger（仅当允许音频时优先置顶展示） */}
      {config.allowedTypes.includes('audio') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>语音记录：</span>
            {audioAttachments.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: '#4fd1a1', fontWeight: 700 }}>
                ✓ 已录制 ({audioAttachments.length} 段)
              </span>
            )}
          </div>
          
          {/* Recording Button & Real-time Resonance Visualizer */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 20,
                background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 112, 166, 0.08)',
                border: isRecording ? '1px solid #ef4444' : '1px solid rgba(255, 112, 166, 0.35)',
                color: isRecording ? '#ef4444' : 'var(--text-primary)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s',
              }}
              className={isRecording ? 'animate-pulse' : 'hover:bg-[rgba(255,112,166,0.15)]'}
            >
              <Mic size={13} color={isRecording ? '#ef4444' : '#ff70a6'} />
              <span>{isRecording ? `录音中... 点击停止 (${recordingSeconds}s)` : '点击录音对话'}</span>
            </button>

            {isRecording && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(14, 11, 26, 0.9)',
                border: '1px solid rgba(255, 112, 166, 0.3)',
                borderRadius: 18,
                padding: '2px 8px',
              }}>
                <AudioWaveformVisualizer
                  stream={recordingStream}
                  isActive={isRecording}
                  height={22}
                  barCount={16}
                  primaryColor="#ff3377"
                  secondaryColor="#80f3ff"
                />
              </div>
            )}
          </div>

          {/* Chat Voice Message Bubbles */}
          {audioAttachments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
              {audioAttachments.map((item) => (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    alignItems: 'center', 
                    width: '100%', 
                    justifyContent: 'flex-start' 
                  }}
                >
                  {/* Chat Avatar Placeholder */}
                  <div style={{ 
                    width: 30, 
                    height: 30, 
                    borderRadius: '50%', 
                    background: 'rgba(255, 112, 166, 0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#ff70a6', 
                    border: '1px solid rgba(255, 112, 166, 0.2)',
                    flexShrink: 0
                  }}>
                    <Mic size={12} />
                  </div>

                  {/* Speech Bubble */}
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, rgba(225, 0, 255, 0.2) 0%, rgba(28, 10, 36, 0.8) 100%)',
                      border: '1px solid rgba(225, 0, 255, 0.25)',
                      padding: '0.45rem 0.8rem',
                      borderRadius: '4px 14px 14px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#fff',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      minWidth: 110,
                      maxWidth: '70%',
                      position: 'relative'
                    }}
                    onClick={() => toggleAudioPlay(item)}
                  >
                    {playingAudioId === item.id ? (
                      <Pause size={10} style={{ color: '#ff70a6' }} />
                    ) : (
                      <Play size={10} style={{ color: '#ff70a6', marginLeft: 1 }} />
                    )}
                    
                    {/* soundwave bars */}
                    {playingAudioId === item.id ? (
                      <AudioWaveformVisualizer
                        isActive={true}
                        height={14}
                        barCount={10}
                        primaryColor="#ff70a6"
                        secondaryColor="#80f3ff"
                      />
                    ) : (
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        <span style={{ width: 1.5, height: 6, background: '#ff70a6', opacity: 0.4 }} />
                        <span style={{ width: 1.5, height: 10, background: '#ff70a6', opacity: 0.4 }} />
                        <span style={{ width: 1.5, height: 4, background: '#ff70a6', opacity: 0.4 }} />
                        <span style={{ width: 1.5, height: 8, background: '#ff70a6', opacity: 0.4 }} />
                      </div>
                    )}
                    
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                      {item.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    className="hover:text-[#ff4d4d]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Large Image Upload Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', ...(config.allowedTypes.includes('audio') ? { borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.65rem' } : {}) }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>图片附图：</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          width: '100%',
        }}>
          {/* Render Existing Images */}
          {imageAttachments.map((img) => (
            <div 
              key={img.id} 
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <img 
                src={img.dataUrl} 
                alt={img.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <button
                type="button"
                onClick={() => handleRemove(img.id)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {/* Plus Add Box */}
          {attachments.length < config.maxFileCount && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 12,
                border: '1.5px dashed rgba(255, 112, 166, 0.35)',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,112,166,0.6)',
                gap: '0.2rem'
              }}
              className="hover:border-[#ff70a6] hover:bg-[rgba(255,112,166,0.04)]"
            >
              <Plus size={20} />
              <span style={{ fontSize: '0.58rem' }}>
                {config.allowedTypes.includes('video') ? '上传图片/视频' : '上传图片'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Other Document files list */}
      {otherAttachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {otherAttachments.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: '0.4rem 0.6rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                <FileText size={14} color="#ff70a6" />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 4. Video attachments list */}
      {videoAttachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.65rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>视频附片：</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {videoAttachments.map((item) => (
              <div
                key={item.id}
                style={{
                  position: 'relative',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <video
                  src={item.dataUrl}
                  controls
                  playsInline
                  style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: 8 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Video size={12} color="#80f3ff" />
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    className="hover:text-[#ff4d4d]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div style={{ color: '#ff4d4d', fontSize: '0.7rem', marginTop: '0.2rem', textAlign: 'center' }}>
          ⚠️ {errorMsg}
        </div>
      )}

    </div>
  );
};
