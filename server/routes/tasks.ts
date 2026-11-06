import { Router, type NextFunction, type Response } from 'express';
import { z, ZodError } from 'zod';
import { db } from '../db.js';
import { extractDeviceId, maybeUserId, requireAuth, type AuthedRequest } from '../auth.js';
import { STATIC_TASKS } from '../../shared/tasks.js';
import { mediaAttachmentsSchema } from '../schemas.js';
import { getClientIp } from '../utils/clientIp.js';
import { createAbuseLimitMiddleware } from '../utils/abuseLimiter.js';

export const tasksRouter = Router();

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

const specialEvaluationSchema = z.object({
  price: z.number({ message: '请输入自评金额/数值' })
    .min(0, '金额不能小于0')
    .max(1000000000, '金额超出合理范围'),
  selfEvaluation: z.string({ message: '请输入自评理由/自白' })
    .trim()
    .min(1, '请输入文字自白')
    .max(2000, '自评文字不能超过2000字'),
}).strict();

const SPECIAL_TASK_CONFIG: Record<string, { taskType: string; name: string }> = {
  'price-tag': { taskType: 'price_tag', name: '身价自评' },
  'betrothal-gift': { taskType: 'betrothal_gift', name: '彩礼与伴侣自白' },
};

function resolveSpecialTask(slug: string | string[] | undefined): { taskType: string; name: string } | null {
  const key = Array.isArray(slug) ? slug[0] : slug;
  return key ? SPECIAL_TASK_CONFIG[key] || null : null;
}

const voteSpecialSchema = z.object({
  evaluationId: z.string({ message: '缺少 evaluationId' }).min(1),
  voteType: z.enum(['up', 'down'], { message: 'voteType 必须为 up 或 down' }),
}).strict();

/**
 * 反滥用框架当前只启用可信 IP 维度和宽松阈值；后续可按风险情况替换为
 * 账号、设备或组合身份策略，不需要改动持久化计数实现。
 */
const specialVoteLimiter = createAbuseLimitMiddleware({
  scope: 'special-price-vote',
  windowMs: 24 * 60 * 60 * 1000,
  maxAttempts: 20,
  resolveIdentity: (req) => ({ type: 'ip', value: getClientIp(req) }),
  message: '今日投票次数已达 20 次，请明天再来。',
});

/**
 * 获取天梯榜：近 7 天净赞数（赞 - 踩）前 10 名及本人排名
 * GET /api/tasks/special/:slug/leaderboard
 */
