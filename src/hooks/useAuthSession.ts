import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthSessionResponse, BasicInfoContract, DossierSummaryContract, SessionUser } from '../../shared/apiContracts';

const SESSION_CACHE_KEY = 'innerecho:session-user:v1';
const SESSION_ME_TIMEOUT_MS = 8000;

function loadCachedSessionUser(): SessionUser | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return { id: parsed.id, email: parsed.email };
    }
    return null;
  } catch {
    return null;
  }
}

function persistSessionUser(user: SessionUser | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // Ignore storage failures; the session check will still recover on the next request.
  }
}

/**
 * Optimistic cookie-session discovery:
 * - Render immediately from a cached SessionUser (no blocking spinner).
 * - Refresh /api/auth/me in the background and persist/clear the cache.
 * - A 401 clears the cached session; a network timeout keeps the optimistic state.
 */
export function useAuthSession() {
  const [user, setUser] = useState<SessionUser | null>(loadCachedSessionUser);
  const [latestDossier, setLatestDossier] = useState<DossierSummaryContract | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfoContract | null>(null);
  // 会话世代：登录/退出都会推进；在途 /api/auth/me 响应只允许在发起时的世代写入，
  // 避免“退出后旧响应把用户状态复活”和“挂载期 401 把刚登录的状态清掉”两类竞态。
  const sessionEpochRef = useRef(0);

  const applySession = useCallback((data: AuthSessionResponse | null, epoch: number) => {
    if (epoch !== sessionEpochRef.current) return;
    if (data?.success && data.user) {
      setUser(data.user);
      setLatestDossier(data.latestDossier ?? null);
      setBasicInfo(data.basicInfo ?? null);
      persistSessionUser(data.user);
    } else {
      setUser(null);
      setLatestDossier(null);
      setBasicInfo(null);
      persistSessionUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SESSION_ME_TIMEOUT_MS);

    fetch('/api/auth/me', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (
        response.ok
          ? response.json() as Promise<AuthSessionResponse>
          : null
      ))
      .then((data) => {
        if (!active) return;
        // 挂载期请求只对初始会话有效：一旦期间发生登录/退出（epoch 推进），丢弃。
        applySession(data, 0);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.name === 'AbortError') {
          // Timeout or cancelled: keep the optimistic cached user, do not force logout.
          return;
        }
        console.warn('Fetch user profile failed:', error);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const setAuthenticatedUser = useCallback((nextUser: SessionUser) => {
    sessionEpochRef.current += 1;
    setUser(nextUser);
    persistSessionUser(nextUser);
  }, []);

  /** 登录/恢复后主动刷新一次会话，取回档案基础信息与最近卷宗。 */
  const refreshSession = useCallback(async () => {
    const epochAtStart = sessionEpochRef.current;
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json() as AuthSessionResponse;
      applySession(data, epochAtStart);
    } catch {
      // 网络异常保留乐观会话状态，下次进入页面会重试
    }
  }, [applySession]);

  const logout = useCallback(() => {
    sessionEpochRef.current += 1;
    setUser(null);
    setLatestDossier(null);
    setBasicInfo(null);
    persistSessionUser(null);
    void fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }, []);

  return { user, latestDossier, basicInfo, setAuthenticatedUser, refreshSession, logout };
}
