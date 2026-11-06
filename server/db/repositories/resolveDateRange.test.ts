import { describe, expect, it } from 'vitest';
import { resolveDateRange } from './analyticsRepo.js';

describe('resolveDateRange', () => {
  it('正确计算今日与昨日', () => {
    // 2026-10-06 10:00:00 UTC = 2026-10-06 18:00:00 UTC+8 (北京时间)
    const now = Date.UTC(2026, 9, 6, 10, 0, 0);

    const todayRes = resolveDateRange('today', undefined, now);
    expect(todayRes).toEqual({ start: '2026-10-06', end: '2026-10-06' });

    const yesterdayRes = resolveDateRange('yesterday', undefined, now);
    expect(yesterdayRes).toEqual({ start: '2026-10-05', end: '2026-10-05' });
  });

  it('正确计算本周（周一至今日）', () => {
    // 2026-10-06 是周二，本周一为 2026-10-05
    const now = Date.UTC(2026, 9, 6, 10, 0, 0);
    const weekRes = resolveDateRange('week', undefined, now);
    expect(weekRes).toEqual({ start: '2026-10-05', end: '2026-10-06' });

    // 2026-10-11 是周日，本周一仍为 2026-10-05
    const sunday = Date.UTC(2026, 9, 11, 10, 0, 0);
    const sundayRes = resolveDateRange('week', undefined, sunday);
    expect(sundayRes).toEqual({ start: '2026-10-05', end: '2026-10-11' });
  });

  it('正确计算本月（1号至今日）', () => {
    const now = Date.UTC(2026, 9, 6, 10, 0, 0);
    const monthRes = resolveDateRange('month', undefined, now);
    expect(monthRes).toEqual({ start: '2026-10-01', end: '2026-10-06' });
  });

  it('正确计算本季（各季度初至今日）', () => {
    // Q1: 2月15日 -> 2026-01-01
    const q1 = Date.UTC(2026, 1, 15, 10, 0, 0);
    expect(resolveDateRange('quarter', undefined, q1)).toEqual({
      start: '2026-01-01',
      end: '2026-02-15',
    });

    // Q2: 5月20日 -> 2026-04-01
    const q2 = Date.UTC(2026, 4, 20, 10, 0, 0);
    expect(resolveDateRange('quarter', undefined, q2)).toEqual({
      start: '2026-04-01',
      end: '2026-05-20',
    });

    // Q3: 8月10日 -> 2026-07-01
    const q3 = Date.UTC(2026, 7, 10, 10, 0, 0);
    expect(resolveDateRange('quarter', undefined, q3)).toEqual({
      start: '2026-07-01',
      end: '2026-08-10',
    });

    // Q4: 10月6日 -> 2026-10-01
    const q4 = Date.UTC(2026, 9, 6, 10, 0, 0);
    expect(resolveDateRange('quarter', undefined, q4)).toEqual({
      start: '2026-10-01',
      end: '2026-10-06',
    });
  });

  it('正确计算本年（1月1日至今日）', () => {
    const now = Date.UTC(2026, 9, 6, 10, 0, 0);
    const yearRes = resolveDateRange('year', undefined, now);
    expect(yearRes).toEqual({ start: '2026-01-01', end: '2026-10-06' });
  });

  it('正确处理指定日期', () => {
    const customRes = resolveDateRange('custom', '2026-05-20');
    expect(customRes).toEqual({ start: '2026-05-20', end: '2026-05-20' });
  });
});
