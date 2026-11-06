import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { getClientIp } from '../utils/clientIp.js';
import { config } from '../config.js';
import type { GlobalStatsContract, GlobalStatsResponse } from '../../shared/apiContracts.js';

export const statsRouter = Router();

const statsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { success: false, message: '请求过于频繁，请稍后再试。' },
});

let cachedStats: GlobalStatsContract | null = null;
let cachedTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 秒内存缓存

/**
 * 获取全网公开模糊化统计大盘数据：
 * - 仅输出脱敏与阶梯模糊化指标
 * - 绝不返回任何用户自白文本、内部可信度评分或未脱敏数据
 */
statsRouter.get('/global', statsLimiter, asyncHandler(async (_req, res) => {
  const now = Date.now();
  if (cachedStats && now - cachedTimestamp < CACHE_TTL_MS && config.nodeEnv !== 'test') {
    const response: GlobalStatsResponse = {
      success: true,
      stats: cachedStats,
    };
    return res.json(response);
  }

  const freshStats = await db.getGlobalPublicStats();
  cachedStats = freshStats;
  cachedTimestamp = now;

  const response: GlobalStatsResponse = {
    success: true,
    stats: freshStats,
  };
  return res.json(response);
}));
