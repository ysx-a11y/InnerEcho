import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import { extractDeviceId, maybeUserId } from '../auth.js';
import { getClientIp } from '../utils/clientIp.js';
import { asyncHandler } from '../http/asyncHandler.js';

export const mailboxRouter = Router();

const sendMailboxLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const deviceId = extractDeviceId(req);
    return deviceId ? `mail_dev:${deviceId}` : `mail_ip:${getClientIp(req)}`;
  },
  message: { success: false, message: '密信投递过于频繁，请稍后再试。' },
});

const sendMailboxSchema = z.object({
  content: z.string().trim().min(3, '内容至少需要 3 个字符').max(2000, '内容不能超过 2000 个字符'),
  category: z.enum(['suggestion', 'whisper', 'question', 'bug']).optional().default('suggestion'),
  contactInfo: z.string().trim().max(100, '联系方式不能超过 100 个字符').optional(),
  nickname: z.string().trim().max(50, '昵称不能超过 50 个字符').optional(),
});

/**
 * GET /api/mailbox/my
 * 获取当前设备或账号的密信列表与未读红点状态（1v1 私密，仅本人和管理员可见）
 */
mailboxRouter.get('/my', asyncHandler(async (req, res) => {
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.json({ success: true, messages: [], hasUnreadReply: false });
  }

  const userId = await maybeUserId(req);
  const messages = db.mailbox.getMessagesForUser({ deviceId, userId });
  const hasUnreadReply = db.mailbox.hasUnreadReply({ deviceId, userId });

  return res.json({
    success: true,
    messages,
    hasUnreadReply,
  });
}));

/**
 * POST /api/mailbox/send
 * 投递一条新的暗室密信
 */
mailboxRouter.post('/send', sendMailboxLimiter, asyncHandler(async (req, res) => {
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.status(400).json({ success: false, message: '缺少设备指纹' });
  }

  const parsed = sendMailboxSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || '参数校验失败',
    });
  }

  const userId = await maybeUserId(req);
  let effectiveNickname = parsed.data.nickname;

  // 若未指定昵称且已登录，尝试读取用户账号基础信息
  if (!effectiveNickname && userId) {
    const userProfile = await db.getUserBasicInfo(userId);
    if (userProfile?.nickname) {
      effectiveNickname = userProfile.nickname;
    }
  }

  const message = db.mailbox.createMessage({
    deviceId,
    userId,
    nickname: effectiveNickname,
    contactInfo: parsed.data.contactInfo,
    category: parsed.data.category,
    content: parsed.data.content,
  });

  return res.json({
    success: true,
    message,
  });
}));

/**
 * POST /api/mailbox/read
 * 标记所有主理人回复为已读（清除前端红点）
 */
mailboxRouter.post('/read', asyncHandler(async (req, res) => {
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.json({ success: true });
  }

  const userId = await maybeUserId(req);
  db.mailbox.markRepliesAsRead({ deviceId, userId });

  return res.json({ success: true });
}));
