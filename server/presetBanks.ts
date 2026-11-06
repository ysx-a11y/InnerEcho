import type { AdminBankSummary, AdminBankDetail } from './types.js';
import { PRESET_BANKS_DATA } from './data/generated/presets.js';

/**
 * 内置题库（只读）。
 *
 * ⚠️ 数据不在这里：题库正文放在 content/banks/*.json（不进 git），
 * 构建前由 scripts/gen-bank-modules.ts 生成 ./data/generated/presets.ts。
 * 这里只保留对外的读取接口，行为与改造前一致（后台内置题库只读）。
 */
export const PRESET_BANKS: Record<string, AdminBankDetail> = PRESET_BANKS_DATA;

export function getPresetBankSummaries(): AdminBankSummary[] {
  return Object.values(PRESET_BANKS)
    .filter((b) => b.isPublished !== false)
    .map(({ questions: _q, dimensions: _d, ...summary }) => summary);
}

export function getPresetBankById(id: string): AdminBankDetail | null {
  return PRESET_BANKS[id] ?? null;
}
