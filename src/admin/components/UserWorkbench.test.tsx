// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserWorkbench } from './UserWorkbench';
import { usersApi } from '../adminApi';
import type { AdminUserSummary, AdminUserStats, AdminUserDetails } from '../adminTypes';

vi.mock('../adminApi', () => ({
  usersApi: {
    listUsers: vi.fn(),
    getUserDetails: vi.fn(),
    deleteUser: vi.fn(),
  },
  formatTime: (t: string) => t || '2026-08-16 00:00:00',
}));

const mockStats: AdminUserStats = {
  totalUsers: 25,
  activeUsers: 23,
  deletedUsers: 2,
  withDossierCount: 15,
  withoutDossierCount: 8,
  totalRegisteredDossiers: 18,
};

const mockUsers: AdminUserSummary[] = [
  {
    id: 'usr_active_with_dossier',
    email: 'architect@example.com',
    generation: 1,
    createdAt: '2026-08-16T00:00:00Z',
    deletedAt: null,
    lastLoginAt: '2026-08-16T01:00:00Z',
    deviceCount: 2,
    devices: ['dev_alpha', 'dev_beta'],
    dossierCount: 1,
    latestNickname: '深渊漫游者',
    latestOccupation: '系统架构师',
    latestDepthRating: 'deep',
    latestDossierAt: '2026-08-16T00:30:00Z',
    userBankCount: 2,
    taskCount: 3,
    echoCount: 1,
  },
  {
    id: 'usr_active_no_dossier',
    email: 'newbie@example.com',
    generation: 1,
    createdAt: '2026-08-16T02:00:00Z',
    deletedAt: null,
    lastLoginAt: null,
    deviceCount: 1,
    devices: ['dev_gamma'],
    dossierCount: 0,
    latestNickname: null,
    latestOccupation: null,
    latestDepthRating: null,
    latestDossierAt: null,
    userBankCount: 0,
    taskCount: 0,
    echoCount: 0,
  },
];

const mockUserDetails: AdminUserDetails = {
  user: {
    id: 'usr_active_with_dossier',
    email: 'architect@example.com',
    generation: 1,
    createdAt: '2026-08-16T00:00:00Z',
    deletedAt: null,
    tokenInvalidatedAt: null,
  },
  devices: [{ deviceId: 'dev_alpha', lastLoginAt: '2026-08-16T01:00:00Z', createdAt: '2026-08-16T00:00:00Z' }],
  dossiers: [
    {
      id: 'dos_123',
      nickname: '深渊漫游者',
      occupation: '系统架构师',
      personaTrait: '深沉冷冽',
      depthRating: 'deep',
      createdAt: '2026-08-16T00:30:00Z',
      auditStatus: 'approved',
      selectedShadowTags: ['暗黑依恋', '心智掌控'],
    },
  ],
  banks: [
    {
      id: 'ubk_1',
      title: '高阶架构师自省题库',
      subtitle: '沉浸式自省',
      questionCount: 10,
      isPublished: true,
      auditStatus: 'approved',
      createdAt: '2026-08-16T00:10:00Z',
      updatedAt: '2026-08-16T00:10:00Z',
    },
  ],
  tasks: [
    {
      id: 'utask_1',
      taskId: 'task_secret_code',
      status: 'completed',
      acceptedAt: '2026-08-16T00:20:00Z',
      completedAt: '2026-08-16T00:25:00Z',
    },
  ],
  echoes: [
    {
      id: 'echo_1',
      surfaceRole: '系统架构师',
      shadowDesire: '渴望彻底卸下架构职责体验被动指令',
      shadowTag: '心智掌控',
      echoCount: 5,
      auditStatus: 'approved',
      createdAt: '2026-08-16T00:35:00Z',
    },
  ],
  bankNames: { ubk_1: '高阶架构师自省题库' },
};

describe('UserWorkbench Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);
    (usersApi.listUsers as any).mockResolvedValue({
      success: true,
      items: mockUsers,
      total: mockUsers.length,
      stats: mockStats,
    });
    (usersApi.getUserDetails as any).mockResolvedValue({
      success: true,
      details: mockUserDetails,
    });
    (usersApi.deleteUser as any).mockResolvedValue({ success: true, deleted: true });
  });

  it('renders stats overview, user table and switches category tabs', async () => {
    render(<UserWorkbench />);

    // 统计看板渲染
    expect(await screen.findByText('总注册用户')).toBeTruthy();

    // 表格数据渲染
    expect(screen.getByText('architect@example.com')).toBeTruthy();
    expect(screen.getByText('newbie@example.com')).toBeTruthy();

    // 切换至【已填卷用户】标签按钮
    const withDossierBtn = screen.getByRole('tab', { name: /已填卷用户/i });
    fireEvent.click(withDossierBtn);

    await waitFor(() => {
      expect(usersApi.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ hasDossier: 'yes', status: 'active' })
      );
    });
  });

  it('clicks user profile button to inspect details drawer and triggers user soft-delete', async () => {
    render(<UserWorkbench />);
    expect(await screen.findByText('architect@example.com')).toBeTruthy();

    // 点击【全维画像】按钮打开详情抽屉
    const detailBtns = screen.getAllByRole('button', { name: /全维画像/i });
    expect(detailBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(detailBtns[0]);

    await waitFor(() => {
      expect(usersApi.getUserDetails).toHaveBeenCalledWith('usr_active_with_dossier');
    });

    // 弹窗头部呈现
    expect(await screen.findByText('用户全维画像')).toBeTruthy();
    expect(screen.getByText('高阶架构师自省题库')).toBeTruthy();
    expect(screen.getByText(/渴望彻底卸下架构职责/i)).toBeTruthy();

    // 点击表格中的注销按钮并确认
    const deleteBtns = screen.getAllByRole('button', { name: /^注销$/i });
    fireEvent.click(deleteBtns[0]);

    const confirmBtn = await screen.findByRole('button', { name: '确认注销' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(usersApi.deleteUser).toHaveBeenCalledWith('usr_active_with_dossier');
    });
  });
});
