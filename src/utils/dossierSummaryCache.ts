import type { DossierSummaryContract } from '../../shared/apiContracts';

const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = 'innerecho:dossier-summaries:v1:';

interface CachedDossierSummaries {
  version: typeof CACHE_VERSION;
  userId: string;
  savedAt: string;
  summaries: DossierSummaryContract[];
}

function cacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function sanitizeSummary(value: unknown): DossierSummaryContract | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DossierSummaryContract>;
  if (typeof candidate.id !== 'string' || !candidate.id) return null;
  if (typeof candidate.createdAt !== 'string' || !candidate.createdAt) return null;
  if (!Array.isArray(candidate.bankIds)) return null;

  return {
    id: candidate.id,
    bankIds: Array.from(new Set(candidate.bankIds.filter((id): id is string => typeof id === 'string' && id.length > 0))),
    createdAt: candidate.createdAt,
  };
}

function sanitizeSummaries(values: readonly unknown[]): DossierSummaryContract[] {
  const seen = new Set<string>();
  const summaries: DossierSummaryContract[] = [];
  for (const value of values) {
    const summary = sanitizeSummary(value);
    if (!summary || seen.has(summary.id)) continue;
    seen.add(summary.id);
    summaries.push(summary);
  }
  return summaries;
}

/**
 * 只缓存题库完成状态所需的轻量字段，不落地用户答案、报告正文或图片。
 * null 表示没有可用缓存；空数组表示已知该用户暂无历史卷宗。
 */
export function loadDossierSummaryCache(userId: string): DossierSummaryContract[] | null {
  try {
    if (typeof window === 'undefined' || !userId) return null;
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedDossierSummaries>;
    if (parsed.version !== CACHE_VERSION || parsed.userId !== userId || !Array.isArray(parsed.summaries)) {
      return null;
    }
    return sanitizeSummaries(parsed.summaries);
  } catch {
    return null;
  }
}

export function saveDossierSummaryCache(userId: string, summaries: readonly DossierSummaryContract[]): void {
  try {
    if (typeof window === 'undefined' || !userId) return;
    const payload: CachedDossierSummaries = {
      version: CACHE_VERSION,
      userId,
      savedAt: new Date().toISOString(),
      summaries: sanitizeSummaries(summaries),
    };
    localStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to cache dossier summaries:', error);
  }
}

export function upsertDossierSummary(
  summaries: readonly DossierSummaryContract[],
  summary: DossierSummaryContract,
): DossierSummaryContract[] {
  const sanitized = sanitizeSummary(summary);
  if (!sanitized) return sanitizeSummaries(summaries);
  return [sanitized, ...sanitizeSummaries(summaries).filter((item) => item.id !== sanitized.id)];
}

export function clearDossierSummaryCache(userId: string): void {
  try {
    if (typeof window === 'undefined' || !userId) return;
    localStorage.removeItem(cacheKey(userId));
  } catch (error) {
    console.warn('Failed to clear dossier summary cache:', error);
  }
}
