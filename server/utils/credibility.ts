import type { FullDossierData, LlmAnalysisJson } from '../types.js';

export type CredibilityFactorKey =
  | 'rhythm'
  | 'monotony'
  | 'completion'
  | 'variance'
  | 'writingTrace';

export interface CredibilityResult {
  score: number;
  level: 'high' | 'medium' | 'low';
  /** 判定依据（仅内部/管理端可见）：这个分数被哪些信号推高或压低。 */
  reasons: string[];
  /** 各因子原始分（0-98，越高越可信）。缺省的因子代表样本不足，已从加权中剔除。 */
  factors: Partial<Record<CredibilityFactorKey, number>>;
}

interface CredibilityQuestionLog {
  questionId?: string;
  durationMs?: number;
  interactionCount?: number;
  isLeftBlank?: boolean;
  finalValue?: {
    selectedOptions?: string[];
    textInput?: string;
  };
}

interface OptionMeta {
  index: number;
  count: number;
}

/**
 * 因子权重。写作痕迹权重最高——它是这套数据里最难伪装的一环：
 * 时长、选项、完成度都可以被"很认真地乱答"刷高，但"有没有真实输入过程"
 * 直接区分真人手写与整段粘贴/AI 代写。
 */
const FACTOR_WEIGHTS: Record<CredibilityFactorKey, number> = {
  writingTrace: 0.25,
  rhythm: 0.2,
  monotony: 0.2,
  variance: 0.15,
  completion: 0.1,
};

/**
 * 完全没有作答轨迹时的兜底分。这不是"判定为假"，而是"无法核验"，
 * 因此不给高分——旧实现遇到空 questionLogs 直接返回 90/high，
 * 等于对"没有任何证据"发放了最高信用。
 */
const NO_EVIDENCE_SCORE = 40;

/** 整场作答的平均单题停留时长分档（毫秒）。 */
function scoreDwell(avgDwellMs: number): { factor: number; reason?: string } {
  if (avgDwellMs < 1000) {
    return {
      factor: 20,
      reason: `平均每题停留仅 ${(avgDwellMs / 1000).toFixed(1)} 秒，低于阅读题干所需时间`,
    };
  }
  if (avgDwellMs < 2000) return { factor: 55 };
  if (avgDwellMs < 4000) return { factor: 80 };
  return { factor: 98 };
}

function readQuestionLogs(dossierData: FullDossierData): CredibilityQuestionLog[] {
  const raw = dossierData?.questionLogs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is CredibilityQuestionLog =>
    Boolean(item) && typeof item === 'object'
  );
}

/** 选项 id → 它在该题中的位次与选项总数，用于识别"一路点第一个"这类直线作答。 */
function buildOptionIndexMap(completedBanks: unknown[]): Map<string, OptionMeta> {
  const map = new Map<string, OptionMeta>();
  for (const bank of completedBanks) {
    const questions = (bank as { questions?: unknown } | null)?.questions;
    if (!Array.isArray(questions)) continue;
    for (const question of questions) {
      const options = (question as { options?: unknown } | null)?.options;
      if (!Array.isArray(options) || options.length === 0) continue;
      options.forEach((option, index) => {
        const id = (option as { id?: unknown } | null)?.id;
        if (typeof id === 'string' && id) map.set(id, { index, count: options.length });
      });
    }
  }
  return map;
}

function resolveAnswerText(
  log: CredibilityQuestionLog,
  userTextAnswers: Record<string, string>
): string {
  const inline = log.finalValue?.textInput;
  if (typeof inline === 'string' && inline.trim()) return inline.trim();
  const key = log.questionId;
  if (key && typeof userTextAnswers[key] === 'string') return userTextAnswers[key].trim();
  return '';
}

/**
 * Answering Credibility Evaluation (0-100 Score)
 *
 * 这套分数衡量的是「这次作答过程本身是否可核验、是否自洽」，
 * 而不是「受访者说的一定是真话」——后者只能由人工审核判定。
 *
 * 六个因子：作答节奏、完成度、节奏方差、选项分布、写作痕迹、交卷自洽性。
 * 样本不足的因子会被剔除并重新归一化权重，避免用缺失数据惩罚受访者。
 * INTERNAL ONLY - 不得展示给普通用户。
 */
