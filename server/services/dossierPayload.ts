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
