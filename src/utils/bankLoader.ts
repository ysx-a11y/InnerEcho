import type { QuestionBankDefinition, QuestionBankMetadata } from '../types/quizEngine';
import { BANK_IMPORTERS } from '../data/questionBanks/bankRegistry';

/**
 * Fully lazy bank loader: no bank's `questions` array is imported at module
 * load time. Each bank is dynamically imported only when requested.
 * The bank cards in the UI render from ALL_BANK_METADATA (lightweight).
 *
 * 支持两类题库 ID：
 *  - 内置代码题库：'standard_bdsm_50'
 *  - 用户自建题库：'ubk_xxx' 前缀，从 DB /api/banks/public/:id 加载
 */

const loadedBanks: Map<string, QuestionBankDefinition> = new Map();
const inflight: Map<string, Promise<QuestionBankDefinition | null>> = new Map();

/** 合法题目类型白名单。 */
const VALID_QUESTION_TYPES = new Set(['single_choice', 'multiple_choice', 'open_text', 'media_upload']);

/**
 * On-demand load a full bank (including questions) by id.
 * Returns the cached bank if already loaded.
 *
 * - 内置代码题库 ID → 走 dynamic import 懒加载
 * - 'ubk_' 前缀的题库 ID → 走 /api/banks/public/:id 公开端点加载
 */
export async function loadQuestionBankById(bankId: string): Promise<QuestionBankDefinition | null> {
  const cached = loadedBanks.get(bankId);
  if (cached) return cached;

  const existing = inflight.get(bankId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      // 用户自建题库分支
      if (bankId.startsWith('ubk_')) {
        const resp = await fetch(`/api/banks/public/${encodeURIComponent(bankId)}`, {
          credentials: 'include',
        });
        if (!resp.ok) {
          console.warn(`[BankLoader] user bank ${bankId} fetch failed: ${resp.status}`);
          return null;
        }
        const data = await resp.json();
        if (!data?.success || !data?.bank) return null;
        // DB 中 questions 字段是 unknown[]，需要做最小校验后转换为 QuestionDefinition[]
        const bank = userBankRecordToDefinition(data.bank);
        if (bank) {
          loadedBanks.set(bank.id, bank);
          return bank;
        }
        return null;
      }

      // 内置代码题库分支
      let bank: QuestionBankDefinition | null = null;
      const importer = BANK_IMPORTERS[bankId];
      if (importer) {
        const m = await importer();
        // Dynamically find the exported bank object that matches the requested bankId
        const bankKey = Object.keys(m).find((k) => m[k] && m[k].id === bankId);
        if (bankKey) {
          bank = m[bankKey];
        }
      }

      if (bank) {
        loadedBanks.set(bank.id, bank);
        return bank;
      }
    } catch (err) {
      console.warn(`[BankLoader] Failed to lazy load bank "${bankId}":`, err);
    }
    return null;
  })();

  inflight.set(bankId, promise);
  const result = await promise;
  inflight.delete(bankId);
  return result;
}

/**
 * 将 DB 返回的 UserBankRecord 转换为 QuestionBankDefinition。
 * 做最小字段校验：题目必须有 id/title/type，否则过滤掉。
 */
function userBankRecordToDefinition(record: {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  badgeColor?: string | null;
  estimatedMinutes?: number | null;
  questions?: unknown[];
}): QuestionBankDefinition | null {
  if (!record?.id || !record?.title) return null;
  const rawQuestions = Array.isArray(record.questions) ? record.questions : [];
  const questions = rawQuestions
    .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
    .filter((q) => typeof q.id === 'string' && typeof q.title === 'string' && typeof q.type === 'string' && VALID_QUESTION_TYPES.has(q.type as string))
    .map((q) => ({
      ...q,
      bankId: record.id, // 强制对齐 bankId，防止跨库污染
    })) as QuestionBankDefinition['questions'];

  const meta: QuestionBankMetadata = {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle ?? '',
    description: record.description ?? '',
    category: (record.category === 'scientific' || record.category === 'scenario' ? record.category : 'direct'),
    badgeColor: record.badgeColor ?? '#9333ea',
    estimatedMinutes: record.estimatedMinutes ?? undefined,
  };

  return { ...meta, questions };
}

/**
 * 清除指定题库的缓存（创建/更新/删除后调用，确保下次加载拿到最新数据）。
 */
export function clearBankCache(bankId: string): void {
  loadedBanks.delete(bankId);
  inflight.delete(bankId);
}
