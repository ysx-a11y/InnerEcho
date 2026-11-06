import type { FullDossierData } from './types.js';
import { BUILTIN_PROMPT_TEMPLATE } from './defaultPromptTemplate.js';

interface OptionDef {
  id: string;
  text: string;
  subtext?: string;
}

interface QuestionDef {
  id: string;
  title: string;
  scenario?: string;
  type: string;
  options?: OptionDef[];
}

interface BankDef {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  category?: string;
  questions?: QuestionDef[];
}

interface MediaAttachmentDef {
  name?: string;
}

interface QuestionLogDef {
  questionId?: string;
  durationMs?: number;
  interactionCount?: number;
  isLeftBlank?: boolean;
  actionLogs?: string[];
  finalValue?: {
    selectedOptions?: string[];
    textInput?: string;
    mediaAttachments?: unknown[];
  };
}

function countRevisions(log: QuestionLogDef): number {
  const actions = log.actionLogs ?? [];
  const optionEdits = Math.max(0, actions.filter((action) => action.startsWith('select_options:')).length - 1);
  const textEdits = Math.max(0, actions.filter((action) => action.startsWith('text_input:')).length - 1);
  const reEnters = actions.filter((action) => action.startsWith('re_enter:')).length;
  return optionEdits + textEdits + reEnters;
}

function buildBehavioralSignalsSection(
  questionLogs: QuestionLogDef[],
  questionMap: Map<string, QuestionDef>
): string {
  const titledLogs = questionLogs.filter((log) => log.questionId && questionMap.has(log.questionId));
  if (titledLogs.length === 0) return '';

  const usedQuestionIds = new Set<string>();
  const titleOf = (log: QuestionLogDef): string => questionMap.get(log.questionId!)?.title || '未命名问题';
  const lines: string[] = [];

  const longest = [...titledLogs]
    .filter((log) => (log.durationMs || 0) > 0)
    .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
    .find((log) => !usedQuestionIds.has(log.questionId!));
  if (longest) {
    usedQuestionIds.add(longest.questionId!);
    const seconds = Math.max(1, Math.round((longest.durationMs || 0) / 1000));
    lines.push(`- 停留最久：在「${titleOf(longest)}」上停留约 ${seconds} 秒。`);
  }

  const mostRevised = [...titledLogs]
    .sort((a, b) => countRevisions(b) - countRevisions(a))
    .find((log) => !usedQuestionIds.has(log.questionId!));
  if (mostRevised && countRevisions(mostRevised) > 0) {
    usedQuestionIds.add(mostRevised.questionId!);
    lines.push(`- 修改最多：在「${titleOf(mostRevised)}」上反复修改/切换约 ${countRevisions(mostRevised)} 次。`);
  }

  const blankCandidates = Array.from(questionMap.entries())
    .filter(([, question]) => question.type === 'open_text')
    .map(([questionId, question]) => {
      const log = questionLogs.find((item) => item.questionId === questionId);
      return {
        questionId,
        title: question.title || '未命名问题',
        durationMs: log?.durationMs || 0,
        isBlank: !log || Boolean(log.isLeftBlank),
      };
    })
    .filter((candidate) => candidate.isBlank)
    .sort((a, b) => b.durationMs - a.durationMs);

  const blank = blankCandidates.find((candidate) => !usedQuestionIds.has(candidate.questionId));
  if (blank) {
    usedQuestionIds.add(blank.questionId);
    lines.push(`- 留白未答：对「${blank.title}」选择留白，未留下答案。`);
  }

  if (lines.length === 0) return '';
  return `【作答节奏微信号（停留最久 / 修改最多 / 留白未答）】：\n${lines.join('\n')}`;
}

