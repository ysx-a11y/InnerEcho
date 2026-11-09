// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLogin } from './AdminLogin';
import { clearAdminToken, getAdminToken, setAdminToken } from '../adminToken';

afterEach(() => {
  clearAdminToken();
  vi.restoreAllMocks();
});

describe('AdminLogin & adminToken session-only storage', () => {
  it('uses standard credential autocomplete fields and keeps the token only in sessionStorage', async () => {
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

    expect(username.getAttribute('autocomplete')).toBe('username');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
    expect(form?.tagName).toBe('FORM');

    fireEvent.change(password, { target: { value: 'test-only-admin-token' } });
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith('test-only-admin-token'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(getAdminToken()).toBe('test-only-admin-token');
    // 口令不得落到 localStorage（不长期持久化）
    expect(localStorage.getItem('innerecho_admin_token_v2')).toBeNull();

    // 关闭标签页（sessionStorage 清空）后必须重新验证，不存在持久化副本
    sessionStorage.removeItem('innerecho_admin_token');
    expect(getAdminToken()).toBeNull();
  });

  it('clears legacy persisted tokens so old 7-day credentials stop working', () => {
    localStorage.setItem(
      'innerecho_admin_token_v2',
      JSON.stringify({
        token: 'legacy-token',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    expect(getAdminToken()).toBeNull();
    expect(localStorage.getItem('innerecho_admin_token_v2')).toBeNull();

    setAdminToken('session-token');
    expect(getAdminToken()).toBe('session-token');

    clearAdminToken();
    expect(getAdminToken()).toBeNull();
  });
});
