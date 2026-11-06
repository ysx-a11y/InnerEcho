import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateDeviceId } from './deviceId';

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as { window?: unknown }).window;
});

describe('getOrCreateDeviceId 加固（localStorage 不可用时兜底）', () => {
  it('localStorage 可用时返回并复用持久化 ID', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    });

    const id = getOrCreateDeviceId();
    expect(id).toMatch(/^dev_/);
    expect(getOrCreateDeviceId()).toBe(id);
  });

  it('localStorage 抛异常时仍返回内存临时 ID', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('storage blocked'); },
      setItem: () => { throw new Error('storage blocked'); },
    });

    const id = getOrCreateDeviceId();
    expect(id).toMatch(/^dev_/);
  });
});
