// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterrogationRoomView } from './InterrogationRoomView';

const { apiGetMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('../utils/api', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  ApiError: class ApiError extends Error {
    status: number;
    payload: unknown;
    constructor(status: number, message: string, payload?: unknown) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  },
}));

const user = { id: 'usr_interrogation_test', email: 'itr@example.com' };

const exhaustedState = {
  success: true,
  config: { maxTurns: 5, maxInputTokens: 1200, maxOutputTokens: 300 },
  session: {
    id: 'itr_test',
    status: 'exhausted',
    turnCount: 5,
    summary: null,
    summaryGeneratedAt: null,
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:05:00.000Z',
  },
  messages: [
    { id: 'm1', role: 'user', content: '我说了一句', createdAt: '2026-11-06T00:00:30.000Z' },
    { id: 'm2', role: 'assistant', content: '你在回避什么？', createdAt: '2026-11-06T00:00:31.000Z' },
  ],
  remainingTurns: 0,
  hasDossier: true,
};

beforeEach(() => {
  apiGetMock.mockReset();
  apiPostMock.mockReset();
  // happy-dom 未实现 scrollIntoView，组件滚到底部时会调用。
  Element.prototype.scrollIntoView = vi.fn();
});

describe('InterrogationRoomView', () => {
  it('对话到上限后显示「暂未开放更多对话」与总结按钮，点击生成总结', async () => {
    apiGetMock.mockResolvedValue({ data: exhaustedState });
    apiPostMock.mockResolvedValue({
      data: {
        success: true,
        summary: '你反复绕开了那个最简单的问题。',
        session: { ...exhaustedState.session, status: 'summarized', summary: '你反复绕开了那个最简单的问题。' },
      },
    });

    render(<InterrogationRoomView user={user} onBack={vi.fn()} onGoBanks={vi.fn()} />);

    expect(await screen.findByText('暂未开放更多对话')).toBeDefined();
    expect(screen.getByText('测试功能')).toBeDefined();

    fireEvent.click(screen.getByText('生成审讯总结'));

    await waitFor(() => {
      expect(screen.getByText('你反复绕开了那个最简单的问题。')).toBeDefined();
    });
    expect(apiPostMock).toHaveBeenCalledWith('/api/interrogation/summary', {}, expect.anything());
  });

  it('没有卷宗时不开放输入，引导先去选卷宗', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        config: { maxTurns: 5, maxInputTokens: 1200, maxOutputTokens: 300 },
        session: null,
        messages: [],
        remainingTurns: 5,
        hasDossier: false,
      },
    });
    const onGoBanks = vi.fn();

    render(<InterrogationRoomView user={user} onBack={vi.fn()} onGoBanks={onGoBanks} />);

    expect(await screen.findByText('门还没为你打开')).toBeDefined();
    fireEvent.click(screen.getByText('去选一份卷宗'));
    expect(onGoBanks).toHaveBeenCalledTimes(1);
  });

  it('还能对话时输入并发送，剩余轮数递减', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        ...exhaustedState,
        session: { ...exhaustedState.session, status: 'active', turnCount: 1 },
        remainingTurns: 4,
      },
    });
    apiPostMock.mockResolvedValue({
      data: {
        success: true,
        reply: '那你为什么停在这里？',
        session: { ...exhaustedState.session, status: 'active', turnCount: 2 },
        remainingTurns: 3,
      },
    });

    render(<InterrogationRoomView user={user} onBack={vi.fn()} onGoBanks={vi.fn()} />);

    const textarea = await screen.findByPlaceholderText('写下你的供词…');
    fireEvent.change(textarea, { target: { value: '我在想怎么回答。' } });
    fireEvent.click(screen.getByText('递过去'));

    await waitFor(() => {
      expect(screen.getByText('那你为什么停在这里？')).toBeDefined();
    });
    expect(screen.getByText(/已进行 2 \/ 5 轮/)).toBeDefined();
  });

  it('第一次进门、还没有会话时给出输入框，而不是直接显示到上限', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        config: { maxTurns: 5, maxInputTokens: 1200, maxOutputTokens: 300 },
        session: null,
        messages: [],
        remainingTurns: 5,
        hasDossier: true,
      },
    });
    apiPostMock.mockResolvedValue({
      data: {
        success: true,
        reply: '你最近一次对别人说真话，是什么时候？',
        session: { ...exhaustedState.session, status: 'active', turnCount: 1 },
        remainingTurns: 4,
      },
    });

    render(<InterrogationRoomView user={user} onBack={vi.fn()} onGoBanks={vi.fn()} />);

    const textarea = await screen.findByPlaceholderText('写下你的供词…');
    expect(screen.queryByText('暂未开放更多对话')).toBeNull();

    fireEvent.change(textarea, { target: { value: '刚才。' } });
    fireEvent.click(screen.getByText('递过去'));

    await waitFor(() => {
      expect(screen.getByText('你最近一次对别人说真话，是什么时候？')).toBeDefined();
    });
    expect(screen.getByText('已进行 1 / 5 轮 · 还剩 4 轮')).toBeDefined();
  });
});
