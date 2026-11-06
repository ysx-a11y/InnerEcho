import { describe, expect, it } from 'vitest';
import { analyzeDossierSchema } from './schemas.js';
// 契约测试专用：仅类型导入前端真实载荷类型，确保前端新增字段时后端 strict schema 必须同步。
// 该测试不允许从 src 导入运行时代码（遵守“src/server 不互导”边界）。
import type { FullDossierData } from '../src/data/chapterStructure.js';

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** 完整模拟前端真实提交载荷：覆盖 ChapterOneData/ChapterTwoData/ChapterThreeData/遥测/题库/日志/媒体附件全部字段。 */
function buildRealisticFrontendPayload(): FullDossierData {
  return {
    chapter1: {
      nickname: '契约测试员',
      gender: '女',
      occupation: '测试工程师',
      avatarUrl: TINY_PNG,
      avatarUrls: [TINY_PNG],
      personaTrait: '高冷精英',
      age: '28',
      maritalStatus: '未婚',
      hasBoyfriend: '单身',
      surfaceTrait: '表面温和克制',
      innerDesire: '渴望彻底卸下掌控，体验安全交付',
      durationSeconds: 42,
    },
    chapter2: {
      boundaryText: '绝对安全的边界试探',
      fantasyText: '私密幻想场景描述',
      relationPreference: '信任交付',
      awakeningMoment: '初次觉醒的瞬间',
      durationSeconds: 60,
    },
    chapter3: {
      secretWords: '密室第一句话',
      secretRule: '私密法则',
      durationSeconds: 30,
    },
    selectedShadowTags: ['反差情绪', '绝对臣服'],
    depthRating: 'deep',
    telemetry: {
      submitTimestamp: '2026-08-16 05:00:00',
      isDarkMode: true,
      isLateNight: true,
      totalKeystrokes: 220,
      totalBackspaces: 18,
      deletionRatePercent: 8,
      hesitationPauses: 5,
      fieldTelemetryMap: {
        nickname: {
          fieldId: 'nickname',
          fieldLabel: '昵称',
          keystrokes: 12,
          backspaces: 2,
          deletionRatePercent: 16,
          pauses: 1,
          struggleScore: 3,
        },
      },
      topStruggledFields: [{ label: 'innerDesire', deletionRate: 20, pauses: 2, score: 3 }],
      flipFlopCount: 1,
      flipFlopLog: ['opt_1 -> opt_2'],
      avgTouchDurationMs: 320,
    },
    selectedBankIds: ['standard_bdsm_50'],
    completedBanks: [
      {
        id: 'standard_bdsm_50',
        title: '标准 BDSM 50 题',
        subtitle: '科学属性',
        description: '多维度标准化测评',
        category: 'scientific',
        badgeColor: '#ff3377',
        estimatedMinutes: 8,
        questions: [
          {
            id: 'std_bdsm_1',
            bankId: 'standard_bdsm_50',
            title: '你是否喜欢掌控节奏？',
            type: 'single_choice',
            options: [
              { id: 'opt_1', text: '非常符合', scores: { dominance: 5 }, tags: ['主导'] },
              { id: 'opt_2', text: '完全不符', scores: { dominance: 1 }, tags: ['顺从'] },
            ],
            isRequired: true,
          },
        ],
      },
    ],
    aggregatedScores: { dominance: 78, submission: 22, restraint: 65, sensory: 58 },
    collectedTags: ['主导', '反差'],
    questionLogs: [
      {
        questionId: 'std_bdsm_1',
        bankId: 'standard_bdsm_50',
        enterTimestamp: 1700000000000,
        leaveTimestamp: 1700000045000,
        durationMs: 45000,
        interactionCount: 3,
        actionLogs: ['enter:1700000000000', 'select_options:opt_1', 'leave:1700000045000'],
        isLeftBlank: false,
        finalValue: { selectedOptions: ['opt_1'] },
      },
      {
        questionId: 'q_open',
        bankId: 'standard_bdsm_50',
        enterTimestamp: 1700000050000,
        durationMs: 12000,
        interactionCount: 1,
        actionLogs: ['enter:1700000050000', 'text_input:秘密'],
        isLeftBlank: false,
        finalValue: { textInput: '我的隐秘渴望' },
      },
      {
        questionId: 'q_media',
        bankId: 'standard_bdsm_50',
        enterTimestamp: 1700000060000,
        durationMs: 8000,
        interactionCount: 1,
        actionLogs: ['enter:1700000060000', 'media_upload:image'],
        isLeftBlank: false,
        finalValue: {
          mediaAttachments: [
            {
              id: 'media_1',
              name: 'photo.png',
              type: 'image',
              mimeType: 'image/png',
              sizeBytes: 1024,
              dataUrl: TINY_PNG,
              durationSeconds: undefined,
            },
          ],
        },
      },
    ],
    userTextAnswers: { q_open: '我的隐秘渴望' },
    userMediaAttachments: {
      q_media: [
        {
          id: 'media_1',
          name: 'photo.png',
          type: 'image',
          mimeType: 'image/png',
          sizeBytes: 1024,
          dataUrl: TINY_PNG,
        },
      ],
    },
    totalDurationSeconds: 123,
  };
}

describe('前后端载荷契约（analyze-dossier）', () => {
  it('前端 FullDossierData 全字段载荷必须通过后端 strict schema', () => {
    const payload = buildRealisticFrontendPayload();
    const parsed = analyzeDossierSchema.safeParse({ dossierData: payload });

    if (!parsed.success) {
      // 失败时把第一个问题完整打印，便于定位是哪个字段不一致
      expect(parsed.error.issues[0]).toBeUndefined();
    }
    expect(parsed.success).toBe(true);
  });

  it('前端可选自定义 LLM 配置同样通过校验', () => {
    const payload = buildRealisticFrontendPayload();
    const parsed = analyzeDossierSchema.safeParse({
      dossierData: payload,
      customConfig: {
        apiKey: 'sk-test',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
      },
    });
    expect(parsed.success).toBe(true);
  });
});
