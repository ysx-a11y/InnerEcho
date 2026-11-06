import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { config } from '../config.js';
import { extractDeviceId, maybeUserId } from '../auth.js';
import { getClientIp } from '../utils/clientIp.js';
import { asyncHandler } from '../http/asyncHandler.js';

export const basicInfoRouter = Router();

/** 设备恢复接口限流：按设备号计（缺失时按 IP），避免遍历设备号批量拉取。 */
const deviceBasicInfoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const deviceId = extractDeviceId(req);
    return deviceId ? `dev:${deviceId}` : getClientIp(req);
  },
  message: { success: false, message: '请求过于频繁，请稍后再试。' },
});

/**
 * 设备维度基础信息恢复：
 * - 已登录：优先返回账号档案（可能比设备卷宗更新）；
 * - 未登录：返回该设备最近一次填写（卷宗 chapter1 文本字段）。
 * 无设备号或没有任何记录时返回 basicInfo: null，前端据此决定是否显示门禁。
 */
basicInfoRouter.get('/basic-info/device', deviceBasicInfoLimiter, asyncHandler(async (req, res) => {
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.json({ success: true, basicInfo: null });
  }
  const userId = await maybeUserId(req);
  if (userId) {
    const profile = await db.getUserBasicInfo(userId);
    if (profile) return res.json({ success: true, basicInfo: profile });
  }
  const basicInfo = await db.getDeviceBasicInfo(deviceId);
  return res.json({ success: true, basicInfo });
}));