export function buildDynamicLLMPrompt(
  payload: FullDossierData,
  instructionTemplate = BUILTIN_PROMPT_TEMPLATE
): string {
  const completedBanks = (payload?.completedBanks as BankDef[] | undefined) ?? [];

  const questionLogs = (payload?.questionLogs as QuestionLogDef[] | undefined) ?? [];
  const userTextAnswers = payload?.userTextAnswers ?? {};
  const userMediaAttachments = payload?.userMediaAttachments ?? {};

  const ch1 = payload?.chapter1 ?? {};

  // 1. 题库元数据信息（动态组装）
  const bankMetadataDescriptions = completedBanks
    .map((b) => `- 题库名称: ${b.title || '未命名题库'}${b.subtitle ? ` (${b.subtitle})` : ''}${b.description ? `\n  描述: ${b.description}` : ''}`)
    .join('\n\n');
  const bankMetadataSection = bankMetadataDescriptions
    ? `【当前测评题库的元数据】：\n${bankMetadataDescriptions}`
    : '';

  // 2. 建立题目映射字典
  const questionMap = new Map<string, QuestionDef>();
  completedBanks.forEach((bank) => {
    if (Array.isArray(bank.questions)) {
      bank.questions.forEach((q) => {
        questionMap.set(q.id, q);
      });
    }
  });

  // 2.5 作答节奏微信号（停留最久 / 修改最多 / 留白未答，最多三条）
  const behavioralSignalsSection = buildBehavioralSignalsSection(questionLogs, questionMap);

  // 3. 构建用户作答细节列表（动态组装）
  const answersList: string[] = [];
  questionLogs.forEach((log, index) => {
    const qId = log.questionId;
    if (!qId) return;
    const q = questionMap.get(qId);
    if (!q) return;

    const questionTitle = q.title || '未命名问题';
    const questionScenario = q.scenario ? ` (情境: ${q.scenario})` : '';

    if (q.type === 'single_choice' || q.type === 'multiple_choice') {
      const selectedOptIds = log.finalValue?.selectedOptions ?? [];
      const selectedTexts: string[] = [];
      if (Array.isArray(q.options)) {
        selectedOptIds.forEach((optId) => {
          const opt = q.options?.find((o) => o.id === optId);
          if (opt) {
            selectedTexts.push(`"${opt.text}"${opt.subtext ? ` (${opt.subtext})` : ''}`);
          }
        });
      }
      if (selectedTexts.length > 0) {
        answersList.push(`[问题 ${index + 1}] "${questionTitle}"${questionScenario} -> 用户选择了: ${selectedTexts.join('、')}`);
      }
    } else if (q.type === 'open_text') {
      const textVal = userTextAnswers[qId];
      if (textVal && textVal.trim()) {
        answersList.push(`[问题 ${index + 1}] "${questionTitle}"${questionScenario} -> 用户手填倾诉: "${textVal.trim()}"`);
      }
    } else if (q.type === 'media_upload') {
      const attachments = userMediaAttachments[qId] as MediaAttachmentDef[] | undefined;
      if (Array.isArray(attachments) && attachments.length > 0) {
        const attachmentNames = attachments.map((a) => a.name || '多媒体文件').join('、');
        answersList.push(`[问题 ${index + 1}] "${questionTitle}"${questionScenario} -> 用户上传了多媒体意象: ${attachmentNames}`);
      }
    }
  });
  const answersDetailSection = answersList.length > 0
    ? `【用户作答与选择详情】：\n${answersList.join('\n')}`
    : '';

  // 4. 简答题倾诉记录（动态组装）
  const textEntries = Object.entries(userTextAnswers)
    .filter(([, txt]) => txt && txt.trim().length > 0)
    .map(([qId, txt]) => `[题目 ${qId}] 倾诉手填: "${txt.trim()}"`)
    .join('\n');

  const textEntriesSection = textEntries
    ? `【开放式倾诉手填记录】：\n${textEntries}`
    : '';

  // 5. 访客自建基本身份与手填自白信息（仅取实际存在且有填写的 Chapter 1 字段）
  const infoLines: string[] = [];
  if (ch1.nickname && ch1.nickname.trim()) infoLines.push(`- 昵称/代号：${ch1.nickname.trim()}`);
  if (ch1.gender && ch1.gender.trim()) infoLines.push(`- 性别：${ch1.gender.trim()}`);
  if (ch1.occupation && ch1.occupation.trim()) infoLines.push(`- 真实社会职业：${ch1.occupation.trim()}`);

  const age = ch1.age ? ch1.age.trim() : '';
  const marital = ch1.maritalStatus ? ch1.maritalStatus.trim() : '';
  const hasBoyfriend = ch1.hasBoyfriend ? ch1.hasBoyfriend.trim() : '';
  const relationshipStatus = [age, marital, hasBoyfriend].filter(Boolean).join(' | ');
  if (relationshipStatus) {
    infoLines.push(`- 年龄与情感状态：${relationshipStatus}`);
  }

  const surface = ch1.surfaceTrait || ch1.personaTrait;
  if (surface && surface.trim()) infoLines.push(`- 人前社交表象：${surface.trim()}`);
  if (ch1.innerDesire && ch1.innerDesire.trim()) infoLines.push(`- 无人时隐秘渴望：${ch1.innerDesire.trim()}`);

  const visitorDataSection = infoLines.length > 0
    ? `【访客社会身份与表里自白数据】：\n${infoLines.join('\n')}`
    : '';

  // 组合非空数据块
  const dataBlocks = [
    bankMetadataSection,
    behavioralSignalsSection,
    answersDetailSection,
    textEntriesSection,
    visitorDataSection,
  ].filter(Boolean).join('\n\n');

  const safeTemplate = instructionTemplate.trim() || BUILTIN_PROMPT_TEMPLATE;
  return `${dataBlocks}

--------------------------------------------------
${safeTemplate}`;
}
