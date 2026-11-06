import { QuestionBankDefinition, SingleQuestionLog, QuestionDefinition } from '../types/quizEngine';

export interface ScoreAggregationResult {
  rawScores: Record<string, number>;        // 原始累计得分
  normalizedScores: Record<string, number>; // 归一化百分比得分 (0 - 100)
  dominantDimension: string;                // 最高占位维度
  collectedTags: string[];                  // 收集到的相关属性标签
}

/**
 * 通用分数与维度归纳计算器
 * 摆脱硬编码，自动识别动态得分字典 (Dominance, Submission, Restraint, Disparity, Sensory...)
 */
export function aggregateScores(
  completedBanks: QuestionBankDefinition[],
  logs: SingleQuestionLog[]
): ScoreAggregationResult {
  const rawScores: Record<string, number> = {};
  const maxPossibleScores: Record<string, number> = {};
  const tagsSet = new Set<string>();

  // 1. 建立题目字典快照
  const questionMap = new Map<string, QuestionDefinition>();
  completedBanks.forEach((bank) => {
    bank.questions.forEach((q) => {
      questionMap.set(q.id, q);
    });
  });

  // 2. 遍历用户作答日志，累加真实得分
  logs.forEach((log) => {
    const q = questionMap.get(log.questionId);
    if (!q) return;

    const selectedOptIds = log.finalValue?.selectedOptions || [];
    if (q.options && selectedOptIds.length > 0) {
      selectedOptIds.forEach((optId: string) => {
        const opt = q.options?.find((o) => o.id === optId);
        if (opt) {
          // 收集关联标签
          if (opt.tags) {
            opt.tags.forEach((t: string) => tagsSet.add(t));
          }
          // 动态计分累加
          if (opt.scores) {
            Object.entries(opt.scores).forEach(([dim, val]) => {
              rawScores[dim] = (rawScores[dim] || 0) + (val as number);
            });
          }
        }
      });
    }
  });

  // 3. 计算各个维度的理论最大分，完成归一化
  completedBanks.forEach((bank) => {
    bank.questions.forEach((q) => {
      if (q.options) {
        // 统计此题各维度的最高可能得分
        const dimMax: Record<string, number> = {};
        q.options.forEach((opt) => {
          if (opt.scores) {
            Object.entries(opt.scores).forEach(([dim, val]) => {
              dimMax[dim] = Math.max(dimMax[dim] || 0, val as number);
            });
          }
        });
        Object.entries(dimMax).forEach(([dim, maxVal]) => {
          maxPossibleScores[dim] = (maxPossibleScores[dim] || 0) + maxVal;
        });
      }
    });
  });

  const normalizedScores: Record<string, number> = {};
  let dominantDimension = '';
  let highestScore = -1;

  Object.keys(rawScores).forEach((dim) => {
    const raw = rawScores[dim] || 0;
    const max = maxPossibleScores[dim] || 1;
    const normalized = Math.min(100, Math.round((raw / max) * 100));
    normalizedScores[dim] = normalized;

    if (normalized > highestScore) {
      highestScore = normalized;
      dominantDimension = dim;
    }
  });

  return {
    rawScores,
    normalizedScores,
    dominantDimension: dominantDimension || 'disparity',
    collectedTags: Array.from(tagsSet),
  };
}
