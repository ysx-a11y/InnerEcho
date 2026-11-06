// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { basicInfoStore } from './basicInfoStore';

describe('basicInfoStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads by owner, stripping media fields', () => {
    const owner = basicInfoStore.ownerFor('usr_1', 'dev_1');
    basicInfoStore.save(owner, {
      nickname: '测试昵称',
      gender: '女',
      avatarUrl: 'data:image/png;base64,abc',
      avatarUrls: ['data:image/png;base64,abc'],
      durationSeconds: 12,
    });
    const loaded = basicInfoStore.load(owner);
    expect(loaded?.nickname).toBe('测试昵称');
    expect(loaded?.gender).toBe('女');
    const asRecord = (loaded ?? {}) as Record<string, unknown>;
    expect(asRecord.avatarUrl).toBeUndefined();
    expect(asRecord.avatarUrls).toBeUndefined();
    expect(asRecord.durationSeconds).toBeUndefined();
  });

  it('does not store an empty nickname', () => {
    const owner = basicInfoStore.ownerFor(null, 'dev_1');
    basicInfoStore.save(owner, { nickname: '' });
    expect(basicInfoStore.load(owner)).toBeNull();
  });

  it('keeps user and device owners separate', () => {
    basicInfoStore.save(basicInfoStore.ownerFor('usr_1', 'dev_1'), { nickname: '用户甲' });
    basicInfoStore.save(basicInfoStore.ownerFor(null, 'dev_1'), { nickname: '匿名乙' });
    expect(basicInfoStore.load(basicInfoStore.ownerFor('usr_1', 'dev_1'))?.nickname).toBe('用户甲');
    expect(basicInfoStore.load(basicInfoStore.ownerFor(null, 'dev_1'))?.nickname).toBe('匿名乙');
    basicInfoStore.clear(basicInfoStore.ownerFor('usr_1', 'dev_1'));
    expect(basicInfoStore.load(basicInfoStore.ownerFor('usr_1', 'dev_1'))).toBeNull();
    expect(basicInfoStore.load(basicInfoStore.ownerFor(null, 'dev_1'))?.nickname).toBe('匿名乙');
  });
});
