import { describe, expect, it } from 'vitest';
import { MAX_AGE, MIN_AGE, normalizeAge, validateAge } from './age';

/**
 * 回归背景：曾经有一版首页"极速身份门禁"把区间文案（'23-28岁'）直接写进
 * chapter1.age，而服务端 analyzeDossierSchema 要求 /^\d*$/，导致
 * /api/analyze-dossier 返回 400、卷宗静默不入库。这些用例锁死归一化行为。
 */
describe('normalizeAge', () => {
  it('保留合法岁数', () => {
    expect(normalizeAge('28')).toBe('28');
    expect(normalizeAge('18')).toBe('18');
  });

  it('把区间文案折算为起始岁数（兼容历史脏数据）', () => {
    expect(normalizeAge('23-28岁')).toBe('23');
    expect(normalizeAge('18-22岁')).toBe('18');
    expect(normalizeAge('35岁以上')).toBe('35');
  });

  it('修复被反复剥离非数字后产生的 4 位脏值', () => {
    // '23-28岁' -> replace(/\D/g,'') -> '2328' 的历史损坏数据
    expect(normalizeAge('2328')).toBe('23');
  });

  it('去掉单位与空白', () => {
    expect(normalizeAge(' 26岁 ')).toBe('26');
    expect(normalizeAge('岁')).toBe('');
  });

  it('未填写返回空字符串', () => {
    expect(normalizeAge('')).toBe('');
    expect(normalizeAge(undefined)).toBe('');
    expect(normalizeAge(null)).toBe('');
  });

  it('输出始终满足服务端 /^\\d*$/ 约束', () => {
    const samples = ['23-28岁', '2328', ' 26岁 ', 'abc', '', '18-22岁', '99'];
    for (const sample of samples) {
      expect(normalizeAge(sample)).toMatch(/^\d*$/);
    }
  });
});

describe('validateAge', () => {
  it('空值是合法的（服务端 age 为可选）', () => {
    expect(validateAge('')).toBeNull();
    expect(validateAge(undefined)).toBeNull();
  });

  it('接受范围内年龄', () => {
    expect(validateAge(String(MIN_AGE))).toBeNull();
    expect(validateAge(String(MAX_AGE))).toBeNull();
    expect(validateAge('28')).toBeNull();
  });

  it('拒绝越界年龄', () => {
    expect(validateAge(String(MIN_AGE - 1))).toBeTruthy();
    expect(validateAge(String(MAX_AGE + 1))).toBeTruthy();
  });

  it('区间文案按起始岁数判定，不会因为含非数字而误判越界', () => {
    expect(validateAge('23-28岁')).toBeNull();
  });
});
