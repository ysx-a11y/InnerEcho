import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { generateInterrogationSummary, runInterrogationTurn } from '../services/interrogationService.js';
import type {
  InterrogationSessionContract,
  InterrogationStateResponse,
} from '../../shared/apiContracts.js';
import type { InterrogationSessionRow } from '../db/repositories/interrogationRepo.js';

export const interrogationRouter = Router();

/** 审讯室只对已登录账号开放：归属只认 user_id，不读取设备指纹。 */
interrogationRouter.use(requireAuth);

const turnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `itr_user:${(req as AuthedRequest).userId ?? 'anon'}`,
  message: { success: false, message: '审讯室请求过于频繁，请稍后再试。' },
});

const messageSchema = z.object({
  message: z.string().trim().min(1, '不能发送空内容').max(2000, '单次陈述不能超过 2000 个字符'),
});

function toSessionContract(row: InterrogationSessionRow): InterrogationSessionContract {
  return {
    id: row.id,
    status: row.status,
    turnCount: row.turn_count,
    summary: row.summary,
    summaryGeneratedAt: row.summary_generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function remainingTurns(row: InterrogationSessionRow | null, maxTurns: number): number {
  const used = row?.turn_count ?? 0;
  return Math.max(0, maxTurns - used);
}

/**
 * GET /api/interrogation/state
 * 进入审讯室时拉取：额度配置、最近一场会话、已发生的对话。
 */
interrogationRouter.get('/state', asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const configRow = db.interrogation.getConfig();
  const sessionRow = db.interrogation.getLatestSession(userId);
  const messages = sessionRow ? db.interrogation.listMessages(sessionRow.id) : [];
  const dossier = await db.getLatestDossierSummaryByUserId(userId);

  const payload: InterrogationStateResponse = {
    success: true,
    config: {
      maxTurns: configRow.maxTurns,
      maxInputTokens: configRow.maxInputTokens,
      maxOutputTokens: configRow.maxOutputTokens,
    },
    session: sessionRow ? toSessionContract(sessionRow) : null,
    messages: messages.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    })),
    remainingTurns: remainingTurns(sessionRow, configRow.maxTurns),
    hasDossier: Boolean(dossier),
  };
  return res.json(payload);
}));

/**
 * POST /api/interrogation/messages
 * 提交一句陈述，换回审讯者的一句追问。到达额度后返回 409，由前端切到「暂未开放」。
 */
interrogationRouter.post('/messages', turnLimiter, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parsed = messageSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '内容格式不正确' });
  }

  const userId = req.userId!;
  const dossier = await db.getLatestDossierSummaryByUserId(userId);
  if (!dossier) {
    return res.status(403).json({
      success: false,
      code: 'no_dossier',
      message: '审讯室只对完成过自白的来访者开放，请先完成一次卷宗。',
    });
  }

  const configRow = db.interrogation.getConfig();
  const session = db.interrogation.getOrCreateSession(userId);
  if (session.status === 'summarized') {
    return res.status(409).json({
      success: false,
      code: 'closed',
      message: '这场审讯已经归档，暂未开放新的审讯。',
      session: toSessionContract(session),
    });
  }
  if (session.status === 'exhausted' || session.turn_count >= configRow.maxTurns) {
    return res.status(409).json({
      success: false,
      code: 'exhausted',
      message: '本次审讯已到对话上限，暂未开放更多对话。',
      session: toSessionContract(session),
    });
  }

  const history = db.interrogation.listMessages(session.id);
  const turn = await runInterrogationTurn({
    dossier,
    history,
    message: parsed.data.message,
    maxInputTokens: configRow.maxInputTokens,
    maxOutputTokens: configRow.maxOutputTokens,
    interrogatorPrompt: configRow.interrogatorPrompt,
  });

  if (!turn.ok) {
    const status = turn.code === 'input_too_long' ? 400 : turn.code === 'llm_not_configured' ? 503 : 502;
    return res.status(status).json({
      success: false,
      code: turn.code,
      message: turn.message,
      session: toSessionContract(session),
    });
  }

  const updated = db.interrogation.appendExchange({
    sessionId: session.id,
    userId,
    userContent: parsed.data.message,
    assistantContent: turn.reply,
    maxTurns: configRow.maxTurns,
  });

  return res.json({
    success: true,
    reply: turn.reply,
    session: toSessionContract(updated),
    remainingTurns: remainingTurns(updated, configRow.maxTurns),
  });
}));

/**
 * POST /api/interrogation/summary
 * 到达对话上限后生成总结（重复调用直接返回已归档的总结）。
 */
interrogationRouter.post('/summary', turnLimiter, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.userId!;
  const configRow = db.interrogation.getConfig();
  const session = db.interrogation.getLatestSession(userId);
  if (!session || session.turn_count === 0) {
    return res.status(400).json({ success: false, code: 'no_session', message: '还没有可总结的审讯记录。' });
  }
  if (session.status === 'active' && session.turn_count < configRow.maxTurns) {
    return res.status(409).json({
      success: false,
      code: 'not_finished',
      message: `本次审讯还有 ${remainingTurns(session, configRow.maxTurns)} 轮对话，结束后才能生成总结。`,
      session: toSessionContract(session),
    });
  }
  if (session.summary) {
    return res.json({ success: true, summary: session.summary, session: toSessionContract(session) });
  }

  const dossier = await db.getLatestDossierSummaryByUserId(userId);
  const messages = db.interrogation.listMessages(session.id);
  const result = await generateInterrogationSummary({
    dossier,
    session,
    messages,
    maxOutputTokens: configRow.maxOutputTokens,
    summaryPrompt: configRow.summaryPrompt,
  });
  const updated = db.interrogation.setSummary(session.id, userId, result.summary);

  return res.json({
    success: true,
    summary: result.summary,
    session: toSessionContract(updated),
    usedFallback: result.usedFallback,
  });
}));
