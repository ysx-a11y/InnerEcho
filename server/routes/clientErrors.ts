import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import { extractDeviceId, maybeUserId } from '../auth.js';
import { getClientIp } from '../utils/clientIp.js';

export const clientErrorsRouter = Router();

const clientErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { success: false, message: '请求过于频繁，请稍后再试。' },
});

const clientErrorSchema = z.object({
  message: z.string().max(1000).optional().default(''),
  stack: z.string().max(8000).optional().default(''),
  url: z.string().max(500).optional().default(''),
  view: z.string().max(100).optional().default(''),
}).strict();

/** 前端运行时错误上报：配合 ErrorBoundary / window.onerror，崩溃可留痕不再静默。 */
clientErrorsRouter.post('/client-error', clientErrorLimiter, async (req, res) => {
  const parsed = clientErrorSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: '入参校验失败' });
  }
  const { message, stack, url, view } = parsed.data;
  try {
    await db.logApiError({
      endpoint: `/client-error${view ? ` (${view})` : ''}`,
      errorMessage: `${message}\nURL: ${url}`.slice(0, 2000),
      stackTrace: stack.slice(0, 8000),
      payload: JSON.stringify({ url, view }),
      deviceId: extractDeviceId(req) ?? null,
      userId: (await maybeUserId(req)) ?? null,
      ipAddress: getClientIp(req),
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});
