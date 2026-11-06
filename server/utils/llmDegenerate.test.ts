import { describe, expect, it } from 'vitest';
import { detectDegenerateAnalysis } from './llmDegenerate.js';

describe('detectDegenerateAnalysis', () => {
  it('四维指标全为 0 时判定为「0000」默认值', () => {
    const result = detectDegenerateAnalysis({
      archetypeTitle: '默认结果',
      personaDeconstruction: '有正文',
      shadowDeconstruction: '有正文',
      psychologicalSublimation: '有正文',
      dominanceIndex: 0,
      submissionIndex: 0,
      restraintIndex: 0,
      sensoryThreshold: 0,
    });
    expect(result.degenerate).toBe(true);
    expect(result.reason).toContain('四维指标');
  });

  it('三段解读正文全为空时判定为异常', () => {
    const result = detectDegenerateAnalysis({
      archetypeTitle: '默认结果',
      personaDeconstruction: '',
      shadowDeconstruction: '   ',
      psychologicalSublimation: '',
    });
    expect(result.degenerate).toBe(true);
    expect(result.reason).toContain('解读正文');
  });

  it('缺少结构化对象时判定为异常', () => {
    expect(detectDegenerateAnalysis(null).degenerate).toBe(true);
    expect(detectDegenerateAnalysis(undefined).degenerate).toBe(true);
  });

  it('正常但文风平庸的输出（如缺省指标）不算异常', () => {
    expect(detectDegenerateAnalysis({
      archetypeTitle: '心相解构者',
      personaDeconstruction: '一段正常的人格解构正文。',
      shadowDeconstruction: '一段正常的阴影解构正文。',
      psychologicalSublimation: '一段正常的升华建议。',
    }).degenerate).toBe(false);
  });

  it('仅单个指标为 0、其余为非 0 时不算异常', () => {
    expect(detectDegenerateAnalysis({
      archetypeTitle: '心相解构者',
      personaDeconstruction: '正文',
      shadowDeconstruction: '正文',
      psychologicalSublimation: '正文',
      dominanceIndex: 0,
      submissionIndex: 42,
      restraintIndex: 37,
      sensoryThreshold: 58,
    }).degenerate).toBe(false);
  });
});
