import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createUserApp } from './app.js';
import { db } from './db.js';

const app = createUserApp();

describe('Global Stats Public API', () => {
  it('GET /api/stats/global returns 200 with obfuscated data structure', async () => {
    const res = await request(app)
      .get('/api/stats/global')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();

    const stats = res.body.stats;

    // 1. 验证数量模糊化格式（例如 "10+"、"50+"、"1.2k+"）
    expect(typeof stats.fuzzedDossierCount).toBe('string');
    expect(stats.fuzzedDossierCount).toMatch(/\+$/);
    expect(typeof stats.fuzzedExplorerCount).toBe('string');
    expect(stats.fuzzedExplorerCount).toMatch(/\+$/);

    // 2. 验证深度等级分布（百分比为整量，和为 100）
    expect(stats.depthDistribution).toBeDefined();
    expect(Number.isInteger(stats.depthDistribution.light)).toBe(true);
    expect(Number.isInteger(stats.depthDistribution.medium)).toBe(true);
    expect(Number.isInteger(stats.depthDistribution.deep)).toBe(true);
    expect(
      stats.depthDistribution.light + stats.depthDistribution.medium + stats.depthDistribution.deep
    ).toBe(100);

    // 3. 验证平均反差张力指数（整数百分比）
    expect(Number.isInteger(stats.averageDisparityScore)).toBe(true);
    expect(stats.averageDisparityScore).toBeGreaterThanOrEqual(0);
    expect(stats.averageDisparityScore).toBeLessThanOrEqual(100);

    // 4. 验证 TOP 阴影倾向标签
    expect(Array.isArray(stats.topShadowTendencies)).toBe(true);
    expect(stats.topShadowTendencies.length).toBeGreaterThan(0);
    for (const item of stats.topShadowTendencies) {
      expect(typeof item.tag).toBe('string');
      expect(Number.isInteger(item.percentage)).toBe(true);
      expect(item.percentage).toBeGreaterThanOrEqual(0);
    }

    // 5. 验证四维潜意识均值（整数）
    expect(stats.dimensionAverages).toBeDefined();
    expect(Number.isInteger(stats.dimensionAverages.dominance)).toBe(true);
    expect(Number.isInteger(stats.dimensionAverages.submission)).toBe(true);
    expect(Number.isInteger(stats.dimensionAverages.restraint)).toBe(true);
    expect(Number.isInteger(stats.dimensionAverages.sensory)).toBe(true);

    // 6. 验证职业洞察（宏观分类，无敏感隐私）
    expect(Array.isArray(stats.occupationInsights)).toBe(true);
    expect(stats.occupationInsights.length).toBeGreaterThan(0);
    for (const insight of stats.occupationInsights) {
      expect(typeof insight.occupationGroup).toBe('string');
      expect(typeof insight.topTrait).toBe('string');
      expect(Number.isInteger(insight.contrastPercentage)).toBe(true);
    }

    // 7. 验证阴影原型宏观分布
    expect(Array.isArray(stats.archetypeDistribution)).toBe(true);
    expect(stats.archetypeDistribution.length).toBeGreaterThan(0);

    // 8. 严格安全断言：绝对不能包含 credibilityScore 或任何自由私密自白字段
    const rawJsonString = JSON.stringify(res.body);
    expect(rawJsonString).not.toContain('credibilityScore');
    expect(rawJsonString).not.toContain('credibilityLevel');
    expect(rawJsonString).not.toContain('boundaryText');
    expect(rawJsonString).not.toContain('fantasyText');
    expect(rawJsonString).not.toContain('secretWords');
    expect(rawJsonString).not.toContain('secretRule');
  });

  it('db.getGlobalPublicStats directly returns valid contract', async () => {
    const stats = await db.getGlobalPublicStats();
    expect(stats.fuzzedDossierCount).toBeDefined();
    expect(stats.depthDistribution).toBeDefined();
  });
});
