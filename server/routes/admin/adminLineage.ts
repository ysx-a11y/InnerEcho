import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';

export const adminLineageRouter = Router();

/** 查询指定血缘族谱及世代列表 */
adminLineageRouter.get('/:lineageId', (req: Request, res: Response) => {
  const lineageId = Array.isArray(req.params.lineageId) ? req.params.lineageId[0] : req.params.lineageId;
  const lineage = db.users.getAccountLineage(lineageId);
  if (!lineage) {
    res.status(404).json({ success: false, message: '未找到指定账号血缘档案' });
    return;
  }
  const generations = db.users.getLineageGenerations(lineageId);
  res.json({
    success: true,
    lineage,
    generations: generations.map((u) => ({
      id: u.id,
      email: u.email,
      generation: u.generation,
      accountStatus: u.account_status ?? (u.deleted_at ? 'deleted' : 'active'),
      createdAt: u.created_at,
      deletedAt: u.deleted_at,
      adminNotes: u.admin_notes ?? null,
      remark: u.remark ?? null,
    })),
  });
});

/** 按邮箱查询血缘 */
adminLineageRouter.get('/by-email/:email', (req: Request, res: Response) => {
  const email = Array.isArray(req.params.email) ? req.params.email[0] : req.params.email;
  const lineage = db.users.getAccountLineageByRootKey(email);
  if (!lineage) {
    res.status(404).json({ success: false, message: '该邮箱暂无血缘记录' });
    return;
  }
  const generations = db.users.getLineageGenerations(lineage.id);
  res.json({
    success: true,
    lineage,
    generations: generations.map((u) => ({
      id: u.id,
      email: u.email,
      generation: u.generation,
      accountStatus: u.account_status ?? (u.deleted_at ? 'deleted' : 'active'),
      createdAt: u.created_at,
      deletedAt: u.deleted_at,
      adminNotes: u.admin_notes ?? null,
      remark: u.remark ?? null,
    })),
  });
});

const updateLineageRiskSchema = z.object({
  riskLevel: z.enum(['normal', 'low', 'medium', 'high', 'blocked']).optional(),
  isBlocked: z.number().int().min(0).max(1).optional(),
  adminNotes: z.string().max(1000).optional(),
  remark: z.string().max(500).optional(),
});

/** 调整血缘风控等级、硬封禁状态及运营私密批注 */
adminLineageRouter.put('/:lineageId/risk', (req: Request, res: Response) => {
  const lineageId = Array.isArray(req.params.lineageId) ? req.params.lineageId[0] : req.params.lineageId;
  const parseResult = updateLineageRiskSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, message: '参数格式错误', errors: parseResult.error.format() });
    return;
  }
  const success = db.users.updateLineageRisk(lineageId, parseResult.data);
  if (!success) {
    res.status(404).json({ success: false, message: '未找到指定账号血缘或更新无变化' });
    return;
  }
  const updated = db.users.getAccountLineage(lineageId);
  res.json({ success: true, lineage: updated });
});
