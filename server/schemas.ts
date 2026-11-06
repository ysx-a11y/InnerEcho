import { z } from 'zod';
import { MAX_DOSSIER_IMAGES } from '../shared/dossierLimits.js';

/**
 * Centralized Zod schemas for request body validation and env config.
 * Each route handler can call .parse(req.body) — throws ZodError on invalid input,
 * which the global error handler converts to a 400 response.
 */

// ============ Auth ============

export const registerSchema = z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .min(4, '账号名至少需 4 个字符')
    .max(100, '账号名不能超过 100 个字符')
    .regex(/^[a-zA-Z0-9_@.-]+$/, '账号名仅支持字母、数字、下划线及常用字符（如 @、.、- 等）'),
  password: z.string().min(1, '请填写密码'),
});

export const loginSchema = z.object({
  // 与 registerSchema 对齐：注册时已 trim + 小写，登录也必须同样规范化，
  // 否则用户用大写/带空格输入会因大小写不匹配而无法登录。
  email: z.string().trim().toLowerCase().min(1, '请填写账号和密码'),
  password: z.string().min(1, '请填写账号和密码'),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, '请填写旧密码与新密码'),
    newPassword: z.string().min(1, '请填写旧密码与新密码'),
    confirmPassword: z.string().min(1, '请再次输入新密码'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  });

export const deleteAccountSchema = z.object({
  confirmEmail: z.string().min(1, '请输入账号名以确认注销'),
});

// ============ User Banks (用户自建题库) ============

const bankCategorySchema = z.enum(['scientific', 'direct', 'scenario', 'preference']);
const questionTypeSchema = z.enum(['single_choice', 'multiple_choice', 'open_text', 'media_upload']);

/** 单个选项的 schema (single_choice / multiple_choice 用)。 */
const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, '选项文本不能为空'),
  subtext: z.string().optional(),
  scores: z.record(z.string(), z.number()).optional(),
  tags: z.array(z.string()).optional(),
});

/** 单个题目的 schema。 */
const questionSchema = z.object({
  id: z.string().min(1),
  bankId: z.string().optional(),
  title: z.string().min(1, '题目标题不能为空'),
  scenario: z.string().optional(),
  type: questionTypeSchema,
  options: z.array(optionSchema).optional(),
  maxSelectCount: z.number().int().positive().optional(),
  placeholder: z.string().optional(),
  sparks: z.array(z.string()).optional(),
  mediaConfig: z
    .object({
      allowedTypes: z.array(z.enum(['image', 'audio', 'video', 'document'])),
      maxSizeBytes: z.number().int().positive(),
      maxTotalSizeBytes: z.number().int().positive().optional(),
      maxFileCount: z.number().int().positive(),
    })
    .optional(),
  isRequired: z.boolean().optional(),
});

/** 创建题库：必填 title + questions 数组 (可为空数组)。 */
export const createBankSchema = z.object({
  title: z.string().min(1, '题库名称不能为空').max(80, '题库名称不超过 80 字'),
  subtitle: z.string().max(120, '副标题不超过 120 字').optional(),
  description: z.string().max(500, '描述不超过 500 字').optional(),
  category: bankCategorySchema.optional(),
  badgeColor: z.string().max(20).optional(),
  estimatedMinutes: z.number().int().positive().max(180).optional(),
  questions: z.array(questionSchema).max(100, '单题库最多 100 题').optional().default([]),
  isPublished: z.boolean().optional(),
});

/** 更新题库：所有字段可选，但若提供 questions 必须是合法数组。 */
export const updateBankSchema = z.object({
  title: z.string().min(1, '题库名称不能为空').max(80).optional(),
  subtitle: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  category: bankCategorySchema.optional(),
  badgeColor: z.string().max(20).nullable().optional(),
  estimatedMinutes: z.number().int().positive().max(180).nullable().optional(),
  questions: z.array(questionSchema).max(100).optional(),
  isPublished: z.boolean().optional(),
});

