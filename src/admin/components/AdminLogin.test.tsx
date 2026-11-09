// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLogin } from './AdminLogin';
import {
  clearAdminToken,
  getAdminToken,
  getAdminTokenExpiresAt,
  setAdminToken,
} from '../adminToken';

afterEach(() => {
  clearAdminToken();
  vi.restoreAllMocks();
});

describe('AdminLogin & adminToken expiration', () => {
  it('uses a distinct current-password credential group, persists token for 7 days by default, and submits once', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const onLoginSuccess = vi.fn();

    render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

    const username = screen.getByLabelText('管理员身份 (Administrator)');
    const password = screen.getByLabelText('安全管理口令 (Security Password)');
    const form = document.querySelector('#admin-login-form');

    expect(username.getAttribute('autocomplete')).toBe('section-admin username');
    expect(password.getAttribute('autocomplete')).toBe('section-admin current-password');
    expect(form?.tagName).toBe('FORM');

    fireEvent.change(password, { target: { value: 'test-only-admin-token' } });
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith('test-only-admin-token'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 验证已写入带 7 天有效期的 localStorage，即便清空 sessionStorage 也能自动恢复
    sessionStorage.removeItem('innerecho_admin_token');
    expect(getAdminToken()).toBe('test-only-admin-token');
    const expiresAt = getAdminTokenExpiresAt();
    expect(expiresAt).not.toBeNull();
    expect((expiresAt ?? 0) - Date.now()).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
  });

  it('automatically expires and clears persisted token after TTL elapses', () => {
    setAdminToken('short-lived-token', 7);
    expect(getAdminToken()).toBe('short-lived-token');

    // 模拟已过期的时间戳
    localStorage.setItem(
      'innerecho_admin_token_v2',
      JSON.stringify({
        token: 'expired-token',
        expiresAt: Date.now() - 1000,
      })
    );

    expect(getAdminToken()).toBeNull();
    expect(localStorage.getItem('innerecho_admin_token_v2')).toBeNull();
  });
});
