import { Router, type Response } from 'express';
import { ZodError } from 'zod';
import { db } from '../db.js';
import {
  requireAuth,
  maybeUserId,
  extractDeviceId,
  type AuthedRequest,
} from '../auth.js';
import {
  createBankSchema,
  updateBankSchema,
} from '../schemas.js';
import type { BankCompletionEntryContract } from '../../shared/apiContracts.js';
import type { UserBankSummary, UserBankRecord } from '../types.js';

export const banksRouter = Router();

/**
 * 复用 auth 路由的 Zod 错误处理：返回 400 + 第一个 issue 的 message + 完整 zodErrors。
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

/**
 * 列出当前登录用户的所有题库（草稿 + 已发布）。
 * GET /api/banks
 */
banksRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const banks = await db.getUserBanks(userId);
    return res.json({ success: true, banks });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 公开端点：列出所有审核通过且已发布的社区/用户自建题库（供题库选择器展示）。
 * GET /api/banks/public
 */
banksRouter.get('/public', async (_req, res) => {
  try {
    const banks = await db.getPublishedUserBanks();
    // 与 /public/:id 一致：公开列表剥离创建者内部 userId，避免泄露内部标识符
    const publicBanks = banks.map(({ userId: _userId, ...rest }) => rest);
    return res.json({ success: true, banks: publicBanks });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 公开端点：已发布的题库可被任意人加载（用于答题流程 loadQuestionBankById）。
 * 不需要 requireAuth，便于未来支持分享链接场景。
 * 注意：必须在 /:id 路由之前注册，否则会被 /:id 拦截到 requireAuth。
 * GET /api/banks/public/:id
 */
banksRouter.get('/public/:id', async (req, res) => {
  try {
    const bank = await db.getPublishedUserBankById(req.params.id);
    if (!bank) {
      return res.status(404).json({ success: false, message: '题库不存在或未发布' });
    }
    // 公开端点剥离创建者 userId，避免泄露内部标识符
    const { userId: _userId, ...publicBank } = bank;
    return res.json({ success: true, bank: publicBank });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 题库完成情况（题库选择页「已完成 / 未完成」标记）：
 * 登录用户按账号聚合，匿名访客按设备标识聚合（只统计匿名卷宗）。
 * 只返回题库 ID、次数与首末时间，不返回报告正文或私密原文。
 * 注意：必须在 /:id 之前注册，否则会被带 requireAuth 的单题库路由拦截。
 * GET /api/banks/completion
 */
banksRouter.get('/completion', async (req, res) => {
  try {
    const userId = await maybeUserId(req);
    const deviceId = extractDeviceId(req);
    if (!userId && !deviceId) {
      return res.json({ success: true, completions: [] });
    }

    const rows = await db.listDossierCompletionRows(userId ? { userId } : { deviceId });
    const completions = new Map<string, BankCompletionEntryContract>();
    for (const row of rows) {
      for (const bankId of row.bankIds) {
        const existing = completions.get(bankId);
        if (!existing) {
          completions.set(bankId, {
            bankId,
            count: 1,
            firstAt: row.createdAt,
            lastAt: row.createdAt,
            lastDossierId: row.id,
          });
          continue;
        }
        // 仓储按 created_at 升序返回，直接覆盖即为最新一次。
        existing.count += 1;
        existing.lastAt = row.createdAt;
        existing.lastDossierId = row.id;
      }
    }
    return res.json({ success: true, completions: Array.from(completions.values()) });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 获取单个题库的完整记录（含 questions）。
 * GET /api/banks/:id
 */
banksRouter.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const bankId = String(req.params.id);
    const bank = await db.getUserBankById(bankId, userId);
    if (!bank) {
      return res.status(404).json({ success: false, message: '题库不存在或无权访问' });
    }
    return res.json({ success: true, bank });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 创建题库（默认草稿态）。
 * POST /api/banks
 */
banksRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const parsed = createBankSchema.parse(req.body ?? {});
    const result = await db.createUserBank({
      userId,
      title: parsed.title,
      subtitle: parsed.subtitle,
      description: parsed.description,
      category: parsed.category,
      badgeColor: parsed.badgeColor,
      estimatedMinutes: parsed.estimatedMinutes,
      questions: parsed.questions,
      isPublished: parsed.isPublished,
    });
    const bank = await db.getUserBankById(result.id, userId);
    if (!bank) {
      return res.status(500).json({ success: false, message: '题库已创建但读取失败，请刷新列表' });
    }
    return res.status(201).json({ success: true, bank });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 更新题库字段（部分更新）。可单字段更新，也可整体替换 questions。
 * PUT /api/banks/:id
 */
banksRouter.put('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const bankId = String(req.params.id);
    const parsed = updateBankSchema.parse(req.body ?? {});
    // updateUserBank 已通过 WHERE id=? AND user_id=? 校验归属，
    // 并返回是否实际命中行（空 patch 时也校验存在性）
    const updated = await db.updateUserBank(bankId, userId, parsed);
    if (!updated) {
      return res.status(404).json({ success: false, message: '题库不存在或无权访问' });
    }
    const bank = await db.getUserBankById(bankId, userId);
    return res.json({ success: true, bank });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 删除题库（草稿和已发布都可删）。
 * DELETE /api/banks/:id
 */
banksRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const bankId = String(req.params.id);
    const ok = await db.deleteUserBank(bankId, userId);
    if (!ok) {
      return res.status(404).json({ success: false, message: '题库不存在或无权访问' });
    }
    return res.json({ success: true, message: '题库已删除' });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// Type re-exports for downstream typing convenience.
export type { UserBankSummary, UserBankRecord };
