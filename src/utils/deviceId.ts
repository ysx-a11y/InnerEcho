/**
 * Browser Device Identifier Utility for InnerEcho
 * Generates and maintains a persistent browser-specific device ID (dev_...)
 * stored in localStorage indefinitely until manually cleared.
 */

const STORAGE_KEY = 'innerecho_device_id';

/** 内存兜底：localStorage 不可用（严格隐私模式/禁用存储）时仍保证有设备 ID 可上报。 */
let ephemeralDeviceId: string | null = null;

function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  const cryptoUuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
    : `${timestamp}${randomStr}`;
  return `dev_${cryptoUuid}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId || !deviceId.startsWith('dev_')) {
      deviceId = generateDeviceId();
      localStorage.setItem(STORAGE_KEY, deviceId);
    }

    return deviceId;
  } catch {
    // 隐私模式 / 禁用存储：退回会话级临时 ID，保证测评与访问统计仍可落库
    if (!ephemeralDeviceId) ephemeralDeviceId = generateDeviceId();
    return ephemeralDeviceId;
  }
}

/**
 * Password Strength Evaluator
 * 与 AuthModal 的 8 位硬性校验对齐：<8 位一律判定为不达标，避免强度提示与提交校验矛盾。
 */
export interface PasswordStrength {
  level: 'too_short' | 'weak' | 'medium' | 'strong';
  label: string;
  color: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const len = (password || '').length;

  if (len < 8) {
    return { level: 'too_short', label: '密码至少需8位', color: '#ef4444' };
  }
  if (len < 12) {
    return { level: 'medium', label: '强度：良好', color: '#ff70a6' };
  }
  return { level: 'strong', label: '强度：强', color: '#4ade80' };
}
