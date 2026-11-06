import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config.js';
import { db } from './db.js';
import { validatePassword } from './utils/security.js';

export const COOKIE_NAME = 'innerecho_token';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
export const COOKIE_CLEAR_OPTIONS = {
  httpOnly: COOKIE_OPTIONS.httpOnly,
  sameSite: COOKIE_OPTIONS.sameSite,
  secure: COOKIE_OPTIONS.secure,
  path: COOKIE_OPTIONS.path,
};

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresInSeconds });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

/** Auth middleware — reads JWT from httpOnly cookie. */
export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
  deviceId?: string;
}

/**
 * 校验 token 签发时间是否晚于用户的 tokenInvalidatedAt。
 * 修改密码或软删除账号后，tokenInvalidatedAt 会被刷新为当前时间，旧 token 立即失效。
 *
 * Exported for unit testing.
 */
export function isTokenStillValid(decoded: JwtPayload, invalidatedAt: string | null | undefined): boolean {
  if (!invalidatedAt) return true; // 用户从未修改密码，所有 token 都有效
  if (!decoded.iat) return false; // 没有 iat 的旧 token 视为无效
  const invalidatedSecond = Math.floor(new Date(invalidatedAt).getTime() / 1000);
  // JWT iat has one-second precision. Comparing whole seconds keeps the newly
  // issued current-session token valid without permanently accepting older tokens.
  return decoded.iat >= invalidatedSecond;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ success: false, message: '未登录或登录已过期' });
    return;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTIONS);
    res.status(401).json({ success: false, message: '登录已失效，请重新登录' });
    return;
  }

  // 查用户当前状态：账号被软删除或修改密码后旧 token 必须失效
  const user = await db.findUserById(decoded.userId);
  if (!user) {
    res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTIONS);
    res.status(401).json({ success: false, message: '账号不存在或已注销' });
    return;
  }
  if (!isTokenStillValid(decoded, user.tokenInvalidatedAt)) {
    res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTIONS);
    res.status(401).json({ success: false, message: '登录态已失效（密码已变更或账号已注销），请重新登录' });
    return;
  }

  req.userId = decoded.userId;
  req.userEmail = decoded.email;
  next();
}

/**
 * Soft authentication for endpoints that also support guests.
 * A signed token is not sufficient: password changes and account deletion
 * invalidate previously issued tokens, so check the current database state too.
 */
export async function maybeUserId(req: Request): Promise<string | null> {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  try {
    const user = await db.findUserById(decoded.userId);
    if (!user || !isTokenStillValid(decoded, user.tokenInvalidatedAt)) return null;
    return decoded.userId;
  } catch {
    // Optional authentication must fail closed without breaking guest analysis.
    return null;
  }
}

export function extractDeviceId(req: Request): string {
  const h = req.headers['x-device-id'];
  if (h && typeof h === 'string') {
    const trimmed = h.trim();
    // 限制长度，避免异常超长 header 写入数据库
    if (trimmed.length > 128) return '';
    return trimmed;
  }
  return '';
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export { validatePassword };
