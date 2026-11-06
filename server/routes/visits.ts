import { Router } from 'express';
import { z } from 'zod';
import { extractDeviceId } from '../auth.js';
import { db } from '../db.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { isBotUserAgent } from '../utils/botDetection.js';
import { normalizeReferrerHost } from '../utils/referrer.js';
import { classifyClientRegion } from '../utils/ipRegion.js';
import { getClientIp } from '../utils/clientIp.js';

export const visitsRouter = Router();

const visitSchema = z.object({
  path: z.string().max(200).optional().default('/'),
  referrer: z.string().max(500).optional(),
}).strict();

/**
 * 轻量访问埋点：前端页面加载后上报一次。
 * 无设备标识时静默忽略（recordVisit 内部同样兜底），不影响主流程。
 */
visitsRouter.post('/visit', asyncHandler(async (req, res) => {
  const parsed = visitSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: '入参校验失败' });
  }
  // 爬虫/无头浏览器不上报访问：避免搜索引擎渲染抓取污染 PV 统计
  if (isBotUserAgent(req.headers['user-agent'])) {
    return res.json({ success: true, recorded: false, reason: 'bot' });
  }
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.json({ success: true, recorded: false });
  }
  // 海外/代理出口记为 OVERSEAS 而非空串，否则这些访问会在地区卡片里凭空消失。
  const region = await classifyClientRegion(getClientIp(req));
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
  const secFetchSite = typeof req.headers['sec-fetch-site'] === 'string' ? req.headers['sec-fetch-site'] : '';
  await db.recordVisit(deviceId, parsed.data.path, normalizeReferrerHost(parsed.data.referrer), region.code, userAgent, secFetchSite);
  return res.json({ success: true, recorded: true });
}));
