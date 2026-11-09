/**
 * 管理端会话令牌存取。
 *
 * 安全策略：管理口令（ADMIN_TOKEN）只保存在当前标签页的 sessionStorage 中，
 * 不写入 localStorage；跨会话「记住登录」交给浏览器密码管理器
 * （登录表单使用标准 username / current-password 自动填充语义）。
 * 这样明文口令不会在磁盘上长期留存，关闭标签页即失效。
 */
const SESSION_STORAGE_KEY = 'innerecho_admin_token';
/** 历史版本曾把口令持久化到 localStorage；读取/清理时一并清除，避免旧口令残留。 */
const LEGACY_PERSIST_STORAGE_KEY = 'innerecho_admin_token_v2';

function clearLegacyPersistedToken(): void {
  try {
    localStorage.removeItem(LEGACY_PERSIST_STORAGE_KEY);
  } catch {
    // 隐私模式等场景下存储不可用，忽略
  }
}

export function getAdminToken(): string | null {
  clearLegacyPersistedToken();
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * 保存管理端口令：仅当前浏览器标签页会话有效。
 * 需要「下次自动登录」时由浏览器密码管理器保存并自动填充登录表单。
 */
export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    // 隐私模式等场景下存储不可用，忽略
  }
  clearLegacyPersistedToken();
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  clearLegacyPersistedToken();
}
