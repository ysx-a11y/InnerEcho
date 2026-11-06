import type { FullDossierData } from '../types.js';

export interface PromptVariableContext {
  user?: {
    nickname?: string;
    occupation?: string;
    persona?: string;
    openConfession?: string;
    relationshipStatus?: string;
    opennessIndex?: number;
  };
  dossier?: {
    scoresTable?: string;
    archetype?: string;
    dimensionDetails?: string;
    answersDetail?: string;
    bankMeta?: string;
  };
  pace?: {
    hesitationSignals?: string;
    modifications?: string;
    paceSummary?: string;
  };
  interrogate?: {
    dossierBrief?: string;
    history?: string;
    turnCount?: number;
    remainingTurns?: number;
  };
  custom?: Record<string, string>;
}

/** 包装用户不可信文本，防御 Prompt 注入攻击 */
export function wrapUntrustedInput(text: string, tag = 'user_confession_untrusted'): string {
  const sanitized = (text || '').trim();
  if (!sanitized) return '';
  return `<${tag}>\n${sanitized}\n</${tag}>`;
}

/**
 * 从完整的卷宗数据中提取标准变量上下文
 */
export function extractDossierVariables(dossierData: FullDossierData): Record<string, string> {
  const ch1 = dossierData?.chapter1 ?? {};
  const completedBanks = (dossierData?.completedBanks as Array<{ title?: string; subtitle?: string; description?: string; questions?: Array<{ id: string; title: string; options?: Array<{ id: string; text: string; subtext?: string }> }> }> | undefined) ?? [];
  const questionLogs = (dossierData?.questionLogs as Array<{ questionId?: string; durationMs?: number; actionLogs?: string[]; finalValue?: { selectedOptions?: string[] } }> | undefined) ?? [];
  const userTextAnswers = dossierData?.userTextAnswers ?? {};

  // 1. 题库元数据
  const bankMeta = completedBanks
    .map((b) => `${b.title || '卷宗'}${b.subtitle ? ` (${b.subtitle})` : ''}: ${b.description || ''}`.trim())
    .join('; ');

  // 2. 作答节奏微信号
  const longDurationLogs = [...questionLogs]
    .filter((log) => (log.durationMs || 0) > 15000)
    .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
    .slice(0, 3)
    .map((log) => `题目 ${log.questionId || '未知'} 停留约 ${Math.round((log.durationMs || 0) / 1000)} 秒`);

  const hesitationSignals = longDurationLogs.length > 0
    ? longDurationLogs.join('；')
    : '答题节奏稳定，无显著纠结留白';

  // 3. 用户表里画像
  const age = (ch1.age || '').trim();
  const marital = (ch1.maritalStatus || '').trim();
  const boyfriend = (ch1.hasBoyfriend || '').trim();
  const relationship = [age, marital, boyfriend].filter(Boolean).join(' | ');

  const nickname = (ch1.nickname || '').trim() || '匿名的来访者';
  const occupation = (ch1.occupation || '').trim() || '未声明职业';
  const persona = (ch1.surfaceTrait || ch1.personaTrait || '').trim() || '未填写人前特征';
  const openConfession = (ch1.innerDesire || '').trim() || '未留下公开自白';

  // 4. 答题详情精炼
  const textConfessions = Object.entries(userTextAnswers)
    .filter(([, text]) => text && text.trim().length > 0)
    .map(([qId, text]) => `[${qId}] ${text.trim()}`)
    .join('\n');

  return {
    'user.nickname': nickname,
    'user.occupation': wrapUntrustedInput(occupation, 'user_occupation'),
    'user.persona': wrapUntrustedInput(persona, 'user_persona'),
    'user.open_confession': wrapUntrustedInput(openConfession, 'user_confession'),
    'user.relationship': relationship,
    'dossier.bank_meta': bankMeta || '标准全景卷宗',
    'dossier.scores_table': '（依据当前答题系统归一化得分表）',
    'dossier.archetype': '深渊引渡者',
    'dossier.dimension_details': '主臣服反差、高克制阈值',
    'dossier.text_confessions': textConfessions || '无额外手填倾诉',
    'pace.hesitation_signals': hesitationSignals,
  };
}

/**
 * 预置模拟数据，用于后台沙盒一键 Dry-Run 试跑演练
 */
export function getPresetMockVariables(): Record<string, string> {
  return {
    'user.nickname': '深海旅人',
    'user.occupation': wrapUntrustedInput('外企合规法务总监', 'user_occupation'),
    'user.persona': wrapUntrustedInput('理性严谨、高冷克制、逻辑清晰的职场精英', 'user_persona'),
    'user.open_confession': wrapUntrustedInput('渴望在安全的边界内卸下所有防备与审视，彻底交出控制权与选择权', 'user_confession'),
    'user.relationship': '28岁 | 单身未婚',
    'dossier.bank_meta': '标准 BDSM 50 题极速全景测评 (权责、控制与感官阈值探索)',
    'dossier.scores_table': '支配指数: 18, 臣服指数: 86, 克制指数: 79, 感官阈值: 92',
    'dossier.archetype': '深渊引渡者',
    'dossier.dimension_details': '显性职业克制极高，隐性臣服需求强烈，存在深刻的表里代偿反差',
    'dossier.text_confessions': '[问题 24] 我厌倦了每天替所有人做决定，希望有人能完全替我做决定。',
    'pace.hesitation_signals': '在第 14 题与第 38 题停留超过 24 秒并反复修改过答案',
    'interrogate.dossier_brief': '28岁外企法务，表面极度克制，实际臣服指数 86。在控制权移交题目上存在显著纠结。',
    'interrogate.history': '主审官: 你为何在第 14 题「完全交付身体控制权」上反复修改？你在害怕什么？\n被审人: 我只是在确认措辞，我并不害怕交付...',
    'interrogate.turn_count': '2',
    'interrogate.remaining_turns': '3',
  };
}

/**
 * 执行动态变量渲染：将模版中的 {{variable.key}} 替换为真实值
 */
export function renderTemplateWithVariables(
  templateText: string,
  variables: Record<string, string>,
  options: { stripUnmatched?: boolean } = {}
): string {
  if (!templateText) return '';

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, varKey: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, varKey)) {
      return variables[varKey] ?? '';
    }
    // 未匹配的占位符：若指定 strip 则置空，否则保留占位符以便调试
    return options.stripUnmatched ? '' : `{{${varKey}}}`;
  });
}

