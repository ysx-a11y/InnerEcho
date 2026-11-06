import { Router } from 'express';
import { z } from 'zod';
import { extractDeviceId } from '../auth.js';
import { db } from '../db.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { isBotUserAgent } from '../utils/botDetection.js';

/**
 * 轻量用户事件埋点（如导出角色卡）。
 * 只接受白名单事件类型，不落 IP / 内容正文；无设备标识或爬虫 UA 时静默忽略。
 */
export const eventsRouter = Router();

const eventTypes = ['export_card'] as const;

const eventSchema = z.object({
  event: z.enum(eventTypes),
  dossierId: z.string().max(64).optional(),
}).strict();

eventsRouter.post('/events', asyncHandler(async (req, res) => {
  const parsed = eventSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: '入参校验失败' });
  }
  // 爬虫/无头浏览器不上报事件，避免污染行为统计（与访问埋点口径一致）
  if (isBotUserAgent(req.headers['user-agent'])) {
    return res.json({ success: true, recorded: false, reason: 'bot' });
  }
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.json({ success: true, recorded: false });
  }
  await db.recordEvent(deviceId, parsed.data.event, parsed.data.dossierId ?? '');
  return res.json({ success: true, recorded: true });
}));
