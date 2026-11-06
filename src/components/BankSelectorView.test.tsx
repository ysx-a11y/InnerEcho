// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BankSelectorView } from './BankSelectorView';
import { ALL_BANK_METADATA } from '../data/questionBanks/bankRegistry';

describe('BankSelectorView Category and Search Suite', () => {
  const dummyDossier = {
    nickname: '测试者',
    gender: '女',
    age: '25',
    occupation: '自由职业',
    maritalStatus: '未婚',
    hasBoyfriend: '单身',
    surfaceTrait: '端庄',
    innerDesire: '隐秘',
    avatarUrl: '',
    avatarUrls: [],
  };

  it('renders search input and category tabs correctly', () => {
    render(
      <BankSelectorView
        availableBanks={ALL_BANK_METADATA}
        initialDossier={dummyDossier}
        onGoToBasicInfo={vi.fn()}
        onStartQuizWithBankAndData={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/搜索题库标题、描述或心理维度/i)).toBeTruthy();
    expect(screen.getByRole('tab', { name: /全部/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /情境切片/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /权责谱系/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /心相镜像/i })).toBeTruthy();
  });

  it('filters banks by search query', () => {
    render(
      <BankSelectorView
        availableBanks={ALL_BANK_METADATA}
        initialDossier={dummyDossier}
        onGoToBasicInfo={vi.fn()}
        onStartQuizWithBankAndData={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/搜索题库标题、描述或心理维度/i);
    fireEvent.change(searchInput, { target: { value: '背德' } });

    expect(screen.getByText(/体面人妻的聚会与婚房/i)).toBeTruthy();
    expect(screen.queryByText(/标准 BDSM 50 题深度卷宗/i)).toBeNull();
  });

  it('filters banks by category tab selection', () => {
    render(
      <BankSelectorView
        availableBanks={ALL_BANK_METADATA}
        initialDossier={dummyDossier}
        onGoToBasicInfo={vi.fn()}
        onStartQuizWithBankAndData={vi.fn()}
      />
    );

    const preferenceTab = screen.getByRole('tab', { name: /权责谱系/i });
    fireEvent.click(preferenceTab);

    expect(screen.getByText(/标准 BDSM 50 题深度卷宗/i)).toBeTruthy();
    expect(screen.queryByText(/体面人妻的聚会与婚房/i)).toBeNull();
    expect(screen.queryByText(/世交哥哥的私宅与试衣间/i)).toBeNull();
  });

  it('shows empty state when no banks match search', () => {
    render(
      <BankSelectorView
        availableBanks={ALL_BANK_METADATA}
        initialDossier={dummyDossier}
        onGoToBasicInfo={vi.fn()}
        onStartQuizWithBankAndData={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/搜索题库标题、描述或心理维度/i);
    fireEvent.change(searchInput, { target: { value: 'xyznonexistentword123' } });

    expect(screen.getByText(/未找到匹配题库/i)).toBeTruthy();
    const resetBtn = screen.getByText(/重置筛选/i);
    expect(resetBtn).toBeTruthy();

    fireEvent.click(resetBtn);
    expect(screen.getByText(/标准 BDSM 50 题深度卷宗/i)).toBeTruthy();
  });

  it('shows 已完成 / 未完成 markers to guests without exposing retest entries', () => {
    render(
      <BankSelectorView
        availableBanks={ALL_BANK_METADATA}
        initialDossier={dummyDossier}
        onGoToBasicInfo={vi.fn()}
        onStartQuizWithBankAndData={vi.fn()}
        completedBankIds={['standard_bdsm_50']}
        completedCounts={{ standard_bdsm_50: 1 }}
      />
    );

    // 游客也能量到自己是否做过：至少一个"已完成"和一个"未完成"标记
    expect(screen.getAllByText('已完成').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未完成').length).toBeGreaterThan(0);
    // 未登录不展示报告全文入口与复测对比
    expect(screen.queryByText('复测对比')).toBeNull();
    expect(screen.queryByText('查看上次报告')).toBeNull();
  });

  it('offers retest comparison to logged-in users with repeat attempts', () => {
    const onOpenRetest = vi.fn();
    render(
      <BankSelectorView
        availableBanks={ALL_BANK_METADATA}
        initialDossier={dummyDossier}
        onGoToBasicInfo={vi.fn()}
        onStartQuizWithBankAndData={vi.fn()}
        user={{ id: 'usr_test', email: 'tester@example.com' }}
        completedBankIds={['standard_bdsm_50']}
        completedCounts={{ standard_bdsm_50: 2 }}
        onOpenRetest={onOpenRetest}
        onViewResult={vi.fn()}
      />
    );

    const retestButton = screen.getByText('复测对比');
    fireEvent.click(retestButton);
    expect(onOpenRetest).toHaveBeenCalledWith('standard_bdsm_50', expect.stringContaining('BDSM'));
    // 只答过一次的题库不出现复测入口
    expect(screen.queryByText('已完成 · 2 次')).toBeTruthy();
  });
});
