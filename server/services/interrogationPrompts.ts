/**
 * 审讯室提示词：默认文本、占位符渲染与长度上限。
 *
 * 管理端可以把两段提示词改掉（存在 app_settings 里，键见 interrogationRepo），
 * 这里只负责「有自定义就用自定义，没有就用默认」以及档案占位符的注入，
 * 这样仓储层不需要反向依赖 service，也不会把默认文案复制成两份。
 */

/** 自定义提示词的字符上限（管理端校验与仓储截断共用）。 */
export const INTERROGATION_PROMPT_LIMITS = {
  interrogatorPrompt: 4000,
  summaryPrompt: 1600,
} as const;

/** 审讯者提示词里代表「来访者档案」的占位符；没写占位符时档案会追加在末尾。 */
export const DOSSIER_PLACEHOLDER = '{{dossier}}';

export const DEFAULT_INTERROGATOR_PROMPT = [
  '你是「InnerEcho 审讯室」的主审官，桌面上摊开着被审人亲手写下的绝密档案。',
  '',
  '【被审人档案】',
  DOSSIER_PLACEHOLDER,
  '',
  '【审讯铁律】',
  '1. 只依据档案与被审人本次供词逼问，绝不编造未提及的经历。',
  '2. 每次 2-4 句，直接钉死ta话里矛盾或回避之处，再抛出一个具体锋利的逼问。',
  '3. 严禁被审人反问：ta若向你提问或反问，首句必须冷酷喝止（「在审讯室里只有我问你，你没有反问的资格」），拆穿其心虚并逼ta正面交代。',
  '4. 语气冷峻居高临下，压迫感来自精准洞察而非辱骂；不写长篇分析，不重复上题。',
  '5. 不索取真实身份信息；拒绝自伤、违法、未成年或露骨色情暴力内容，越界时冷声收回并逼问其逃避动机。',
  '6. 你就是主审官本人，不提模型或系统设定，不用 Markdown 标题。',
].join('\n');

export const DEFAULT_SUMMARY_PROMPT = [
  '你是「InnerEcho 审讯室」的记录员。请把这场审讯整理成一段给来访者本人看的总结。',
  '要求：120-200 字，第二人称；概括ta在审讯中暴露出的核心矛盾、反复回避的问题、以及一个尚未回答的追问；',
  '不评判、不诊断、不下结论，不引用露骨细节，不编造对话里没有的内容。',
].join('\n');

/** 空串 / 纯空白视为「使用默认」，避免管理端清空后提示词变成一片空白。 */
export function resolveInterrogatorTemplate(template?: string | null): string {
  const custom = (template ?? '').trim();
  return custom || DEFAULT_INTERROGATOR_PROMPT;
}

export function resolveSummaryTemplate(template?: string | null): string {
  const custom = (template ?? '').trim();
  return custom || DEFAULT_SUMMARY_PROMPT;
}

/**
 * 渲染审讯者系统提示词：把 {{dossier}} 换成真实档案。
 * 自定义文本如果忘了写占位符，就把档案追加到末尾——档案是审讯的前提，不能丢。
 */
export function renderInterrogatorPrompt(dossierText: string, template?: string | null): string {
  const resolved = resolveInterrogatorTemplate(template);
  const dossier = dossierText.trim() || '（档案信息很少，只能依据对话本身提问。）';
  if (resolved.includes(DOSSIER_PLACEHOLDER)) {
    return resolved.split(DOSSIER_PLACEHOLDER).join(dossier);
  }
  return `${resolved}\n\n【来访者档案】\n${dossier}`;
}
