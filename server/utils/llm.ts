import { config } from '../config.js';
import { isLlmBaseUrlAllowed, cleanLlmJsonContent } from './security.js';
import { logger } from '../logger.js';
import type { LlmAnalysisJson } from '../types.js';
import { detectStructuredRefusal } from './llmRefusal.js';
import { detectDegenerateAnalysis } from './llmDegenerate.js';

interface LlmMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LlmCallInput {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  /** 采样温度；未传时沿用历史默认值 0.75。会被钳制到 0-2。 */
  temperature?: number;
  messages: LlmMessage[];
}

export interface LlmCallResult {
  ok: boolean;
  data?: LlmAnalysisJson;
  errorMessage?: string;
  durationMs?: number;
  /** True when the model kept returning an obvious default/empty result after the retry. */
  degenerate?: boolean;
}

/**
 * Call an OpenAI-compatible LLM chat completions endpoint.
 * Returns a normalized LlmAnalysisJson parsed from the model's JSON output.
 */
export async function callLlm(input: LlmCallInput): Promise<LlmCallResult> {
  const baseUrl = (input.baseUrl || config.llmBaseUrl).replace(/\/+$/, '');
  const apiKey = (input.apiKey || config.llmApiKey).trim();
  const model = (input.model || config.llmModel).trim();
  const temperature =
    typeof input.temperature === 'number' && Number.isFinite(input.temperature)
      ? Math.min(2, Math.max(0, input.temperature))
      : 0.75;

  if (!apiKey) {
    return { ok: false, errorMessage: 'Missing LLM_API_KEY', durationMs: 0 };
  }
  if (!isLlmBaseUrlAllowed(baseUrl)) {
    return { ok: false, errorMessage: `LLM base URL host not allowed: ${baseUrl}`, durationMs: 0 };
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const callStartTime = Date.now();

  // 推理型模型（如 deepseek-v4-flash）可能把 token 预算耗在 reasoning 上导致 content 为空或截断，
  // 因此输出上限放宽到 10000，并对"空内容"重试一次。
  let lastError = '';
  let messages = input.messages;
  // DeepSeek/OpenAI 的 JSON Output 模式能保证语法合法 JSON；部分 OpenAI 兼容端点
  // 不支持 response_format，首次 400 时降级为纯提示词约束重试一次。
  let useJsonMode = true;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      logger.info({ endpoint, model, attempt }, 'LLM calling');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          // This project requires structured analysis output. DeepSeek's JSON
          // Output mode guarantees syntactically valid JSON; the prompt above
          // already includes the word "JSON" and a complete output example.
          ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
          temperature,
          max_tokens: 10000,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const durationMs = Date.now() - callStartTime;
        const errText = await res.text();
        logger.error({ status: res.status, endpoint, errText, durationMs, attempt }, 'LLM endpoint error');
        if (attempt === 1 && useJsonMode && /response_format|json_object|unsupported (parameter|field)/i.test(errText)) {
          useJsonMode = false;
          lastError = `LLM provider rejected response_format (status ${res.status})`;
          logger.warn({ endpoint, model, durationMs }, 'LLM provider does not support response_format, retrying without it');
          continue;
        }
        return { ok: false, errorMessage: `LLM provider returned status ${res.status}`, durationMs };
      }

      const resData = await res.json() as {
        choices?: { message?: { content?: string } }[];
      };
      const rawContent = resData?.choices?.[0]?.message?.content ?? '';
      if (!rawContent) {
        const durationMs = Date.now() - callStartTime;
        lastError = 'LLM returned empty content';
        logger.warn({ endpoint, model, durationMs, attempt }, 'LLM returned empty content, retrying');
        continue;
      }

      const cleaned = cleanLlmJsonContent(rawContent);
      const parsed = JSON.parse(cleaned) as Partial<LlmAnalysisJson>;
      const refusal = detectStructuredRefusal(parsed);
      if (refusal.refused) {
        const durationMs = Date.now() - callStartTime;
        lastError = 'LLM returned a structured refusal';
        logger.warn({ endpoint, model, durationMs, attempt, reason: refusal.reason }, 'LLM structured refusal');
        if (attempt === 1) {
          messages = [
            ...input.messages,
            {
              role: 'user',
              content: '请重新处理：这是一份填写者主动提交的自我描述。任务仅是依据原文做主题归纳，不扩写行为细节，不作医学诊断，也不要求赞同或反对其中的偏好。请按之前约定的 JSON 结构返回；资料不足之处直接说明“不足以判断”。',
            },
          ];
          continue;
        }
        return { ok: false, errorMessage: lastError, durationMs };
      }

      const normalized = normalizeLlmAnalysis(parsed);
      const quality = detectDegenerateAnalysis(normalized);
      if (quality.degenerate) {
        const durationMs = Date.now() - callStartTime;
        lastError = `LLM 返回明显异常结果：${quality.reason}`;
        logger.warn(
          { endpoint, model, durationMs, attempt, reason: quality.reason },
          'LLM returned degenerate analysis, retrying'
        );
        if (attempt === 1) {
          messages = [
            ...input.messages,
            {
              role: 'user',
              content:
                '上一次返回的 JSON 明显不完整或为默认空值（例如四维指标全为 0，或解读正文为空）。请重新生成一份完整结果：四维指标必须是 1-100 之间的真实数值，三段解读正文（personaDeconstruction / shadowDeconstruction / psychologicalSublimation）必须各自成文，不得留空或返回占位内容。',
            },
          ];
          continue;
        }
        return { ok: false, errorMessage: lastError, durationMs, degenerate: true };
      }

      const durationMs = Date.now() - callStartTime;
      logger.info({ model, durationMs, attempt }, 'LLM call succeeded');
      return {
        ok: true,
        data: normalized,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - callStartTime;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg, endpoint, model, durationMs, attempt }, 'LLM exception');
      // 仅对超时/中止类异常重试一次（C4）；JSON 解析等确定性错误不重试
      if (attempt === 1 && err instanceof Error && err.name === 'AbortError') {
        lastError = msg;
        continue;
      }
      return { ok: false, errorMessage: msg, durationMs };
    } finally {
      clearTimeout(timeout);
    }
  }
  const finalDurationMs = Date.now() - callStartTime;
  return { ok: false, errorMessage: lastError || 'LLM returned empty content', durationMs: finalDurationMs };
}

function normalizeLlmAnalysis(p: Partial<LlmAnalysisJson>): LlmAnalysisJson {
  return {
    credibilityScore: 0,
    credibilityLevel: 'medium',
    archetypeTitle: p.archetypeTitle ?? '暗光解构者',
    archetypeSubtitle: p.archetypeSubtitle,
    disparityScore: p.disparityScore,
    dominanceIndex: p.dominanceIndex,
    submissionIndex: p.submissionIndex,
    restraintIndex: p.restraintIndex,
    sensoryThreshold: p.sensoryThreshold,
    personaDeconstruction: p.personaDeconstruction ?? '',
    shadowDeconstruction: p.shadowDeconstruction ?? '',
    psychologicalSublimation: p.psychologicalSublimation ?? '',
    resonanceKeywords: p.resonanceKeywords ?? ['反差觉醒', '心理补偿'],
  };
}
