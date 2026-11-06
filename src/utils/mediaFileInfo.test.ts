import { describe, expect, it } from 'vitest';
import { resolveMediaFileInfo } from './mediaFileInfo';

describe('resolveMediaFileInfo', () => {
  it('classifies videos by mime and by extension fallback', () => {
    expect(resolveMediaFileInfo({ name: 'a.mp4', type: 'video/mp4' })).toEqual({
      type: 'video',
      mimeType: 'video/mp4',
    });
    expect(resolveMediaFileInfo({ name: 'a.mov', type: '' })).toEqual({
      type: 'video',
      mimeType: 'video/quicktime',
    });
    expect(resolveMediaFileInfo({ name: 'a.mp4', type: 'application/octet-stream' })).toEqual({
      type: 'video',
      mimeType: 'video/mp4',
    });
  });

  it('classifies empty-mime webm as audio (recording product)', () => {
    expect(resolveMediaFileInfo({ name: 'rec.webm', type: '' })).toEqual({
      type: 'audio',
      mimeType: 'audio/webm',
    });
    expect(resolveMediaFileInfo({ name: 'rec.webm', type: 'video/webm' })).toEqual({
      type: 'video',
      mimeType: 'video/webm',
    });
  });

  it('classifies audio by extension fallback', () => {
    expect(resolveMediaFileInfo({ name: 'voice.mp3', type: '' })).toEqual({
      type: 'audio',
      mimeType: 'audio/mpeg',
    });
    expect(resolveMediaFileInfo({ name: 'voice.wav', type: 'audio/wav' })).toEqual({
      type: 'audio',
      mimeType: 'audio/wav',
    });
  });

  it('treats svg as document, not image', () => {
    expect(resolveMediaFileInfo({ name: 'x.svg', type: 'image/svg+xml' })).toEqual({
      type: 'document',
      mimeType: 'image/svg+xml',
    });
    expect(resolveMediaFileInfo({ name: 'x.svg', type: '' })).toEqual({
      type: 'document',
      mimeType: 'image/svg+xml',
    });
  });

  it('falls back to document for unknown files', () => {
    expect(resolveMediaFileInfo({ name: 'notes.txt', type: 'text/plain' })).toEqual({
      type: 'document',
      mimeType: 'text/plain',
    });
    expect(resolveMediaFileInfo({ name: 'data.bin', type: '' })).toEqual({
      type: 'document',
      mimeType: 'application/octet-stream',
    });
  });
});
