import { Router, type Response } from 'express';
import { z } from 'zod';
import { ZodError } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import {
  validatePassword,
  hashPassword,
  verifyPassword,
  signToken,
  COOKIE_NAME,
  COOKIE_OPTIONS,
  COOKIE_CLEAR_OPTIONS,
  extractDeviceId,
  type AuthedRequest,
  requireAuth,
} from '../auth.js';
import { getClientIp } from '../utils/clientIp.js';
import { createAbuseLimitMiddleware } from '../utils/abuseLimiter.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  deleteAccountSchema,
  nicknameSchema,
} from '../schemas.js';

export const authRouter = Router();

/**
 * 登录/注册专用限流：5 次/分钟，按 IP 计。
 * 全局 limiter (200/15min) 仍然生效，此为更严格的接口级限制以阻止暴力破解。
 * 测试环境下放宽限制以防集成测试 429。
 */
const authActionLimiter = createAbuseLimitMiddleware({
  scope: 'auth-action',
  windowMs: 60 * 1000,
  maxAttempts: config.nodeEnv === 'test' ? 1000 : 5,
  resolveIdentity: (req) => ({ type: 'ip', value: getClientIp(req) }),
  message: '尝试过于频繁，请 1 分钟后再试。',
});
/**
 * 检查错误是否为 ZodError，是则返回 400 + 第一个 issue 的 message + 完整 issues 列表。
 * 路由 catch 块开头调用，避免 ZodError 被当成普通 Error 返回 500。
 *
 * 返回 true 表示已处理（路由应直接 return）；false 表示非 ZodError，路由继续业务错误处理。
 */
function sendZodError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    res.status(400).json({
      success: false,
      message: firstIssue?.message ?? '入参校验失败',
      zodErrors: err.issues,
    });
    return true;
  }
  return false;
}

authRouter.post('/register', authActionLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body ?? {});
    const { email, password } = parsed;

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.ok) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.createUser(email, passwordHash);

    const deviceId = extractDeviceId(req);
    if (deviceId) await db.bindUserDevice(user.id, deviceId);

    const token = signToken({ userId: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      user: { id: user.id, email: user.email, generation: user.generation },
      message: '注册成功！',
    });
  } catch (err) {
    if (sendZodError(err, res)) return;
    const msg = err instanceof Error ? err.message : '注册失败';
    // 注销后同邮箱可重新注册，不再有 410；仅活跃账号重复注册返回 409
    const status = (msg.includes('已注册') || msg.includes('已被注册')) ? 409 : 500;
    // 500 只回泛化信息，内部异常详情留在服务端日志
    return res.status(status).json({ success: false, message: status >= 500 ? '服务器内部错误' : msg });
  }
});

authRouter.post('/login', authActionLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body ?? {});
    const { email, password } = parsed;

    const user = await db.findUserByEmail(email);
    if (!user) {
      // 统一提示，避免通过响应差异枚举账号是否存在
      return res.status(400).json({ success: false, message: '账号或密码错误' });
    }
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '账号或密码错误' });
    }

    const deviceId = extractDeviceId(req);
    if (deviceId) await db.bindUserDevice(user.id, deviceId);

    const token = signToken({ userId: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    const latestDossier = await db.getLatestDossierSummaryByUserId(user.id);
    const basicInfo = await db.getUserBasicInfo(user.id);
    return res.json({
      success: true,
      user: { id: user.id, email: user.email, generation: user.generation },
      latestDossier,
      basicInfo,
      message: '登录成功！',
    });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTIONS);
  return res.json({ success: true });
});

const basicInfoSchema = z.object({
  nickname: nicknameSchema,
  gender: z.string().trim().max(20, '性别最多 20 字').optional().default(''),
  occupation: z.string().trim().max(50, '职业描述最多 50 字').optional().default(''),
  personaTrait: z.string().trim().max(50, '人前特质最多 50 字').optional().default(''),
  age: z.string().trim().max(10, '年龄格式不正确').optional().default(''),
  maritalStatus: z.string().trim().max(20, '婚姻状态最多 20 字').optional().default(''),
  hasBoyfriend: z.string().trim().max(20, '感情状态最多 20 字').optional().default(''),
  surfaceTrait: z.string().trim().max(2000, '人前特质描述最多 2000 字').optional().default(''),
  innerDesire: z.string().trim().max(2000, '暗面渴望描述最多 2000 字').optional().default(''),
}).strict();

/** 保存第一章基础信息到用户档案（“填写基础信息”解锁任务/数据的依据）。 */
authRouter.post('/basic-info', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const parsed = basicInfoSchema.parse(req.body ?? {});
    await db.upsertUserBasicInfo(req.userId!, parsed);
    return res.json({ success: true, message: '基础信息已保存' });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const latestDossier = await db.getLatestDossierSummaryByUserId(userId);
    const basicInfo = await db.getUserBasicInfo(userId);
    return res.json({
      success: true,
      user: { id: user.id, email: user.email, generation: user.generation },
      latestDossier,
      basicInfo,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 修改密码：验证旧密码 → 写入新密码哈希 → 刷新 tokenInvalidatedAt 使其他设备 token 失效 → 重发 cookie。 */
authRouter.post('/change-password', authActionLimiter, requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const parsed = changePasswordSchema.parse(req.body ?? {});
    const { oldPassword, newPassword } = parsed;

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.ok) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: '新密码不能与旧密码相同' });
    }

    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '账号不存在或已注销' });
    }

    const isMatch = await verifyPassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '旧密码错误' });
    }

    const newHash = await hashPassword(newPassword);
    await db.updateUserPassword(userId, newHash);

    // 当前设备重发新 token，保持登录态；其他设备旧 token 立即失效
    const token = signToken({ userId: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    return res.json({ success: true, message: '密码修改成功，其他设备登录已失效' });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 账号注销（软删除）：禁止登录；同账号名可重新注册为新账号（generation 递增）。 */
authRouter.post('/delete-account', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const parsed = deleteAccountSchema.parse(req.body ?? {});
    const { confirmEmail } = parsed;

    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '账号不存在或已注销' });
    }
    // 二次确认：要求用户输入完整邮箱以匹配
    if (confirmEmail.trim().toLowerCase() !== user.email) {
      return res.status(400).json({ success: false, message: '邮箱确认不匹配，已拒绝注销' });
    }

    await db.softDeleteUser(userId);
    res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTIONS);

    return res.json({ success: true, message: '账号已注销' });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 已登录个人中心：返回昵称/头像/卷宗数/上次诊断时间/注册时间。 */
authRouter.get('/stats', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const stats = await db.getUserStats(userId);
    if (!stats) {
      return res.status(404).json({ success: false, message: '账号不存在或已注销' });
    }
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});