export function evaluateInputCredibility(
  dossierData: FullDossierData
): CredibilityResult {
  const questionLogs = readQuestionLogs(dossierData);
  const reasons: string[] = [];
  const factors: CredibilityResult['factors'] = {};
  const caps: number[] = [];

  if (questionLogs.length === 0) {
    return {
      score: NO_EVIDENCE_SCORE,
      level: 'low',
      reasons: ['缺少作答轨迹（questionLogs 为空），本次作答无法核验'],
      factors: {},
    };
  }

  const userTextAnswers = (dossierData?.userTextAnswers ?? {}) as Record<string, string>;
  const totalDurationSeconds = Number(dossierData?.totalDurationSeconds ?? 0);
  const durations = questionLogs.map((log) => Math.max(0, Number(log.durationMs) || 0));
  const perQuestionSumMs = durations.reduce((sum, value) => sum + value, 0);

  const isAnswered = (log: CredibilityQuestionLog): boolean => {
    const selected = log.finalValue?.selectedOptions?.length ?? 0;
    return selected > 0 || resolveAnswerText(log, userTextAnswers).length > 0;
  };
  const answeredLogs = questionLogs.filter((log) => !log.isLeftBlank && isAnswered(log));

  // ── 1. 作答节奏：以整场作答时长为准，而不是单题停留 ──────────────────
  // 单题停留受切题、切后台、页面失焦影响太大，整场时长 / 作答题数更稳。
  let avgDwellMs: number | null = null;
  if (totalDurationSeconds > 0 && answeredLogs.length > 0) {
    avgDwellMs = (totalDurationSeconds * 1000) / answeredLogs.length;
  } else if (perQuestionSumMs > 0 && questionLogs.length > 0) {
    avgDwellMs = perQuestionSumMs / questionLogs.length;
  }
  if (avgDwellMs !== null) {
    const dwell = scoreDwell(avgDwellMs);
    factors.rhythm = dwell.factor;
    if (dwell.reason) reasons.push(dwell.reason);
  }

  // ── 2. 完成度 ────────────────────────────────────────────────────────
  const blankCount = questionLogs.filter((log) => log.isLeftBlank).length;
  const completionRatio = (questionLogs.length - blankCount) / questionLogs.length;
  factors.completion =
    completionRatio >= 0.9 ? 98
      : completionRatio >= 0.6 ? 85
        : completionRatio >= 0.3 ? 50
          : 15;
  if (completionRatio < 0.3) {
    reasons.push(
      `仅有 ${(completionRatio * 100).toFixed(0)}% 的题目留下作答（${blankCount} 道题留白未答）`
    );
    caps.push(30);
  } else if (completionRatio < 0.6) {
    reasons.push(`有 ${blankCount} 道题留白未答`);
    caps.push(55);
  }

  // ── 3. 节奏方差：机器式匀速点击的痕迹 ────────────────────────────────
  const positiveDurations = durations.filter((value) => value > 0);
  if (positiveDurations.length >= 3) {
    const mean = positiveDurations.reduce((sum, value) => sum + value, 0) / positiveDurations.length;
    const variance =
      positiveDurations.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      positiveDurations.length;
    const stdDev = Math.sqrt(variance);
    factors.variance = stdDev < 150 ? 10 : stdDev < 450 ? 50 : stdDev < 800 ? 80 : 98;
    if (factors.variance <= 50) {
      reasons.push('每题停留时长高度整齐，接近机器节奏');
    }
  }

  // ── 4. 选项分布：识别"一路点第一个/最后一个"的直线作答 ────────────────
  // 旧实现按"选项 id 是否重复"统计，而题库里的选项 id 全局唯一
  // （mi_q1_a、mi_q2_c…），因此该因子恒为满分、形同虚设。
  // 这里改为按「选项位次」统计，并对照随机期望值判断集中程度。
  const optionIndex = buildOptionIndexMap(
    Array.isArray(dossierData?.completedBanks) ? dossierData.completedBanks : []
  );
  const selectedPositions: number[] = [];
  const perQuestionPosition: number[] = [];
  let expectedShareSum = 0;
  for (const log of answeredLogs) {
    const selected = (log.finalValue?.selectedOptions ?? []).filter((id) => optionIndex.has(id));
    if (selected.length === 0) continue;
    const metas = selected.map((id) => optionIndex.get(id)!);
    perQuestionPosition.push(Math.min(...metas.map((meta) => meta.index)));
    for (const meta of metas) {
      selectedPositions.push(meta.index);
      expectedShareSum += 1 / Math.max(meta.count, 1);
    }
  }
  if (selectedPositions.length >= 6) {
    const positionCounts = new Map<number, number>();
    for (const position of selectedPositions) {
      positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
    }
    const dominantShare = Math.max(...positionCounts.values()) / selectedPositions.length;
    const chanceShare = expectedShareSum / selectedPositions.length;

    let longestRun = 1;
    let run = 1;
    for (let i = 1; i < perQuestionPosition.length; i += 1) {
      run = perQuestionPosition[i] === perQuestionPosition[i - 1] ? run + 1 : 1;
      if (run > longestRun) longestRun = run;
    }

    // 阈值按线上 207 条真实卷宗的分布标定（dominantShare p75=0.60 / p90=0.80 / p95=0.97，
    // longestRun p75=6 / p90=10 / p95=24）。单选量表天然具有"一贯性"，若以随机基线
    // （1/选项数）作参照，58% 的正常作答都会被误判成直线作答，因此只抓真正的长尾。
    let monotony = 98;
    if (dominantShare >= 0.85 && longestRun >= 8) monotony = 15;
    else if (dominantShare >= 0.75 || longestRun >= 10) monotony = 45;
    else if (dominantShare >= 0.62 || longestRun >= 7) monotony = 75;

    factors.monotony = monotony;
    if (monotony <= 75) {
      reasons.push(
        `选项位次过于集中（同一位置占比 ${(dominantShare * 100).toFixed(0)}%，随机基线 ${(chanceShare * 100).toFixed(0)}%，连续同位置最长 ${longestRun} 题）`
      );
      // 只有极端情形才封顶到 45，中等集中只是降分（对"一贯性强"的正常受访者不失真）
      if (monotony === 15) caps.push(45);
    }
  }

  // ── 5. 写作痕迹：区分"真人手写"与"整段粘贴/AI 代写" ──────────────────
  // 前端每发生一次输入变化记 1 次操作，因此「字数 / 操作数」能直接暴露
  // 粘贴：正常逐字输入约为 1-2 字/次操作，整段粘贴则是几十上百字/次操作。
  let totalTextLength = 0;
  let traceEvaluated = false;
  let writingTrace = 98;
  const traceFlags = new Set<string>();
  for (const log of answeredLogs) {
    const text = resolveAnswerText(log, userTextAnswers);
    if (!text) continue;
    const length = text.length;
    totalTextLength += length;
    if (length < 40) continue;
    if (typeof log.interactionCount !== 'number') continue;
    traceEvaluated = true;
    const operations = Math.max(0, log.interactionCount);
    if (operations <= 2) {
      writingTrace = Math.min(writingTrace, 15);
      traceFlags.add('整段粘贴无输入过程');
      continue;
    }
    const charsPerOperation = length / operations;
    if (charsPerOperation > 8) {
      writingTrace = Math.min(writingTrace, 45);
      traceFlags.add('单次输入字数异常');
    } else if (charsPerOperation > 4) {
      writingTrace = Math.min(writingTrace, 80);
      traceFlags.add('输入节奏偏快');
    }
  }
  const telemetry = dossierData?.telemetry;
  if (
    traceEvaluated
    && totalTextLength >= 150
    && telemetry
    && Number(telemetry.totalBackspaces) === 0
    && Number(telemetry.deletionRatePercent) === 0
  ) {
    writingTrace = Math.min(writingTrace, 80);
    traceFlags.add('长文本零修改率');
  }
  if (traceEvaluated) {
    factors.writingTrace = writingTrace;
    if (traceFlags.size > 0) {
      reasons.push(`手填文本缺少真实输入痕迹：${[...traceFlags].join('、')}`);
      if (writingTrace <= 15) caps.push(45);
    }
  }

  // ── 6. 时间口径：只提示，不扣分 ──────────────────────────────────────
  // 单题停留合计本不应超过整场作答时长。但 2026-10-06 之前采集的卷宗存在
  // 重复累加的缺陷（线上 268 条里 268 条命中，中位数被放大 14 倍），把它计入
  // 扣分等于对全部历史受访者无差别降低信用，而且不携带任何受访者行为信息。
  // 因此这里只作为数据质量提示保留在判定依据里。
  if (totalDurationSeconds > 0 && perQuestionSumMs > 0) {
    const ratio = perQuestionSumMs / (totalDurationSeconds * 1000);
    if (ratio > 1.15) {
      reasons.push(
        `单题停留合计为整场作答时长的 ${ratio.toFixed(1)} 倍：属旧版采集口径缺陷，仅作提示、不计入扣分`
      );
    } else if (ratio > 1.02) {
      reasons.push('单题停留合计略超整场作答时长，仅作提示、不计入扣分');
    }
  }

  // ── 加权（按可用因子重新归一化）────────────────────────────────────
  const available = (Object.keys(FACTOR_WEIGHTS) as CredibilityFactorKey[])
    .filter((key) => factors[key] !== undefined);
  const weightSum = available.reduce((sum, key) => sum + FACTOR_WEIGHTS[key], 0);
  const weighted = available.reduce(
    (sum, key) => sum + (factors[key] as number) * FACTOR_WEIGHTS[key],
    0
  ) / (weightSum || 1);

  const capped = caps.length > 0 ? Math.min(weighted, ...caps) : weighted;
  const score = Math.max(10, Math.min(100, Math.round(capped)));
  const level: CredibilityResult['level'] = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

  if (reasons.length === 0) {
    reasons.push('作答节奏、选项分布与输入痕迹均未见异常');
  }

  return { score, level, reasons, factors };
}

