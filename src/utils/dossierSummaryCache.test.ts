import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearDossierSummaryCache,
  loadDossierSummaryCache,
  saveDossierSummaryCache,
  upsertDossierSummary,
} from './dossierSummaryCache';

function installStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as { window?: unknown }).window;
});

describe('dossierSummaryCache', () => {
  it('按用户隔离，并且只保存完成状态需要的轻量字段', () => {
    installStorage();
    saveDossierSummaryCache('user-a', [{
      id: 'dos-1',
      bankIds: ['bank-a', 'bank-a'],
      createdAt: '2026-08-13T10:00:00.000Z',
      chapter1: { nickname: '不应缓存' } as never,
    }]);

    expect(loadDossierSummaryCache('user-a')).toEqual([{
      id: 'dos-1',
      bankIds: ['bank-a'],
      createdAt: '2026-08-13T10:00:00.000Z',
    }]);
    expect(loadDossierSummaryCache('user-b')).toBeNull();
  });

  it('区分没有缓存和已知为空的缓存', () => {
    installStorage();
    expect(loadDossierSummaryCache('user-a')).toBeNull();
    saveDossierSummaryCache('user-a', []);
    expect(loadDossierSummaryCache('user-a')).toEqual([]);
  });

  it('新卷宗插入列表头部并替换同 ID 旧记录', () => {
    const result = upsertDossierSummary(
      [{ id: 'dos-1', bankIds: ['old'], createdAt: 'old-time' }],
      { id: 'dos-1', bankIds: ['new'], createdAt: 'new-time' },
    );
    expect(result).toEqual([{ id: 'dos-1', bankIds: ['new'], createdAt: 'new-time' }]);
  });

  it('可以清除指定用户的缓存', () => {
    installStorage();
    saveDossierSummaryCache('user-a', []);
    clearDossierSummaryCache('user-a');
    expect(loadDossierSummaryCache('user-a')).toBeNull();
  });
});
