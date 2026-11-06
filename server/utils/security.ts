import { config } from '../config.js';

/**
 * Validate that the given LLM base URL points to an allow-listed host.
 * Prevents SSRF — otherwise a malicious client could ask the server to POST
 * the LLM API key to an attacker-controlled endpoint via customConfig.baseUrl.
 * 除 hostname 白名单外，非 loopback 地址强制 https + 默认端口，避免
 * 通过 http 或非常规端口绕过协议层面的防护。
 */
export function isLlmBaseUrlAllowed(rawBaseUrl: string): boolean {
  try {
    const u = new URL(rawBaseUrl);
    const host = u.hostname.toLowerCase();
    if (!config.llmAllowedHosts.has(host)) return false;

    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
    if (!isLoopback) {
      // 非本机地址：仅允许 https 且使用默认端口，压缩 SSRF 面
      if (u.protocol !== 'https:') return false;
      if (u.port && u.port !== '443') return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface PasswordIssue {
  ok: boolean;
  message: string;
}

/** Password policy: ≥ 8 chars, must contain letters AND digits. */
export function validatePassword(password: string): PasswordIssue {
  if (!password || password.length < 8) {
    return { ok: false, message: '密码长度至少需要 8 位' };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { ok: false, message: '密码必须同时包含字母和数字' };
  }
  return { ok: true, message: '' };
}

/**
 * Strip long free-form text fields (private confessions) from a payload
 * before writing it to api_error_logs, to avoid persisting sensitive user content.
 */
export function sanitizePayloadForLog(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const p = payload as Record<string, unknown>;
  const clone: Record<string, unknown> = { ...p };

  const redact = (obj: Record<string, unknown> | undefined) => {
    if (!obj || typeof obj !== 'object') return obj;
    const o = { ...(obj as Record<string, unknown>) };
    const REDACTED = '[REDACTED]';
    // 身份类字段（C3）：昵称/职业/人前特质/年龄/婚恋状态/头像均属个人可识别信息
    if ('nickname' in o) o.nickname = REDACTED;
    if ('occupation' in o) o.occupation = REDACTED;
    if ('personaTrait' in o) o.personaTrait = REDACTED;
    if ('age' in o) o.age = REDACTED;
    if ('maritalStatus' in o) o.maritalStatus = REDACTED;
    if ('hasBoyfriend' in o) o.hasBoyfriend = REDACTED;
    if ('avatarUrl' in o) o.avatarUrl = REDACTED;
    if ('avatarUrls' in o) o.avatarUrls = REDACTED;
    if ('innerDesire' in o) o.innerDesire = REDACTED;
    if ('surfaceTrait' in o) o.surfaceTrait = REDACTED;
    if ('boundaryText' in o) o.boundaryText = REDACTED;
    if ('fantasyText' in o) o.fantasyText = REDACTED;
    if ('relationPreference' in o) o.relationPreference = REDACTED;
    if ('awakeningMoment' in o) o.awakeningMoment = REDACTED;
    if ('secretWords' in o) o.secretWords = REDACTED;
    if ('secretRule' in o) o.secretRule = REDACTED;
    return o;
  };

  if (clone.chapter1) clone.chapter1 = redact(clone.chapter1 as Record<string, unknown>);
  if (clone.chapter2) clone.chapter2 = redact(clone.chapter2 as Record<string, unknown>);
  if (clone.chapter3) clone.chapter3 = redact(clone.chapter3 as Record<string, unknown>);
  if (clone.userTextAnswers) clone.userTextAnswers = '[REDACTED]';
  if (clone.questionLogs) clone.questionLogs = `[REDACTED:array]`;
  if (clone.telemetry) clone.telemetry = '[REDACTED]';
  // 完整题库文本与媒体附件同样不得进入日志（C3）
  if (clone.completedBanks) clone.completedBanks = '[REDACTED]';
  if (clone.userMediaAttachments) clone.userMediaAttachments = '[REDACTED]';
  return clone;
}

/** Strip markdown code fences from LLM output before JSON.parse. */
export function cleanLlmJsonContent(raw: string): string {
  return raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}
