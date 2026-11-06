import { getBankMetadataById } from '../data/questionBanks/bankRegistry';

export interface DossierWithBankInfo {
  bankIds?: string | null;
  depthRating?: string | null;
}

export function getQuestionnaireName(
  s: DossierWithBankInfo,
  bankNames: Record<string, string> = {},
): string {
  const titles = (s.bankIds || '')
    .split(',')
    .map((b) => bankNames[b.trim()] ?? getBankMetadataById(b.trim())?.title)
    .filter((t): t is string => Boolean(t));
  if (titles.length > 0) return titles.join(' + ');
  if (s.depthRating === 'deep') return '标准 BDSM 50 题深度卷宗';
  if (s.depthRating === 'medium') return '测测你内心的“隐藏反差面”';
  return '基础探索问卷';
}
