import React from 'react';
import { FileText, Video } from 'lucide-react';

export interface DossierMediaItem {
  id?: string;
  type?: string;
  mimeType?: string;
  name?: string;
  dataUrl: string;
  sizeBytes?: number;
  durationSeconds?: number;
  qId?: string;
}

interface DossierMediaAttachmentsProps {
  attachments: DossierMediaItem[];
  title?: string;
  onZoomImage?: (url: string) => void;
}

export const DossierMediaAttachments: React.FC<DossierMediaAttachmentsProps> = ({ attachments, title, onZoomImage }) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div
        style={{
          background: 'rgba(255, 112, 166, 0.05)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          borderRadius: '10px',
          padding: '0.75rem',
          marginTop: '0.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}
      >
        <span style={{ fontSize: '0.72rem', color: '#ff70a6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Video size={13} />
          {title || '📎 上传媒体成果'} ({attachments.length} 个)
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {attachments.map((item: DossierMediaItem, idx: number) => {
            const isVideo = item.type === 'video' || (item.mimeType && item.mimeType.startsWith('video/'));
            const isAudio = item.type === 'audio' || (item.mimeType && item.mimeType.startsWith('audio/'));
            const isImage = item.type === 'image' || (item.mimeType && item.mimeType.startsWith('image/'));

            if (isVideo) {
              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    width: '100%',
                    maxWidth: '360px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '8px',
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#80f3ff' }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🎥 {item.name || `视频 #${idx + 1}`}
                    </span>
                    {item.sizeBytes && (
                      <span style={{ color: '#8d879e' }}>{(item.sizeBytes / 1024 / 1024).toFixed(1)}MB</span>
                    )}
                  </div>
                  <video
                    controls
                    src={item.dataUrl}
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      background: '#000',
                      maxHeight: '220px',
                    }}
                  />
                </div>
              );
            }

            if (isAudio) {
              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    width: '100%',
                    maxWidth: '360px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '8px',
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#ffd180' }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🎙️ {item.name || `音频 #${idx + 1}`}
                    </span>
                    {item.durationSeconds && (
                      <span style={{ color: '#8d879e' }}>{Math.round(item.durationSeconds)}s</span>
                    )}
                  </div>
                  <audio controls src={item.dataUrl} style={{ width: '100%', height: '36px' }} />
                </div>
              );
            }

            if (isImage) {
              return (
                <div
                  key={item.id || idx}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <img
                    src={item.dataUrl}
                    alt={item.name || '图片'}
                    onClick={() => onZoomImage?.(item.dataUrl)}
                    className="admin-zoomable-img"
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 8,
                      objectFit: 'cover',
                      border: '1px solid rgba(255,255,255,0.12)',
                      cursor: 'zoom-in',
                    }}
                  />
                  <span style={{ fontSize: '0.62rem', color: '#8d879e', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name || `图片 #${idx + 1}`}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={item.id || idx}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={14} color="#80f3ff" />
                <span>{item.name || `文件 #${idx + 1}`}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
};
