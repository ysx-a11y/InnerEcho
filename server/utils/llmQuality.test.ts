import { describe, expect, it } from 'vitest';
import { characterBigramSimilarity, evaluateLlmQuality } from './llmQuality.js';

const profile = {
  id: 'boundary',
  label: '边界样本',
  anchorGroups: [['边界'], ['信任'], ['决定权']],
  forbiddenTerms: ['职场绩效'],
  requireBoundaryLanguage: true,
};

const goodOutput = {
  archetypeTitle: '边界交托者',
  archetypeSubtitle: '在信任中放下决定权',
  disparityScore: 72,
  personaDeconstruction: '你习惯先照顾秩序，也会认真确认彼此的边界，这可能是你建立信任的方式。'.repeat(4),
  shadowDeconstruction: '你想在充分信任与沟通之后，暂时交出决定权，并且保留随时可停的余地。'.repeat(4),
  psychologicalSublimation: '你可以先从一次简短沟通开始，把期待、边界与停止方式说清楚，让交托成为被尊重的选择。'.repeat(3),
  resonanceKeywords: ['信任', '边界', '交托', '选择'],
};

describe('evaluateLlmQuality', () => {
  it('高质量、扎根样本的输出通过自动门槛', () => {
    const result = evaluateLlmQuality(goodOutput, profile);
    expect(result.score).toBe(100);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it('诊断化、越题和缺少结构的输出会被扣分', () => {
    const result = evaluateLlmQuality({
      ...goodOutput,
      archetypeTitle: '病态',
      disparityScore: 120,
      shadowDeconstruction: '这证明你就是这样的人，并存在人格障碍和职场绩效问题。',
      resonanceKeywords: ['单一'],
    }, profile);
    expect(result.score).toBeLessThan(70);
    expect(result.checks.find((check) => check.id === 'non-diagnostic-tone')?.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'topic-focus')?.passed).toBe(false);
  });

  it('明确的侧写不必强制堆满保留措辞，但仍禁止绝对化断言', () => {
    const result = evaluateLlmQuality({
      ...goodOutput,
      shadowDeconstruction: '你在关系中的沉默不是冷漠，而是需要明确回应，也需要保有随时停止的空间。'.repeat(4),
      psychologicalSublimation: '下一次直接把你需要的独处时刻说清楚，并提前约定停止条件。'.repeat(3),
    }, profile);

    expect(result.checks.find((check) => check.id === 'inference-bounds')?.passed).toBe(true);
    expect(result.checks.find((check) => check.id === 'non-diagnostic-tone')?.passed).toBe(true);
  });
});

describe('characterBigramSimilarity', () => {
  it('相同文本相似度为 1', () => {
    expect(characterBigramSimilarity('同一段文字', '同一段文字')).toBe(1);
  });

  it('无关文本相似度较低', () => {
    expect(characterBigramSimilarity('温柔地确认边界', '霓虹城市里的机械钟表')).toBeLessThan(0.2);
  });
});
