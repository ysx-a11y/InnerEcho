// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthSession } from './useAuthSession';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useAuthSession logout race protection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not restore the user from an in-flight /api/auth/me response after logout', async () => {
    let resolveMountMe: (value: Response) => void = () => {};
    const mountMe = new Promise<Response>((resolve) => {
      resolveMountMe = resolve;
    });
    const fetchMock = vi
      .fn()
      // 挂载时 /api/auth/me（挂起）
      .mockReturnValueOnce(mountMe)
      // 退出请求
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.user).toBeNull();

    act(() => {
      result.current.setAuthenticatedUser({ id: 'u_race', email: 'race@example.com' });
    });
    expect(result.current.user?.email).toBe('race@example.com');

    act(() => {
      result.current.logout();
    });
    expect(result.current.user).toBeNull();

    // 挂载期 /me 此刻才返回 200 + 用户：必须被丢弃，不能复活登录态
    await act(async () => {
      resolveMountMe(
        jsonResponse({ success: true, user: { id: 'u_race', email: 'race@example.com' } })
      );
      await Promise.resolve();
    });

    expect(result.current.user).toBeNull();
  });

  it('ignores a stale mount-time 401 after a fresh login', async () => {
    let resolveMountMe: (value: Response) => void = () => {};
    const mountMe = new Promise<Response>((resolve) => {
      resolveMountMe = resolve;
    });
    const fetchMock = vi.fn().mockReturnValueOnce(mountMe);

    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAuthSession());

    act(() => {
      result.current.setAuthenticatedUser({ id: 'u_login', email: 'login@example.com' });
    });
    expect(result.current.user?.email).toBe('login@example.com');

    // 挂载期 /me 返回 401：必须被丢弃，不能清掉刚登录的状态
    await act(async () => {
      resolveMountMe(jsonResponse({ success: false }, 401));
      await Promise.resolve();
    });

    expect(result.current.user?.email).toBe('login@example.com');
  });
});
