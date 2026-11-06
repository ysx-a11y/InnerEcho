/**
 * LLM 深度解读「明显错误默认值」的判定，前后端共用同一口径：
 * - 服务端在 `callLlm` 里据此决定自动重试一次；
 * - 用户端在恢复历史报告时据此决定是否提供一次手动重试。
 *
 * 只把「确实错了」的返回判定为异常；正常但文风平庸、个别指标为 0 的输出不算，
 * 以免把一次合格的生成反复丢弃。
 */
export interface LlmAnalysisScoreFields {
  dominanceIndex?: number;
  submissionIndex?: number;
  restraintIndex?: number;
  sensoryThreshold?: number;
  personaDeconstruction?: string;
  shadowDeconstruction?: string;
  psychologicalSublimation?: string;
  [key: string]: unknown;
}

export interface DegenerateAnalysisCheck {
  degenerate: boolean;
  reason?: string;
}

/** 四维指标：只有这几个字段同时为 0 时才判定为「0000」型默认值。 */
const INDEX_FIELDS = ['dominanceIndex', 'submissionIndex', 'restraintIndex', 'sensoryThreshold'] as const;

/** 报告正文：三段全部为空说明模型没真正产出内容。 */
const TEXT_FIELDS = ['personaDeconstruction', 'shadowDeconstruction', 'psychologicalSublimation'] as const;

function isBlankText(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function detectDegenerateAnalysis(
  input: LlmAnalysisScoreFields | null | undefined
): DegenerateAnalysisCheck {
  if (!input || typeof input !== 'object') {
    return { degenerate: true, reason: '未返回结构化对象' };
  }

  const record = input as Record<string, unknown>;

  const indices = INDEX_FIELDS.map((field) => record[field]);
  if (indices.every((value) => typeof value === 'number' && value === 0)) {
    return { degenerate: true, reason: '四维指标全部为 0（疑似 0000 默认值）' };
  }

  const texts = TEXT_FIELDS.map((field) => record[field]);
  if (texts.every(isBlankText)) {
    return { degenerate: true, reason: '解读正文全部为空' };
  }

  return { degenerate: false };
}
