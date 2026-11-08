/**
 * Telemetry metrics snapshot shape (mirror of src/utils/telemetryTracker.ts).
 * Server keeps its own copy so it doesn't import from the front-end bundle.
 */

import type { UserBankAuditStatus } from '../shared/apiContracts.js';

export interface TelemetryMetrics {
  submitTimestamp: string;
  isDarkMode: boolean;
  isLateNight: boolean;
  totalKeystrokes: number;
  totalBackspaces: number;
  deletionRatePercent: number;
  hesitationPauses: number;
  fieldTelemetryMap: Record<string, unknown>;
  topStruggledFields: { label: string; deletionRate: number; pauses: number; score: number }[];
  flipFlopCount: number;
  flipFlopLog: string[];
  avgTouchDurationMs: number;
  maxTouchForce?: number;
  llmDurationMs?: number;
}

export interface ChapterOneData {
  nickname?: string;
  gender?: string;
  occupation?: string;
  avatarUrl?: string;
  avatarUrls?: string[];
  personaTrait?: string;
  age?: string;
  maritalStatus?: string;
  hasBoyfriend?: string;
  surfaceTrait?: string;
  innerDesire?: string;
  durationSeconds?: number;
}

export interface ChapterTwoData {
  boundaryText?: string;
  fantasyText?: string;
  relationPreference?: string;
  awakeningMoment?: string;
  durationSeconds?: number;
}

export interface ChapterThreeData {
  secretWords?: string;
  secretRule?: string;
  durationSeconds?: number;
}

export interface FullDossierData {
  chapter1?: ChapterOneData;
  chapter2?: ChapterTwoData;
  chapter3?: ChapterThreeData;
  selectedShadowTags?: string[];
  depthRating?: 'light' | 'medium' | 'deep';
  telemetry?: TelemetryMetrics;
  /** Dynamic quiz payload fields (when user came via bank selector flow). */
  selectedBankIds?: string[];
  completedBanks?: unknown[];
  aggregatedScores?: Record<string, number>;
  collectedTags?: string[];
  questionLogs?: unknown[];
  userTextAnswers?: Record<string, string>;
  userMediaAttachments?: Record<string, unknown[]>;
  totalDurationSeconds?: number;
}

/** Output JSON schema returned by LLM (unified across static & dynamic paths). */
export interface LlmAnalysisJson {
  credibilityScore: number;
  credibilityLevel: 'high' | 'medium' | 'low';
  archetypeTitle: string;
  archetypeSubtitle?: string;
  disparityScore?: number;
  dominanceIndex?: number;
  submissionIndex?: number;
  restraintIndex?: number;
  sensoryThreshold?: number;
  personaDeconstruction: string;
  shadowDeconstruction: string;
  psychologicalSublimation: string;
  resonanceKeywords: string[];
  [key: string]: any;
}

export interface AuthUser {
  id: string;
  email: string;
  /** 同邮箱第几次注册（注销后重新注册会递增），用于账号生命周期审计。 */
  generation: number;
  /** ISO 8601 — null when user has not changed password since registration. */
  tokenInvalidatedAt?: string | null;
  /** ISO 8601 — null when account is active. Set when user soft-deletes account. */
  deletedAt?: string | null;
}

/** Aggregate stats for the logged-in user's personal center. */
export interface UserStats {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrls: string[];
  dossierCount: number;
  lastDossierAt: string | null;
  createdAt: string;
}

export interface DossierRow {
  id: string;
  userId: string | null;
  deviceId: string | null;
  email: string | null;
  chapter1: ChapterOneData;
  chapter2: ChapterTwoData;
  chapter3: ChapterThreeData;
  depthRating: 'light' | 'medium' | 'deep';
  selectedShadowTags: string[];
  telemetry: TelemetryMetrics | Record<string, never>;
  diagnosticResult: LlmAnalysisJson | null;
  quizPayload?: any;
  bankIds?: string;
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
  createdAt: string;
}

/** 卷宗轻量摘要（列表/登录恢复用，不含 LLM 全文与 quizPayload）。 */
export interface DossierSummaryContract {
  id: string;
  bankIds: string[];
  createdAt: string;
  chapter1?: ChapterOneData;
  depthRating?: 'light' | 'medium' | 'deep';
  selectedShadowTags?: string[];
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
}

