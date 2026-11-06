// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLogin } from './AdminLogin';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminLogin', () => {
  it('uses a distinct current-password credential group and one form submission', async () => {
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
  });
});
