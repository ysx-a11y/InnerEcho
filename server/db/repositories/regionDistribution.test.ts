import { describe, expect, it } from 'vitest';
import { buildRegionDistribution } from './analyticsRepo.js';

describe('buildRegionDistribution', () => {
  it('全部能定位时不追加兜底分组', () => {
    const result = buildRegionDistribution(
      [{ region_code: '110000', c: 8 }, { region_code: '450100', c: 2 }],
      10
    );

    expect(result).toEqual([
      { code: '110000', city: '北京市', count: 8 },
      { code: '450100', city: '南宁市', count: 2 },
    ]);
  });

  it('海外与未识别访问各占一行，列表合计等于当期访问量', () => {
    const result = buildRegionDistribution(
      [{ region_code: '110000', c: 8 }, { region_code: 'OVERSEAS', c: 30 }],
      99
    );

    const total = result.reduce((sum, item) => sum + item.count, 0);
    expect(total).toBe(99);
    expect(result.find((item) => item.code === 'OVERSEAS')?.city).toBe('海外 / 代理');
    expect(result.find((item) => item.code === 'UNKNOWN')?.count).toBe(61);
    // 降序排列，海外/未识别这两类不会被截断
    expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
  });

  it('地区过多时尾部并成「其他地区」，合计仍等于访问量', () => {
    const rows = Array.from({ length: 15 }, (_, index) => ({
      region_code: `31000${index % 10}${index}`,
      c: 20 - index,
    }));
    const totalVisits = rows.reduce((sum, row) => sum + row.c, 0);

    const result = buildRegionDistribution(rows, totalVisits);

    expect(result).toHaveLength(8);
    expect(result.at(-1)?.city).toBe('其他地区');
    expect(result.reduce((sum, item) => sum + item.count, 0)).toBe(totalVisits);
  });
});