/** 管理端卷宗审核状态。 */
export type AdminAuditStatus = 'pending' | 'approved' | 'flagged';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  categories: string[];
  isActive: boolean;
  isBuiltin: boolean;
  agentId?: string;
  activeVersionId?: string | null;
  activeVersionNum?: number | null;
  remark?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 管理后台卷宗（扁平结构，与旧 Mock 前端字段对齐，方便直接渲染）。
 * 自白类字段已由服务端解密。
 */
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
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
  // 答卷自白明细（服务端已解密）
  q_occupation: string;
  q_surfaceTrait: string;
  q_innerDesire: string;
  q_boundaryText: string;
  q_relationPreference: string;
  q_awakeningMoment: string;
  q_secretWords: string;
  q_secretRule: string;
  /** 原始遥测快照（可选字段，供重新分析等场景使用）。 */
  telemetry?: TelemetryMetrics | Record<string, never>;
  /** 完整诊断结果对象 */
  diagnosticResult?: LlmAnalysisJson | null;
  /** 完整答题及题库载荷对象 */
  quizPayload?: any;
}

export interface AdminDossierSummary {
  id: string;
  nickname: string;
  depthRating: string;
  bankIds: string;
  credibilityScore: number;
  credibilityLevel: string;
  durationSeconds: number;
  createdAt: string;
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
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
  referrerLinks?: { referrer: string; count: number }[];
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

export interface AdminBankTelemetry {
  bankId: string;
  count: number;
  avgDurationSeconds: number;
  avgHesitateIndex: number;
  avgBackspaceRate: number;
  avgFlipFlop: number;
}

export interface AdminQuestionTelemetry {
  bankId: string;
  questionId: string;
  attempts: number;
  avgDurationMs: number;
  avgInteractions: number;
}

export interface AdminTelemetry {
  banks: AdminBankTelemetry[];
  topQuestions: AdminQuestionTelemetry[];
  timeDistribution: { range: string; rate: number }[];
  /** 遥测中出现的题库 id → 名称（内置 + 用户自建），供管理端展示。 */
  bankNames: Record<string, string>;
  isFallbackBaseline?: boolean;
  hourlyTimeline?: { hour: number; count: number }[];
  totalDossiers?: number;
}

/** 用户自建题库的轻量元数据 (列表展示用，不含 questions 数组)。 */
export type {
  UserBankSummaryContract as UserBankSummary,
  UserBankRecordContract as UserBankRecord,
  UserBankAuditStatus,
} from '../shared/apiContracts.js';

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
  auditStatus: UserBankAuditStatus;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBankDetail extends AdminBankSummary {
  questions: unknown[];
  dimensions?: { key: string; name: string; description?: string }[];
}

export interface AdminBankListResult {
  total: number;
  items: AdminBankSummary[];
  stats: {
    totalBanks: number;
    publishedCount: number;
    draftCount: number;
    pendingCount: number;
    rejectedCount: number;
    presetCount: number;
    customCount: number;
    totalQuestions: number;
  };
}

export interface AdminUserSummary {
  id: string;
  email: string;
  generation: number;
  lineageId?: string | null;
  accountStatus?: string;
  adminNotes?: string | null;
  remark?: string | null;
  createdAt: string;
  deletedAt: string | null;
  lastLoginAt: string | null;
  deviceCount: number;
  devices: string[];
  dossierCount: number;
  latestNickname?: string | null;
  latestOccupation?: string | null;
  latestPersonaTrait?: string | null;
  latestDepthRating?: string | null;
  latestDossierAt?: string | null;
  userBankCount: number;
  taskCount: number;
  echoCount: number;
}

export interface AdminUserDetails {
  user: {
    id: string;
    email: string;
    generation: number;
    lineageId?: string | null;
    accountStatus?: string;
    adminNotes?: string | null;
    remark?: string | null;
    createdAt: string;
    deletedAt: string | null;
    tokenInvalidatedAt: string | null;
  };
  lineage?: import('../shared/apiContracts.js').AccountLineageSummary | null;
  lineageGenerations?: Array<{
    id: string;
    email: string;
    generation: number;
    accountStatus: string;
    createdAt: string;
    deletedAt: string | null;
    adminNotes: string | null;
    remark: string | null;
  }>;
  basicInfo?: ChapterOneData | null;
  devices: { deviceId: string; lastLoginAt: string; createdAt: string }[];
  dossiers: {
    id: string;
    nickname: string | null;
    occupation: string | null;
    personaTrait: string | null;
    depthRating: string | null;
    bankIds?: string | null;
    createdAt: string;
    auditStatus: string | null;
    selectedShadowTags: string[];
  }[];
  banks: {
    id: string;
    title: string;
    subtitle: string | null;
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

export interface AdminUserListResult {
  total: number;
  items: AdminUserSummary[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    deletedUsers: number;
    withDossierCount: number;
    withoutDossierCount: number;
    totalRegisteredDossiers: number;
  };
}
