/**
 * 服务端侧对「LLM 返回明显错误默认值」判定的入口。
 * 实现放在 shared/ 供前后端共用，避免两处口径漂移。
 */
export {
  detectDegenerateAnalysis,
  type DegenerateAnalysisCheck,
  type LlmAnalysisScoreFields,
} from '../../shared/llmAnalysisQuality.js';