tasksRouter.get('/special/:slug/leaderboard', async (req, res) => {
  try {
    const config = resolveSpecialTask(req.params.slug);
    if (!config) {
      return res.status(404).json({ success: false, message: '未知的特殊任务类型' });
    }

    const deviceId = extractDeviceId(req) || '';
    const userId = await maybeUserId(req);

    const result = await db.getSpecialPriceLeaderboard(config.taskType, deviceId, userId);
    return res.json({
      success: true,
      top10: result.top10,
      myStatus: result.myStatus,
      userVotes: result.userVotes,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 点赞/点踩特殊任务自评
 * POST /api/tasks/special/:slug/vote
 */
tasksRouter.post('/special/:slug/vote', specialVoteLimiter, async (req, res) => {
  try {
    const config = resolveSpecialTask(req.params.slug);
    if (!config) {
      return res.status(404).json({ success: false, message: '未知的特殊任务类型' });
    }

    const parsed = voteSpecialSchema.parse(req.body ?? {});
    const deviceId = extractDeviceId(req);
    if (!deviceId) {
      return res.status(400).json({ success: false, message: '缺少设备标识，请刷新重试' });
    }
    const userId = await maybeUserId(req);

    const result = await db.voteSpecialEvaluation(parsed.evaluationId, deviceId, userId, parsed.voteType);
    if (!result.ok) {
      const status = result.reason === 'not_found' ? 404 : 400;
      const message = result.reason === 'not_found' ? '未找到该自评' : '不能给自己的自评投票';
      return res.status(status).json({ success: false, message });
    }
    return res.json({
      success: true,
      evaluationId: parsed.evaluationId,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      netScore: result.netScore,
      userVote: result.userVote,
    });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 获取特殊任务自评与排名（如身价自评、彩礼与伴侣自白）
 * GET /api/tasks/special/:slug
 */
tasksRouter.get('/special/:slug', async (req, res) => {
  try {
    const config = resolveSpecialTask(req.params.slug);
    if (!config) {
      return res.status(404).json({ success: false, message: '未知的特殊任务类型' });
    }

    const deviceId = extractDeviceId(req);
    const userId = await maybeUserId(req);

    if (!deviceId && !userId) {
      return res.json({ success: true, evaluation: null });
    }

    const evaluation = await db.getSpecialEvaluation(config.taskType, deviceId || '', userId);
    return res.json({
      success: true,
      evaluation,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 提交或更新特殊任务自评，含 1 小时修改冷却
 * POST /api/tasks/special/:slug
 */
tasksRouter.post('/special/:slug', requireAuth, requireBasicInfo, async (req: AuthedRequest, res: Response) => {
  try {
    const config = resolveSpecialTask(req.params.slug);
    if (!config) {
      return res.status(404).json({ success: false, message: '未知的特殊任务类型' });
    }

    const parsed = specialEvaluationSchema.parse(req.body ?? {});
    const deviceId = extractDeviceId(req);
    if (!deviceId) {
      return res.status(400).json({ success: false, message: '缺少设备标识，请刷新重试' });
    }

    const userId = req.userId!;

    const result = await db.saveSpecialEvaluation({
      taskType: config.taskType,
      deviceId,
      userId,
      price: parsed.price,
      selfEvaluation: parsed.selfEvaluation,
    });

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: result.message || '操作过于频繁',
        cooldownRemainingSeconds: result.cooldownRemainingSeconds,
      });
    }

    return res.json({
      success: true,
      message: `${config.name}已提交并完成全网排位测算`,
      evaluation: result.evaluation,
    });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/** 任务操作前置：必须已填写基础信息（第一章），防止匿名“神秘客”接取/发布任务。 */
async function requireBasicInfo(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const has = await db.hasUserBasicInfo(req.userId!);
    if (!has) {
      res.status(403).json({ success: false, message: '请先填写基础信息后再接取/发布任务' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
}

const createCustomTaskSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题不能超过 100 字符'),
  description: z.string().min(1, '描述不能为空').max(1000, '描述不能超过 1000 字符'),
  category: z.enum(['subconscious', 'dream', 'shadow', 'persona']),
}).strict();

const completeTaskSchema = z.object({
  textContent: z.string().trim().min(1, '必须填写实质性文字内容以记录成果').max(10000),
  attachments: mediaAttachmentsSchema.optional().default([]),
}).strict();

type TaskCategory = 'subconscious' | 'dream' | 'shadow' | 'persona';

interface TaskDefWithCategory {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  requireAudio?: boolean;
}

interface CompletedTaskHistoryItem {
  id: string;
  taskId: string;
  title: string;
  textContent: string | null;
  attachments: unknown[];
  acceptedAt: string;
  completedAt: string | null;
}

/** 静态任务 + 当前用户自建任务合并；他人自建任务不可见。 */
async function loadAllTaskDefs(userId: string): Promise<TaskDefWithCategory[]> {
  const customTasks = await db.getCustomTaskDefinitions(userId);
  return [
    ...STATIC_TASKS,
    ...customTasks.map((ct) => ({
      id: ct.id,
      title: ct.title,
      description: ct.description,
      category: ct.category as TaskCategory,
    })),
  ];
}

/** 附件 JSON 解析兜底：损坏/历史数据返回空数组，避免整个任务列表 500。 */
function safeParseAttachments(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 获取任务列表、已完成的任务次数以及历史记录
 * GET /api/tasks
 */
tasksRouter.get('/', async (req, res) => {
  try {
    const userId = await maybeUserId(req);
    
    // 合并静态任务与自建任务
    const allTaskDefs = await loadAllTaskDefs(userId || '');

    // 游客可浏览任务列表，但无个人进度与历史
    if (!userId) {
      return res.json({
        success: true,
        tasks: allTaskDefs.map((t) => ({
          ...t,
          status: 'available',
          activeTaskInstance: null,
        })),
        completedCount: 0,
        totalAcceptedCount: 0,
        completedHistory: [],
      });
    }

    // 查询该用户的所有任务接受/完成行
    const userTasks = await db.getUserTasks(userId);
    
    // 过滤出 active/accepted 和 completed
    const activeTasksMap = new Map<string, typeof userTasks[0]>();
    const completedHistory: CompletedTaskHistoryItem[] = [];
    
    userTasks.forEach((ut) => {
      if (ut.status === 'accepted') {
        activeTasksMap.set(ut.task_id, ut);
      } else if (ut.status === 'completed') {
        const taskDef = allTaskDefs.find((t) => t.id === ut.task_id);
        completedHistory.push({
          id: ut.id,
          taskId: ut.task_id,
          title: taskDef?.title ?? '未知任务',
          textContent: ut.text_content,
          attachments: safeParseAttachments(ut.attachments_json),
          acceptedAt: ut.accepted_at,
          completedAt: ut.completed_at,
        });
      }
    });

    const tasks = allTaskDefs.map((t) => {
      const activeInstance = activeTasksMap.get(t.id);
      
      // 判断是否在历史记录里有完成
      const hasCompleted = completedHistory.some(ch => ch.taskId === t.id);
      
      let finalStatus: 'accepted' | 'completed' | 'available' = 'available';
      if (activeInstance) {
        finalStatus = 'accepted';
      } else if (hasCompleted) {
        finalStatus = 'completed';
      }

      return {
        ...t,
        status: finalStatus,
        activeTaskInstance: activeInstance ? {
          id: activeInstance.id,
          acceptedAt: activeInstance.accepted_at,
        } : null,
      };
    });

    const completedCount = await db.getCompletedTasksCount(userId);
    const totalAcceptedCount = await db.getTotalAcceptedTasksCount(userId);

    return res.json({
      success: true,
      tasks,
      completedCount,
      totalAcceptedCount,
      completedHistory,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 新增/发布自定义任务
 * POST /api/tasks
 */
tasksRouter.post('/', requireAuth, requireBasicInfo, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const parsed = createCustomTaskSchema.parse(req.body ?? {});
    const { title, description, category } = parsed;
    
    const customTask = await db.createCustomTaskDefinition(userId, title, description, category);
    return res.json({
      success: true,
      message: '发布任务成功',
      task: {
        id: customTask.id,
        title: customTask.title,
        description: customTask.description,
        category: customTask.category,
      }
    });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 接取任务
 * POST /api/tasks/:taskId/accept
 */
tasksRouter.post('/:taskId/accept', requireAuth, requireBasicInfo, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.taskId as string;

    // 获取所有的定义（静态+自建）以进行校验
    const allTaskDefs = await loadAllTaskDefs(userId);

    const taskDef = allTaskDefs.find((t) => t.id === taskId);
    if (!taskDef) {
      return res.status(400).json({ success: false, message: '任务不存在' });
    }

    // 检查是否已有该任务在进行中
    const active = await db.getUserActiveTask(userId, taskId);
    if (active) {
      return res.status(400).json({ success: false, message: '该任务已在进行中' });
    }

    // 强制限制：最多同时接取 2 个任务
    const allUserTasks = await db.getUserTasks(userId);
    const activeCount = allUserTasks.filter(ut => ut.status === 'accepted').length;
    if (activeCount >= 2) {
      return res.status(400).json({ success: false, message: '同时最多只能接取两个任务' });
    }

    const userTask = await db.createUserTask(userId, taskId);
    return res.json({
      success: true,
      message: '接取任务成功',
      userTask: {
        id: userTask.id,
        taskId: userTask.task_id,
        status: userTask.status,
        acceptedAt: userTask.accepted_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('TASK_ALREADY_ACTIVE')) {
      return res.status(400).json({ success: false, message: '该任务已在进行中' });
    }
    if (message.includes('TASK_ACTIVE_LIMIT')) {
      return res.status(400).json({ success: false, message: '同时最多只能接取两个任务' });
    }
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 完成任务
 * POST /api/tasks/:taskId/complete
 */
tasksRouter.post('/:taskId/complete', requireAuth, requireBasicInfo, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.taskId as string;

    const parsed = completeTaskSchema.parse(req.body ?? {});
    const { textContent, attachments } = parsed;

    // 获取所有的定义（静态+自建）以进行校验
    const allTaskDefs = await loadAllTaskDefs(userId);

    const taskDef = allTaskDefs.find((t) => t.id === taskId);
    if (!taskDef) {
      return res.status(400).json({ success: false, message: '任务不存在' });
    }

    const active = await db.getUserActiveTask(userId, taskId);
    if (!active) {
      return res.status(404).json({ success: false, message: '任务未接取或已完成' });
    }

    if (taskDef.requireAudio) {
      const hasAudio = Array.isArray(attachments) && attachments.some((a: any) => a?.type === 'audio');
      if (!hasAudio) {
        return res.status(400).json({ success: false, message: '该任务要求必须录制并上传语音音频成果' });
      }
    }

    const attachmentsJson = JSON.stringify(attachments);
    await db.completeUserTask(active.id, textContent, attachmentsJson);

    return res.json({
      success: true,
      message: '任务已完成',
    });
  } catch (err) {
    if (sendZodError(err, res)) return;
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 放弃任务
 * POST /api/tasks/:taskId/abandon
 */
tasksRouter.post('/:taskId/abandon', requireAuth, requireBasicInfo, async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.taskId as string;

    const allTaskDefs = await loadAllTaskDefs(userId);
    const taskDef = allTaskDefs.find((t) => t.id === taskId);
    if (!taskDef) {
      return res.status(400).json({ success: false, message: '任务不存在' });
    }

    const active = await db.getUserActiveTask(userId, taskId);
    if (!active) {
      return res.status(404).json({ success: false, message: '任务未接取或已结束' });
    }

    await db.abandonUserTask(active.id);

    return res.json({
      success: true,
      message: '已放弃该任务',
    });
  } catch {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});