export const adminBankListQuerySchema = z.object({
  search: z.string().max(100).optional().default(''),
  category: z.enum(['scientific', 'direct', 'scenario', 'preference', 'all']).optional().default('all'),
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'all']).optional().default('all'),
  source: z.enum(['preset', 'custom', 'all']).optional().default('all'),
  sort: z.enum(['createdAt', 'updatedAt', 'title', 'questionCount']).optional().default('updatedAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}).strict();


// ============ Analyze ============

const dossierTextSchema = z.string().max(10_000, '单个文本字段不能超过 10000 字符');

// ============ 图片 DataURL 魔数校验 ============
// 浏览器 canvas 只会产出 PNG/JPEG/WebP，GIF 由前端原样透传；
// 声明 MIME 可以随便写，文件头不会撒谎，因此服务端统一按文件头再核一遍。
const IMAGE_MIME_FAMILIES: Record<string, 'png' | 'jpeg' | 'webp' | 'gif'> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** 只解码 DataURL 头部 32 个 base64 字符（约 24 字节），不对整张图做全量解码。 */
export function imageDataUrlMagicMatches(dataUrl: string, declaredMime?: string): boolean {
  const match = /^data:([^;,]+);base64,/i.exec(dataUrl);
  if (!match) return false;
  const headerMime = match[1].toLowerCase();
  const expected = IMAGE_MIME_FAMILIES[headerMime];
  if (!expected) return false;
  if (declaredMime) {
    const declared = IMAGE_MIME_FAMILIES[declaredMime.trim().toLowerCase()];
    if (declared !== expected) return false;
  }
  const head = Buffer.from(dataUrl.slice(match[0].length, match[0].length + 32), 'base64');
  switch (expected) {
    case 'png':
      return head.length >= 8
        && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
        && head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a;
    case 'jpeg':
      return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'gif': {
      const signature = head.subarray(0, 6).toString('latin1');
      return signature === 'GIF87a' || signature === 'GIF89a';
    }
    case 'webp':
      return head.length >= 12
        && head.subarray(0, 4).toString('latin1') === 'RIFF'
        && head.subarray(8, 12).toString('latin1') === 'WEBP';
    default:
      return false;
  }
}

/** 头像/照片是浏览器压缩后的 DataURL，远大于普通文本字段，不能用上面的 10000 字上限。 */
const dossierImageDataUrlSchema = z.string().max(9_000_000, '头像图片数据过大')
  .refine((value) => value === '' || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value), {
    message: '头像只支持 PNG/JPEG/WebP/GIF 的 Base64 图片',
  })
  .refine((value) => value === '' || imageDataUrlMagicMatches(value), {
    message: '头像数据与图片格式不一致',
  });
const durationSchema = z.number().finite().nonnegative().max(86_400).optional();

/** 昵称：最少 2 个字符，且不允许 aa / 11 这类全重复字符名称。 */
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, '名称或昵称至少需要 2 个字符')
  .max(20, '名称或昵称不能超过 20 个字符')
  .refine((s) => new Set(Array.from(s)).size > 1, {
    message: '名称或昵称不能使用 aa、11 这类重复字符',
  });

// ============ 媒体附件（服务端校验，C7 配套） ============

export const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024; // 单附件上限 30MB (满足移动端原画视频录制)
export const MAX_ATTACHMENT_COUNT = 10;               // 单次提交最多 10 个附件
export const MAX_TOTAL_ATTACHMENT_BYTES = 30 * 1024 * 1024; // 单次提交附件总大小上限 30MB (base64 后约 40MB，nginx 50M 与 express 60M 均能承载)

const BLOCKED_ACTIVE_MIME_TYPES = new Set([
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
]);

