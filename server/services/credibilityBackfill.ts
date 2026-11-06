import { db } from '../db.js';
import type { DossierRow } from '../types.js';
import { evaluateInputCredibility } from '../utils/credibility.js';
import { dossierRowToFullDossierData } from './dossierPayload.js';

export interface CredibilityChangeDetail {
  id: string;
  submittedAt: string;
  nickname: string;
  previousScore: number | null;
  previousLevel: string;
  score: number;
  level: 'high' | 'medium' | 'low';
  scoreDelta: number | null;
  reasons: string[];
}

export interface CredibilityBackfillSummary {
  total: number;
  evaluated: number;
  skippedNoTrace: number;
  updated: number;
  changed: number;
  unchanged: number;
  levelTransitions: Record<string, number>;
  reasonCounts: Record<string, number>;
  changes: CredibilityChangeDetail[];
}

/** 把带具体数值的判定依据归并成固定分类，便于统计。 */
function bucketReason(reason: string): string {
  if (reason.includes('无法核验')) return '缺少作答轨迹';
  if (reason.includes('粘贴')) return '整段粘贴无输入过程';
  if (reason.includes('单次输入字数异常')) return '单次输入字数异常';
  if (reason.includes('输入节奏偏快')) return '输入节奏偏快';
  if (reason.includes('零修改率')) return '长文本零修改率';
  if (reason.includes('选项位次')) return '选项位次过于集中';
  if (reason.includes('留白')) return '留白未答过多';
  if (reason.includes('接近机器节奏')) return '停留时长过于整齐';
  if (reason.includes('旧版采集口径缺陷')) return '时间口径（旧版缺陷，仅提示）';
  if (reason.includes('略超整场')) return '时间口径略超（仅提示）';
  if (reason.includes('低于阅读')) return '停留时间过短';
  if (reason.includes('未见异常')) return '未见异常';
  return reason;
}

function readPrevious(analysis: unknown): { score: number | null; level: string } {
  const diagnostic = (analysis ?? {}) as Record<string, unknown>;
  const rawScore = Number(diagnostic.credibilityScore);
  return {
    score: Number.isFinite(rawScore) && diagnostic.credibilityScore !== undefined
      ? Math.round(rawScore)
      : null,
    level: typeof diagnostic.credibilityLevel === 'string' ? diagnostic.credibilityLevel : '未知',
  };
}

/**
 * 存量卷宗可信度重算（不调用 LLM）。
 *
 * 只读回已落库的作答轨迹（questionLogs / telemetry / 文本 / 总时长）重新打分，
 * 并把 credibilityScore、credibilityLevel、credibilityReasons 合并回 diagnostic_result_json，
 * 报告正文与其余字段原样保留。
 *
 * 缺少作答轨迹的卷宗一律跳过、保持原值——这些是银行题库流程上线之前的老数据，
 * 拿不到过程证据，不能因此判低。
 */
export async function recomputeDossierCredibility(
  options: { apply: boolean }
): Promise<CredibilityBackfillSummary> {
  const rows: DossierRow[] = await db.getAllDossierHistory();

  const summary: CredibilityBackfillSummary = {
    total: rows.length,
    evaluated: 0,
    skippedNoTrace: 0,
    updated: 0,
    changed: 0,
    unchanged: 0,
    levelTransitions: {},
    reasonCounts: {},
    changes: [],
  };

  for (const row of rows) {
    const payload = dossierRowToFullDossierData(row);
    if (!Array.isArray(payload.questionLogs) || payload.questionLogs.length === 0) {
      summary.skippedNoTrace += 1;
      continue;
    }

    summary.evaluated += 1;
    const credibility = evaluateInputCredibility(payload);
    const previous = readPrevious(row.diagnosticResult);
    const scoreDelta = previous.score === null ? null : credibility.score - previous.score;
    const levelChanged = previous.level !== credibility.level;

    const transition = `${previous.level} → ${credibility.level}`;
    summary.levelTransitions[transition] = (summary.levelTransitions[transition] ?? 0) + 1;

    if (scoreDelta === 0 && !levelChanged) {
      summary.unchanged += 1;
    } else {
      summary.changed += 1;
      summary.changes.push({
        id: row.id,
        submittedAt: row.createdAt,
        nickname: row.chapter1?.nickname ?? '',
        previousScore: previous.score,
        previousLevel: previous.level,
        score: credibility.score,
        level: credibility.level,
        scoreDelta,
        reasons: credibility.reasons,
      });
    }

    for (const reason of credibility.reasons) {
      const bucket = bucketReason(reason);
      summary.reasonCounts[bucket] = (summary.reasonCounts[bucket] ?? 0) + 1;
    }

    if (options.apply) {
      const merged = {
        ...((row.diagnosticResult ?? {}) as Record<string, unknown>),
        credibilityScore: credibility.score,
        credibilityLevel: credibility.level,
        credibilityReasons: credibility.reasons,
      };
      const ok = await db.updateDossierDiagnostic(row.id, merged);
      if (ok) summary.updated += 1;
    }
  }

  summary.changes.sort((a, b) => Math.abs(b.scoreDelta ?? 0) - Math.abs(a.scoreDelta ?? 0));
  return summary;
}
