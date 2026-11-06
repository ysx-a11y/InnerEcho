import { FullDossierData, calculateBehaviorOpenness } from '../data/chapterStructure';
import { PSYCHOLOGY_ARCHETYPES, PsychologyArchetype } from '../data/psychologyArchetypes';
import type { RestoredDossierContract } from '../../shared/apiContracts';

export interface LlmAnalysisJson {
  credibilityScore?: number;     // 内部评判：乱填还是真实填写 (0-100) -> 前端对普通用户隐藏
  credibilityLevel?: 'high' | 'medium' | 'low'; // 内部可信度等级
  archetypeTitle?: string;        // 阴影原型称号
  archetypeSubtitle?: string;     // 动态描述
  disparityScore?: number;        // 反差张力分
  dominanceIndex?: number;        // 支配指数
  submissionIndex?: number;       // 臣服指数
  restraintIndex?: number;        // 克制指数
  sensoryThreshold?: number;      // 感官阀值
  personaDeconstruction?: string; // 动态生成的人格面具剖析
  shadowDeconstruction?: string;  // 动态生成的潜意识阴影解构
  psychologicalSublimation?: string; // 动态生成的心理升华与建议
  resonanceKeywords?: string[];   // 心理共鸣关键词
  [key: string]: any;
}

export interface FullDossierResult {
  dossierId?: string;
  dossierData: FullDossierData;
  archetype: PsychologyArchetype;
  llmAnalysis: LlmAnalysisJson;
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null;
  resonanceText?: string | null;
  resonanceAt?: string | null;
  behavior: {
    filledCount: number;
    totalCount: number;
    opennessPercent: number;
    opennessTrait: string;
  };
  normalized: {
    awareness: number;
    chaos: number;
    intuition: number;
    structure: number;
  };
}

/**
 * Multi-factor Weighted Credibility Algorithm (0-100 Score)
 * Evaluates duration/dwell time (35%), text depth/length (40%), and anti-keyboard-mashing (25%)
 * INTERNAL ONLY - Never exposed on end-user UI/poster!
 */
function evaluateCredibility(ch1: any, ch2: any, ch3: any): { score: number; level: 'high' | 'medium' | 'low' } {
  // 1. Duration / Dwell Time Weight (35%)
  const totalDuration = (ch1?.durationSeconds || 0) + (ch2?.durationSeconds || 0) + (ch3?.durationSeconds || 0);
  let timeScore = 80;
  if (totalDuration < 6) {
    timeScore = 15; // Heavy penalty for instant 1-second click-through mashing
  } else if (totalDuration < 15) {
    timeScore = 55;
  } else if (totalDuration >= 30) {
    timeScore = 98; // Sincerity bonus for thoughtful reflection time
  }

  // 2. Text Depth & Valid Content Weight (40%)
  const openText = [
    ch1?.innerDesire,
    ch2?.boundaryText,
    ch2?.fantasyText,
    ch2?.relationPreference,
    ch2?.awakeningMoment,
    ch3?.secretWords,
    ch3?.secretRule,
  ].filter(Boolean).join(' ');

  const totalLength = openText.trim().length;
  let textScore = 65;
  if (totalLength >= 60) {
    textScore = 95;
  } else if (totalLength >= 25) {
    textScore = 80;
  } else if (totalLength < 10) {
    textScore = 40; // Privacy defense / minimal input
  }

  // 3. Anti-Keyboard Mashing & Coherence Weight (25%)
  const combinedAll = [ch1?.occupation, ch1?.surfaceTrait, openText].join(' ');
  let mashScore = 95;
  if (/([a-zA-Z0-9])\1{3,}/.test(combinedAll) || /asdf|qwer|zxcv|12345/i.test(combinedAll)) {
    mashScore = 20; // Keyboard mashing penalty
  }

  // Weighted Combination
  const weightedScore = Math.round(timeScore * 0.35 + textScore * 0.40 + mashScore * 0.25);
  const finalScore = Math.max(10, Math.min(100, weightedScore));
  const level = finalScore >= 80 ? 'high' : finalScore >= 50 ? 'medium' : 'low';

  return { score: finalScore, level };
}

