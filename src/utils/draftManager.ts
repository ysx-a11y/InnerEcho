import { FullDossierData } from '../data/chapterStructure';

const DRAFT_KEY = 'innerecho_draft_dossier';

/**
 * 草稿软上限（字符数，UTF-16 近似字节）。
 *
 * localStorage 单源通常只有 5MB：9 张压缩后照片的 DataURL 轻易超过它，
 * 直接 setItem 会抛 QuotaExceededError。旧实现只 catch 后放弃，
 * 结果是"照片没存住"连同一整份文字草稿一起丢，用户刷新后什么都找不回来。
 */
const DRAFT_SOFT_LIMIT = 3_500_000;

/** 小于该长度的 data: URL 视为图标级素材，不作为大体积媒体剔除。 */
const MIN_HEAVY_DATA_URL_LENGTH = 4_096;

function isHeavyDataUrl(value: unknown): boolean {
  return (
    typeof value === 'string'
    && value.length >= MIN_HEAVY_DATA_URL_LENGTH
    && value.startsWith('data:')
  );
}

/**
 * 深拷贝并剔除大体积媒体（照片 / 音频 DataURL），文本字段全部保留。
 * 用于草稿超配额时的降级写入：照片只在当前会话内有效，文字才是必须留住的。
 */
function stripHeavyMedia(input: unknown): unknown {
  if (isHeavyDataUrl(input)) return undefined;
  if (Array.isArray(input)) {
    return input
      .map((item) => stripHeavyMedia(item))
      .filter((item) => item !== undefined);
  }
  if (input && typeof input === 'object') {
    const output: Record<string, unknown> = {};
    Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
      if (isHeavyDataUrl(value)) return;
      output[key] = stripHeavyMedia(value);
    });
    return output;
  }
  return input;
}

export const draftManager = {
  saveDraft(data: Partial<FullDossierData>) {
    if (typeof window === 'undefined') return;
    let updated: Partial<FullDossierData>;
    let serialized: string;
    try {
      const existing = this.loadDraft() || {};
      updated = { ...existing, ...data };
      serialized = JSON.stringify(updated);
    } catch (e) {
      console.warn('Failed to serialize draft:', e);
      return;
    }
    try {
      if (serialized.length <= DRAFT_SOFT_LIMIT) {
        localStorage.setItem(DRAFT_KEY, serialized);
        return;
      }
    } catch (e) {
      // 配额被同源其它键占满时，普通体积也会写失败，统一走下面的降级写入。
    }
    // 超上限（典型场景：9 张照片的 DataURL）时不再硬写，
    // 降级为"只留文本"的草稿，保证文字不随照片一起丢。
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(stripHeavyMedia(updated)));
    } catch (e) {
      console.warn('Failed to save draft to localStorage:', e);
    }
  },

  loadDraft(): Partial<FullDossierData> | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  clearDraft() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  },
};
