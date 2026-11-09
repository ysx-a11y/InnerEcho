/**
 * 管理端会话令牌存取。
 * 支持在浏览器本地记住口令并设置合理过期时间（默认 7 天自动过期），
 * 同时保留 sessionStorage 兼容单次会话模式与单元测试。
 */
const SESSION_STORAGE_KEY = 'innerecho_admin_token';
const PERSIST_STORAGE_KEY = 'innerecho_admin_token_v2';

/** 默认记住登录有效期：7 天 */
export const DEFAULT_ADMIN_TOKEN_TTL_DAYS = 7;

interface PersistedAdminTokenPayload {
  token: string;
  expiresAt: number;
}

export function getAdminToken(): string | null {
  try {
    const raw = localStorage.getItem(PERSIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedAdminTokenPayload>;
      if (
        typeof parsed?.token === 'string' &&
        parsed.token.trim().length > 0 &&
        typeof parsed?.expiresAt === 'number'
      ) {
        if (Date.now() < parsed.expiresAt) {
          return parsed.token;
        }
        // 已过期：主动清理本地与会话存储
        localStorage.removeItem(PERSIST_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      localStorage.removeItem(PERSIST_STORAGE_KEY);
    }
  } catch {
    // 忽略 JSON 解析或隐私模式异常，回退检查 sessionStorage
  }

  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getAdminTokenExpiresAt(): number | null {
  try {
    const raw = localStorage.getItem(PERSIST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedAdminTokenPayload>;
    if (typeof parsed?.expiresAt === 'number' && Date.now() < parsed.expiresAt) {
      return parsed.expiresAt;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 保存管理端令牌。
 * @param token 管理口令
 * @param rememberDays 记住天数（默认 7 天；传 0 则仅保存在当前浏览器标签会话 sessionStorage）
 */
export function setAdminToken(
  token: string,
  rememberDays: number = DEFAULT_ADMIN_TOKEN_TTL_DAYS
): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    // ignore
  }

  try {
    if (rememberDays > 0) {
      const payload: PersistedAdminTokenPayload = {
        token,
        expiresAt: Date.now() + rememberDays * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(PERSIST_STORAGE_KEY, JSON.stringify(payload));
    } else {
      localStorage.removeItem(PERSIST_STORAGE_KEY);
    }
  } catch {
    // 隐私模式等场景下存储不可用，忽略
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(PERSIST_STORAGE_KEY);
  } catch {
    // ignore
  }
}
