import type { BankDisplayRule, QuestionBankMetadata } from '../../types/quizEngine';
import { DEFAULT_BANK_RANK } from '../../types/quizEngine';
import { ALL_BANK_METADATA, BANK_DISPLAY_RULES } from './generated';

/**
 * 题库注册表 —— 只留行为，不留内容。
 *
 * ⚠️ 题库正文不在仓库里：内容放在 content/banks/*.json（已 gitignore），
 * 构建前由 scripts/gen-bank-modules.ts 生成 ./generated/ 下的普通 TS 模块。
 * 因此 ALL_BANK_METADATA / BANK_IMPORTERS / BANK_DISPLAY_RULES 的运行时行为
 * 与改造前完全一致：题库卡片同步渲染，题库本体仍按题库分包懒加载。
 *
 * 新增/修改题库：改 content/banks/*.json → npm run gen:banks。
 */
export { ALL_BANK_METADATA, BANK_DISPLAY_RULES };
export { BANK_IMPORTERS } from './generated';
export { DEFAULT_BANK_RANK };

export type { BankDisplayRule };

/**
 * 获取题库卡片展示排序权重（人妻第一、社死第二、哥哥第三、心相镜像与标准50题放最底）。
 *
 * 优先级：显式规则表 → 元数据里构建期写入的 displayRank → 完整标题兜底 → 默认权重。
 * 显式规则优先，是为了让社区题库重新投稿拿到新 ubk_ id 后仍能按标题蹭回原位；
 * 这里刻意用完整短语而不是"人妻""社死"这类泛词，避免自建题库靠标题蹭到置顶位。
 */
export function getBankDisplayRank(bank: {
  id: string;
  title?: string;
  displayRank?: number;
}): number {
  const byId = BANK_DISPLAY_RULES.find((rule: BankDisplayRule) => rule.id === bank.id);
  if (byId) return byId.rank;

  if (typeof bank.displayRank === 'number') return bank.displayRank;

  const title = bank.title ?? '';
  if (title) {
    const byTitle = BANK_DISPLAY_RULES.find((rule: BankDisplayRule) =>
      rule.titleSignatures.some((signature) => title.includes(signature)),
    );
    if (byTitle) return byTitle.rank;
  }

  return DEFAULT_BANK_RANK;
}

/**
 * 按题库展示规则排序；未列入的题库维持原有相对顺序，
 * 排在哥哥之后、心相镜像与权责谱系之前（依赖 Array#sort 的稳定性）。
 */
export function sortBanksByDisplayOrder<
  T extends { id: string; title?: string; displayRank?: number },
>(banks: T[]): T[] {
  return [...banks].sort((a, b) => getBankDisplayRank(a) - getBankDisplayRank(b));
}

export function getBankMetadataById(id: string): QuestionBankMetadata | undefined {
  return ALL_BANK_METADATA.find((b) => b.id === id);
}