// Generates the LLM JSON response matching backend API schema
export function generateLlmJsonAnalysis(data: FullDossierData): LlmAnalysisJson {
  const ch1 = data?.chapter1 || {};
  const ch2 = data?.chapter2 || {};
  const ch3 = data?.chapter3 || {};

  const cred = evaluateCredibility(ch1, ch2, ch3);

  const occ = ch1.occupation || '探索者';
  const ageStr = ch1.age ? `（${ch1.age}）` : '';
  const marital = ch1.maritalStatus || '未婚';
  const surface = ch1.surfaceTrait || '温柔规矩、严肃克制';
  const desire = ch1.innerDesire || '渴望打破日常枷锁，体验一次彻底的失控与反差';
  const boundary = ch2.boundaryText || '隐秘触向';
  const tags = (data?.selectedShadowTags || []).join('、');

  const title = data?.depthRating === 'deep' ? '暗夜破局者' : data?.depthRating === 'medium' ? '双重奏弥散者' : '暗光萌芽者';

  return {
    credibilityScore: cred.score,   // INTERNAL ONLY (Hidden from user poster)
    credibilityLevel: cred.level,   // INTERNAL ONLY ('high' | 'medium' | 'low')
    archetypeTitle: title,
    personaDeconstruction: `作为一名在日常社会中担任【${occ}】的女性${ageStr}，你的婚姻状态为【${marital}】。你在人群中展现出“${surface}”的稳定特质，这构成了你强大且具有保护性的人格面具（Persona）。这种面具让你在现实世界中获得了安全感与社会认同。`,
    shadowDeconstruction: `然而从潜意识与心理张力的视角下，当只有你一个人时，你的内心暗面呈现出强烈的反差——你真正渴望“${desire}”。${boundary && boundary !== '隐秘触向' ? `在暗面边界的试探中，你触及了对“${boundary}”的向往。` : ''} ${tags ? `包含【${tags}】的潜在倾向，是你灵魂深处被压抑但无比鲜活的情感势能。` : ''}`,
    psychologicalSublimation: `不必为你的反差渴望感到困惑。外在的【${surface}】与内在的【${desire}】并非矛盾，而是你心理能量的互相补偿（Compensation）。在彼此绝对信任与安全的私密场域中接纳它，你的灵魂将获得最高级的舒缓与升华。`,
    resonanceKeywords: ['反差觉醒', '心理补偿', '情感共鸣', '角色倒错', '暗面升华'],
  };
}

export function calculateFullDossierResult(
  data: FullDossierData,
  overrideLlmAnalysis?: LlmAnalysisJson,
  dossierId?: string,
  resonanceLevel?: 'exact' | 'partial' | 'guarded' | 'custom' | null,
  resonanceText?: string | null,
  resonanceAt?: string | null
): FullDossierResult {
  const behavior = calculateBehaviorOpenness(data);
  const archetype = PSYCHOLOGY_ARCHETYPES[data.depthRating] || PSYCHOLOGY_ARCHETYPES.medium;
  const llmAnalysis = overrideLlmAnalysis || generateLlmJsonAnalysis(data);

  const chaosScore = data.depthRating === 'deep' ? 88 : data.depthRating === 'medium' ? 68 : 45;
  const awarenessScore = Math.min(98, Math.max(40, behavior.opennessPercent + 15));
  const intuitionScore = Math.min(95, Math.max(35, (data.selectedShadowTags || []).length * 15 + 40));
  const structureScore = Math.min(95, Math.max(25, 100 - behavior.opennessPercent + 30));

  return {
    dossierId,
    dossierData: data,
    archetype,
    llmAnalysis,
    resonanceLevel,
    resonanceText,
    resonanceAt,
    behavior,
    normalized: {
      awareness: awarenessScore,
      chaos: chaosScore,
      intuition: intuitionScore,
      structure: structureScore,
    },
  };
}

/**
 * 用后端返回的历史卷宗行重建可展示的 FullDossierResult。
 * 登录/刷新恢复时后端只回传章节数据 + LLM 分析 JSON，海报所需的行为与归一化维度需在此重建。
 */
export function buildRestoredDossierResult(row: RestoredDossierContract): FullDossierResult | null {
  if (!row || !row.diagnosticResult || typeof row.diagnosticResult !== 'object') return null;
  const dossierData: FullDossierData = {
    chapter1: row.chapter1 ?? { nickname: '' },
    chapter2: row.chapter2 ?? { boundaryText: '', fantasyText: '', relationPreference: '', awakeningMoment: '' },
    chapter3: row.chapter3 ?? { secretWords: '', secretRule: '' },
    selectedShadowTags: row.selectedShadowTags ?? [],
    depthRating: row.depthRating ?? 'medium',
    selectedBankIds: row.bankIds ? row.bankIds.split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
  return calculateFullDossierResult(
    dossierData,
    row.diagnosticResult as LlmAnalysisJson,
    row.id,
    row.resonanceLevel,
    row.resonanceText,
    row.resonanceAt
  );
}
