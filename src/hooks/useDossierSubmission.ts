import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AnalyzeDossierRequest,
  AnalyzeDossierResponse,
  DossierSummaryContract,
  ReanalyzeDossierResponse,
  SessionUser,
} from '../../shared/apiContracts';
import { detectDegenerateAnalysis } from '../../shared/llmAnalysisQuality';
import type { ChapterOneData, FullDossierData } from '../data/chapterStructure';
import type { DynamicQuizPayload } from '../types/quizEngine';
import type { FullDossierResult, LlmAnalysisJson } from '../utils/calculator';
import { draftManager } from '../utils/draftManager';
import { describeValidationFailure } from '../utils/dossierValidation';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { telemetryTracker } from '../utils/telemetryTracker';
import type { AppViewState, NavigateOptions } from './useAppViewHistory';

interface UseDossierSubmissionOptions {
  dossierData: FullDossierData;
  user: SessionUser | null;
  viewState: AppViewState;
  navigateTo: (view: AppViewState, options?: NavigateOptions) => void;
  onSavedDossier: (summary: DossierSummaryContract) => void;
}

/** LLM 深度解读明显异常时的重试状态：自动重试已在服务端完成，这里只承载「一次手动重试」。 */
export interface LlmRetryState {
  failed: boolean;
  retrying: boolean;
  retryUsed: boolean;
  lastError: string | null;
}

export const IDLE_LLM_RETRY: LlmRetryState = { failed: false, retrying: false, retryUsed: false, lastError: null };

