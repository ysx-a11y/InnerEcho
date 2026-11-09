import { db } from '../db.js';
import { config } from '../config.js';
import { callLlm } from '../utils/llm.js';
import { dossierRowToFullDossierData } from './dossierPayload.js';
import {
  extractDossierVariables,
  getPresetMockVariables,
  renderTemplateWithVariables,
} from './variableEngine.js';
import type {
  PlaygroundRunRequest,
  PlaygroundRunResponse,
} from '../../shared/apiContracts.js';

const REQUIRED_ANALYSIS_FIELDS = [
  'archetypeTitle',
  'disparityScore',
  'personaDeconstruction',
  'shadowDeconstruction',
  'psychologicalSublimation',
  'resonanceKeywords',
];

export async function runPromptPlayground(
  request: PlaygroundRunRequest
): Promise<PlaygroundRunResponse> {
  const startTime = Date.now();

  // 1. 组装变量字典
  let variables = getPresetMockVariables();
  if (request.mockSource === 'real_dossier' && request.dossierId) {
    try {
      const realDossierRow = await db.getDossierRowById(request.dossierId);
      if (realDossierRow) {
        const fullData = dossierRowToFullDossierData(realDossierRow);
        variables = { ...variables, ...extractDossierVariables(fullData) };
      }
    } catch {
      // 容错降级回预置变量
    }
  }
  if (request.customVariables) {
    variables = { ...variables, ...request.customVariables };
  }

  // 2. 解析系统提示词主体与模板
  let systemPromptText = (request.draftSystemPrompt || '').trim();
  let userTemplateText = (request.draftUserTemplate || '').trim();

  if (!systemPromptText) {
    if (request.versionId) {
      const version = await db.prompts.getPromptVersionById(request.versionId);
      if (version) {
        systemPromptText = version.systemPrompt;
        if (!userTemplateText) userTemplateText = version.userPromptTemplate;
      }
    } else if (request.templateId) {
      const tmpl = await db.prompts.getPromptTemplateById(request.templateId);
      if (tmpl) {
        systemPromptText = tmpl.content;
      }
    }
  }

  if (!systemPromptText) {
    const defaultTemplate = await db.prompts.getActivePromptTemplate();
    systemPromptText = defaultTemplate?.content || '你是一位专业的深层心理洞察导师。';
  }

  // 3. 执行变量渲染
  const renderedSystemPrompt = renderTemplateWithVariables(systemPromptText, variables);
  const renderedUserPrompt = userTemplateText
    ? renderTemplateWithVariables(userTemplateText, variables)
    : `【来访者自白与量化档案】：\n${JSON.stringify(variables, null, 2)}`;

  // 4. 解析智能体与超参数
  let targetAgent = null;
  if (request.agentId) {
    targetAgent = await db.aiAgent.getAgentById(request.agentId);
  }

  const model = (request.modelOverride || targetAgent?.defaultModel || config.llmModel || 'gemini-1.5-pro').trim();
  const temperature =
    typeof request.temperatureOverride === 'number'
      ? Math.min(2, Math.max(0, request.temperatureOverride))
      : targetAgent?.temperature ?? 0.7;

  // 5. 调用大模型（若无 API Key 或在测试环境下提供确定性模拟响应）
  let rawResponse = '';
  const apiKey = config.llmApiKey.trim();

  if (!apiKey || config.nodeEnv === 'test') {
    if (targetAgent?.agentKey === 'interrogator') {
      rawResponse = '你在第14题「完全交付控制权」上反复修改了两次。你口口声声说自己崇尚理性，但供词里的犹豫出卖了你的恐慌。在审讯室里，你休想用沉默来敷衍我。正面回答我：交出控制权，究竟让你联想到了什么？';
    } else if (targetAgent?.agentKey === 'interrogation_recorder') {
      rawResponse = '在这场审讯交锋中，你始终在理性防御与渴望卸下重担之间激烈拉扯。你回避了关于控制权移交的深层恐惧，但你的犹豫已给出了答案。留给你的追问是：你何时才敢在真实世界里承认这份软弱？';
    } else {
      rawResponse = JSON.stringify(
        {
          archetypeTitle: '深渊引渡者',
          archetypeSubtitle: '在极致理性中渴望交付权柄的摆渡人',
          disparityScore: 88,
          dominanceIndex: 18,
          submissionIndex: 86,
          restraintIndex: 79,
          sensoryThreshold: 92,
          personaDeconstruction:
            '你在日常社交与职业场域中呈现出严丝合缝的理性精英面具，任何微小的漏洞都会被你的合规雷达精准拦截。这种高强度的秩序感是你抵御不确定性的唯一盾牌。',
          shadowDeconstruction:
            '然而在暗流涌动的潜意识深处，这种永无止境的决策疲惫让你产生了一种深刻的代偿渴望——你并非不想掌控，而是渴望遇到一个力量足够强大的锚点，能让你安全且彻底地解除武装。',
          psychologicalSublimation:
            '真正的坚韧并非永不卸甲，而是允许自己在被全然接纳的边界里，放心地闭上眼睛。',
          resonanceKeywords: ['秩序面具', '决策疲劳', '权柄移交', '安全锚点'],
        },
        null,
        2
      );
    }
  } else {
    const llmRes = await callLlm({
      model,
      apiKey,
      temperature,
      messages: [
        { role: 'system', content: renderedSystemPrompt },
        { role: 'user', content: renderedUserPrompt },
      ],
    });
    rawResponse = llmRes.data
      ? typeof llmRes.data === 'string'
        ? llmRes.data
        : JSON.stringify(llmRes.data, null, 2)
      : llmRes.errorMessage || '调用未返回内容';
  }

  const durationMs = Date.now() - startTime;

  // 6. 输出契约校验
  let parsedJson: Record<string, unknown> | null = null;
  const missingFields: string[] = [];
  const issues: string[] = [];

  try {
    const cleanJsonStr = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    if (cleanJsonStr.startsWith('{') && cleanJsonStr.endsWith('}')) {
      parsedJson = JSON.parse(cleanJsonStr);
      for (const field of REQUIRED_ANALYSIS_FIELDS) {
        if (!parsedJson || !(field in parsedJson)) {
          missingFields.push(field);
        }
      }
    }
  } catch {
    if (targetAgent?.interactionMode === 'analysis') {
      issues.push('输出未能成功解析为标准 JSON 格式');
    }
  }

  const isValid = missingFields.length === 0 && issues.length === 0;

  return {
    success: true,
    renderedFullPrompt: `=== System Prompt ===\n${renderedSystemPrompt}\n\n=== User Input Prompt ===\n${renderedUserPrompt}`,
    rawResponse,
    parsedJson,
    validation: {
      isValid,
      missingFields,
      issues,
    },
    metrics: {
      durationMs,
      estimatedPromptTokens: Math.round((renderedSystemPrompt.length + renderedUserPrompt.length) / 3),
      estimatedCompletionTokens: Math.round(rawResponse.length / 3),
      model,
    },
  };
}
