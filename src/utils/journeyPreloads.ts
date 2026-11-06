import { loadQuestionBankById } from './bankLoader';
import { progressivePreloader } from './progressiveLoading';

/** 推测性预取上限：用户自建题库数量不可控，只对内置题库做有限预取。 */
const MAX_SPECULATIVE_BANK_PRELOADS = 6;

export const journeyLoaders = {
  auth: () => import('../components/AuthModal'),
  bankSelector: () => import('../components/BankSelectorView'),
  basicInfo: () => import('../components/ChapterOneView'),
  quiz: () => import('../components/DynamicQuizEngine'),
  bank: (bankId: string) => loadQuestionBankById(bankId),
};

export function queueHomeJourney(): void {
  progressivePreloader.enqueue('view:auth', journeyLoaders.auth, 100);
  progressivePreloader.enqueue('view:banks', journeyLoaders.bankSelector, 90);
}

export function queueBankJourney(bankIds: string[]): void {
  progressivePreloader.enqueue('view:basic-info', journeyLoaders.basicInfo, 100);
  progressivePreloader.enqueue('view:quiz', journeyLoaders.quiz, 90);
  bankIds
    .filter((bankId) => !bankId.startsWith('ubk_'))
    .slice(0, MAX_SPECULATIVE_BANK_PRELOADS)
    .forEach((bankId, index) => {
      progressivePreloader.enqueue(`bank:${bankId}`, () => journeyLoaders.bank(bankId), 80 - index);
    });
}

export function prioritizeAuth(): Promise<unknown> {
  return progressivePreloader.prioritize('view:auth', journeyLoaders.auth);
}

export function prioritizeBankSelector(): Promise<unknown> {
  return progressivePreloader.prioritize('view:banks', journeyLoaders.bankSelector);
}

export function prioritizeBasicInfo(): Promise<unknown> {
  return progressivePreloader.prioritize('view:basic-info', journeyLoaders.basicInfo);
}

/** 用户明确指向某张题卡时，只优先加载该题库数据（渲染引擎留到点击时）。 */
export function prioritizeBank(bankId: string): Promise<unknown> {
  return progressivePreloader.prioritize(`bank:${bankId}`, () => journeyLoaders.bank(bankId));
}

export function prioritizeQuizAndBank(bankId: string): Promise<unknown> {
  progressivePreloader.pause();
  return Promise.all([
    progressivePreloader.prioritize('view:quiz', journeyLoaders.quiz),
    progressivePreloader.prioritize(`bank:${bankId}`, () => journeyLoaders.bank(bankId)),
  ]).finally(() => progressivePreloader.resume());
}
