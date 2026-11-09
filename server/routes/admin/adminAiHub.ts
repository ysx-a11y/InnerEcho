import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { logger } from '../../logger.js';
import { runPromptPlayground } from '../../services/promptPlaygroundService.js';
import type {
  PlaygroundRunRequest,
} from '../../../shared/apiContracts.js';

export const adminAiHubRouter = Router();

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return (Array.isArray(val) ? val[0] : val) || '';
}

// 1. 智能体列表与详情
adminAiHubRouter.get('/agents', asyncHandler(async (_req: Request, res: Response) => {
  const items = await db.aiAgent.listAgents();
  return res.json({ success: true, items });
}));

adminAiHubRouter.get('/agents/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const agent = await db.aiAgent.getAgentById(id);
  if (!agent) return res.status(404).json({ success: false, message: '智能体未找到' });
  return res.json({ success: true, agent });
}));

const updateAgentSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  defaultModel: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxOutputTokens: z.number().min(16).max(8192).optional(),
  outputSchema: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  remark: z.string().optional(),
  adminNotes: z.string().optional(),
});

adminAiHubRouter.patch('/agents/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const parsed = updateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '参数校验失败' });
  }
  const existing = await db.aiAgent.getAgentById(id);
  if (!existing) return res.status(404).json({ success: false, message: '智能体未找到' });
  const updated = await db.aiAgent.updateAgent(id, parsed.data);
  return res.json({ success: true, agent: updated });
}));

// 2. 提示词模版管理
adminAiHubRouter.get('/templates', asyncHandler(async (req: Request, res: Response) => {
  const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : undefined;
  const items = await db.prompts.listPromptTemplates(agentId);
  return res.json({ success: true, items });
}));

adminAiHubRouter.get('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const template = await db.prompts.getPromptTemplateById(id);
  if (!template) return res.status(404).json({ success: false, message: '模版未找到' });
  return res.json({ success: true, template });
}));

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, '名称不能为空'),
  description: z.string().trim().default(''),
  content: z.string().trim().min(1, '提示词内容不能为空'),
  agentId: z.string().trim().default('agent_dossier_analyst'),
  categories: z.array(z.string()).default(['all']),
  changeSummary: z.string().trim().default('初始版本'),
  remark: z.string().default(''),
  adminNotes: z.string().default(''),
});

adminAiHubRouter.post('/templates', asyncHandler(async (req: Request, res: Response) => {
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '参数不合法' });
  }
  const template = await db.prompts.createPromptTemplate(parsed.data);
  return res.status(201).json({ success: true, template });
}));

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  content: z.string().trim().optional(),
  agentId: z.string().trim().optional(),
  categories: z.array(z.string()).optional(),
  changeSummary: z.string().trim().max(200).optional(),
  remark: z.string().optional(),
  adminNotes: z.string().optional(),
});

adminAiHubRouter.patch('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '参数不合法' });
  }
  const existing = await db.prompts.getPromptTemplateById(id);
  if (!existing) return res.status(404).json({ success: false, message: '模版不存在' });

  const { content, changeSummary, ...metadata } = parsed.data;

  // 正文变更必须落成不可变版本，避免 active_version_id 仍指向旧快照。
  if (typeof content === 'string' && content.trim().length > 0 && content !== existing.content) {
    await db.prompts.createPromptVersion(id, {
      systemPrompt: content,
      changeSummary: (changeSummary && changeSummary.trim()) || '通过 AI 智能体中台编辑提示词',
    });
  }

  const updated =
    Object.keys(metadata).length > 0
      ? await db.prompts.updatePromptTemplate(id, metadata)
      : await db.prompts.getPromptTemplateById(id);
  if (!updated) return res.status(404).json({ success: false, message: '模版不存在' });

  // 若修改的是当前生效中的审讯室提示词，自动同步至审讯室配置
  if (updated.isActive) {
    if (updated.agentId === 'agent_interrogator' && updated.content) {
      db.interrogation.updateConfig({ interrogatorPrompt: updated.content });
    } else if (updated.agentId === 'agent_interrogation_recorder' && updated.content) {
      db.interrogation.updateConfig({ summaryPrompt: updated.content });
    }
  }

  return res.json({ success: true, template: updated });
}));

// 3. 不可变版本快照管理与一键回滚
const createVersionSchema = z.object({
  systemPrompt: z.string().trim().min(1, '系统提示词不能为空'),
  userPromptTemplate: z.string().default(''),
  modelParams: z.record(z.string(), z.unknown()).default({}),
  changeSummary: z.string().trim().min(1, '必须填写本次版本变更摘要'),
  createdBy: z.string().default('admin'),
  remark: z.string().default(''),
  adminNotes: z.string().default(''),
});

