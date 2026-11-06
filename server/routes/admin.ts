import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { config } from '../config.js';
import { db } from '../db.js';
import { getClientIp } from '../utils/clientIp.js';
import { createAbuseLimitMiddleware } from '../utils/abuseLimiter.js';
import { adminSecurityAuditMiddleware } from '../utils/securityAudit.js';
import { reanalyzeDossierData } from '../services/analyzeService.js';
import { dossierRowToFullDossierData } from '../services/dossierPayload.js';
import { createBankSchema, updateBankSchema, adminBankListQuerySchema } from '../schemas.js';
import { adminDictRouter } from './admin/adminDict.js';
import { adminLineageRouter } from './admin/adminLineage.js';

export const adminRouter = Router();
adminRouter.use(adminSecurityAuditMiddleware);

/** 登录探针保持严格限流，业务接口使用独立额度，避免正常管理操作被误伤。 */
const adminLoginLimiter = createAbuseLimitMiddleware({
  scope: 'admin-verify',
  windowMs: 60 * 1000,
  maxAttempts: config.nodeEnv === 'test' ? 1000 : 10,
  resolveIdentity: (req) => ({ type: 'ip', value: getClientIp(req) }),
  message: '尝试过于频繁，请稍后再试。',
});

const adminActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: { success: false, message: '尝试过于频繁，请稍后再试。' },
});

/** Admin auth via x-admin-token header (compared with constant-time check). */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-admin-token'];
  if (typeof token !== 'string' || token.length === 0) {
    res.status(401).json({ success: false, message: 'admin token required' });
    return;
  }
  const expected = config.adminToken;
  if (token.length !== expected.length || !timingSafeEqual(token, expected)) {
    res.status(403).json({ success: false, message: 'invalid admin token' });
    return;
  }
  next();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** 口令校验探针：仅验证 x-admin-token 是否有效，供管理端登录页使用。 */
adminRouter.post('/verify', adminLoginLimiter, requireAdmin, (_req, res) => {
  res.json({ success: true, message: 'admin token valid' });
});

// 动态数据字典与有限状态机
adminRouter.use('/dict', adminActionLimiter, requireAdmin, adminDictRouter);
// 账号血缘、跨世代族谱与风控
adminRouter.use('/users/lineage', adminActionLimiter, requireAdmin, adminLineageRouter);

const dossierListQuerySchema = z.object({
  search: z.string().max(100).optional().default(''),
  depth: z.enum(['light', 'medium', 'deep', 'all']).optional().default('all'),
  credibility: z.enum(['high', 'medium', 'low', 'all']).optional().default('all'),
  status: z.enum(['pending', 'approved', 'flagged', 'all']).optional().default('all'),
  sort: z.enum(['submitTime', 'credibilityScore', 'durationSeconds']).optional().default('submitTime'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).strict();

const userListQuerySchema = z.object({
  search: z.string().max(100).optional().default(''),
  hasDossier: z.enum(['all', 'yes', 'no']).optional().default('all'),
  status: z.enum(['all', 'active', 'deleted']).optional().default('all'),
  sort: z.enum(['createdAt', 'lastLoginAt', 'dossierCount', 'userBankCount', 'taskCount', 'echoCount']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).strict();

const dossierPatchSchema = z.object({
  auditStatus: z.enum(['pending', 'approved', 'flagged']).optional(),
  adminNotes: z.string().max(2000).optional(),
}).strict().refine(
  (d) => d.auditStatus !== undefined || d.adminNotes !== undefined,
  { message: '至少提供一个更新字段（auditStatus / adminNotes）' }
);

const batchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
}).strict();

const promptTemplateCreateSchema = z.object({
  name: z.string().trim().min(1, '模板名称不能为空').max(80),
  description: z.string().trim().max(300).optional().default(''),
  content: z.string().trim().min(100, '提示词至少需要 100 个字符').max(30_000),
  categories: z.array(z.string()).optional().default([]),
  activate: z.boolean().optional().default(false),
}).strict();

const promptTemplatePatchSchema = z.object({
  name: z.string().trim().min(1, '模板名称不能为空').max(80).optional(),
  description: z.string().trim().max(300).optional(),
  content: z.string().trim().min(100, '提示词至少需要 100 个字符').max(30_000).optional(),
  categories: z.array(z.string()).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: '至少提供一个要更新的字段' }
);

const PROMPT_CATEGORY_LABELS: Record<string, string> = {
  all: '通用全部',
  scenario: '情境切片',
  direct: '真实自白',
  preference: '权责谱系',
  scientific: '心相镜像',
};

const taskListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.enum(['all', 'accepted', 'completed', 'abandoned']).optional(),
  category: z.string().max(50).optional(),
}).strict();