function dataUrlMatches(dataUrl: string, mimeType: string, type: 'image' | 'audio' | 'video' | 'document'): boolean {
  if (!dataUrl.startsWith('data:')) return false;
  // FileReader 产出形如 data:<mime>;base64,<payload>，校验前缀防任意数据灌入
  const header = dataUrl.slice(0, dataUrl.indexOf(',') > 0 ? dataUrl.indexOf(',') : dataUrl.length);
  if (!header.includes(';base64')) return false;
  const mime = header.slice(5).split(';')[0].toLowerCase();
  if (!mimeType) return false;
  const targetMime = mimeType.toLowerCase();
  // 这些格式可携带主动脚本，不作为用户附件接收或预览。
  if (BLOCKED_ACTIVE_MIME_TYPES.has(targetMime) || BLOCKED_ACTIVE_MIME_TYPES.has(mime)) return false;
  // 允许 header mime 与 targetMime 完全匹配，或 header 为 octet-stream 兼容流
  if (mime && mime !== targetMime && mime !== 'application/octet-stream') return false;
  if (type === 'image' && !targetMime.startsWith('image/')) return false;
  if (type === 'audio' && !targetMime.startsWith('audio/')) return false;
  if (type === 'video' && !targetMime.startsWith('video/')) return false;
  // document：前端对非图片音视频文件统一标 document，mime 可为任意合法类型
  return true;
}

export const mediaAttachmentSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200, '文件名不能超过 200 字符'),
  type: z.enum(['image', 'audio', 'video', 'document']),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, '单个附件不能超过 30MB'),
  dataUrl: z.string().min(1).max(50_000_000, '附件数据异常过大'),
  durationSeconds: z.number().finite().nonnegative().max(86_400).optional(),
}).strict().refine(
  (a) => dataUrlMatches(a.dataUrl, a.mimeType, a.type),
  { message: '附件数据与声明类型不一致', path: ['dataUrl'] }
).refine(
  // 图片附件按文件头复核：声明成 image/png 但内容其实是 HTML/SVG 的会被这里拦下。
  (a) => a.type !== 'image' || imageDataUrlMagicMatches(a.dataUrl, a.mimeType),
  { message: '图片数据与声明格式不一致', path: ['dataUrl'] }
).refine(
  // 防灌水：dataUrl(base64) 长度应与声明的 sizeBytes 量级一致，远大于声明值视为异常
  (a) => a.dataUrl.length <= Math.ceil(a.sizeBytes * 4 / 3) + 512,
  { message: '附件数据大小与声明不符', path: ['dataUrl'] }
);

export const mediaAttachmentsSchema = z.array(mediaAttachmentSchema)
  .max(MAX_ATTACHMENT_COUNT, `单次最多上传 ${MAX_ATTACHMENT_COUNT} 个附件`)
  .superRefine((items, ctx) => {
    const total = items.reduce((sum, it) => sum + (it.sizeBytes || 0), 0);
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '附件总大小不能超过 30MB',
      });
    }
  });

