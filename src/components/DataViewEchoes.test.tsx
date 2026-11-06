// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DataView } from './DataView';
import { apiGet, apiPost } from '../utils/api';

vi.mock('../utils/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('../utils/deviceId', () => ({
  getOrCreateDeviceId: () => 'dev_test_device_123',
}));

const mockEchoList = {
  success: true,
  items: [
    {
      id: 'echo_public_1',
      surfaceRole: '心内科主治医生',
      shadowDesire: '每天掌控生死，深夜独处时渴望彻底失去掌控与主导权。',
      shadowTag: '绝对臣服',
      fuzzedEchoes: '10+ 灵魂共鸣',
      echoCount: 14,
      isResonated: false,
      isMine: false,
      auditStatus: 'approved',
      createdAt: '2026-08-16T00:00:00Z',
    },
    {
      id: 'echo_preset_01',
      surfaceRole: '程序员',
      shadowDesire: '预置示例回声内容，仅用于验证标识展示。',
      shadowTag: '绝对臣服',
      fuzzedEchoes: '100+ 灵魂共鸣',
      echoCount: 142,
      isResonated: false,
      isPreset: true,
      isMine: false,
      auditStatus: 'approved',
      createdAt: '2026-08-16T01:00:00Z',
    },
  ],
  myPendingEchoes: [
    {
      id: 'echo_pending_mine',
      surfaceRole: '高中班主任',
      shadowDesire: '严谨威严背后，渴望体验无条件的被动服从。',
      shadowTag: '安全束缚',
      fuzzedEchoes: '1 灵魂共鸣',
      echoCount: 1,
      isResonated: false,
      isMine: true,
      auditStatus: 'pending',
      createdAt: '2026-08-16T00:05:00Z',
    },
  ],
};

describe('DataView Midnight Echo Well Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiGet as any).mockImplementation((url: string) => {
      if (url.startsWith('/api/echoes')) {
        return Promise.resolve({ data: mockEchoList });
      }
      if (url.startsWith('/api/stats/global')) {
        return Promise.resolve({
          data: {
            success: true,
            totalDossiers: '1.2k+',
            totalExplorers: '980+',
            depthDistribution: { deep: 55, medium: 35, light: 10 },
            topShadowTendencies: [],
            occupationInsights: [],
            energyAverages: { exploration: 80, authenticity: 85, liberation: 75, resilience: 90 },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    (apiPost as any).mockImplementation((url: string) => {
      if (url.includes('/resonate')) {
        return Promise.resolve({
          data: {
            success: true,
            isResonated: true,
            echoCount: 15,
            fuzzedEchoes: '10+ 灵魂共鸣',
          },
        });
      }
      if (url === '/api/echoes') {
        return Promise.resolve({
          data: {
            success: true,
            echo: {
              id: 'echo_new_cast',
              surfaceRole: '产品总监',
              shadowDesire: '在无尽的权衡与决策后，渴望被绝对指令支配。',
              shadowTag: '心智掌控',
              fuzzedEchoes: '1 灵魂共鸣',
              echoCount: 1,
              isResonated: false,
              isMine: true,
              auditStatus: 'pending',
              createdAt: '2026-08-16T00:10:00Z',
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders Midnight Echo Well with public approved whispers and user pending echoes', async () => {
    render(<DataView />);

    // 默认展示回响心声标签
    expect(await screen.findByText(/心内科主治医生/i)).toBeTruthy();
    expect(screen.getByText(/每天掌控生死/i)).toBeTruthy();
    expect(screen.getByText(/预置回声/i)).toBeTruthy();

    // 展示作者专属的待审核心声
    expect(screen.getByText(/高中班主任/i)).toBeTruthy();
    expect(screen.getByText(/已投掷/i)).toBeTruthy();
  });

  it('interacts with resonate button and opens whisper modal to cast a new echo', async () => {
    render(<DataView />);

    expect(await screen.findByText(/心内科主治医生/i)).toBeTruthy();

    // 点击点赞共鸣按钮
    const resonateBtn = screen.getAllByRole('button', { name: /点赞共鸣/i })[0];
    fireEvent.click(resonateBtn);

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/api/echoes/echo_public_1/resonate',
        {},
        expect.anything()
      );
    });

    // 点击倾诉自白心声
    const castBtn = screen.getByRole('button', { name: /倾诉自白心声/i });
    fireEvent.click(castBtn);

    // 模态弹窗出现
    expect(await screen.findByText('投掷自白心声')).toBeTruthy();

    const roleInput = screen.getByPlaceholderText(/例如：大学讲师、大厂前端/i);
    const desireInput = screen.getByPlaceholderText(/写下你在私密场域最渴望的体验/i);

    fireEvent.change(roleInput, { target: { value: '产品总监' } });
    fireEvent.change(desireInput, {
      target: { value: '在无尽的权衡与决策后，渴望被绝对指令支配。' },
    });

    const submitBtn = screen.getByRole('button', { name: /确认投掷/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/api/echoes',
        expect.objectContaining({
          surfaceRole: '产品总监',
          shadowDesire: '在无尽的权衡与决策后，渴望被绝对指令支配。',
        }),
        expect.anything()
      );
    });
  });
});
