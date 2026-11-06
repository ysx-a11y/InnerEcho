import type { BasicInfoContract } from '../../shared/apiContracts';
import type { ChapterOneData } from '../data/chapterStructure';

const KEY_PREFIX = 'innerecho_basic_info_v1:';

export type BasicInfoOwner = `user:${string}` | `device:${string}`;

interface StoredEntry {
  owner: BasicInfoOwner;
  basicInfo: BasicInfoContract;
  savedAt: string;
}

/** 只保留基础文本字段，照片与填写时长不入缓存（与后端档案口径一致）。 */
function sanitize(ch1: ChapterOneData | BasicInfoContract): BasicInfoContract {
  return {
    nickname: (ch1.nickname ?? '').trim(),
    gender: ch1.gender,
    occupation: ch1.occupation,
    personaTrait: ch1.personaTrait,
    age: ch1.age,
    maritalStatus: ch1.maritalStatus,
    hasBoyfriend: ch1.hasBoyfriend,
    surfaceTrait: ch1.surfaceTrait,
    innerDesire: ch1.innerDesire,
  };
}

/**
 * 基础信息本地缓存：按归属（用户或设备）分开存储，
 * 打开页面时零请求恢复；只有缓存缺失才走后端接口。
 */
export const basicInfoStore = {
  ownerFor(userId?: string | null, deviceId?: string): BasicInfoOwner {
    return userId ? `user:${userId}` : `device:${deviceId ?? 'unknown'}`;
  },

  load(owner: BasicInfoOwner): BasicInfoContract | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = window.localStorage.getItem(KEY_PREFIX + owner);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredEntry>;
      if (parsed?.owner !== owner || !parsed.basicInfo?.nickname?.trim()) return null;
      return sanitize(parsed.basicInfo);
    } catch {
      return null;
    }
  },

  save(owner: BasicInfoOwner, chapter1: ChapterOneData | BasicInfoContract): void {
    try {
      if (typeof window === 'undefined') return;
      const basicInfo = sanitize(chapter1);
      if (!basicInfo.nickname) return;
      const entry: StoredEntry = { owner, basicInfo, savedAt: new Date().toISOString() };
      window.localStorage.setItem(KEY_PREFIX + owner, JSON.stringify(entry));
    } catch {
      // 存储失败不影响主流程
    }
  },

  clear(owner: BasicInfoOwner): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(KEY_PREFIX + owner);
    } catch {
      // ignore
    }
  },
};
