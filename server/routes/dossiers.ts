import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, maybeUserId, extractDeviceId, type AuthedRequest } from '../auth.js';
import { db } from '../db.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { config } from '../config.js';
import { getClientIp } from '../utils/clientIp.js';
import { reanalyzeDossierData } from '../services/analyzeService.js';
import { dossierRowToFullDossierData } from '../services/dossierPayload.js';
import type { ReanalyzeDossierResponse } from '../../shared/apiContracts.js';
import type { LlmAnalysisJson } from '../types.js';

/** 用户侧卷宗路由：列表只回轻量摘要，报告全文按需加载（本人可见）。 */
export const dossiersRouter = Router();

const reanalyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { success: false, message: '重试过于频繁，请稍后再试。' },
});

dossiersRouter.get('/dossiers', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const dossiers = await db.listDossierSummariesByUserId(userId);
  return res.json({ success: true, dossiers });
}));

/**
 * 复测对比：同一账号在同一题库上的「首次 → 最近一次」指标序列。
 * 仅登录用户、仅本人卷宗；只返回称号与数值指标，不返回报告正文、私密原文与内部可信度。
 * GET /api/dossiers/retest/:bankId
 */
dossiersRouter.get('/dossiers/retest/:bankId', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const bankId = String(req.params.bankId || '').trim();
  if (!bankId) {
    return res.status(400).json({ success: false, message: '缺少题库标识' });
  }

  const attempts = await db.listDossierAttemptMetricsForBank(userId, bankId);
  if (attempts.length === 0) {
    return res.status(404).json({ success: false, message: '该题库暂无作答记录' });
  }

  const names = await db.resolveBankNames([bankId]);
  return res.json({
    success: true,
    bankId,
    bankTitle: names[bankId] ?? null,
    attempts,
  });
}));

dossiersRouter.get('/dossiers/:id', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const id = String(req.params.id);
  const dossier = await db.getDossierByIdForUser(id, req.userId!);
  if (!dossier) {
    return res.status(404).json({ success: false, message: '卷宗不存在' });
  }
  return res.json({ success: true, dossier });
}));

/**
 * 🪞 镜像契合印记与暗面自白反馈
 * 允许用户/访客在测算结果页标记对报告的认同程度及手写私密自白
 */
dossiersRouter.post('/dossiers/:id/resonance', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const { resonanceLevel, resonanceText } = req.body || {};
  if (!['exact', 'partial', 'guarded', 'custom'].includes(resonanceLevel)) {
    return res.status(400).json({ success: false, message: '无效的共鸣等级' });
  }
  const cleanText = typeof resonanceText === 'string' ? resonanceText.slice(0, 1000).trim() : null;
  const userId = await maybeUserId(req);
  const deviceId = extractDeviceId(req);

  if (!userId && !deviceId) {
    return res.status(400).json({ success: false, message: '缺少设备标识，请刷新重试' });
  }

  const ok = await db.updateDossierResonance(id, resonanceLevel, cleanText, userId, deviceId);
  if (!ok) {
    return res.status(404).json({ success: false, message: '卷宗未找到或无权操作' });
  }
  return res.json({
    success: true,
    resonanceLevel,
    resonanceText: cleanText,
    message: '暗面共鸣已印记',
  });
}));

/**
 * 🔁 用户自助重跑 LLM 深度诊断（不新增卷宗，覆盖原诊断结果）。
 *
 * 仅用于「LLM 返回明显错误默认值」时的一次手动重试：
 * - 只允许卷宗归属者本人（登录账号或同设备匿名卷宗）调用；
 * - 重跑仍失败/仍异常时保留原诊断结果，不做覆盖，交由前端引导用户反馈。
 */
dossiersRouter.post('/dossiers/:id/reanalyze', reanalyzeLimiter, asyncHandler(async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(400).json({ success: false, message: '缺少卷宗标识' });
  }

  const userId = await maybeUserId(req);
  const deviceId = extractDeviceId(req);
  if (!userId && !deviceId) {
    return res.status(400).json({ success: false, message: '缺少设备标识，请刷新后重试' });
  }

  const row = await db.getOwnedDossierRow(id, { userId, deviceId });
  if (!row) {
    return res.status(404).json({ success: false, message: '卷宗未找到或无权操作' });
  }

  const result = await reanalyzeDossierData(dossierRowToFullDossierData(row));
  if (result.isFallback) {
    const failed: ReanalyzeDossierResponse<LlmAnalysisJson> = {
      success: false,
      llmFailed: true,
      message: result.error ?? 'AI 深度诊断暂时不可用，请稍后再试',
    };
    return res.json(failed);
  }

  const saved = await db.updateDossierDiagnosticForOwner(id, result.data, { userId, deviceId });
  if (!saved) {
    return res.status(404).json({ success: false, message: '卷宗未找到或无权操作' });
  }

  const ok: ReanalyzeDossierResponse<LlmAnalysisJson> = { success: true, data: result.data };
  return res.json(ok);
}));
