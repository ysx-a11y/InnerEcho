import type { DossierRow, FullDossierData } from '../types.js';

/**
 * 从已落库卷宗行重建完整问卷载荷。
 *
 * 管理端「重新运行 LLM 深度诊断」与存量可信度重算（scripts/recompute-credibility.ts）
 * 共用这一份映射，避免两处口径漂移导致同一条卷宗算出不同的可信度。
 */
export function dossierRowToFullDossierData(row: DossierRow): FullDossierData {
  const quiz = (row.quizPayload ?? {}) as Record<string, unknown>;
  return {
    chapter1: row.chapter1,
    chapter2: row.chapter2,
    chapter3: row.chapter3,
    selectedShadowTags: row.selectedShadowTags,
    depthRating: row.depthRating,
    telemetry: row.telemetry as FullDossierData['telemetry'],
    selectedBankIds: (row.bankIds ?? '').split(',').filter(Boolean),
    completedBanks: Array.isArray(quiz.completedBanks) ? quiz.completedBanks : [],
    aggregatedScores: (quiz.aggregatedScores ?? {}) as Record<string, number>,
    collectedTags: Array.isArray(quiz.collectedTags) ? quiz.collectedTags : [],
    questionLogs: Array.isArray(quiz.questionLogs) ? quiz.questionLogs : [],
    userTextAnswers: (quiz.userTextAnswers ?? {}) as Record<string, string>,
    userMediaAttachments: (quiz.userMediaAttachments ?? {}) as Record<string, unknown[]>,
    totalDurationSeconds: Number(quiz.totalDurationSeconds ?? 0),
  };
}

/**
 * 剥离内部可信度与防刷判定字段（credibilityScore、credibilityLevel、credibilityReasons）。
 * 
 * 仅用于向普通用户/来访者输出诊断海报与卷宗数据时过滤；
 * 数据库内部持久化与管理端审计接口仍保留完整字段。
 */
export function sanitizeAnalysisForUser<T extends Record<string, unknown>>(
  analysis: T
): Omit<T, 'credibilityScore' | 'credibilityLevel' | 'credibilityReasons'> {
  if (!analysis || typeof analysis !== 'object') return analysis;
  const {
    credibilityScore: _score,
    credibilityLevel: _level,
    credibilityReasons: _reasons,
    ...clean
  } = analysis;
  return clean as Omit<T, 'credibilityScore' | 'credibilityLevel' | 'credibilityReasons'>;
}