export const analyzeDossierSchema = z.object({
  dossierData: z.object({
    chapter1: z.object({
      nickname: nicknameSchema.optional(),
      gender: z.string().max(10, '性别字段过长').optional(),
      occupation: dossierTextSchema.optional(),
      avatarUrl: dossierImageDataUrlSchema.optional(),
      avatarUrls: z.array(dossierImageDataUrlSchema).max(MAX_DOSSIER_IMAGES).optional(),
      personaTrait: dossierTextSchema.optional(),
      age: z.string().regex(/^\d*$/, '年龄必须为纯数字').optional(),
      maritalStatus: dossierTextSchema.optional(),
      hasBoyfriend: dossierTextSchema.optional(),
      surfaceTrait: dossierTextSchema.optional(),
      innerDesire: dossierTextSchema.optional(),
      durationSeconds: durationSchema,
    }).strict().optional(),
    chapter2: z.object({
      boundaryText: dossierTextSchema.optional(),
      fantasyText: dossierTextSchema.optional(),
      relationPreference: dossierTextSchema.optional(),
      awakeningMoment: dossierTextSchema.optional(),
      durationSeconds: durationSchema,
    }).strict().optional(),
    chapter3: z.object({
      secretWords: dossierTextSchema.optional(),
      secretRule: dossierTextSchema.optional(),
      durationSeconds: durationSchema,
    }).strict().optional(),
    selectedShadowTags: z.array(dossierTextSchema).max(100).optional(),
    depthRating: z.enum(['light', 'medium', 'deep']).optional(),
    telemetry: z.record(z.string(), z.unknown()).optional(),
    selectedBankIds: z.array(dossierTextSchema).max(100).optional(),
    completedBanks: z.array(z.unknown()).max(100).optional(),
    aggregatedScores: z.record(z.string(), z.number().finite()).optional(),
    collectedTags: z.array(dossierTextSchema).max(500).optional(),
    questionLogs: z.array(z.unknown()).max(500).optional(),
    userTextAnswers: z.record(z.string(), dossierTextSchema).optional(),
    userMediaAttachments: z.record(z.string(), mediaAttachmentsSchema).optional(),
    totalDurationSeconds: z.number().finite().nonnegative().max(86_400).optional(),
  }).strict().superRefine((data, ctx) => {
    // 署名（昵称）是卷宗的必要字段：管理端只能靠它区分受访者，
    // 因此 /api/analyze-dossier 不再接受没有合法昵称的提交。
    // 字段本身仍是 optional，缺字段时在这里补一条与 nicknameSchema 同口径的可读错误。
    const nickname = data.chapter1?.nickname;
    const trimmed = typeof nickname === 'string' ? nickname.trim() : '';
    // 字段级校验已经报过的（空串/过短/全重复字符）不重复添加，避免同一字段两条 issue。
    if (typeof nickname === 'string' && (trimmed.length < 2 || new Set(Array.from(trimmed)).size < 2)) return;
    if (trimmed.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['chapter1', 'nickname'],
        message: '名称或昵称至少需要 2 个字符',
      });
      return;
    }
    if (new Set(Array.from(trimmed)).size < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['chapter1', 'nickname'],
        message: '名称或昵称不能使用 aa、11 这类重复字符',
      });
    }
  }),
  customConfig: z
    .object({
      apiKey: z.string().max(1_000).optional(),
      baseUrl: z.string().url().max(2_048).optional(),
      model: z.string().min(1).max(200).optional(),
    })
    .strict()
    .optional(),
}).strict();

// ============ Environment variables ============

const jwtExpiresPattern = /^(\d+)\s*([smhdw])?$/i;
const fieldEncryptionKeyPattern = /^(?:[a-f\d]{64}|[A-Za-z0-9+/]{43}=)$/i;

export const envSchema = z.object({
  JWT_SECRET: z.string().min(16, 'JWT_SECRET 至少 16 字符').refine(
    (s) => !s.includes('replace_with'),
    'JWT_SECRET 必须替换为真实随机串'
  ),
  ADMIN_TOKEN: z.string().min(8, 'ADMIN_TOKEN 至少 8 字符').refine(
    (s) => !s.includes('replace_with'),
    'ADMIN_TOKEN 必须替换为真实随机串'
  ),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_BASE_URL: z.string().url().optional().default('https://api.deepseek.com/v1'),
  LLM_MODEL: z.string().optional().default('deepseek-chat'),
  LLM_ALLOWED_HOSTS: z.string().optional(),
  PORT: z.coerce.number().int().positive().optional().default(3000),
  APP_MODE: z.enum(['user', 'admin', 'all']).optional().default('all'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_FILE: z.string().min(1).optional(),
  FIELD_ENC_KEY: z.string().optional().refine(
    (value) => !value || fieldEncryptionKeyPattern.test(value),
    'FIELD_ENC_KEY 必须是 32 字节 base64 或 64 位 hex'
  ),
  JWT_EXPIRES_IN: z.string().regex(jwtExpiresPattern, 'JWT_EXPIRES_IN 格式错误，如 7d / 24h').optional().default('7d'),
  // Sentry DSN — 可选，未配置则跳过错误上报
  SENTRY_DSN: z.string().url().optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.FIELD_ENC_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['FIELD_ENC_KEY'],
      message: '生产环境必须配置 FIELD_ENC_KEY，禁止私密卷宗明文落库',
    });
  }
});

export type EnvInput = z.infer<typeof envSchema>;
