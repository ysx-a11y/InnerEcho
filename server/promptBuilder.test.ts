import { describe, expect, it } from 'vitest';
import { buildDynamicLLMPrompt } from './promptBuilder.js';

describe('buildDynamicLLMPrompt', () => {
  it('要求结构化 JSON，同时允许行为微信号参与侧写', () => {
    const prompt = buildDynamicLLMPrompt({
      chapter1: { surfaceTrait: '冷静', innerDesire: '想暂时安静下来' },
      telemetry: {
        submitTimestamp: new Date(0).toISOString(),
        isDarkMode: true,
        isLateNight: true,
        totalKeystrokes: 100,
        totalBackspaces: 20,
        deletionRatePercent: 20,
        hesitationPauses: 8,
        fieldTelemetryMap: {},
        topStruggledFields: [],
        flipFlopCount: 3,
        flipFlopLog: [],
        avgTouchDurationMs: 600,
      },
    });

    expect(prompt).toContain('JSON');
    expect(prompt).toContain('被认真听见');
    expect(prompt).toContain('作答节奏微信号');
    expect(prompt).toContain('允许并鼓励使用【作答节奏微信号】');
    expect(prompt).not.toContain('Jailbreak');
    expect(prompt).not.toContain('完全虚构');
    expect(prompt).not.toContain('无条件进行解构');
    expect(prompt).not.toContain('totalBackspaces');
    expect(prompt).not.toContain('hesitationPauses');
  });

  it('按停留最久、修改最多、留白未答三类组装作答节奏微信号', () => {
    const prompt = buildDynamicLLMPrompt({
      chapter1: { surfaceTrait: '冷静' },
      completedBanks: [
        {
          id: 'bank_test',
          title: '测试题库',
          questions: [
            {
              id: 'q_long',
              type: 'single_choice',
              title: '停留最久题',
              options: [{ id: 'opt_0', text: '选项A' }],
            },
            {
              id: 'q_edit',
              type: 'open_text',
              title: '修改最多题',
            },
            {
              id: 'q_blank',
              type: 'open_text',
              title: '留白未答题',
            },
            {
              id: 'q_normal',
              type: 'single_choice',
              title: '普通题',
              options: [{ id: 'opt_1', text: '选项B' }],
            },
          ],
        },
      ],
      questionLogs: [
        {
          questionId: 'q_long',
          durationMs: 12000,
          actionLogs: ['enter:1', 'select_options:opt_0'],
          isLeftBlank: false,
          finalValue: { selectedOptions: ['opt_0'] },
        },
        {
          questionId: 'q_edit',
          durationMs: 3000,
          actionLogs: ['enter:1', 'text_input:len_1', 'text_input:len_4', 'text_input:len_9'],
          isLeftBlank: false,
          finalValue: { textInput: '反复修改的内容' },
        },
        {
          questionId: 'q_normal',
          durationMs: 1000,
          actionLogs: ['enter:1', 'select_options:opt_1'],
          isLeftBlank: false,
          finalValue: { selectedOptions: ['opt_1'] },
        },
      ],
      userTextAnswers: {},
      telemetry: {
        submitTimestamp: new Date(0).toISOString(),
        isDarkMode: false,
        isLateNight: false,
        totalKeystrokes: 500,
        totalBackspaces: 120,
        deletionRatePercent: 24,
        hesitationPauses: 9,
        fieldTelemetryMap: {},
        topStruggledFields: [
          { label: '最深的秘密', deletionRate: 45, pauses: 3, score: 96 },
          { label: '隐秘幻想', deletionRate: 30, pauses: 2, score: 72 },
          { label: '真实自我', deletionRate: 10, pauses: 0, score: 21 },
          { label: '不应显示第四条', deletionRate: 99, pauses: 9, score: 999 },
        ],
        flipFlopCount: 2,
        flipFlopLog: [],
        avgTouchDurationMs: 600,
      },
    });

    expect(prompt).toContain('停留最久');
    expect(prompt).toContain('停留最久题');
    expect(prompt).toContain('修改最多');
    expect(prompt).toContain('修改最多题');
    expect(prompt).toContain('留白未答');
    expect(prompt).toContain('留白未答题');
    expect(prompt).not.toContain('不应显示第四条');
    expect(prompt).not.toContain('totalBackspaces');
    expect(prompt).not.toContain('hesitationPauses');
    expect(prompt).not.toContain('totalKeystrokes');
  });

  it('允许替换报告指令，但始终保留系统组装的题库与作答数据', () => {
    const prompt = buildDynamicLLMPrompt({
      chapter1: { nickname: '测试代号', surfaceTrait: '冷静' },
      completedBanks: [{ id: 'bank_custom', title: '自定义题库' }],
      questionLogs: [],
      userTextAnswers: {},
    }, '自定义报告指令：请仅输出指定 JSON 字段。'.repeat(8));

    expect(prompt).toContain('自定义题库');
    expect(prompt).toContain('测试代号');
    expect(prompt).toContain('自定义报告指令');
    expect(prompt).not.toContain('极具洞察力');
  });
});
