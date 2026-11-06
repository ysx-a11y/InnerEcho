/**
 * 管理端会话令牌存取。
 * 只放 sessionStorage（关闭浏览器即失效），避免长期滞留；
 * 后续 /api/admin/* 数据请求统一从这里取令牌。
 */
const STORAGE_KEY = 'innerecho_admin_token';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // 隐私模式等场景下存储不可用，忽略（本次会话仍可用）
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