adminAiHubRouter.post('/templates/:id/versions', asyncHandler(async (req: Request, res: Response) => {
  const templateId = getParam(req, 'id');
  const parsed = createVersionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '参数不合法' });
  }
  const version = await db.prompts.createPromptVersion(templateId, parsed.data);
  return res.status(201).json({ success: true, version });
}));

adminAiHubRouter.get('/templates/:id/versions', asyncHandler(async (req: Request, res: Response) => {
  const templateId = getParam(req, 'id');
  const versions = await db.prompts.listPromptVersions(templateId);
  return res.json({ success: true, versions });
}));

const rollbackSchema = z.object({
  targetVersionId: z.string().trim().min(1, '目标版本ID不能为空'),
  adminNotes: z.string().default(''),
  remark: z.string().default(''),
});

adminAiHubRouter.post('/templates/:id/rollback', asyncHandler(async (req: Request, res: Response) => {
  const templateId = getParam(req, 'id');
  const parsed = rollbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '参数不合法' });
  }
  try {
    const updated = await db.prompts.rollbackPromptVersion(templateId, parsed.data.targetVersionId, {
      adminNotes: parsed.data.adminNotes,
      remark: parsed.data.remark,
    });
    return res.json({ success: true, template: updated, message: '版本回滚成功' });
  } catch (err: unknown) {
    // 只回传可判定的业务错误，其余错误仅记录在服务端日志，避免把内部异常细节抛给客户端。
    logger.warn({ err, templateId, targetVersionId: parsed.data.targetVersionId }, 'prompt version rollback failed');
    const message =
      err instanceof Error && /does not exist|not found/i.test(err.message)
        ? '目标版本不存在或不属于该模板'
        : '版本回滚失败，请查看服务端日志';
    return res.status(400).json({ success: false, message });
  }
}));

adminAiHubRouter.post('/templates/:id/activate', asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const activated = await db.prompts.activatePromptTemplate(id);
  if (!activated) return res.status(404).json({ success: false, message: '模版未找到' });

  // 激活审讯室相关模板时，同步至审讯室配置
  if (activated.agentId === 'agent_interrogator' && activated.content) {
    db.interrogation.updateConfig({ interrogatorPrompt: activated.content });
  } else if (activated.agentId === 'agent_interrogation_recorder' && activated.content) {
    db.interrogation.updateConfig({ summaryPrompt: activated.content });
  }

  return res.json({ success: true, template: activated });
}));

adminAiHubRouter.delete('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  const result = await db.prompts.deletePromptTemplate(id);
  if (result === 'not_found') return res.status(404).json({ success: false, message: '模版未找到' });
  if (result === 'active') return res.status(400).json({ success: false, message: '生效中的模板不可删除' });
  if (result === 'builtin') return res.status(400).json({ success: false, message: '系统内置模板不可删除' });
  return res.json({ success: true, message: '删除成功' });
}));

// 4. 动态变量字典
adminAiHubRouter.get('/variables', asyncHandler(async (req: Request, res: Response) => {
  const ns = typeof req.query.namespace === 'string' ? req.query.namespace : undefined;
  const variables = await db.aiAgent.listVariables(ns);
  return res.json({ success: true, variables });
}));

const upsertVarSchema = z.object({
  variableKey: z.string().trim().min(1),
  namespace: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().optional(),
  mockValue: z.string().optional(),
  remark: z.string().optional(),
  adminNotes: z.string().optional(),
});

adminAiHubRouter.post('/variables', asyncHandler(async (req: Request, res: Response) => {
  const parsed = upsertVarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '参数不合法' });
  }
  const variable = await db.aiAgent.upsertVariable(parsed.data);
  return res.json({ success: true, variable });
}));

// 5. 沙盒演练场 (Playground Dry-Run)
const playgroundSchema = z.object({
  agentId: z.string().optional(),
  templateId: z.string().optional(),
  versionId: z.string().optional(),
  draftSystemPrompt: z.string().optional(),
  draftUserTemplate: z.string().optional(),
  modelOverride: z.string().optional(),
  temperatureOverride: z.number().min(0).max(2).optional(),
  mockSource: z.enum(['real_dossier', 'preset_mock']).default('preset_mock'),
  dossierId: z.string().optional(),
  customVariables: z.record(z.string(), z.string()).optional(),
});

adminAiHubRouter.post('/playground/run', asyncHandler(async (req: Request, res: Response) => {
  const parsed = playgroundSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? '参数不合法' });
  }
  const result = await runPromptPlayground(parsed.data as PlaygroundRunRequest);
  return res.json(result);
}));

