/**
 * 录音格式归一化：MediaRecorder 实际产出的容器/编码（webm/mp4/ogg）必须如实声明，
 * 不能统一写死 wav，否则跨浏览器播放会失败。
 */
export function normalizeRecordingMime(raw: string): string {
  const base = (raw || '').split(';')[0].trim().toLowerCase();
  return base.startsWith('audio/') ? base : 'audio/webm';
}

export function recordingExtension(mime: string): string {
  const base = normalizeRecordingMime(mime);
  if (base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/aac') return 'm4a';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  return 'webm';
}

/** 优先使用浏览器真实支持的录音容器；不支持时返回 undefined 由 MediaRecorder 自选。 */
export function pickSupportedRecordingMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}