export function generateFallbackAnalysis(dossierData: FullDossierData, cred: CredibilityResult): LlmAnalysisJson {
  const ch1 = dossierData?.chapter1 ?? {};
  const completedBanks = (dossierData?.completedBanks as { title?: string }[] | undefined) ?? [];
  const bankTitle = completedBanks[0]?.title || '深层特质探索';

  const occ = ch1.occupation || '自由表达者';
  const surface = ch1.surfaceTrait || ch1.personaTrait || '随和、合群、符合社交期待';
  const desire = ch1.innerDesire || '探寻内在的真实自我，获得精神上的深度共鸣与释怀';

  const titles = ['边界探索者', '特质解构客', '心流共鸣者', '内在守望者'];
  const chosenTitle = titles[Math.floor(Math.random() * titles.length)];

  return {
    credibilityScore: cred.score,
    credibilityLevel: cred.level,
    credibilityReasons: cred.reasons,
    archetypeTitle: chosenTitle,
    archetypeSubtitle: `${bankTitle} · 潜能探索`,
    disparityScore: Math.round(65 + Math.random() * 25),
    personaDeconstruction: `在日常生活与社会交往中，你通常展现出“${surface}”的外在特质。作为【${occ}】，你习惯性地维持着稳健、成熟且符合外界期待的表现，这是你应对日常挑战与社交互动的理性防线。你在白昼里将自己的行为调整得井然有序，默默承担着角色赋予你的期望。`,
    shadowDeconstruction: `然而，通过在《${bankTitle}》中的作答选择与心声倾诉，显露出你内在深处独特的特质与精神张力。当卸下日常防备时，你真正渴望的是“${desire}”。这种外在表现出的平稳与内在潜藏的真实渴求，构成了你丰富而有张力的多维心灵画卷。`,
    psychologicalSublimation: `请温和地接纳你外在的坚韧与内在的柔软。外在的得体表现与内心的真实诉求并不是冲突的，而是你心灵自我调节、维持心理平衡的自然代偿。允许自己拥有多样的心理维度，在安全的环境里多给自己的真实偏好留出呼吸的空间。`,
    resonanceKeywords: ['自我探索', '表里对冲', '潜在动机', '真实共鸣'],
  };
}