/** Owns report generation, cancellation, fallback calculation, and result state. */
export function useDossierSubmission({
  dossierData,
  user,
  viewState,
  navigateTo,
  onSavedDossier,
}: UseDossierSubmissionOptions) {
  const [diagnosticResult, setDiagnosticResult] = useState<FullDossierResult | null>(null);
  const [submissionSaved, setSubmissionSaved] = useState(false);
  const [resultNotice, setResultNotice] = useState<string | null>(null);
  const [llmRetry, setLlmRetry] = useState<LlmRetryState>(IDLE_LLM_RETRY);
  const submitAbortControllerRef = useRef<AbortController | null>(null);
  const previousViewRef = useRef(viewState);

  const cancelSubmission = useCallback(() => {
    submitAbortControllerRef.current?.abort();
    submitAbortControllerRef.current = null;
  }, []);

  const resetSubmission = useCallback(() => {
    cancelSubmission();
    setDiagnosticResult(null);
    setSubmissionSaved(false);
    setResultNotice(null);
    setLlmRetry(IDLE_LLM_RETRY);
  }, [cancelSubmission]);

  const restoreResult = useCallback((result: FullDossierResult) => {
    setDiagnosticResult(result);
    setSubmissionSaved(true);
    setResultNotice(null);
    // 恢复历史报告时同样按「明显错误默认值」口径判断，异常报告仍保留一次手动重试入口。
    const degenerate = Boolean(result.dossierId) && detectDegenerateAnalysis(result.llmAnalysis).degenerate;
    setLlmRetry(degenerate ? { failed: true, retrying: false, retryUsed: false, lastError: null } : IDLE_LLM_RETRY);
  }, []);

  const showCurrentResult = useCallback((): boolean => {
    if (!diagnosticResult) return false;
    navigateTo('result');
    return true;
  }, [diagnosticResult, navigateTo]);

  useEffect(() => {
    const previousView = previousViewRef.current;
    previousViewRef.current = viewState;
    if (previousView === 'generating' && viewState !== 'generating' && viewState !== 'result') {
      cancelSubmission();
    }
  }, [viewState, cancelSubmission]);

  useEffect(() => {
    if (viewState !== 'dynamic_quiz' && viewState !== 'generating') return;
    const warnBeforeDocumentExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeDocumentExit);
    return () => window.removeEventListener('beforeunload', warnBeforeDocumentExit);
  }, [viewState]);

  const submitDossier = useCallback(async (payload: DynamicQuizPayload, overrideChapter1?: ChapterOneData) => {
    cancelSubmission();
    setDiagnosticResult(null);
    setSubmissionSaved(false);
    setResultNotice(null);
    setLlmRetry(IDLE_LLM_RETRY);
    navigateTo('generating');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const calculatorModule = import('../utils/calculator');
    void import('../components/ResultView');

    const mergedPayload: FullDossierData = {
      ...dossierData,
      ...payload,
      chapter1: overrideChapter1 ?? dossierData.chapter1,
      telemetry: telemetryTracker.getSnapshot(),
    };

    const controller = new AbortController();
    submitAbortControllerRef.current = controller;
    const isStale = () => submitAbortControllerRef.current !== controller;
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const requestBody: AnalyzeDossierRequest<typeof mergedPayload> = {
        dossierData: mergedPayload,
      };
      const response = await fetch('/api/analyze-dossier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getOrCreateDeviceId(),
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });
      if (isStale()) return;

      const responseBody = await response.json() as AnalyzeDossierResponse<LlmAnalysisJson>;
      if (isStale()) return;

      if (
        response.ok
        && responseBody.success
        && responseBody.saved
        && responseBody.dossierId
        && responseBody.data
      ) {
        const { calculateFullDossierResult } = await calculatorModule;
        if (isStale()) return;
        setDiagnosticResult(calculateFullDossierResult(mergedPayload, responseBody.data, responseBody.dossierId));
        setSubmissionSaved(true);

        if (user) {
          onSavedDossier({
            id: responseBody.dossierId,
            bankIds: mergedPayload.selectedBankIds ?? [],
            createdAt: new Date().toISOString(),
            depthRating: mergedPayload.depthRating,
            selectedShadowTags: mergedPayload.selectedShadowTags,
          });
        }
        if (responseBody.llmFailed) {
          // 服务端已自动重试一次仍返回明显异常结果：保留本地结果为底稿，并开放一次手动重试。
          setLlmRetry({ failed: true, retrying: false, retryUsed: false, lastError: responseBody.error ?? null });
          setResultNotice('AI 深度解读疑似异常（返回默认值），已自动重试一次仍失败，已使用本地分析并安全保存本次卷宗。');
        } else if (responseBody.isFallback) {
          setResultNotice('AI 服务暂时不可用，已使用本地分析并安全保存本次卷宗。');
        }
      } else {
        if (response.status === 400) {
          // 字段级校验失败：把具体原因透传给用户，并明确"未保存"，
          // 不要再笼统地让用户"稍后重试"（重试一百次也不会通过）。
          setResultNotice(describeValidationFailure(responseBody.zodErrors, responseBody.message));
        } else {
          setResultNotice(responseBody.message || '服务端未确认保存成功。本机结果仍可查看，草稿已保留，请稍后重试。');
        }
        const { calculateFullDossierResult } = await calculatorModule;
        if (isStale()) return;
        setDiagnosticResult(calculateFullDossierResult(mergedPayload));
      }
    } catch (error) {
      if (isStale() && error instanceof Error && error.name === 'AbortError') return;
      console.warn('Backend LLM API dynamic payload fallback:', error);
      setResultNotice('网络或服务器异常，本机结果仍可查看，但本次卷宗尚未确认保存；草稿已保留。');
      const { calculateFullDossierResult } = await calculatorModule;
      if (isStale()) return;
      setDiagnosticResult(calculateFullDossierResult(mergedPayload));
    } finally {
      clearTimeout(timeoutId);
      const wasCurrent = submitAbortControllerRef.current === controller;
      if (wasCurrent) submitAbortControllerRef.current = null;
      if (wasCurrent) telemetryTracker.reset();
    }
  }, [cancelSubmission, dossierData, navigateTo, onSavedDossier, user]);

  const finishGenerating = useCallback(() => {
    if (submissionSaved) draftManager.clearDraft();
    navigateTo('result', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [submissionSaved, navigateTo]);

  /**
   * 手动重跑一次 LLM 深度解读（仅在报告被判定为「明显错误默认值」时开放）。
   * 成功后原地刷新报告；再次失败则保留本地兜底结果，并交由 UI 引导用户前往反馈系统。
   */
  const retryAnalysis = useCallback(async (): Promise<void> => {
    const dossierId = diagnosticResult?.dossierId;
    if (!dossierId) return;

    setLlmRetry({ failed: true, retrying: true, retryUsed: false, lastError: null });
    try {
      const response = await fetch(`/api/dossiers/${encodeURIComponent(dossierId)}/reanalyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getOrCreateDeviceId(),
        },
        credentials: 'include',
      });
      const body = await response.json().catch(() => null) as ReanalyzeDossierResponse<LlmAnalysisJson> | null;

      if (response.ok && body?.success && body.data) {
        const { calculateFullDossierResult } = await import('../utils/calculator');
        setDiagnosticResult((previous) => previous
          ? calculateFullDossierResult(
              previous.dossierData,
              body.data,
              dossierId,
              previous.resonanceLevel,
              previous.resonanceText,
              previous.resonanceAt,
            )
          : previous);
        setLlmRetry({ failed: false, retrying: false, retryUsed: true, lastError: null });
        setResultNotice('AI 深度解读已重新生成，请查看更新后的卷宗。');
        return;
      }

      setLlmRetry({ failed: true, retrying: false, retryUsed: true, lastError: body?.message ?? null });
      setResultNotice(body?.message ?? 'AI 深度解读仍未能正常生成，可继续使用本地分析结果，或向主理人反馈本次异常。');
    } catch (error) {
      console.warn('Manual LLM reanalyze failed:', error);
      setLlmRetry({ failed: true, retrying: false, retryUsed: true, lastError: null });
      setResultNotice('网络或服务器异常，AI 深度解读重试未完成，可稍后向主理人反馈本次异常。');
    }
  }, [diagnosticResult]);

  return {
    diagnosticResult,
    submissionSaved,
    resultNotice,
    llmRetry,
    submitDossier,
    finishGenerating,
    cancelSubmission,
    resetSubmission,
    restoreResult,
    showCurrentResult,
    retryAnalysis,
  };
}
