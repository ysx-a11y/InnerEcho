// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortalView } from './PortalView';

describe('PortalView 5-layer portal', () => {
  it('renders all 5 layer entry points and triggers respective callbacks', () => {
    const onGoToBasicInfo = vi.fn();
    const onOpenBanks = vi.fn();
    const onOpenTasks = vi.fn();
    const onOpenCards = vi.fn();
    const onOpenAstrolabe = vi.fn();

    render(
      <PortalView
        onGoToBasicInfo={onGoToBasicInfo}
        onOpenBanks={onOpenBanks}
        onOpenTasks={onOpenTasks}
        onOpenCards={onOpenCards}
        onOpenAstrolabe={onOpenAstrolabe}
      />
    );

    // Layer 1: 基础信息入口
    const basicInfoBtn = screen.getByText('身份与表里假面登记');
    expect(basicInfoBtn).toBeDefined();
    fireEvent.click(basicInfoBtn);
    expect(onGoToBasicInfo).toHaveBeenCalledTimes(1);

    // Layer 2: 精选题库及查看全部入口
    const viewAllBanksBtn = screen.getByText('查看全部绝密卷宗库与社区自制题库 (10+)');
    expect(viewAllBanksBtn).toBeDefined();
    fireEvent.click(viewAllBanksBtn);
    expect(onOpenBanks).toHaveBeenCalledTimes(1);

    // Layer 3: 并列双入口 (任务在前，自制卡片在后)
    const tasksBtn = screen.getByText('试炼任务');
    expect(tasksBtn).toBeDefined();
    fireEvent.click(tasksBtn);
    expect(onOpenTasks).toHaveBeenCalledTimes(1);

    const cardsBtn = screen.getByText('自制角色卡');
    expect(cardsBtn).toBeDefined();
    fireEvent.click(cardsBtn);
    expect(onOpenCards).toHaveBeenCalledTimes(1);

    // Layer 4: 潜意识星盘
    const astrolabeBtn = screen.getByText('潜意识星盘');
    expect(astrolabeBtn).toBeDefined();
    fireEvent.click(astrolabeBtn);
    expect(onOpenAstrolabe).toHaveBeenCalledTimes(1);
  });

  it('renders registered status and 补全资料 when user has registered nickname but missing details', () => {
    const onGoToBasicInfo = vi.fn();
    render(
      <PortalView
        onGoToBasicInfo={onGoToBasicInfo}
        onOpenBanks={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenCards={vi.fn()}
        onOpenAstrolabe={vi.fn()}
        basicInfo={{ nickname: '夜刃' }}
      />
    );

    expect(screen.getByText('代号：夜刃 · 假面档案')).toBeDefined();
    expect(screen.getByText('补全资料')).toBeDefined();
  });

  it('renders 修改资料 when user profile is complete', () => {
    render(
      <PortalView
        onGoToBasicInfo={vi.fn()}
        onOpenBanks={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenCards={vi.fn()}
        onOpenAstrolabe={vi.fn()}
        basicInfo={{ nickname: '夜刃', occupation: '程序员', innerDesire: '渴望被掌控' }}
      />
    );

    expect(screen.getByText('代号：夜刃 · 假面档案')).toBeDefined();
    expect(screen.getByText('修改资料')).toBeDefined();
  });

  it('triggers onStartBank with bank id when clicking featured bank start button', () => {
    const onStartBank = vi.fn();
    render(
      <PortalView
        onGoToBasicInfo={vi.fn()}
        onOpenBanks={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenCards={vi.fn()}
        onOpenAstrolabe={vi.fn()}
        onStartBank={onStartBank}
      />
    );

    const startButtons = screen.getAllByText('立即开启测验');
    expect(startButtons.length).toBe(3);
    fireEvent.click(startButtons[0]);
    expect(onStartBank).toHaveBeenCalledWith('wife_taboo_20');
  });
});
