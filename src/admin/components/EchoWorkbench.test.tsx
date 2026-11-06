// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EchoWorkbench } from './EchoWorkbench';
import { echoesApi } from '../adminApi';
import type { AdminEchoWhisper } from '../adminTypes';

vi.mock('../adminApi', () => ({
  echoesApi: {
    listEchoes: vi.fn(),
    updateStatus: vi.fn(),
    deleteEcho: vi.fn(),
  },
  formatTime: (t: string) => t || '2026-08-16 00:00:00',
}));

const mockEchoes: AdminEchoWhisper[] = [
  {
    id: 'echo_pending',
    surfaceRole: '急诊科医生',
    shadowDesire: '渴望在独处时被完全支配与约束',
    shadowTag: '安全束缚',
    echoCount: 3,
    auditStatus: 'pending',
    createdAt: '2026-08-16T00:00:00Z',
    deviceId: 'dev_1',
    userId: null,
  },
  {
    id: 'echo_approved',
    surfaceRole: '高校讲师',
    shadowDesire: '严谨教学背后渴望极度的依赖与放空',
    shadowTag: '绝对臣服',
    echoCount: 12,
    auditStatus: 'approved',
    createdAt: '2026-08-16T00:01:00Z',
    deviceId: 'dev_2',
    userId: 'usr_2',
  },
  {
    id: 'echo_flagged',
    surfaceRole: '金融分析师',
    shadowDesire: '数字理性外追求非理性的感官试探',
    shadowTag: '心智掌控',
    echoCount: 1,
    auditStatus: 'flagged',
    createdAt: '2026-08-16T00:02:00Z',
    deviceId: 'dev_3',
    userId: null,
  },
  {
    id: 'echo_rejected',
    surfaceRole: '测试角色',
    shadowDesire: '违规或者被驳回的自白文本',
    shadowTag: '角色互换',
    echoCount: 0,
    auditStatus: 'rejected',
    createdAt: '2026-08-16T00:03:00Z',
    deviceId: 'dev_4',
    userId: null,
  },
];

describe('EchoWorkbench Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);
    (echoesApi.listEchoes as any).mockResolvedValue({
      success: true,
      items: mockEchoes,
      total: mockEchoes.length,
    });
    (echoesApi.updateStatus as any).mockResolvedValue({ success: true, message: '状态已更新' });
    (echoesApi.deleteEcho as any).mockResolvedValue({ success: true, message: '已删除' });
  });

  it('renders echo list and strictly adheres to status action & delete rules', async () => {
    const onStatusChanged = vi.fn();
    render(<EchoWorkbench onStatusChanged={onStatusChanged} />);

    expect(await screen.findByText(/急诊科医生/i)).toBeTruthy();
    expect(screen.getByText(/高校讲师/i)).toBeTruthy();
    expect(screen.getByText(/金融分析师/i)).toBeTruthy();
    expect(screen.getByText(/测试角色/i)).toBeTruthy();

    // 1. 待审核状态 (pending): 包含【通过】与【驳回】，绝对不包含删除按钮
    const pendingRow = screen.getByText(/急诊科医生/i).closest('tr');
    expect(pendingRow).toBeTruthy();
    expect(pendingRow?.querySelector('button[title*="审核通过并公开"]')).toBeTruthy();
    expect(pendingRow?.querySelector('button[title*="驳回不通过"]')).toBeTruthy();
    expect(pendingRow?.querySelector('button[title*="物理删除"]')).toBeNull();

    // 2. 已上架公开状态 (approved): 仅包含【下架】，绝对不包含删除按钮
    const approvedRow = screen.getByText(/高校讲师/i).closest('tr');
    expect(approvedRow).toBeTruthy();
    expect(approvedRow?.querySelector('button[title*="下架隐藏"]')).toBeTruthy();
    expect(approvedRow?.querySelector('button[title*="物理删除"]')).toBeNull();

    // 3. 已下架状态 (flagged): 包含【重新上架】与【物理删除】
    const flaggedRow = screen.getByText(/金融分析师/i).closest('tr');
    expect(flaggedRow).toBeTruthy();
    expect(flaggedRow?.querySelector('button[title*="重新上架"]')).toBeTruthy();
    expect(flaggedRow?.querySelector('button[title*="物理删除"]')).toBeTruthy();

    // 4. 已驳回状态 (rejected): 包含【重新通过】与【物理删除】
    const rejectedRow = screen.getByText(/测试角色/i).closest('tr');
    expect(rejectedRow).toBeTruthy();
    expect(rejectedRow?.querySelector('button[title*="重新审核通过"]')).toBeTruthy();
    expect(rejectedRow?.querySelector('button[title*="物理删除"]')).toBeTruthy();
  });

  it('triggers approval and deletion operations and invokes onStatusChanged callback', async () => {
    const onStatusChanged = vi.fn();
    render(<EchoWorkbench onStatusChanged={onStatusChanged} />);
    expect(await screen.findByText(/急诊科医生/i)).toBeTruthy();

    // 点击待审核行的【通过】按钮
    const pendingRow = screen.getByText(/急诊科医生/i).closest('tr');
    const approveBtn = pendingRow?.querySelector('button[title*="审核通过并公开"]');
    expect(approveBtn).toBeTruthy();

    fireEvent.click(approveBtn!);
    await waitFor(() => {
      expect(echoesApi.updateStatus).toHaveBeenCalledWith('echo_pending', 'approved');
      expect(onStatusChanged).toHaveBeenCalled();
    });

    // 点击已下架行的【删除】按钮并确认
    const flaggedRow = screen.getByText(/金融分析师/i).closest('tr');
    const deleteBtn = flaggedRow?.querySelector('button[title*="物理删除"]');
    expect(deleteBtn).toBeTruthy();

    fireEvent.click(deleteBtn!);
    const confirmBtn = await screen.findByRole('button', { name: '确认删除' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(echoesApi.deleteEcho).toHaveBeenCalledWith('echo_flagged');
      expect(onStatusChanged).toHaveBeenCalled();
    });
  });
});
