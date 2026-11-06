import type { ChapterOneData } from '../types.js';

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 模糊化统计计数展示 */
export function fuzzCount(count: number): string {
  if (count <= 10) return '10+';
  if (count < 100) return `${Math.floor(count / 10) * 10}+`;
  if (count < 1000) return `${Math.floor(count / 50) * 50}+`;
  const thousands = Math.floor(count / 100) / 10;
  return `${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)}k+`;
}

/**
 * 档案/设备恢复只保留第一章基础字段（文本），
 * 照片（avatarUrl/avatarUrls）与填写时长不随基础信息回传，避免 /me 每次拉大图。
 */
export function sanitizeChapter1ForProfile(ch1: ChapterOneData | undefined): ChapterOneData {
  return {
    nickname: ch1?.nickname ?? '',
    gender: ch1?.gender,
    occupation: ch1?.occupation,
    personaTrait: ch1?.personaTrait,
    age: ch1?.age,
    maritalStatus: ch1?.maritalStatus,
    hasBoyfriend: ch1?.hasBoyfriend,
    surfaceTrait: ch1?.surfaceTrait,
    innerDesire: ch1?.innerDesire,
  };
}

export function analyticsQuestionLogs(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object') return {};
    const log = item as Record<string, unknown>;
    return {
      bankId: log.bankId,
      questionId: log.questionId,
      durationMs: log.durationMs,
      interactionCount: log.interactionCount,
      isLeftBlank: log.isLeftBlank,
    };
  });
}
