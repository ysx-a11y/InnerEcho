// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draftManager } from './draftManager';

/** 造一张"压缩后照片"体量的 DataURL（默认约 900KB，9 张足以撑爆 localStorage）。 */
function fakePhoto(size = 900_000): string {
  return `data:image/jpeg;base64,${'A'.repeat(size)}`;
}

describe('draftManager', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('普通草稿原样存取', () => {
    draftManager.saveDraft({
      chapter1: { nickname: '夜樱', occupation: '医师', avatarUrls: [fakePhoto(64)] },
      depthRating: 'deep',
    });

    const loaded = draftManager.loadDraft();
    expect(loaded?.chapter1?.nickname).toBe('夜樱');
    expect(loaded?.chapter1?.occupation).toBe('医师');
    expect(loaded?.depthRating).toBe('deep');
    // 小体积 DataURL（图标级）不算大媒体，照常保留
    expect(loaded?.chapter1?.avatarUrls?.[0]).toContain('data:image/jpeg');
  });

  it('9 张照片撑爆配额时，文字字段不跟着一起丢', () => {
    draftManager.saveDraft({
      chapter1: {
        nickname: '夜樱',
        occupation: '医师',
        innerDesire: '想被看见真实的自己',
        avatarUrls: Array.from({ length: 9 }, () => fakePhoto()),
      },
      chapter2: {
        boundaryText: '边界文本',
        fantasyText: '幻想文本',
        relationPreference: '权责倾向',
        awakeningMoment: '觉醒契机',
      },
      depthRating: 'medium',
    });

    const loaded = draftManager.loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.chapter1?.nickname).toBe('夜樱');
    expect(loaded?.chapter1?.occupation).toBe('医师');
    expect(loaded?.chapter1?.innerDesire).toBe('想被看见真实的自己');
    expect(loaded?.chapter2?.fantasyText).toBe('幻想文本');
    expect(loaded?.depthRating).toBe('medium');
    // 大体积照片不入草稿，避免整份草稿写不进去
    expect(loaded?.chapter1?.avatarUrls ?? []).toHaveLength(0);
    expect(loaded?.chapter1?.avatarUrl).toBeUndefined();
  });

  it('localStorage 抛配额异常时降级重试，而不是整份放弃', () => {
    const store = new Map<string, string>();
    let rejectOversize = true;
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        // 只在"带媒体"的那次写入抛错，模拟浏览器配额拒绝
        if (rejectOversize && value.includes('data:image/jpeg')) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        store.set(key, value);
      },
      removeItem: (key: string) => { store.delete(key); },
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    draftManager.saveDraft({
      chapter1: { nickname: '夜樱', avatarUrls: [fakePhoto(8_000)] },
      depthRating: 'light',
    });

    const loaded = draftManager.loadDraft();
    expect(loaded?.chapter1?.nickname).toBe('夜樱');
    expect(loaded?.depthRating).toBe('light');
    expect(loaded?.chapter1?.avatarUrls ?? []).toHaveLength(0);
    warn.mockRestore();
    rejectOversize = false;
  });

  it('清空草稿', () => {
    draftManager.saveDraft({ chapter1: { nickname: '夜樱' } });
    draftManager.clearDraft();
    expect(draftManager.loadDraft()).toBeNull();
  });
});
