import { describe, expect, it } from 'vitest';
import { normalizeRecordingMime, recordingExtension } from './recordingFormat';

describe('recordingFormat', () => {
  it('normalizes container mime without codecs', () => {
    expect(normalizeRecordingMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(normalizeRecordingMime('audio/mp4')).toBe('audio/mp4');
    expect(normalizeRecordingMime('Audio/OGG; codecs=opus')).toBe('audio/ogg');
    expect(normalizeRecordingMime('')).toBe('audio/webm');
    expect(normalizeRecordingMime('video/webm')).toBe('audio/webm');
  });

  it('maps container to a playable extension', () => {
    expect(recordingExtension('audio/webm')).toBe('webm');
    expect(recordingExtension('audio/mp4')).toBe('m4a');
    expect(recordingExtension('audio/ogg')).toBe('ogg');
    expect(recordingExtension('audio/wav')).toBe('wav');
    expect(recordingExtension('audio/webm;codecs=opus')).toBe('webm');
  });
});
