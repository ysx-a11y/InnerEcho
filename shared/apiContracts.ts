/** Small, runtime-free contracts shared by the browser and Express server. */

export interface SessionUser {
  id: string;
  email: string;
}

/** 登录/会话恢复时后端返回的历史卷宗行（含章节数据 + LLM 分析结果）。 */
export interface RestoredDossierContract {
  id: string;
  chapter1: {
    nickname: string;
    avatarUrls: string[];
    avatarUrl: string;
    occupation: string;
    personaTrait: string;
    age: string;
    maritalStatus: string;
    hasBoyfriend: string;
    surfaceTrait: string;
    innerDesire: string;
  };
  chapter2: {
    boundaryText: string;
    fantasyText: string;
    relationPreference: string;
    awakeningMoment: string;
  };
  chapter3: {
    secretWords: string;
    secretRule: string;
  };
  depthRating: 'light' | 'medium' | 'deep';
  selectedShadowTags: string[];
  /** 逗号分隔的题库 ID 串（与后端 DossierRow.bankIds 对齐）。 */
  bankIds?: string;
  diagnosticResult?: unknown;
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
  createdAt: string;
}

/**
 * 卷宗轻量摘要：仅含解锁/展示所需的基础资料与题库标识，
 * 不含 LLM 分析全文与 quizPayload，报告全文按需通过 GET /api/dossiers/:id 加载。
 */
export interface DossierSummaryContract {
  id: string;
  bankIds: string[];
  createdAt: string;
  chapter1?: {
    nickname: string;
    avatarUrls: string[];
    avatarUrl: string;
    occupation: string;
    personaTrait: string;
    age: string;
    maritalStatus: string;
    hasBoyfriend: string;
    surfaceTrait: string;
    innerDesire: string;
  };
  depthRating?: 'light' | 'medium' | 'deep';
  selectedShadowTags?: string[];
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
}

/**
 * 第一章基础信息轻量契约（不含照片与填写时长）：
 * 登录/会话恢复与匿名设备恢复时回传，用于跨会话/跨设备预填表单与解锁门禁。
 */
export interface BasicInfoContract {
  nickname: string;
  gender?: string;
  occupation?: string;
  personaTrait?: string;
  age?: string;
  maritalStatus?: string;
  hasBoyfriend?: string;
  surfaceTrait?: string;
  innerDesire?: string;
}

/**
 * 题库完成情况条目：登录用户按账号、匿名访客按设备标识聚合。
 * 只描述"做过几次、什么时候做过"，不含报告正文、私密原文与内部可信度。
 */
export interface BankCompletionEntryContract {
  bankId: string;
  count: number;
  firstAt: string;
  lastAt: string;
  /** 最近一次完成该题库的卷宗 ID，用于和服务端计数去重（避免同一次作答被算两次）。 */
  lastDossierId: string;
}

export interface BankCompletionResponse {
  success: boolean;
  completions: BankCompletionEntryContract[];
  message?: string;
}

/** 单次作答的可对比指标（复测对比用；不含报告正文、私密原文与内部可信度）。 */
export interface DossierAttemptMetricsContract {
  dossierId: string;
  createdAt: string;
  depthRating: 'light' | 'medium' | 'deep';
  archetypeTitle: string | null;
  archetypeSubtitle: string | null;
  disparityScore: number | null;
  dominanceIndex: number | null;
  submissionIndex: number | null;
  restraintIndex: number | null;
  sensoryThreshold: number | null;
  selectedShadowTags: string[];
}

export interface RetestComparisonResponse {
  success: boolean;
  bankId?: string;
  bankTitle?: string | null;
  /** 按时间升序排列的作答指标：attempts[0] 是首次，最后一项是最近一次。 */
  attempts?: DossierAttemptMetricsContract[];
  message?: string;
}

export interface AuthSessionResponse<TDossier = DossierSummaryContract> {
  success: boolean;
  user?: SessionUser;
  latestDossier?: TDossier;
  /** 用户档案基础信息（未填写过则为 null）。 */
  basicInfo?: BasicInfoContract | null;
  message?: string;
}

export interface LlmProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AnalyzeDossierRequest<TDossier = unknown> {
  dossierData: TDossier;
  customConfig?: LlmProviderConfig;
}

/** 服务端入参校验失败时回传的 zod issue（只声明前端会用到的字段）。 */
export interface ZodIssueContract {
  path: Array<string | number>;
  message: string;
}

export interface AnalyzeDossierResponse<TResult = unknown> {
  success: boolean;
  data?: TResult;
  /** True only after the dossier transaction has been durably written. */
  saved?: boolean;
  /** Server-generated persistence identifier; present whenever saved is true. */
  dossierId?: string;
  isFallback?: boolean;
  /** LLM 调用失败或返回明显异常结果（如四维全 0），前端可据此提供一次手动重试。 */
  llmFailed?: boolean;
  error?: string;
  message?: string;
  /** 仅当入参校验失败（HTTP 400）时返回，用于把字段级原因透传给用户。 */
  zodErrors?: ZodIssueContract[];
}

