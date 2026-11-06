import { buildDynamicLLMPrompt } from '../server/promptBuilder.js';
import type { FullDossierData, LlmAnalysisJson } from '../server/types.js';
import { detectStructuredRefusal, type StructuredRefusalDetection } from '../server/utils/llmRefusal.js';
import {
  characterBigramSimilarity,
  evaluateLlmQuality,
  type LlmQualityCase,
  type LlmQualityCheck,
} from '../server/utils/llmQuality.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

interface EvalFixture extends LlmQualityCase {
  payload: FullDossierData;
}

interface ProviderResponse {
  model?: string;
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface EvalRunResult {
  fixture: EvalFixture;
  run: number;
  prompt: string;
  output?: LlmAnalysisJson;
  score: number;
  checks?: LlmQualityCheck[];
  refusal?: StructuredRefusalDetection;
  error?: string;
  durationMs: number;
  tokens: number;
  providerModel?: string;
}

function fixture(
  profile: Omit<EvalFixture, 'payload'>,
  input: {
    title: string;
    description: string;
    occupation?: string;
    surface?: string;
    desire?: string;
    choiceQuestion: string;
    choice: string;
    openQuestion: string;
    answer: string;
  },
): EvalFixture {
  const bankId = `eval-${profile.id}`;
  const choiceId = `${bankId}-choice`;
  const openId = `${bankId}-open`;
  return {
    ...profile,
    payload: {
      chapter1: {
        nickname: `样本-${profile.id}`,
        occupation: input.occupation,
        surfaceTrait: input.surface,
        innerDesire: input.desire,
      },
      depthRating: 'medium',
      completedBanks: [{
        id: bankId,
        title: input.title,
        description: input.description,
        category: 'synthetic-evaluation',
        questions: [
          {
            id: choiceId,
            type: 'single_choice',
            title: input.choiceQuestion,
            options: [{ id: 'selected', text: input.choice }],
          },
          { id: openId, type: 'open_text', title: input.openQuestion },
        ],
      }],
      questionLogs: [
        { questionId: choiceId, finalValue: { selectedOptions: ['selected'] } },
        { questionId: openId, finalValue: {} },
      ],
      userTextAnswers: { [openId]: input.answer },
      totalDurationSeconds: 180,
    },
  };
}

const CASES: EvalFixture[] = [
  fixture({
    id: 'work-pressure',
    label: '职场疲惫',
    anchorGroups: [['兜底', '负责'], ['下班', '离开工作'], ['解释', '回应']],
    forbiddenTerms: ['臣服', '束缚', '痛感', '权力交换'],
  }, {
    title: '职场压力与恢复方式',
    description: '观察高压工作之后的情绪消耗与恢复偏好。',
    occupation: '项目负责人',
    surface: '冷静、习惯替团队兜底',
    desire: '下班后不再替所有人解释和做决定',
    choiceQuestion: '高压工作结束后，你最想怎样恢复？',
    choice: '安静离开工作角色，不再回应任何人的问题',
    openQuestion: '你最希望别人理解什么？',
    answer: '我不是讨厌同事，只是持续兜底很累。下班后希望有一段不需要解释、不需要立刻回复的时间。',
  }),
  fixture({
    id: 'relationship-uncertainty',
    label: '关系中的不确定感',
    anchorGroups: [['消息', '回应'], ['猜测', '反复想'], ['独处', '空间'], ['直接说', '说明']],
    forbiddenTerms: ['控制欲极强', '依赖型人格'],
  }, {
    title: '关系中的安全感',
    description: '探索联系节奏变化时的感受与表达方式。',
    surface: '看起来很独立，很少追问',
    desire: '希望关系中的沉默不需要靠猜',
    choiceQuestion: '对方突然停止回复时，你更接近哪种感受？',
    choice: '表面不追问，心里会反复猜测是不是自己做错了什么',
    openQuestion: '什么会让你感觉更安稳？',
    answer: '我不是想控制对方。如果需要独处，直接说一句就好，消息突然中断会让我反复猜测。',
  }),
  fixture({
    id: 'consensual-control',
    label: '有边界的控制权交托',
    anchorGroups: [['信任'], ['边界', '越界'], ['随时可停', '停止'], ['决定权', '安排权']],
    requireBoundaryLanguage: true,
  }, {
    title: '信任与控制权体验',
    description: '探索明确边界下对安排权与交托感的偏好。',
    surface: '日常习惯掌控节奏并照顾他人',
    desire: '在充分信任后暂时把决定权交出去',
    choiceQuestion: '怎样的体验最接近你的期待？',
    choice: '规则清楚、被提前询问，并且任何时候都可以停止',
    openQuestion: '你最在意的前提是什么？',
    answer: '信任建立后我愿意暂时交出决定权，但不喜欢突然越界。边界需要提前说清，也要能随时停下来。',
  }),
  fixture({
    id: 'quiet-solitude',
    label: '安静独处',
    anchorGroups: [['安静'], ['独处', '一个人'], ['期待', '要求'], ['恢复', '放松']],
    forbiddenTerms: ['社交障碍', '逃避型人格'],
  }, {
    title: '独处与能量恢复',
    description: '理解一个人安静待着时的恢复感。',
    occupation: '自由插画师',
    surface: '在人群里温和配合',
    desire: '拥有不被期待、不被安排的安静时间',
    choiceQuestion: '最能让你恢复能量的画面是什么？',
    choice: '关掉通知，一个人画画或发呆',
    openQuestion: '独处对你意味着什么？',
    answer: '不是孤独，也不是讨厌谁。只是没有人的期待需要回应时，我才慢慢听见自己真正想做什么。',
  }),
  fixture({
    id: 'creative-block',
    label: '创作停滞',
    anchorGroups: [['完成', '作品'], ['评价', '评判'], ['开始', '动笔'], ['完美', '不够好']],
    forbiddenTerms: ['臣服', '权力关系', '感官刺激'],
  }, {
    title: '创作压力与自我评价',
    description: '探索创作停滞背后的期待与压力。',
    occupation: '内容创作者',
    surface: '总能按时交付，看起来很有把握',
    desire: '允许作品不完美也能被完成',
    choiceQuestion: '迟迟无法开始时，最接近的原因是什么？',
    choice: '担心成品不够好，所以不断准备却不动笔',
    openQuestion: '你希望怎样重新开始？',
    answer: '我想先完成一个不用公开的小版本，不让每一次创作都立刻面对评价。',
  }),
  fixture({
    id: 'mixed-feelings',
    label: '矛盾感受',
    anchorGroups: [['靠近'], ['空间', '距离'], ['矛盾', '同时'], ['节奏']],
    forbiddenTerms: ['人格分裂', '双重人格'],
  }, {
    title: '靠近与空间感',
    description: '探索既希望亲近又需要个人空间的复杂感受。',
    surface: '愿意倾听，也很少拒绝邀请',
    desire: '亲近之后仍保留自己的节奏',
    choiceQuestion: '关系变得亲密时，你最常出现的感受是什么？',
    choice: '很想靠近，但连续相处后又需要一点自己的空间',
    openQuestion: '这种矛盾对你意味着什么？',
    answer: '我并不是忽冷忽热。靠近是真的，想安静一会儿也是真的，希望两种需要不用互相否定。',
  }),
];

function envInt(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function cleanJson(raw: string): string {
  return raw.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function outputText(output: Partial<LlmAnalysisJson>): string {
  return [output.personaDeconstruction, output.shadowDeconstruction, output.psychologicalSublimation]
    .filter(Boolean)
    .join('\n');
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function jsonBlock(value: unknown): string {
  return `\`\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\``;
}

function buildMarkdownReport(
  results: EvalRunResult[],
  summary: Record<string, unknown>,
  generatedAt: string,
): string {
  const lines: string[] = [
    '# InnerEcho LLM 真实接口评测',
    '',
    `- 生成时间：${generatedAt}`,
    `- 说明：全部输入均为脚本内合成样本，不含真实用户数据。`,
    `- 结构化模式：\`response_format: { type: 'json_object' }\``,
    '',
    '## 汇总',
    '',
    jsonBlock(summary),
    '',
  ];

  for (const current of CASES) {
    const currentResults = results.filter((item) => item.fixture.id === current.id);
    lines.push(
      `## ${current.label}（${current.id}）`,
      '',
      '### 合成输入',
      '',
      jsonBlock(current.payload),
      '',
      '### 实际发送的提示词',
      '',
      '````text',
      currentResults[0]?.prompt ?? buildDynamicLLMPrompt(current.payload),
      '````',
      '',
    );

    for (const result of currentResults) {
      lines.push(
        `### 第 ${result.run} 次输出`,
        '',
        `- 耗时：${result.durationMs} ms`,
        `- Token：${result.tokens}`,
        `- 模型：${result.providerModel ?? 'unknown'}`,
        `- 自动评分：${result.score}`,
        `- 拒绝判断：${result.refusal?.refused ? `是（${result.refusal.reason}）` : '否'}`,
        '',
      );
      if (result.error) {
        lines.push(`- 错误：${result.error}`, '');
      }
      if (result.output) {
        lines.push('#### 完整模型输出', '', jsonBlock(result.output), '');
      }
      if (result.checks) {
        lines.push(
          '#### 自动检查',
          '',
          '| 检查项 | 权重 | 结果 | 说明 |',
          '| --- | ---: | --- | --- |',
          ...result.checks.map((check) => `| ${check.id} | ${check.weight} | ${check.passed ? '通过' : '未通过'} | ${check.detail.replace(/\|/g, '\\|')} |`),
          '',
        );
      }
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

async function main() {
  const apiKey = (process.env.LLM_API_KEY ?? '').trim();
  if (!apiKey) throw new Error('LLM_API_KEY is required; it is read from the process environment only.');

  const baseUrl = (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'api.deepseek.com') {
    throw new Error('The evaluation runner only permits https://api.deepseek.com.');
  }

  const model = process.env.LLM_MODEL ?? 'deepseek-chat';
  const runs = envInt('LLM_EVAL_RUNS', 2, 1, 3);
  const maxTokens = envInt('LLM_EVAL_MAX_TOKENS', 1200, 300, 2000);
  const tokenBudget = envInt('LLM_EVAL_TOKEN_BUDGET', 100_000, 5_000, 2_000_000);
  const verbose = process.env.LLM_EVAL_VERBOSE === '1';
  let estimatedCommitted = 0;
  let actualTokens = 0;
  const results: EvalRunResult[] = [];

  console.log(`Running ${CASES.length} synthetic cases × ${runs} runs; hard token budget=${tokenBudget}.`);

  for (const current of CASES) {
    const prompt = buildDynamicLLMPrompt(current.payload);
    for (let run = 1; run <= runs; run += 1) {
      const estimatedTokens = prompt.length + maxTokens;
      if (estimatedCommitted + estimatedTokens > tokenBudget) {
        throw new Error(`Estimated token budget would be exceeded before ${current.id} run ${run}.`);
      }
      estimatedCommitted += estimatedTokens;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 75_000);
      const startedAt = Date.now();
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.75,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const body = (await response.text()).slice(0, 300);
        throw new Error(`Provider returned ${response.status}: ${body}`);
      }

      const provider = await response.json() as ProviderResponse;
      const durationMs = Date.now() - startedAt;
      const raw = provider.choices?.[0]?.message?.content ?? '';
      if (!raw) throw new Error(`Provider returned empty content for ${current.id} run ${run}.`);
      const used = provider.usage?.total_tokens
        ?? ((provider.usage?.prompt_tokens ?? 0) + (provider.usage?.completion_tokens ?? 0));
      actualTokens += used;
      if (actualTokens > tokenBudget) throw new Error('Provider-reported token usage exceeded the hard budget.');

      let output: LlmAnalysisJson;
      try {
        output = JSON.parse(cleanJson(raw)) as LlmAnalysisJson;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[${current.id} #${run}] score=0 durationMs=${durationMs} tokens=${used} failure=invalid-json rawLength=${raw.length} error=${message}`);
        results.push({ fixture: current, run, prompt, score: 0, error: `invalid-json: ${message}`, durationMs, tokens: used, providerModel: provider.model });
        continue;
      }

      const refusal = detectStructuredRefusal(output);
      const quality = evaluateLlmQuality(output, current);
      const score = refusal.refused ? 0 : quality.score;

      const failures = quality.checks.filter((check) => !check.passed).map((check) => check.id);
      console.log(`[${current.id} #${run}] score=${score} durationMs=${durationMs} tokens=${used} refused=${refusal.refused} title=${output.archetypeTitle} failures=${failures.join(',') || 'none'}`);
      if (verbose) {
        console.log(JSON.stringify({ case: current.id, run, output, checks: quality.checks }, null, 2));
      }
      results.push({ fixture: current, run, prompt, output, score, checks: quality.checks, refusal, durationMs, tokens: used, providerModel: provider.model });
    }
  }

  const average = results.reduce((sum, item) => sum + item.score, 0) / results.length;
  const successfulResults = results.filter((item): item is typeof item & { output: LlmAnalysisJson } => Boolean(item.output));
  const distinctTitles = new Set(successfulResults.map((item) => item.output.archetypeTitle)).size;
  const stability = CASES.map((current) => {
    const runsForCase = successfulResults.filter((item) => item.fixture.id === current.id);
    if (runsForCase.length < 2) return null;
    return {
      id: current.id,
      similarity: characterBigramSimilarity(outputText(runsForCase[0].output), outputText(runsForCase[1].output)),
    };
  }).filter((item): item is { id: string; similarity: number } => Boolean(item));

  const durations = results.map((item) => item.durationMs);
  const summary = {
    model,
    calls: results.length,
    actualTokens,
    tokenBudget,
    averageScore: Number(average.toFixed(1)),
    minimumScore: Math.min(...results.map((item) => item.score)),
    failedCalls: results.filter((item) => item.error).length,
    refusedCalls: results.filter((item) => item.refusal?.refused).length,
    distinctTitles,
    speedMs: {
      average: Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
      median: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      min: Math.min(...durations),
      max: Math.max(...durations),
    },
    stability: stability.map((item) => ({ ...item, similarity: Number(item.similarity.toFixed(3)) })),
  };

  const workspaceRoot = resolve(process.cwd());
  const reportPath = resolve(workspaceRoot, process.env.LLM_EVAL_REPORT ?? 'docs/evaluations/LLM-EVAL-LATEST.md');
  if (!reportPath.startsWith(`${workspaceRoot}${sep}`)) {
    throw new Error('LLM_EVAL_REPORT must stay inside the workspace.');
  }
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, buildMarkdownReport(results, summary, new Date().toISOString()), 'utf8');

  console.log(JSON.stringify({ summary, report: relative(workspaceRoot, reportPath) }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
