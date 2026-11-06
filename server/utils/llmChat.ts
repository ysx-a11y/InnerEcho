import { config } from '../config.js';
import { isLlmBaseUrlAllowed } from './security.js';
import { logger } from '../logger.js';

/**
 * 审讯室专用的对话调用。
 *
 * 与 `callLlm`（卷宗分析）的区别：这里要的是自然语言回复，不要求 JSON，
 * 输出上限由管理端配置（默认 300 token），并且只会重试一次网络/超时错误。
 */
export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatInput {
  messages: LlmChatMessage[];
  maxOutputTokens: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface LlmChatResult {
  ok: boolean;
  content?: string;
  errorMessage?: string;
  durationMs?: number;
}

export async function callLlmChat(input: LlmChatInput): Promise<LlmChatResult> {
  const baseUrl = config.llmBaseUrl.replace(/\/+$/, '');
  const apiKey = config.llmApiKey.trim();
  const model = config.llmModel.trim();

  if (!apiKey) {
    return { ok: false, errorMessage: 'Missing LLM_API_KEY', durationMs: 0 };
  }
  if (!isLlmBaseUrlAllowed(baseUrl)) {
    return { ok: false, errorMessage: `LLM base URL host not allowed: ${baseUrl}`, durationMs: 0 };
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const startedAt = Date.now();
  const maxTokens = Math.max(1, Math.trunc(input.maxOutputTokens));
  const timeoutMs = input.timeoutMs ?? 40_000;

  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      logger.info({ endpoint, model, attempt, maxTokens }, 'Interrogation LLM calling');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: input.messages,
          temperature: input.temperature ?? 0.8,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        logger.error(
          { status: res.status, endpoint, errText, durationMs: Date.now() - startedAt, attempt },
          'Interrogation LLM endpoint error'
        );
        return { ok: false, errorMessage: `LLM provider returned status ${res.status}`, durationMs: Date.now() - startedAt };
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = (data?.choices?.[0]?.message?.content ?? '').trim();
      if (!content) {
        lastError = 'LLM returned empty content';
        logger.warn({ endpoint, model, attempt }, 'Interrogation LLM returned empty content, retrying');
        continue;
      }
      return { ok: true, content, durationMs: Date.now() - startedAt };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = message;
      logger.error({ err: message, endpoint, model, durationMs: Date.now() - startedAt, attempt }, 'Interrogation LLM exception');
      if (attempt === 1) continue;
      return { ok: false, errorMessage: message, durationMs: Date.now() - startedAt };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { ok: false, errorMessage: lastError || 'LLM returned empty content', durationMs: Date.now() - startedAt };
}