const adminSpecialEvaluationQuerySchema = z.object({
  taskType: z.string().max(50).optional().default('price_tag'),
  search: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['price', 'createdAt', 'updatedAt']).optional().default('price'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).strict();

const securityEventQuerySchema = z.object({
  eventType: z.string().trim().min(1).max(100).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).strict();

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

const overviewQuerySchema = z.object({
  range: z.enum(['today', 'yesterday', 'week', 'month', 'quarter', 'year', 'custom']).optional().default('today'),
  customDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD').optional(),
}).strict();

/** 管理后台总览（今日/累计指标 + 近 7 天趋势 + 最近提交）。 */
adminRouter.get('/overview', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = overviewQuerySchema.parse(req.query ?? {});
    const overview = await db.getAdminOverview(parsed.range, parsed.customDate);
    res.json({ success: true, overview });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 获取待审核红点与角标数量（题库待审核 + 回响待审核）。 */
adminRouter.get('/pending-counts', adminActionLimiter, requireAdmin, async (_req, res) => {
  try {
    const pendingCounts = await db.getPendingAuditCounts();
    const mailbox = db.mailbox.countPending();
    res.json({ success: true, pendingCounts: { ...pendingCounts, mailbox } });
  } catch {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 报告提示词模板列表；只返回模板内容，不返回任何 LLM 密钥或供应商配置。 */
adminRouter.get('/prompt-templates', adminActionLimiter, requireAdmin, async (_req, res) => {
  try {
    const items = await db.listPromptTemplates();
    res.json({ success: true, items, activeId: items.find((item) => item.isActive)?.id ?? null });
  } catch {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

adminRouter.post('/prompt-templates', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = promptTemplateCreateSchema.parse(req.body ?? {});
    if (parsed.activate && parsed.categories.length === 0) {
      return res.status(409).json({ success: false, message: '未绑定分类的模板不能启用，请先选择至少一个应用分类。' });
    }
    let template = await db.createPromptTemplate(parsed);
    if (parsed.activate) {
      template = (await db.activatePromptTemplate(template.id)) ?? template;
    }
    res.status(201).json({ success: true, template });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

adminRouter.patch('/prompt-templates/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = promptTemplatePatchSchema.parse(req.body ?? {});
    const id = String(req.params.id);
    const existing = await db.getPromptTemplateById(id);
    if (!existing) return res.status(404).json({ success: false, message: '提示词模板不存在' });

    // 生效中的模板不允许直接占用其他生效模板已覆盖的分类，避免静默重叠
    if (existing.isActive && parsed.categories !== undefined) {
      if (parsed.categories.length === 0) {
        return res.status(409).json({ success: false, message: '生效中的模板必须至少绑定一个分类，不能清空为未绑定状态。' });
      }
      const conflicts = await db.getPromptCategoryConflicts(id, parsed.categories);
      if (conflicts.length > 0) {
        const detail = conflicts
          .map((c) => `「${PROMPT_CATEGORY_LABELS[c.category] ?? c.category}」已由生效模板「${c.conflictingTemplateName}」覆盖`)
          .join('、');
        return res.status(409).json({
          success: false,
          message: `保存失败：${detail}。请先调整该分类在其他生效模板上的绑定。`,
        });
      }
    }

    const template = await db.updatePromptTemplate(id, parsed);
    if (!template) return res.status(404).json({ success: false, message: '提示词模板不存在' });
    return res.json({ success: true, template });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

adminRouter.post('/prompt-templates/:id/activate', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const existing = await db.getPromptTemplateById(id);
    if (!existing) return res.status(404).json({ success: false, message: '提示词模板不存在' });
    if (existing.categories.length === 0) {
      return res.status(409).json({ success: false, message: '未绑定分类的模板不能启用，请先选择至少一个应用分类。' });
    }
    const template = await db.activatePromptTemplate(id);
    if (!template) return res.status(404).json({ success: false, message: '提示词模板不存在' });
    return res.json({ success: true, template });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

adminRouter.delete('/prompt-templates/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const result = await db.deletePromptTemplate(String(req.params.id));
    if (result === 'not_found') return res.status(404).json({ success: false, message: '提示词模板不存在' });
    if (result === 'active') return res.status(409).json({ success: false, message: '当前生效模板不能删除，请先切换模板' });
    if (result === 'builtin') return res.status(409).json({ success: false, message: '内置模板不能删除' });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台用户管理列表（支持未填卷/已填卷过滤、多维贡献统计）。 */
adminRouter.get('/users', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = userListQuerySchema.parse(req.query ?? {});
    const result = await db.listAdminUsers(parsed);
    res.json({ success: true, ...result });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 用户完整详情画像（名下卷宗、设备、自建题库、任务与回响）。 */
adminRouter.get('/users/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const details = await db.getAdminUserDetails(id);
    if (!details) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    return res.json({ success: true, details });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 软删除/注销用户。 */
adminRouter.delete('/users/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const ok = await db.deleteAdminUser(id);
    return res.json({ success: true, deleted: ok });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台卷宗列表（搜索/筛选/排序/分页）。 */
adminRouter.get('/dossiers', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = dossierListQuerySchema.parse(req.query ?? {});
    const result = await db.listAdminDossiers(parsed);
    res.json({ success: true, ...result });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 批量物理删除卷宗。 */
adminRouter.delete('/dossiers', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = batchDeleteSchema.parse(req.body ?? {});
    const deleted = await db.batchDeleteDossiers(parsed.ids);
    res.json({ success: true, deleted });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 单个卷宗详情（含解密自白与诊断）。 */
adminRouter.get('/dossiers/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const dossier = await db.getAdminDossierById(id);
    if (!dossier) {
      return res.status(404).json({ success: false, message: '卷宗不存在' });
    }
    return res.json({ success: true, dossier });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 更新卷宗审核状态/管理员备注。 */
adminRouter.patch('/dossiers/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = dossierPatchSchema.parse(req.body ?? {});
    const id = String(req.params.id);
    const ok = await db.updateDossierAdmin(id, parsed);
    if (!ok) {
      return res.status(404).json({ success: false, message: '卷宗不存在' });
    }
    const dossier = await db.getAdminDossierById(id);
    return res.json({ success: true, dossier });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 物理删除单个卷宗。 */
adminRouter.delete('/dossiers/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const ok = await db.deleteDossierById(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: '卷宗不存在' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 重新评估单个卷宗（重跑 LLM 并覆盖诊断结果，不新增记录）。 */
adminRouter.post('/dossiers/:id/reanalyze', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const row = await db.getDossierRowById(id);
    if (!row) {
      return res.status(404).json({ success: false, message: '卷宗不存在' });
    }
    const result = await reanalyzeDossierData(dossierRowToFullDossierData(row));
    await db.updateDossierDiagnostic(row.id, result.data);
    return res.json({ success: true, data: result.data, isFallback: result.isFallback, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台遥测（题库聚合 + 高频犹豫题 + 时段分布）。 */
adminRouter.get('/telemetry', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = overviewQuerySchema.parse(req.query ?? {});
    const telemetry = await db.getAdminTelemetry(parsed.range, parsed.customDate);
    res.json({ success: true, telemetry });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

adminRouter.get('/stats', adminActionLimiter, requireAdmin, async (_req, res) => {
  try {
    const stats = await db.getOccupationStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

adminRouter.get('/error-logs', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    // 非法 / 负数 / 非整数的 limit 一律回退默认 100，防止 NaN 或越界值进入 SQL
    const rawLimit = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(rawLimit) && Number.isInteger(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, 500)
      : 100;
    const logs = await db.getErrorLogs(limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理端安全事件；仅返回审计元数据及当前保留区间的哈希链校验结果。 */
adminRouter.get('/security-events', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = securityEventQuerySchema.parse(req.query ?? {});
    const result = await db.listSecurityEvents(parsed);
    const events = result.items.map((row) => {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
      } catch {
        metadata = { invalid: true };
      }
      return {
        sequence: row.sequence,
        id: row.id,
        eventType: row.event_type,
        severity: row.severity,
        requestId: row.request_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        method: row.method,
        route: row.route,
        statusCode: row.status_code,
        targetType: row.target_type,
        targetId: row.target_id,
        responseBytes: row.response_bytes,
        metadata,
        createdAt: row.created_at,
      };
    });
    return res.json({ success: true, events, total: result.total, chainValid: result.chainValid });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

adminRouter.get('/tasks', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = taskListQuerySchema.parse(req.query ?? {});
    const result = await db.listAdminTasks(parsed);
    res.json({ success: true, ...result });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：全网特殊自评任务列表与天梯排位 */
adminRouter.get('/tasks/special-evaluations', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = adminSpecialEvaluationQuerySchema.parse(req.query ?? {});
    const result = await db.listAdminSpecialEvaluations(parsed);
    res.json({ success: true, ...result });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：题库列表（含统计与多维度筛选）。 */
adminRouter.get('/banks', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = adminBankListQuerySchema.parse(req.query ?? {});
    const result = await db.listAdminBanks(parsed);
    res.json({ success: true, ...result });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：单个题库详情（含完整题目列表）。 */
adminRouter.get('/banks/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const bank = await db.getAdminBankById(id);
    if (!bank) {
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    return res.json({ success: true, bank });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：创建新题库。 */
adminRouter.post('/banks', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = createBankSchema.parse(req.body ?? {});
    const bank = await db.createAdminBank({
      ...parsed,
      userId: 'system_admin',
    });
    res.status(201).json({ success: true, bank });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：更新题库属性及题目列表。 */
adminRouter.patch('/banks/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = updateBankSchema.parse(req.body ?? {});
    const id = String(req.params.id);
    const result = await db.updateAdminBank(id, parsed);
    if (result.status === 'preset') {
      return res.status(409).json({ success: false, message: '内置预设题库受系统保护，请先创建副本再进行修改' });
    }
    if (result.status === 'not_found' || !result.bank) {
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    return res.json({ success: true, bank: result.bank });
  } catch (err) {
    if (sendZodError(err, res)) return;
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：切换题库发布/下架状态。 */
adminRouter.post('/banks/:id/toggle-publish', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const result = await db.toggleAdminBankPublish(id);
    if (result.status === 'preset') {
      return res.status(409).json({ success: false, message: '内置预设题库默认处于发布状态' });
    }
    if (result.status === 'not_found' || !result.bank) {
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    return res.json({ success: true, bank: result.bank });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：审核通过题库（公开上线）。 */
adminRouter.post('/banks/:id/approve', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const result = await db.setAdminBankAuditStatus(id, 'approved');
    if (result.status === 'preset') {
      return res.status(409).json({ success: false, message: '内置预设题库无需审核' });
    }
    if (result.status === 'not_found' || !result.bank) {
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    return res.json({ success: true, bank: result.bank, message: '题库已通过审核并公开' });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：驳回题库（下架，仅创建者本人可见）。 */
adminRouter.post('/banks/:id/reject', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const result = await db.setAdminBankAuditStatus(id, 'rejected');
    if (result.status === 'preset') {
      return res.status(409).json({ success: false, message: '内置预设题库无需审核' });
    }
    if (result.status === 'not_found' || !result.bank) {
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    return res.json({ success: true, bank: result.bank, message: '题库已驳回，仅创建者可查看' });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：删除题库。 */
adminRouter.delete('/banks/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const result = await db.deleteAdminBank(id);
    if (result === 'preset') {
      return res.status(409).json({ success: false, message: '内置预设题库不能删除' });
    }
    if (result === 'not_found') {
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    return res.json({ success: true, message: '题库已删除' });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

const adminEchoQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'flagged', 'all']).optional().default('all'),
  tag: z.string().max(30).optional().default('all'),
  search: z.string().max(100).optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).strict();

const adminEchoPatchSchema = z.object({
  auditStatus: z.enum(['pending', 'approved', 'rejected', 'flagged']),
}).strict();

/** 管理后台：回响心声列表。 */
adminRouter.get('/echoes', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const parsed = adminEchoQuerySchema.parse(req.query ?? {});
    const result = await db.listAdminEchoes(parsed);
    return res.json({ success: true, ...result });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：更新回响心声审核状态（通过/驳回/下架）。 */
adminRouter.patch('/echoes/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const parsed = adminEchoPatchSchema.parse(req.body ?? {});
    await db.updateAdminEchoStatus(id, parsed.auditStatus);
    return res.json({ success: true, message: `回响状态已更新为 ${parsed.auditStatus}` });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：删除单个回响心声。 */
adminRouter.delete('/echoes/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await db.batchDeleteEchoes([id]);
    return res.json({ success: true, message: '回响心声已删除' });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});


/** 管理后台：获取暗室信箱列表（支持分页、待回复/已回复筛选）。 */
adminRouter.get('/mailbox', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20));
    const status = (req.query.status as 'all' | 'pending' | 'replied') || 'all';

    const result = db.mailbox.listMessagesForAdmin({ page, pageSize, status });
    return res.json({ success: true, ...result });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：回复暗室信箱。 */
adminRouter.post('/mailbox/:id/reply', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const replyContent = String(req.body.replyContent || '').trim();
    if (!replyContent) {
      return res.status(400).json({ success: false, message: '回复内容不能为空' });
    }
    const success = db.mailbox.replyMessage(id, replyContent);
    if (!success) {
      return res.status(404).json({ success: false, message: '密信不存在或已被删除' });
    }
    return res.json({ success: true, message: '私密回信已发送，仅对方可见' });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：删除暗室信箱投递。 */
adminRouter.delete('/mailbox/:id', adminActionLimiter, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const success = db.mailbox.deleteMessage(id);
    if (!success) {
      return res.status(404).json({ success: false, message: '密信不存在' });
    }
    return res.json({ success: true, message: '密信已删除' });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：获取待回复密信数量。 */
adminRouter.get('/mailbox/pending-count', adminActionLimiter, requireAdmin, async (_req, res) => {
  try {
    const count = db.mailbox.countPending();
    return res.json({ success: true, count });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/* ==========================================================================
 * 审讯室（测试功能）：额度配置与最近会话
 * 配置写入 app_settings，读取时再做一次范围钳制（见 interrogationRepo）。
 * ======================================================================== */

const interrogationConfigSchema = z
  .object({
    maxTurns: z.number().int().min(1).max(20).optional(),
    maxInputTokens: z.number().int().min(64).max(8000).optional(),
    maxOutputTokens: z.number().int().min(32).max(2000).optional(),
    /** 传空串表示恢复默认提示词。 */
    interrogatorPrompt: z.string().max(4000).optional(),
    summaryPrompt: z.string().max(1600).optional(),
  })
  .strict();

/** 管理后台：读取审讯室额度与提示词。 */
adminRouter.get('/interrogation/config', adminActionLimiter, requireAdmin, (_req, res) => {
  try {
    return res.json({ success: true, config: db.interrogation.getConfig() });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：调整额度或提示词，改动立即对下一次对话生效。 */
adminRouter.put('/interrogation/config', adminActionLimiter, requireAdmin, (req, res) => {
  try {
    const parsed = interrogationConfigSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message ?? '参数不合法',
      });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ success: false, message: '至少提供一个需要调整的参数' });
    }
    const config = db.interrogation.updateConfig(parsed.data);
    return res.json({ success: true, config });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 管理后台：最近审讯会话（只看用量，不展开对话内容）。 */
adminRouter.get('/interrogation/sessions', adminActionLimiter, requireAdmin, (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '30'), 10) || 30));
    const items = db.interrogation.listRecentSessions(limit).map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      status: row.status,
      turnCount: row.turn_count,
      summaryGeneratedAt: row.summary_generated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    return res.json({ success: true, items });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});
