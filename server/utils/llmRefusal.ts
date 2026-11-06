import type { LlmAnalysisJson } from '../types.js';

export interface StructuredRefusalDetection {
  refused: boolean;
  explicitFields: string[];
  substantiveFieldCount: number;
  reason: string;
}

const CORE_FIELDS = [
  'personaDeconstruction',
  'shadowDeconstruction',
  'psychologicalSublimation',
] as const;

// These patterns describe a complete assistant-side refusal act. They do not
// match isolated words such as “拒绝”, nor user statements such as “我无法拒绝邀请”.
const ASSISTANT_REFUSAL_PATTERNS = [
  /(?:抱歉|对不起|很遗憾)[^。！？\n]{0,24}(?:无法|不能|不便)[^。！？\n]{0,24}(?:提供|生成|完成|进行|撰写|分析|处理|协助)/i,
  /(?:我|本模型|作为(?:一个)?\s*AI)[^。！？\n]{0,18}(?:无法|不能|不便)[^。！？\n]{0,24}(?:提供|生成|完成|进行|撰写|分析|处理|协助)/i,
  /(?:sorry|I\s+(?:cannot|can't|am unable to))[^.!?\n]{0,40}(?:provide|generate|complete|analy[sz]e|assist|help)/i,
];

const REFUSAL_TITLE_PATTERN = /^(?:抱歉)?(?:无法|不能|不便)(?:提供|生成|完成|分析|解读)/;

function containsAssistantRefusalAct(text: string): boolean {
  return ASSISTANT_REFUSAL_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

/**
 * Detect a structured refusal using multiple signals rather than a keyword hit.
 * A normal long-form analysis may discuss refusal or quote “无法回应” safely.
 */
export function detectStructuredRefusal(output: Partial<LlmAnalysisJson>): StructuredRefusalDetection {
  const values = CORE_FIELDS.map((field) => ({ field, text: String(output[field] ?? '').trim() }));
  const explicitFields = values
    .filter(({ text }) => containsAssistantRefusalAct(text))
    .map(({ field }) => field);
  const substantiveFieldCount = values.filter(({ text }) => [...text].length >= 60).length;
  const sparseFieldCount = values.filter(({ text }) => [...text].length < 20).length;
  const titleIsRefusal = REFUSAL_TITLE_PATTERN.test(String(output.archetypeTitle ?? '').trim());

  const repeatedAcrossStructure = explicitFields.length >= 2;
  const refusalWithMissingAnalysis = explicitFields.length >= 1
    && substantiveFieldCount <= 1
    && sparseFieldCount >= 2;
  const refusalAsTitleAndBody = titleIsRefusal && explicitFields.length >= 1;
  const refused = repeatedAcrossStructure || refusalWithMissingAnalysis || refusalAsTitleAndBody;

  return {
    refused,
    explicitFields,
    substantiveFieldCount,
    reason: refused
      ? `structured refusal: explicit=${explicitFields.join(',') || 'title'}, substantive=${substantiveFieldCount}`
      : 'no structured refusal',
  };
}
