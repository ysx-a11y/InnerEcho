// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DynamicQuizEngine } from './DynamicQuizEngine';
import type { QuestionBankDefinition } from '../types/quizEngine';

const mockBank: QuestionBankDefinition = {
  id: 'test_bank_1',
  title: '测试题库',
  subtitle: '测试副标题',
  category: 'scientific',
  description: '用于测试的题库',
  estimatedMinutes: 5,
  dimensions: [
    { key: 'dominance', name: '支配倾向', description: '支配指数' },
    { key: 'submission', name: '臣服倾向', description: '臣服指数' },
  ],
  questions: [
    {
      id: 'q1',
      bankId: 'test_bank_1',
      title: '第一题：你是否喜欢掌控节奏？',
      type: 'single_choice',
      options: [
        { id: 'opt_1', text: '非常符合', scores: { dominance: 5 } },
        { id: 'opt_2', text: '比较符合', scores: { dominance: 4 } },
        { id: 'opt_3', text: '一般', scores: { dominance: 3 } },
        { id: 'opt_4', text: '不太符合', scores: { dominance: 2 } },
        { id: 'opt_5', text: '完全不符', scores: { dominance: 1 } },
      ],
    },
    {
      id: 'q2',
      bankId: 'test_bank_1',
      title: '第二题：描述你最隐秘的期待（开放手填）',
      type: 'open_text',
      placeholder: '写下你的真实想法...',
    },
  ],
};

describe('DynamicQuizEngine 填表作答全流程审查', () => {
  it('未答完所有题目时点击提交会拦截并提示剩余题数', () => {
    const onCompleteSpy = vi.fn();
    const onBackSpy = vi.fn();

    render(
      <DynamicQuizEngine
        selectedBanks={[mockBank]}
        onComplete={onCompleteSpy}
        onBackToBankSelect={onBackSpy}
      />
    );

    // 初始状态下直接点击提交
    const submitBtn = screen.getByText(/提交并生成解构卷宗/);
    fireEvent.click(submitBtn);

    // 应该拦截提交，并且展示未完成提示
    expect(onCompleteSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/您还有 2 道题目未作答/)).not.toBeNull();
  });

  it('完成所有选项与文本输入后能够正常提交并生成有效 payload', () => {
    const onCompleteSpy = vi.fn();
    const onBackSpy = vi.fn();

    render(
      <DynamicQuizEngine
        selectedBanks={[mockBank]}
        onComplete={onCompleteSpy}
        onBackToBankSelect={onBackSpy}
      />
    );

    // 1. 选择第一题选项
    const optButton = screen.getByText('非常符合');
    fireEvent.click(optButton);

    // 2. 填写第二题文本
    const textInput = screen.getByPlaceholderText('写下你的真实想法...');
    fireEvent.change(textInput, { target: { value: '希望在安全的前提下体验完全交出控制权' } });

    // 3. 点击提交
    const submitBtn = screen.getByText(/提交并生成解构卷宗/);
    fireEvent.click(submitBtn);

    // 应该成功触发 onComplete 且 payload 完整
    expect(onCompleteSpy).toHaveBeenCalledTimes(1);
    const payload = onCompleteSpy.mock.calls[0][0];
    expect(payload.selectedBankIds).toEqual(['test_bank_1']);
    expect(payload.userTextAnswers['q2']).toBe('希望在安全的前提下体验完全交出控制权');
    expect(payload.aggregatedScores).toBeDefined();
  });
});
