import { describe, it, expect } from 'vitest';
import { aggregateScores } from './scoreAggregator';
import type { QuestionBankDefinition, SingleQuestionLog } from '../types/quizEngine';

function log(questionId: string, selectedOptions: string[]): SingleQuestionLog {
  return {
    questionId,
    bankId: 'test_bank',
    enterTimestamp: 0,
    interactionCount: selectedOptions.length,
    actionLogs: [],
    isLeftBlank: selectedOptions.length === 0,
    finalValue: { selectedOptions },
  };
}

const bank: QuestionBankDefinition = {
  id: 'test_bank',
  title: '测试题库',
  subtitle: '',
  description: '',
  category: 'scientific',
  dimensions: [
    { key: 'alpha', name: 'Alpha' },
    { key: 'beta', name: 'Beta' },
  ],
  questions: [
    {
      id: 't_q1',
      bankId: 'test_bank',
      type: 'single_choice',
      title: 'Q1',
      options: [
        { id: 'a', text: 'A', scores: { alpha: 0, beta: 0 }, tags: ['safe'] },
        { id: 'b', text: 'B', scores: { alpha: 4, beta: 2 }, tags: ['bold'] },
      ],
    },
    {
      id: 't_q2',
      bankId: 'test_bank',
      type: 'multiple_choice',
      title: 'Q2',
      options: [
        { id: 'c', text: 'C', scores: { alpha: 6 }, tags: ['bold', 'deep'] },
        { id: 'd', text: 'D', scores: { beta: 10 } },
      ],
    },
  ],
};

describe('aggregateScores', () => {
  it('累加原始分并收集标签', () => {
    const result = aggregateScores([bank], [
      log('t_q1', ['b']),
      log('t_q2', ['c', 'd']),
    ]);

    expect(result.rawScores).toEqual({ alpha: 10, beta: 12 });
    expect(result.collectedTags.sort()).toEqual(['bold', 'deep']);
  });

  it('给出最高维度并做 0-100 归一化', () => {
    const result = aggregateScores([bank], [
      log('t_q1', ['b']),
      log('t_q2', ['c']),
    ]);

    expect(result.dominantDimension).toBe('alpha');
    for (const value of Object.values(result.normalizedScores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(result.normalizedScores.alpha).toBeGreaterThan(result.normalizedScores.beta);
  });

  it('忽略未作答与不存在的题目', () => {
    const result = aggregateScores([bank], [
      log('nope', ['x']),
      log('t_q1', []),
    ]);

    expect(result.rawScores).toEqual({});
    expect(result.collectedTags).toEqual([]);
  });
});
