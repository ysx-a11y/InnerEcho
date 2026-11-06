// InnerEcho 数据驱动问卷引擎通用类型定义

export type QuestionType = 'single_choice' | 'multiple_choice' | 'open_text' | 'media_upload';

export type MediaType = 'image' | 'audio' | 'video' | 'document';

export interface MediaUploadConfig {
  allowedTypes: MediaType[]; // 限定允许的媒体类型 ['image', 'audio', 'video', 'document']
  maxSizeBytes: number;      // 单文件最大字节数限制 (如 30MB = 31457280)
  maxTotalSizeBytes?: number;// 所有附件累计总大小上限 (如 50MB = 52428800)
  maxFileCount: number;      // 最大选择数量限制 (如 1 或 3)
}

export interface MediaAttachment {
  id: string;
  name: string;
  type: MediaType;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;           // 本地 Base64 / ObjectURL 预览
  durationSeconds?: number;  // 语音音频时长
}

export interface OptionDefinition {
  id: string;
  text: string;
  subtext?: string;
  scores?: Record<string, number>; // 动态维度得分 (如 { dominance: 5, disparity: 3 })
  tags?: string[];                 // 关联心理属性标签
}

export interface QuestionDefinition {
  id: string;                      // 题目全局唯一ID (如 'bpi_dom_01')
  bankId: string;                  // 所属题包ID
  title: string;                   // 题目标题
  scenario?: string;               // 场景/情境详细描述
  type: QuestionType;              // 题目类型
  options?: OptionDefinition[];    // 选项列表 (单选/多选可用，数量不限，如 2-6 个)
  maxSelectCount?: number;         // 多选时的选数上限
  placeholder?: string;            // 文本框/上传引导占位语
  sparks?: string[];               // 手填题的灵感预设词列表
  mediaConfig?: MediaUploadConfig; // 多媒体上传限制配置
  isRequired?: boolean;            // 是否必填 (默认 false，支持留白)
}

export type BankCategory = 'scenario' | 'confession' | 'preference' | 'scientific' | 'direct';

export interface QuestionBankDefinition {
  id: string;                      // 题包ID
  title: string;                   // 题包名称 (如 'BPI 科学属性量表')
  subtitle: string;                // 题包副标题
  description: string;             // 题包描述
  category: BankCategory;          // 分类风格（情景演绎、自白问卷、倾向评测等）
  icon?: string;                   // UI 图标名称
  badge?: string;                  // UI 胶囊标签
  estimatedMinutes?: number;       // 预计作答分钟数
  dimensions?: { key: string; name: string; description?: string }[]; // 覆盖维度描述列表
  badgeColor?: string;             // UI 标签颜色
  questions: QuestionDefinition[]; // 题包包含的完整题目列表
}

/** Lightweight metadata for displaying bank cards without loading the questions array. */
export type QuestionBankMetadata = Omit<QuestionBankDefinition, 'questions'> & {
  /** 题库卡片展示排序权重（构建期从 content/display-rules.json 写入；越小越靠前）。 */
  displayRank?: number;
};

/** 题库卡片展示排序规则（运营配置，源文件 content/display-rules.json）。 */
export interface BankDisplayRule {
  id: string;
  rank: number;
  /** id 兜底识别特征：社区题库重新投稿会拿到新 id，用完整标题短语兜底。 */
  titleSignatures: string[];
}

/** 未列入展示规则的题库默认排序权重。 */
export const DEFAULT_BANK_RANK = 500;

// 单题完整埋点日志
export interface SingleQuestionLog {
  questionId: string;
  bankId: string;
  enterTimestamp: number;
  leaveTimestamp?: number;
  durationMs?: number;
  interactionCount: number;
  actionLogs: string[];            // 交互流水 ('select_opt_a', 'switch_opt_b', 'media_upload_img')
  isLeftBlank: boolean;
  finalValue: {
    selectedOptions?: string[];
    textInput?: string;
    mediaAttachments?: MediaAttachment[];
  };
}

// 动态问卷总结载荷 (发送给后端 API)
export interface DynamicQuizPayload {
  selectedBankIds: string[];
  completedBanks: QuestionBankDefinition[];
  aggregatedScores: Record<string, number>; // 归一化/累计维度得分
  collectedTags: string[];
  questionLogs: SingleQuestionLog[];
  userTextAnswers: Record<string, string>;
  userMediaAttachments: Record<string, MediaAttachment[]>;
  totalDurationSeconds: number;
}
