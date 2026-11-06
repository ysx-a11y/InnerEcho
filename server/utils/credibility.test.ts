import { describe, expect, it } from 'vitest';
import type { FullDossierData } from '../types.js';
import { evaluateInputCredibility } from './credibility.js';

/** 构造一个纯选择题库，选项 id 与真实题库一致（全局唯一，形如 q1_opt0）。 */
function choiceBank(count: number, optionsPerQuestion = 5) {
  return {
    id: 'bank_choice',
    title: '示例选择题库',
    category: 'demo',
    questions: Array.from({ length: count }, (_, index) => ({
      id: `q${index + 1}`,
      title: `题目 ${index + 1}`,
      type: 'single_choice',
      options: Array.from({ length: optionsPerQuestion }, (_, option) => ({
        id: `q${index + 1}_opt${option}`,
        text: `选项 ${option + 1}`,
      })),
    })),
  };
}

/** 构造一个纯手填题库。 */
function openTextBank(count: number) {
  return {
    id: 'bank_text',
    title: '示例手填题库',
    category: 'demo',
    questions: Array.from({ length: count }, (_, index) => ({
      id: `t${index + 1}`,
      title: `手填题目 ${index + 1}`,
      type: 'open_text',
    })),
  };
}

function choiceLog(questionId: string, optionIndex: number, durationMs: number) {
  return {
    questionId,
    durationMs,
    interactionCount: 4,
    isLeftBlank: false,
    finalValue: { selectedOptions: [`${questionId}_opt${optionIndex}`] },
  };
}

describe('evaluateInputCredibility', () => {
  it('逐题作答、选项分散的真实手写卷宗应判为 high', () => {
    const durations = [3200, 5100, 7400, 4600, 6100, 8800, 3900, 9200, 4700, 5600, 6800, 7600];
    const positions = [2, 0, 4, 1, 3, 2, 0, 4, 1, 3, 2, 0];
    const sumMs = durations.reduce((sum, value) => sum + value, 0);

    const result = evaluateInputCredibility({
      completedBanks: [choiceBank(12)],
      totalDurationSeconds: Math.ceil((sumMs / 1000) * 1.05),
      questionLogs: durations.map((duration, index) =>
        choiceLog(`q${index + 1}`, positions[index], duration)
      ),
    } as FullDossierData);

    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.factors.monotony).toBe(98);
  });

  it('手写长文本（约 1 字/次操作）不应被判为粘贴', () => {
    const text = '这是一段由受访者逐字录入的手填内容，'.repeat(10);
    const result = evaluateInputCredibility({
      completedBanks: [openTextBank(4)],
      totalDurationSeconds: 320,
      questionLogs: [1, 2, 3, 4].map((index) => ({
        questionId: `t${index}`,
        durationMs: 60000 + index * 3000,
        interactionCount: Math.round(text.length * 0.9),
        isLeftBlank: false,
        finalValue: { textInput: text },
      })),
    } as FullDossierData);

    expect(result.factors.writingTrace).toBe(98);
    expect(result.level).toBe('high');
  });

  it('整场只点同一个位置的直线作答必须被压到 45 分以下', () => {
    const result = evaluateInputCredibility({
      completedBanks: [choiceBank(20)],
      totalDurationSeconds: 130,
      questionLogs: Array.from({ length: 20 }, (_, index) =>
        choiceLog(`q${index + 1}`, 0, 6000)
      ),
    } as FullDossierData);

    // 旧实现按"选项 id 重复"统计，选项 id 全局唯一导致该因子恒为 98 分。
    expect(result.factors.monotony).toBe(15);
    expect(result.score).toBeLessThanOrEqual(45);
    expect(result.reasons.join()).toContain('选项位次过于集中');
  });

  it('整段粘贴的长文本（1 次操作灌入数百字）应触发封顶与提示', () => {
    const text = '这段内容并非逐字输入而是整段粘贴进来的文字，'.repeat(12);
    const result = evaluateInputCredibility({
      completedBanks: [openTextBank(3)],
      totalDurationSeconds: 150,
      questionLogs: [1, 2, 3].map((index) => ({
        questionId: `t${index}`,
        durationMs: 40000,
        interactionCount: 1,
        isLeftBlank: false,
        finalValue: { textInput: text },
      })),
    } as FullDossierData);

    expect(result.factors.writingTrace).toBe(15);
    expect(result.score).toBeLessThanOrEqual(45);
    expect(result.reasons.join()).toContain('粘贴');
  });

  it('缺少作答轨迹时应判为 low，而不是默认 high', () => {
    const result = evaluateInputCredibility({ completedBanks: [choiceBank(5)] } as FullDossierData);

    expect(result.score).toBe(40);
    expect(result.level).toBe('low');
    expect(result.reasons.join()).toContain('无法核验');
  });

  it('大面积留白的卷宗不应靠其余因子拉到 high', () => {
    const logs = Array.from({ length: 20 }, (_, index) => {
      const answered = index < 5;
      return answered
        ? choiceLog(`q${index + 1}`, index % 5, 5000)
        : {
          questionId: `q${index + 1}`,
          durationMs: 3000,
          interactionCount: 0,
          isLeftBlank: true,
          finalValue: {},
        };
    });

    const result = evaluateInputCredibility({
      completedBanks: [choiceBank(20)],
      totalDurationSeconds: 75,
      questionLogs: logs,
    } as FullDossierData);

    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.level).toBe('low');
    expect(result.reasons.join()).toContain('留白');
  });

  it('单题停留合计远超整场作答时长时只作提示，不扣分', () => {
    const durations = [28000, 31000, 26000, 33000, 29000, 34000, 27000, 32000, 25000, 35000];
    const result = evaluateInputCredibility({
      completedBanks: [choiceBank(10)],
      // 单题合计 300 秒 = 整场 100 秒的 3 倍，与线上历史卷宗的失真形态一致
      totalDurationSeconds: 100,
      questionLogs: Array.from({ length: 10 }, (_, index) =>
        choiceLog(`q${index + 1}`, index % 5, durations[index])
      ),
    } as FullDossierData);

    // 旧采集口径的时长缺陷不携带任何受访者行为信息，只提示不扣分
    expect(Object.keys(result.factors)).not.toContain('consistency');
    expect(result.reasons.join()).toContain('不计入扣分');
    expect(result.level).toBe('high');
  });

  it('回归：旧采集口径下的真实手写卷宗不应被降级为可疑', () => {
    // 复刻 2026-10 之前采集的卷宗特征：单题停留被重复累加（合计约为整场 2.3 倍），
    // 但文本是逐字敲出来的，选项分布正常，因此结论仍应是 high。
    const text = '受访者逐字写下的长段自白，包含大量具体细节与时间地点。'.repeat(9);
    const durations = [1900000, 900000, 250000, 300000, 180000, 420000];
    const positions = [3, 1, 4, 0, 2, 1];

    const result = evaluateInputCredibility({
      completedBanks: [choiceBank(6)],
      totalDurationSeconds: 1429,
      questionLogs: durations.map((duration, index) => ({
        questionId: `q${index + 1}`,
        durationMs: duration,
        interactionCount: index === 0 ? Math.round(text.length * 0.9) : 5,
        isLeftBlank: false,
        finalValue: {
          selectedOptions: [`q${index + 1}_opt${positions[index]}`],
          ...(index === 0 ? { textInput: text } : {}),
        },
      })),
    } as FullDossierData);

    expect(result.reasons.join()).toContain('旧版采集口径缺陷');
    expect(result.level).toBe('high');
  });
});
