import type { InterrogationMessageRow, InterrogationSessionRow } from '../db/repositories/interrogationRepo.js';
import { callLlmChat, type LlmChatMessage } from '../utils/llmChat.js';
import { renderInterrogatorPrompt, resolveSummaryTemplate } from './interrogationPrompts.js';

/** 只依赖审讯用得到的字段，避免把服务端/共享两套 DossierSummary 类型绑死。 */
export interface InterrogationDossierLike {
  chapter1?: {
    nickname?: string;
    age?: string;
    occupation?: string;
    maritalStatus?: string;
    hasBoyfriend?: string;
    personaTrait?: string;
    surfaceTrait?: string;
    innerDesire?: string;
  } | null;
  selectedShadowTags?: string[];
  resonanceText?: string | null;
}

/**
 * 审讯室（测试功能）的提示词与调用编排。
 *
 * 原则：
 * - 只审「档案里写过的」和「本轮对话里说过的」，不替来访者编造经历；
 * - 语气冷、短、追问式，一次只问一个核心问题；
 * - 明确拒绝露骨色情 / 违法指导 / 未成年相关，遇到越界先收回再追问动机。
 */
const MAX_REPLY_SENTENCES = 5;

export function estimateTokens(text: string): number {
  // 粗估：CJK 字符约 1 token/字，其余字符约 4 字符/token。只用于额度判断，不追求精确。
  let cjk = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x2e80) cjk += 1;
  }
  const other = Math.max(0, text.length - cjk);
  return cjk + Math.ceil(other / 4);
}

function describeDossier(dossier: InterrogationDossierLike | null): string {
  if (!dossier?.chapter1) return '（该来访者尚未留下档案，只能依据对话本身提问。）';
  const c = dossier.chapter1;
  const lines = [
    c.nickname ? `称呼：${c.nickname}` : '',
    c.age ? `年龄：${c.age}` : '',
    c.occupation ? `职业：${c.occupation}` : '',
    c.maritalStatus ? `婚姻状态：${c.maritalStatus}` : '',
    c.hasBoyfriend ? `感情状态：${c.hasBoyfriend}` : '',
    c.personaTrait ? `人前面具：${c.personaTrait}` : '',
    c.surfaceTrait ? `外在性格：${c.surfaceTrait}` : '',
    c.innerDesire ? `自述的暗面渴望：${c.innerDesire}` : '',
    dossier.selectedShadowTags?.length ? `阴影标签：${dossier.selectedShadowTags.join('、')}` : '',
    dossier.resonanceText ? `此前回响：${dossier.resonanceText}` : '',
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : '（档案信息很少，只能依据对话本身提问。）';
}

/** 审讯者系统提示词：默认文案在 interrogationPrompts，管理端可覆盖。 */
export function buildInterrogationSystemPrompt(
  dossier: InterrogationDossierLike | null,
  template?: string | null,
): string {
  return renderInterrogatorPrompt(describeDossier(dossier), template);
}

/** 总结系统提示词：默认文案在 interrogationPrompts，管理端可覆盖。 */
export function buildSummarySystemPrompt(template?: string | null): string {
  return resolveSummaryTemplate(template);
}

function toChatMessages(rows: InterrogationMessageRow[]): LlmChatMessage[] {
  return rows
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .map((row) => ({ role: row.role, content: row.content }));
}

function trimHistoryToBudget(
  systemPrompt: string,
  history: LlmChatMessage[],
  userMessage: string,
  maxInputTokens: number
): LlmChatMessage[] | null {
  const budget = Math.max(16, maxInputTokens);
  const base = estimateTokens(systemPrompt) + estimateTokens(userMessage);
  if (base > budget) return null;

  let used = base;
  const kept: LlmChatMessage[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].content);
    if (used + cost > budget) break;
    kept.unshift(history[i]);
    used += cost;
  }
  return kept;
}

export type InterrogationTurnResult =
  | { ok: true; reply: string }
  | { ok: false; code: 'input_too_long' | 'llm_failed' | 'llm_not_configured'; message: string };

export async function runInterrogationTurn(input: {
  dossier: InterrogationDossierLike | null;
  history: InterrogationMessageRow[];
  message: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  /** 管理端自定义的审讯者提示词；空则用默认。 */
  interrogatorPrompt?: string | null;
}): Promise<InterrogationTurnResult> {
  const systemPrompt = buildInterrogationSystemPrompt(input.dossier, input.interrogatorPrompt);
  const history = trimHistoryToBudget(systemPrompt, toChatMessages(input.history), input.message, input.maxInputTokens);
  if (!history) {
    return { ok: false, code: 'input_too_long', message: '这段话太长了，审讯室一次只能处理较短的陈述，请缩短后再试。' };
  }

  const messages: LlmChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: input.message },
  ];

  const result = await callLlmChat({ messages, maxOutputTokens: input.maxOutputTokens, temperature: 0.85 });
  if (!result.ok) {
    if (result.errorMessage === 'Missing LLM_API_KEY') {
      return { ok: false, code: 'llm_not_configured', message: '审讯室暂未配置模型，请稍后再试。' };
    }
    return { ok: false, code: 'llm_failed', message: '审讯者暂时没有回应，请稍后再试。' };
  }

  return { ok: true, reply: clampSentences(result.content ?? '') };
}

function clampSentences(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '……你在回避。说说看，刚才那句话里，哪一部分是你最不想让我追问的？';
  // 只保留前若干句，防止模型无视字数要求写成小作文。
  const parts = normalized.split(/(?<=[。！？!?])/).filter((part) => part.trim().length > 0);
  return parts.slice(0, MAX_REPLY_SENTENCES).join('').trim() || normalized;
}

export function buildFallbackSummary(session: InterrogationSessionRow, messages: InterrogationMessageRow[]): string {
  const userTurns = messages.filter((m) => m.role === 'user').length;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const excerpt = lastUser.length > 60 ? `${lastUser.slice(0, 60)}…` : lastUser;
  return [
    `这场审讯持续了 ${userTurns} 轮（${session.status === 'summarized' ? '已归档' : '到达当前上限'}）。`,
    excerpt ? `你最后留下的话是「${excerpt}」。` : '',
    '真正没有回答的，往往不是审讯者最后问的那个问题，而是你一次次绕开的那一处。',
  ].filter(Boolean).join('');
}

export async function generateInterrogationSummary(input: {
  dossier: InterrogationDossierLike | null;
  session: InterrogationSessionRow;
  messages: InterrogationMessageRow[];
  maxOutputTokens: number;
  /** 管理端自定义的总结提示词；空则用默认。 */
  summaryPrompt?: string | null;
}): Promise<{ summary: string; usedFallback: boolean }> {
  const dialogue = input.messages
    .map((row) => `${row.role === 'user' ? '来访者' : '审讯者'}：${row.content}`)
    .join('\n');

  const result = await callLlmChat({
    messages: [
      { role: 'system', content: buildSummarySystemPrompt(input.summaryPrompt) },
      {
        role: 'user',
        content: [
          '【来访者档案】',
          describeDossier(input.dossier),
          '',
          '【审讯记录】',
          dialogue || '（本轮没有任何有效对话。）',
        ].join('\n'),
      },
    ],
    maxOutputTokens: Math.max(120, Math.min(400, input.maxOutputTokens)),
    temperature: 0.6,
  });

  if (result.ok && result.content) {
    return { summary: result.content, usedFallback: false };
  }
  return { summary: buildFallbackSummary(input.session, input.messages), usedFallback: true };
}
