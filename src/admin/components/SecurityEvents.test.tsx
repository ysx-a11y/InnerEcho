// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from '../adminApi';
import { SecurityEvents } from './SecurityEvents';

vi.mock('../adminApi', () => ({
  adminApi: { listSecurityEvents: vi.fn() },
  formatTime: (value: string) => value,
}));

const securityEvent = {
  sequence: 7,
  id: 'security-event-7',
  eventType: 'admin_new_source',
  severity: 'warning' as const,
  requestId: 'request-7',
  ipAddress: '198.51.100.7',
  userAgent: 'security-ui-test',
  method: 'SYSTEM',
  route: '/verify',
  statusCode: 0,
  targetType: 'admin',
  targetId: null,
  responseBytes: null,
  metadata: { count: 1 },
  createdAt: '2026-08-20T01:00:00.000Z',
};

describe('SecurityEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listSecurityEvents).mockResolvedValue({
      success: true,
      events: [securityEvent],
      total: 1,
      chainValid: false,
    });
  });

  it('shows a prominent chain warning and keeps event details available', async () => {
    render(<SecurityEvents refreshTrigger={0} />);
    expect((await screen.findByRole('alert')).textContent).toContain('审计链校验失败');
    expect(screen.getByText('新管理来源')).toBeTruthy();
    expect(screen.getByText('198.51.100.7')).toBeTruthy();

    fireEvent.click(screen.getByText('新管理来源').closest('summary') as HTMLElement);
    expect(await screen.findByText('request-7')).toBeTruthy();
    expect(screen.getByText('{"count":1}')).toBeTruthy();
  });

  it('provides the four required anomaly filters and resets pagination on selection', async () => {
    render(<SecurityEvents refreshTrigger={0} />);
    await screen.findByText('198.51.100.7');

    fireEvent.click(screen.getByRole('button', { name: /事件:.*全部事件/ }));
    expect(screen.getByText('登录失败突发')).toBeTruthy();
    expect(screen.getByText('敏感读取突发')).toBeTruthy();
    expect(screen.getByText('蜜罐永久封禁')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '新管理来源' }));

    await waitFor(() => expect(adminApi.listSecurityEvents).toHaveBeenLastCalledWith({
      eventType: 'admin_new_source',
      severity: undefined,
      limit: 30,
      offset: 0,
    }));
  });
});
