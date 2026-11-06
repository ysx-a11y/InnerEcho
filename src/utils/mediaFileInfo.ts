import type { MediaType } from '../types/quizEngine';

const VIDEO_EXTS = ['mp4', 'mov', 'm4v', 'avi', 'mkv', '3gp', 'wmv', 'flv'];
// webm 只归音频：空 MIME 的 .webm 绝大多数是录音产物；带 MIME 的 webm 视频走 mime 分支
const AUDIO_EXTS = ['mp3', 'wav', 'webm', 'm4a', 'aac', 'ogg', 'opus', 'flac', 'caf'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'bmp', 'avif'];

export interface ResolvedMediaInfo {
  type: MediaType;
  mimeType: string;
}

function fallbackMime(ext: string, kind: 'video' | 'audio' | 'image'): string {
  if (kind === 'video') {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  }
  if (kind === 'audio') {
    if (ext === 'mp3') return 'audio/mpeg';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'webm') return 'audio/webm';
    if (ext === 'm4a') return 'audio/mp4';
    if (ext === 'ogg' || ext === 'opus') return 'audio/ogg';
    return 'audio/mpeg';
  }
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/**
 * 根据 MIME 与扩展名识别媒体类型：
 * - 优先真实 MIME；空/octet-stream 时按扩展名兜底（修复 .mov、剪贴板无 type 视频被误判为 document）；
 * - SVG 按文档处理，不进入图片（避免脚本型矢量文件被当图片存储/渲染）。
 */
export function resolveMediaFileInfo(file: { name: string; type?: string }): ResolvedMediaInfo {
  const rawMime = (file.type || '').toLowerCase();
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  // SVG 明确排除出图片
  if (rawMime === 'image/svg+xml' || ext === 'svg') {
    return { type: 'document', mimeType: rawMime || 'image/svg+xml' };
  }

  if (rawMime.startsWith('video/') || VIDEO_EXTS.includes(ext)) {
    return {
      type: 'video',
      mimeType: rawMime && rawMime !== 'application/octet-stream'
        ? rawMime
        : fallbackMime(ext, 'video'),
    };
  }

  if (rawMime.startsWith('audio/') || AUDIO_EXTS.includes(ext)) {
    return {
      type: 'audio',
      mimeType: rawMime && rawMime !== 'application/octet-stream'
        ? rawMime
        : fallbackMime(ext, 'audio'),
    };
  }

  if (rawMime.startsWith('image/') || IMAGE_EXTS.includes(ext)) {
    return {
      type: 'image',
      mimeType: rawMime && rawMime !== 'application/octet-stream'
        ? rawMime
        : fallbackMime(ext, 'image'),
    };
  }

  return { type: 'document', mimeType: rawMime || 'application/octet-stream' };
}
