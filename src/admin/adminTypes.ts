/** 管理后台前端类型（与服务端 AdminDossier / AdminOverview / AdminTelemetry 对应）。 */

export type { AdminTimeRange } from '../../shared/apiContracts';

export type AdminAuditStatus = 'pending' | 'approved' | 'flagged';

export type SecurityEventSeverity = 'info' | 'warning' | 'critical';

export interface AdminSecurityEvent {
  sequence: number;
  id: string;
  eventType: string;
  severity: SecurityEventSeverity;
  requestId: string;
  ipAddress: string;
  userAgent: string;
  method: string;
  route: string;
  statusCode: number;
  targetType: string | null;
  targetId: string | null;
  responseBytes: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminSecurityEventListParams {
  eventType?: string;
  severity?: SecurityEventSeverity;
  limit?: number;
  offset?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  categories: string[];
  isActive: boolean;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDossier {
  id: string;
  userId: string | null;
  deviceId: string | null;
  email: string | null;
  submitTime: string;
  createdAt: string;
  nickname: string;
  /** 用户上传的基础信息照片（压缩后的 dataURL，可能为空）。 */
  avatarUrls: string[];
  gender: string;
  occupation: string;
  personaTrait: string;
  age: string;
  maritalStatus: string;
  hasBoyfriend: string;
  depthRating: 'light' | 'medium' | 'deep';
  credibilityScore: number;
  credibilityLevel: 'high' | 'medium' | 'low';
  archetypeTitle: string;
  archetypeSubtitle?: string;
  dominanceIndex: number;
  submissionIndex: number;
  restraintIndex: number;
  sensoryThreshold: number;
  personaDeconstruction: string;
  shadowDeconstruction: string;
  psychologicalSublimation: string;
  resonanceKeywords: string[];
  selectedShadowTags: string[];
  durationSeconds: number;
  auditStatus: AdminAuditStatus;
  adminNotes: string;
  bankIds: string;
  // 答卷自白明细（服务端已解密）
  q_occupation: string;
  q_surfaceTrait: string;
  q_innerDesire: string;
  q_boundaryText: string;
  q_relationPreference: string;
  q_awakeningMoment: string;
  q_secretWords: string;
  q_secretRule: string;
  /** 完整诊断结果对象 */
  diagnosticResult?: any;
  /** 完整答题及题库载荷对象 */
  quizPayload?: any;
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
}

export interface AdminDossierSummary {
  id: string;
  nickname: string;
  depthRating: string;
  bankIds: string;
  credibilityScore: number;
  credibilityLevel: string;
  durationSeconds: number;
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
  createdAt: string;
}

export interface AdminOverview {
  today: { visits: number; visitors: number; users: number; dossiers: number; uniquePeople: number };
  totals: { visits: number; users: number; dossiers: number; banks: number; uniquePeople: number };
  weekly: { date: string; label: string; pv: number; submit: number }[];
  recent: AdminDossierSummary[];
  selectedPeriod?: { visits: number; visitors: number; users: number; dossiers: number; uniquePeople: number };
  depthDistribution?: { rating: string; count: number }[];
  auditDistribution?: { status: string; count: number }[];
  occupationDistribution?: { occupation: string; count: number }[];
  ageDistribution?: { group: string; count: number }[];
  taskStats?: {
    category: string;
    accepted: number;
    completed: number;
  }[];
  sourceDistribution: { source: string; count: number }[];
  tasksCompleted: number;
  totalTasksCompleted: number;
  regionDistribution: { code: string; city: string; count: number }[];
  /** 轻量用户事件统计（如导出角色卡）：当前时间段 + 全量口径。 */
  eventStats: {
    eventType: string;
    count: number;
    devices: number;
    totalCount: number;
    totalDevices: number;
  }[];
  /** 卷宗/遥测中出现的题库 id → 名称（内置 + 用户自建），供管理端展示。 */
  bankNames: Record<string, string>;
}

export interface AdminTelemetry {
  banks: {
    bankId: string;
    count: number;
    avgDurationSeconds: number;
    avgHesitateIndex: number;
    avgBackspaceRate: number;
    avgFlipFlop: number;
  }[];
  topQuestions: {
    bankId: string;
    questionId: string;
    attempts: number;
    avgDurationMs: number;
    avgInteractions: number;
  }[];
  timeDistribution: { range: string; rate: number }[];
  /** 遥测中出现的题库 id → 名称（内置 + 用户自建），供管理端展示。 */
  bankNames: Record<string, string>;
}

export interface DossierListParams {
  search?: string;
  depth?: string;
  credibility?: string;
  status?: string;
  sort?: 'submitTime' | 'credibilityScore' | 'durationSeconds';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AdminTaskSummary {
  id: string;
  userId: string;
  email: string | null;
  nickname: string;
  taskId: string;
  title: string;
  description: string;
  category: 'subconscious' | 'dream' | 'shadow' | 'persona';
  status: string;
  textContent: string | null;
  attachments: any[];
  acceptedAt: string;
  completedAt: string | null;
}

export interface AdminSpecialEvaluation {
  id: string;
  userId: string | null;
  email: string | null;
  nickname: string;
  deviceId: string;
  taskType: string;
  price: number;
  selfEvaluation: string;
  rank: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSpecialEvaluationStats {
  totalParticipants: number;
  highestPrice: number;
  lowestPrice: number;
  averagePrice: number;
  medianPrice: number;
}

export interface AdminBankSummary {
  id: string;
  userId: string | null;
  userEmail: string | null;
  title: string;
  subtitle: string;
  description: string;
  category: 'scientific' | 'direct' | 'scenario' | 'preference';
  badgeColor: string | null;
  estimatedMinutes: number | null;
  questionCount: number;
  isPublished: boolean;
  auditStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBankDetail extends AdminBankSummary {
  questions: any[];
  dimensions?: { key: string; name: string; description?: string }[];
}

export interface AdminBankListParams {
  search?: string;
  category?: 'scientific' | 'direct' | 'scenario' | 'preference' | 'all';
  status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'all';
  source?: 'preset' | 'custom' | 'all';
  sort?: 'createdAt' | 'updatedAt' | 'title' | 'questionCount';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AdminBankStats {
  totalBanks: number;
  publishedCount: number;
  draftCount: number;
  pendingCount: number;
  rejectedCount: number;
  presetCount: number;
  customCount: number;
  totalQuestions: number;
}

export interface AdminEchoWhisper {
  id: string;
  surfaceRole: string;
  shadowDesire: string;
  shadowTag: string;
  echoCount: number;
  auditStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: string;
  deviceId: string;
  userId: string | null;
}

export interface AdminEchoListParams {
  status?: 'pending' | 'approved' | 'rejected' | 'flagged' | 'all';
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

import type { ChapterOneData } from '../data/chapterStructure';

export interface AdminUserSummary {
  id: string;
  email: string;
  generation: number;
  createdAt: string;
  deletedAt: string | null;
  lastLoginAt: string | null;
  deviceCount: number;
  devices: string[];
  dossierCount: number;
  latestNickname: string | null;
  latestOccupation: string | null;
  latestPersonaTrait?: string | null;
  latestDepthRating: string | null;
  latestDossierAt: string | null;
  userBankCount: number;
  taskCount: number;
  echoCount: number;
}

export interface AdminUserDetails {
  user: {
    id: string;
    email: string;
    generation: number;
    createdAt: string;
    deletedAt: string | null;
    tokenInvalidatedAt: string | null;
  };
  basicInfo?: ChapterOneData | null;
  devices: {
    deviceId: string;
    lastLoginAt: string;
    createdAt: string;
  }[];
  dossiers: {
    id: string;
    nickname: string;
    occupation: string;
    personaTrait: string;
    depthRating: string;
    bankIds?: string | null;
    createdAt: string;
    auditStatus?: string;
    selectedShadowTags?: string[];
  }[];
  banks: {
    id: string;
    title: string;
    subtitle: string;
    questionCount: number;
    isPublished: boolean;
    auditStatus: string;
    createdAt: string;
    updatedAt: string;
  }[];
  tasks: {
    id: string;
    taskId: string;
    status: string;
    acceptedAt: string;
    completedAt: string | null;
  }[];
  echoes: {
    id: string;
    surfaceRole: string;
    shadowDesire: string;
    shadowTag: string;
    echoCount: number;
    auditStatus: string;
    createdAt: string;
  }[];
  /** 该用户卷宗引用的题库 id → 名称（内置 + 自建）。 */
  bankNames: Record<string, string>;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  deletedUsers: number;
  withDossierCount: number;
  withoutDossierCount: number;
  totalRegisteredDossiers: number;
}

export interface AdminUserListParams {
  search?: string;
  hasDossier?: 'all' | 'yes' | 'no';
  status?: 'all' | 'active' | 'deleted';
  sort?: 'createdAt' | 'lastLoginAt' | 'dossierCount' | 'userBankCount' | 'taskCount' | 'echoCount';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AdminUserListResult {
  items: AdminUserSummary[];
  total: number;
  stats: AdminUserStats;
}

export interface PendingAuditCounts {
  banks: number;
  echoes: number;
}

/** 审讯室（测试功能）的运行参数；改这里即可调整每轮 token 预算与对话轮数上限。 */
export interface AdminInterrogationConfig {
  maxTurns: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  /** 实际生效的审讯者系统提示词（服务端已把空值回填为默认文案）。 */
  interrogatorPrompt: string;
  /** 实际生效的总结系统提示词。 */
  summaryPrompt: string;
  updatedAt: string | null;
}

export interface AdminInterrogationSession {
  id: string;
  userId: string;
  email: string | null;
  status: string;
  turnCount: number;
  summaryGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