/** 用户主动重跑 LLM 深度诊断（覆盖原诊断结果，不新增卷宗）。 */
export interface ReanalyzeDossierResponse<TResult = unknown> {
  success: boolean;
  data?: TResult;
  /** 重跑后仍失败或返回明显异常结果时为 true。 */
  llmFailed?: boolean;
  message?: string;
}

/** 用户自建题库审核状态。 */
export type UserBankAuditStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface UserBankSummaryContract {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'scientific' | 'direct' | 'scenario' | 'preference';
  badgeColor: string | null;
  estimatedMinutes: number | null;
  questionCount: number;
  isPublished: boolean;
  /** draft=草稿 / pending=待审核 / approved=已通过（公开） / rejected=未通过。 */
  auditStatus: UserBankAuditStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserBankRecordContract<TQuestion = unknown> extends UserBankSummaryContract {
  questions: TQuestion[];
}

/** 用户端全网公开模糊化统计数据契约 */
export interface GlobalStatsContract {
  /** 模糊化总卷宗数展示（例如 "500+"、"1.2k+"、"10k+"） */
  fuzzedDossierCount: string;
  /** 模糊化探索灵魂总数展示（例如 "300+"、"800+"） */
  fuzzedExplorerCount: string;
  /** 深度等级分布百分比（整量四舍五入） */
  depthDistribution: {
    light: number;
    medium: number;
    deep: number;
  };
  /** 全网平均反差张力指数（0-100，整量四舍五入） */
  averageDisparityScore: number;
  /** TOP 阴影倾向标签与全网占比（仅保留标准预置标签，K-匿名阈值 >= 5） */
  topShadowTendencies: Array<{
    tag: string;
    percentage: number;
  }>;
  /** 四维潜意识能量全网基准均值（0-100，整量四舍五入） */
  dimensionAverages: {
    dominance: number;
    submission: number;
    restraint: number;
    sensory: number;
  };
  /** 职业 vs 潜意识反差力学洞察（K-匿名聚合，严禁暴露小众/私密文本） */
  occupationInsights: Array<{
    occupationGroup: string;
    topTrait: string;
    contrastPercentage: number;
  }>;
  /** 阴影原型宏观分布百分比 */
  archetypeDistribution: Array<{
    archetype: string;
    percentage: number;
  }>;
}

export interface GlobalStatsResponse {
  success: boolean;
  stats?: GlobalStatsContract;
  message?: string;
}

/** 回响审核状态：pending=待审核 / approved=已通过公开 / rejected=未通过 / flagged=已下架 */
export type EchoAuditStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface EchoWhisperContract {
  id: string;
  surfaceRole: string;
  shadowDesire: string;
  shadowTag: string;
  fuzzedEchoes: string;
  echoCount: number;
  isResonated: boolean;
  /** 系统预置的示例回声（device_id=system_preset），用于回响池冷启动填充 */
  isPreset?: boolean;
  isMine?: boolean;
  auditStatus?: EchoAuditStatus;
  createdAt: string;
}

export interface EchoListResponse {
  success: boolean;
  items: EchoWhisperContract[];
  myPendingEchoes?: EchoWhisperContract[];
  hasMore?: boolean;
  message?: string;
}

export interface CreateEchoRequest {
  surfaceRole: string;
  shadowDesire: string;
  shadowTag: string;
}

export interface CreateEchoResponse {
  success: boolean;
  echo?: EchoWhisperContract;
  message?: string;
}

export interface ResonateEchoResponse {
  success: boolean;
  fuzzedEchoes?: string;
  echoCount?: number;
  isResonated?: boolean;
  message?: string;
}

export interface AdminEchoWhisperContract {
  id: string;
  surfaceRole: string;
  shadowDesire: string;
  shadowTag: string;
  echoCount: number;
  auditStatus: EchoAuditStatus;
  createdAt: string;
  deviceId: string;
  userId: string | null;
  adminNotes?: string | null;
  remark?: string | null;
}

export interface AdminEchoListResponse {
  success: boolean;
  items: AdminEchoWhisperContract[];
  total: number;
  message?: string;
}

export interface SpecialEvaluationResult {
  id: string;
  taskType: string;
  price: number;
  selfEvaluation: string;
  rank: number;
  totalParticipants: number;
  defeatedPercentage: number;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  cooldownRemainingSeconds: number;
}

export interface SpecialTaskResponse {
  success: boolean;
  evaluation?: SpecialEvaluationResult | null;
  message?: string;
  cooldownRemainingSeconds?: number;
}

export interface SpecialPriceLeaderboardItem {
  id: string;
  nickname: string;
  price: number;
  selfEvaluation: string;
  upvotes: number;
  downvotes: number;
  netScore: number;
  rank: number;
  createdAt: string;
  userVote: 'up' | 'down' | null;
}

export interface SpecialPriceMyStatus {
  id: string | null;
  rank: number | null;
  price: number | null;
  selfEvaluation: string | null;
  upvotes: number;
  downvotes: number;
  netScore: number;
  totalParticipants: number;
  hasSubmitted: boolean;
  userVote: 'up' | 'down' | null;
}

export interface SpecialPriceLeaderboardResponse {
  success: boolean;
  top10: SpecialPriceLeaderboardItem[];
  myStatus: SpecialPriceMyStatus;
  userVotes: Record<string, 'up' | 'down'>;
  message?: string;
}

/** 管理端时段筛选范围：今日 / 昨日 / 本周 / 本月 / 本季 / 本年 / 指定日期。 */
export type AdminTimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/* ============================================================================
 * 审讯室（测试功能）
 * 只对已登录账号开放，会话与消息全部按 user_id 归属，不读取设备指纹。
 * ========================================================================== */

export type InterrogationStatus = 'active' | 'exhausted' | 'summarized';

export interface InterrogationConfigContract {
  maxTurns: number;
  maxInputTokens: number;
  maxOutputTokens: number;
}

export interface InterrogationSessionContract {
  id: string;
  status: InterrogationStatus;
  turnCount: number;
  summary: string | null;
  summaryGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterrogationMessageContract {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface InterrogationStateResponse {
  success: boolean;
  config: InterrogationConfigContract;
  session: InterrogationSessionContract | null;
  messages: InterrogationMessageContract[];
  remainingTurns: number;
  hasDossier: boolean;
}

export interface InterrogationTurnResponse {
  success: boolean;
  reply?: string;
  session?: InterrogationSessionContract;
  remainingTurns?: number;
  code?: 'no_dossier' | 'exhausted' | 'closed' | 'input_too_long' | 'llm_failed' | 'llm_not_configured';
  message?: string;
}

export interface InterrogationSummaryResponse {
  success: boolean;
  summary?: string;
  session?: InterrogationSessionContract;
  usedFallback?: boolean;
  code?: 'no_session' | 'not_finished' | 'llm_failed';
  message?: string;
}

/** 动态数据字典大类 */
export interface SysDictType {
  code: string;
  name: string;
  description: string | null;
  remark: string | null;
  isSystem: number;
  createdAt: string;
  updatedAt: string;
}

/** 动态数据字典子项 */
export interface SysDictItem {
  id: string;
  typeCode: string;
  value: string;
  label: string;
  badgeColor: string;
  badgeVariant: string;
  sortOrder: number;
  isDefault: number;
  isActive: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 有限状态机流转规则 */
export interface SysStateTransition {
  id: string;
  typeCode: string;
  fromValue: string;
  toValue: string;
  actionName: string;
  requiredRole: string;
  isAllowed: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 根账号血缘摘要 */
export interface AccountLineageSummary {
  id: string;
  rootKey: string;
  firstRegisteredAt: string;
  lastActiveAt: string;
  totalGenerations: number;
  currentUserId: string | null;
  riskLevel: string;
  isBlocked: number;
  adminNotes: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/** AI 智能体契约 */
export interface AiAgentContract {
  id: string;
  agentKey: string;
  name: string;
  description: string;
  interactionMode: 'analysis' | 'chat' | 'summary';
  defaultModel: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  outputSchema: string;
  status: string;
  remark: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

/** 提示词不可变版本快照 */
export interface PromptVersionContract {
  id: string;
  templateId: string;
  versionNum: number;
  systemPrompt: string;
  userPromptTemplate: string;
  modelParams: Record<string, unknown>;
  changeSummary: string;
  createdBy: string;
  remark: string;
  adminNotes: string;
  createdAt: string;
}

/** 提示词动态变量元数据 */
export interface PromptVariableContract {
  id: string;
  variableKey: string;
  namespace: string;
  label: string;
  description: string;
  mockValue: string;
  remark: string;
  adminNotes: string;
  createdAt: string;
}

/** 沙盒试跑演练请求契约 */
export interface PlaygroundRunRequest {
  agentId?: string;
  templateId?: string;
  versionId?: string;
  draftSystemPrompt?: string;
  draftUserTemplate?: string;
  modelOverride?: string;
  temperatureOverride?: number;
  mockSource?: 'real_dossier' | 'preset_mock';
  dossierId?: string;
  customVariables?: Record<string, string>;
}

/** 沙盒试跑演练响应契约 */
export interface PlaygroundRunResponse {
  success: boolean;
  message?: string;
  renderedFullPrompt: string;
  rawResponse: string;
  parsedJson?: Record<string, unknown> | null;
  validation: {
    isValid: boolean;
    missingFields: string[];
    issues: string[];
  };
  metrics: {
    durationMs: number;
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
    model: string;
  };
}



