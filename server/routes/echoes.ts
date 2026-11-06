import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { extractDeviceId, maybeUserId } from '../auth.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { getClientIp } from '../utils/clientIp.js';
import { config } from '../config.js';
import type { EchoListResponse, CreateEchoResponse, ResonateEchoResponse } from '../../shared/apiContracts.js';

export const echoesRouter = Router();

const echoActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { success: false, message: '请求过于频繁，请稍后再试。' },
});

const createEchoSchema = z.object({
  surfaceRole: z.string().trim().min(2, '人前面具/职业至少2个字符').max(50, '职业描述最多50字符'),
  shadowDesire: z.string().trim().min(10, '暗面心声自白至少10个字符').max(200, '心声自白最多200字符'),
  shadowTag: z.string().trim().min(2, '请选择所属阴影标签').max(20),
}).strict();

/** 基础 PII 与广告敏感词过滤 */
function checkPiiAndSpam(text: string): string | null {
  // 手机号检测
  if (/1[3-9]\d{9}/.test(text)) {
    return '为保护您的绝对私密与安全，心声中严禁包含真实手机号码';
  }
  // 微信/QQ等联系方式检测
  if (/(?:wx|v信|微信|vx|qq|扣扣|vx号|加我)[:：\s]*[a-zA-Z0-9_-]{5,}/i.test(text)) {
    return '为保证回响池纯粹与安全，心声中严禁包含任何社交账号';
  }
  // 网址链接检测
  if (/https?:\/\/|[a-zA-Z0-9.-]+\.(?:com|cn|net|org|xyz|top|me)/i.test(text)) {
    return '心声中严禁包含外部链接';
  }
  return null;
}

/**
 * 获取公开回响列表（仅已审核通过的内容 + 当前设备待审核的内容）。
 */
echoesRouter.get('/', asyncHandler(async (req, res) => {
  const deviceId = extractDeviceId(req) ?? null;
  const userId = await maybeUserId(req);
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) || 30 : 30;
  const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) || 0 : 0;

  const [{ items, hasMore }, myPendingEchoes] = await Promise.all([
    db.listApprovedEchoes(deviceId, tag, limit, offset, userId),
    deviceId ? db.listMyPendingEchoes(deviceId, userId) : Promise.resolve([]),
  ]);

  const response: EchoListResponse = {
    success: true,
    items,
    myPendingEchoes: myPendingEchoes.length > 0 ? myPendingEchoes : undefined,
    hasMore,
  };
  return res.json(response);
}));

/**
 * 投掷一条新心声（默认 pending 审核态）。
 */
echoesRouter.post('/', echoActionLimiter, asyncHandler(async (req, res) => {
  const parsed = createEchoSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? '入参校验失败';
    return res.status(400).json({ success: false, message: errorMsg });
  }

  const { surfaceRole, shadowDesire, shadowTag } = parsed.data;

  // PII 安全拦截
  const combined = `${surfaceRole} ${shadowDesire}`;
  const piiError = checkPiiAndSpam(combined);
  if (piiError) {
    return res.status(400).json({ success: false, message: piiError });
  }

  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.status(400).json({ success: false, message: '缺少设备标识，请刷新后重试' });
  }

  const userId = await maybeUserId(req);

  try {
    const createdEcho = await db.createEchoWhisper({
      deviceId,
      userId,
      surfaceRole,
      shadowDesire,
      shadowTag,
    });

    const response: CreateEchoResponse = {
      success: true,
      echo: createdEcho,
      message: '心声已投入暗夜回响池。',
    };
    return res.status(201).json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '投掷失败，请稍后重试';
    return res.status(429).json({ success: false, message: msg });
  }
}));

/**
 * 点亮共鸣微光 (+1)。
 */
echoesRouter.post('/:id/resonate', echoActionLimiter, asyncHandler(async (req, res) => {
  const echoId = String(req.params.id);
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.status(400).json({ success: false, message: '缺少设备标识' });
  }

  const userId = await maybeUserId(req);
  const result = await db.resonateEchoWhisper(echoId, deviceId, userId);

  const response: ResonateEchoResponse = {
    success: true,
    echoCount: result.echoCount,
    fuzzedEchoes: result.fuzzedEchoes,
    isResonated: result.isResonated,
  };
  return res.json(response);
}));

/**
 * 作者撤回/删除心声。
 */
echoesRouter.delete('/:id', echoActionLimiter, asyncHandler(async (req, res) => {
  const echoId = String(req.params.id);
  const deviceId = extractDeviceId(req);
  if (!deviceId) {
    return res.status(400).json({ success: false, message: '缺少设备标识' });
  }

  const userId = await maybeUserId(req);
  await db.deleteEchoWhisper(echoId, deviceId, userId);

  return res.json({ success: true, message: '心声已撤回' });
}));
