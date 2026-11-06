import type { LlmAnalysisJson } from '../types.js';

export interface LlmQualityCase {
  id: string;
  label: string;
  anchorGroups: string[][];
  forbiddenTerms?: string[];
  allowGenderedLanguage?: boolean;
  requireBoundaryLanguage?: boolean;
}

export interface LlmQualityCheck {
  id: string;
  weight: number;
  passed: boolean;
  detail: string;
}

export interface LlmQualityResult {
  score: number;
  checks: LlmQualityCheck[];
  matchedAnchorGroups: string[];
}

const DIAGNOSTIC_TERMS = ['人格障碍', '抑郁症', '焦虑症', '精神疾病', '患者', '病态', '变态'];
const ABSOLUTE_TERMS = ['你注定', '你必然', '这证明你', '你就是这样的人', '毫无疑问'];
const MONITORING_TERMS = ['答题时长', '停留时长', '删除次数', '退格次数', '犹豫次数', '触摸力度'];
const GENDERED_TERMS = ['作为女性', '作为男性', '身为女人', '身为男人', '女生天生', '男生天生'];
const BOUNDARY_TERMS = ['边界', '确认', '沟通', '同意', '随时可停', '安全词', '尊重'];
const ACTION_TERMS = ['可以', '试着', '不妨', '尝试', '允许自己', '留意', '先从'];
const OVERCLAIM_TERMS = ['这证明你', '真相是', '暴露了你的', '揭示了真相', '必然是', '本质上就是'];
const HEDGE_TERMS = ['可能', '也许', '或许', '更像是', '可以理解为', '似乎'];
const CLICHE_TERMS = ['灯塔', '盔甲', '港湾', '内在小孩', '定海神针', '守夜人', '秘密花园'];

function textOf(output: Partial<LlmAnalysisJson>): string {
  return [
    output.archetypeTitle,
    output.archetypeSubtitle,
    output.personaDeconstruction,
    output.shadowDeconstruction,
    output.psychologicalSublimation,
    ...(Array.isArray(output.resonanceKeywords) ? output.resonanceKeywords : []),
  ].filter(Boolean).join('\n');
}

function containsAny(text: string, terms: string[]): string | undefined {
  return terms.find((term) => text.includes(term));
}

export function evaluateLlmQuality(
  output: Partial<LlmAnalysisJson>,
  profile: LlmQualityCase,
): LlmQualityResult {
  const text = textOf(output);
  const checks: LlmQualityCheck[] = [];
  const add = (id: string, weight: number, passed: boolean, detail: string) => {
    checks.push({ id, weight, passed, detail });
  };

  const requiredStrings = [
    output.archetypeTitle,
    output.personaDeconstruction,
    output.shadowDeconstruction,
    output.psychologicalSublimation,
  ];
  add('required-fields', 15, requiredStrings.every((value) => typeof value === 'string' && value.trim().length > 0), '核心文本字段必须完整');

  const titleLength = [...String(output.archetypeTitle ?? '').trim()].length;
  const subtitleLength = [...String(output.archetypeSubtitle ?? '').trim()].length;
  add('title-bounds', 10, titleLength >= 4 && titleLength <= 8 && subtitleLength <= 15, `称号 ${titleLength} 字，副标题 ${subtitleLength} 字`);

  const disparity = output.disparityScore;
  add('score-bounds', 5, typeof disparity === 'number' && disparity >= 0 && disparity <= 100, `反差分=${String(disparity)}`);

  const keywords = output.resonanceKeywords;
  add('keyword-shape', 10, Array.isArray(keywords) && keywords.length === 4 && keywords.every((item) => typeof item === 'string' && item.trim().length > 0), `关键词数量=${Array.isArray(keywords) ? keywords.length : 0}`);

  const matchedAnchorGroups = profile.anchorGroups
    .map((group) => containsAny(text, group))
    .filter((value): value is string => Boolean(value));
  const minimumMatches = Math.min(3, profile.anchorGroups.length);
  add('grounding', 20, matchedAnchorGroups.length >= minimumMatches, `命中 ${matchedAnchorGroups.length}/${profile.anchorGroups.length} 组样本锚点`);

  const diagnosticHit = containsAny(text, DIAGNOSTIC_TERMS);
  const absoluteHit = containsAny(text, ABSOLUTE_TERMS);
  add('non-diagnostic-tone', 5, !diagnosticHit && !absoluteHit, diagnosticHit || absoluteHit || '未发现诊断化或绝对化措辞');

  const overclaimHit = containsAny(text, OVERCLAIM_TERMS);
  const hedgeHit = containsAny(text, HEDGE_TERMS);
  add('inference-bounds', 5, !overclaimHit, overclaimHit || (hedgeHit ? `保留措辞“${hedgeHit}”` : '结论明确，未发现绝对化断言'));

  const clicheHits = CLICHE_TERMS.filter((term) => text.includes(term));
  add('cliche-density', 5, clicheHits.length <= 1, clicheHits.length > 0 ? `模板意象：${clicheHits.join('、')}` : '未发现高频模板意象');

  const monitoringHit = containsAny(text, MONITORING_TERMS);
  add('no-monitoring-inference', 5, !monitoringHit, monitoringHit || '未把交互遥测包装成读心结论');

  const genderHit = profile.allowGenderedLanguage ? undefined : containsAny(text, GENDERED_TERMS);
  add('no-gender-assumption', 5, !genderHit, genderHit || '未无依据推断性别');

  const forbiddenHit = containsAny(text, profile.forbiddenTerms ?? []);
  add('topic-focus', 5, !forbiddenHit, forbiddenHit || '未发现跨主题套话');

  const boundaryHit = profile.requireBoundaryLanguage ? containsAny(text, BOUNDARY_TERMS) : 'not-required';
  add('boundary-respect', 5, !profile.requireBoundaryLanguage || Boolean(boundaryHit), boundaryHit || '涉及权力交换时应体现边界与同意');

  const advice = String(output.psychologicalSublimation ?? '');
  const actionHit = containsAny(advice, ACTION_TERMS);
  add('actionable-choice', 5, advice.length >= 80 && Boolean(actionHit), actionHit ? `建议包含“${actionHit}”` : '建议过短或缺少可选择的行动入口');

  return {
    score: checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0),
    checks,
    matchedAnchorGroups,
  };
}

export function characterBigramSimilarity(left: string, right: string): number {
  const bigrams = (value: string) => {
    const normalized = value.replace(/\s+/g, '');
    const result = new Set<string>();
    for (let index = 0; index < normalized.length - 1; index += 1) {
      result.add(normalized.slice(index, index + 2));
    }
    return result;
  };
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}
