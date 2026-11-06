import { config } from '../config.js';
import { db } from '../db.js';
import { logger, logError } from '../logger.js';
import { buildDynamicLLMPrompt } from '../promptBuilder.js';
import type { FullDossierData, LlmAnalysisJson } from '../types.js';
import { evaluateInputCredibility, generateFallbackAnalysis } from '../utils/credibility.js';
import { callLlm } from '../utils/llm.js';
import { detectDegenerateAnalysis } from '../utils/llmDegenerate.js';
import { sanitizePayloadForLog } from '../utils/security.js';
import type {
  AnalyzeDossierResponse,
  LlmProviderConfig,
} from '../../shared/apiContracts.js';

export interface AnalyzeRequest {
  dossierData: FullDossierData;
  customConfig?: LlmProviderConfig;
  userId: string | null;
  deviceId: string;
  ipAddress: string;
}

/**
 * 答卷可能同时包含多个题库：只有所有题库分类一致时才调度分类专属提示词，
 * 混合分类或缺失分类时返回 undefined，由调用方降级到通用（all）生效模板。
 */
function resolvePromptCategory(completedBanks: unknown[] | undefined): string | undefined {
  const categories = new Set<string>();
  for (const bank of completedBanks ?? []) {
    const category = (bank as { category?: string } | null | undefined)?.category;
    if (category) categories.add(category);
  }
  return categories.size === 1 ? [...categories][0] : undefined;
}

async function saveDossierResult(
  userId: string | null,
  deviceId: string,
  dossierData: FullDossierData,
  result: LlmAnalysisJson,
  stage: string
): Promise<{ id: string; createdAt: string }> {
  // 匿名用户仅在带有设备标识（UUID）时落库，便于后续关联与找回
  if (!userId && !deviceId) {
    logger.warn({ userId, deviceId: deviceId || null, stage }, 'analyze dossier dropped: no user or device identity');
    throw new Error('dossier identity required');
  }
  try {
    return await db.saveDossier(userId, deviceId || null, dossierData, result);
  } catch (error) {
    logError(error, { userId, stage }, 'analyze saveDossier failed');
    // Never report success when persistence failed. The Express error handler
    // converts this into a generic 500 without exposing database details.
    throw error;
  }
}

export async function analyzeDossier(
  input: AnalyzeRequest
): Promise<AnalyzeDossierResponse<LlmAnalysisJson> & {
  success: true;
  data: LlmAnalysisJson;
  saved: true;
  dossierId: string;
}> {
  const { dossierData, userId, deviceId, ipAddress } = input;
  const customConfig = input.customConfig ?? {};
  const credibility = evaluateInputCredibility(dossierData);
  const apiKey = (customConfig.apiKey || config.llmApiKey).trim();

  if (credibility.score < 45 || !apiKey) {
    logger.info(
      { credScore: credibility.score, hasApiKey: Boolean(apiKey), userId },
      'analyze interceptor → fallback'
    );
    const fallback = generateFallbackAnalysis(dossierData, credibility);
    const saved = await saveDossierResult(userId, deviceId, dossierData, fallback, 'saveDossier-fallback');
    return {
      success: true,
      data: fallback,
      saved: true,
      dossierId: saved.id,
      isFallback: true,
      credibilityLevel: credibility.level,
    };
  }

  const bankCategory = resolvePromptCategory(dossierData?.completedBanks);
  const activePrompt = await db.getActivePromptTemplate(bankCategory);
  const llmResult = await callLlm({
    baseUrl: customConfig.baseUrl,
    apiKey,
    model: customConfig.model,
    messages: [{ role: 'user', content: buildDynamicLLMPrompt(dossierData, activePrompt?.content) }],
  });

  if (!llmResult.ok || !llmResult.data) {
    logger.error(
      { errorMessage: llmResult.errorMessage, userId, endpoint: '/api/analyze-dossier' },
      'analyze LLM failed'
    );
    try {
      await db.logApiError({
        endpoint: '/api/analyze-dossier',
        errorMessage: llmResult.errorMessage ?? 'unknown LLM error',
        stackTrace: '',
        payload: JSON.stringify(sanitizePayloadForLog(dossierData)),
        deviceId,
        userId,
        ipAddress,
      });
    } catch (error) {
      logError(error, { stage: 'logApiError' }, 'analyze logApiError failed');
    }

    const fallback = generateFallbackAnalysis(dossierData, credibility);
    const saved = await saveDossierResult(userId, deviceId, dossierData, fallback, 'saveDossier-llm-failed');
    return {
      success: true,
      data: fallback,
      saved: true,
      dossierId: saved.id,
      isFallback: true,
      // 标记为 LLM 侧失败（而非可信度不足的合规兜底），前端据此提供一次手动重试。
      llmFailed: true,
      error: llmResult.errorMessage,
    };
  }

  const finalAnalysis: LlmAnalysisJson = {
    ...llmResult.data,
    credibilityScore: credibility.score,
    credibilityLevel: credibility.level,
    credibilityReasons: credibility.reasons,
  };
  const dossierDataToSave: FullDossierData = {
    ...dossierData,
    telemetry: dossierData.telemetry
      ? { ...dossierData.telemetry, llmDurationMs: llmResult.durationMs ?? 0 }
      : undefined,
  };
  const saved = await saveDossierResult(userId, deviceId, dossierDataToSave, finalAnalysis, 'saveDossier-success');
  return { success: true, data: finalAnalysis, saved: true, dossierId: saved.id };
}

/**
 * 管理端"重新评估"：对已落库卷宗重跑 LLM 分析（不新增记录），
 * 由调用方负责把结果写回原行的 diagnostic_result_json。
 */
export async function reanalyzeDossierData(
  dossierData: FullDossierData
): Promise<{ data: LlmAnalysisJson; isFallback: boolean; error?: string }> {
  const credibility = evaluateInputCredibility(dossierData);
  const apiKey = config.llmApiKey.trim();

  if (credibility.score < 45 || !apiKey) {
    return { data: generateFallbackAnalysis(dossierData, credibility), isFallback: true };
  }

  const bankCategory = resolvePromptCategory(dossierData?.completedBanks);
  const activePrompt = await db.getActivePromptTemplate(bankCategory);
  const llmResult = await callLlm({
    messages: [{ role: 'user', content: buildDynamicLLMPrompt(dossierData, activePrompt?.content) }],
  });
  if (!llmResult.ok || !llmResult.data || detectDegenerateAnalysis(llmResult.data).degenerate) {
    return {
      data: generateFallbackAnalysis(dossierData, credibility),
      isFallback: true,
      error: llmResult.errorMessage ?? 'LLM 返回结果异常',
    };
  }

  return {
    data: {
      ...llmResult.data,
      credibilityScore: credibility.score,
      credibilityLevel: credibility.level,
      credibilityReasons: credibility.reasons,
    },
    isFallback: false,
  };
}
