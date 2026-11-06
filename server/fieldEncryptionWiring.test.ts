import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, upgradeSensitiveStorageEncryption } from './db.js';
import type { FullDossierData, LlmAnalysisJson } from './types.js';

const ORIGINAL_KEY = process.env.FIELD_ENC_KEY;
const TEST_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');

function makeDossierData(): FullDossierData {
  return {
    chapter1: {
      nickname: '测试昵称',
      occupation: '开发者',
      avatarUrls: ['data:image/png;base64,PRIVATE_AVATAR'],
      surfaceTrait: '人前冷静',
      innerDesire: '渴望失控',
      durationSeconds: 37,
    },
    chapter2: {
      boundaryText: '我的边界是深海',
      fantasyText: '幻想在极光下奔跑',
      relationPreference: '需要深度信任',
      awakeningMoment: '凌晨三点的雨声',
    },
    chapter3: {
      secretWords: '玻璃与月光',
      secretRule: '绝不先说再见',
    },
    depthRating: 'deep',
    selectedShadowTags: ['私密标签'],
    selectedBankIds: ['encrypted_bank'],
    completedBanks: [{ id: 'encrypted_bank', title: '私密题库', questions: [{ id: 'q-private', title: '私密问题' }] }],
    aggregatedScores: { dominance: 66 },
    collectedTags: ['隐秘偏好'],
    questionLogs: [{
      bankId: 'encrypted_bank',
      questionId: 'q-private',
      durationMs: 3200,
      interactionCount: 2,
      finalValue: { textInput: '日志中的私密答案' },
    }],
    userTextAnswers: { 'q-private': '开放题私密答案' },
    userMediaAttachments: { 'q-private': [{ name: 'private.png', dataUrl: 'data:image/png;base64,PRIVATE_MEDIA' }] },
    totalDurationSeconds: 42,
    telemetry: {
      submitTimestamp: new Date(0).toISOString(),
      isDarkMode: true,
      isLateNight: false,
      totalKeystrokes: 10,
      totalBackspaces: 2,
      deletionRatePercent: 20,
      hesitationPauses: 3,
      fieldTelemetryMap: { secret: 'private-telemetry' },
      topStruggledFields: [],
      flipFlopCount: 1,
      flipFlopLog: ['private-flip'],
      avgTouchDurationMs: 120,
    },
  } as FullDossierData;
}

function makeResult(): LlmAnalysisJson {
  return {
    credibilityScore: 80,
    credibilityLevel: 'high',
    archetypeTitle: '测试原型',
    personaDeconstruction: '诊断中的私密人格解读',
    shadowDeconstruction: '诊断中的私密阴影解读',
    psychologicalSublimation: '诊断中的私密建议',
    resonanceKeywords: ['测试'],
  };
}

describe('字段级落库加密接线（fieldCrypto → db）', () => {
  beforeEach(() => {
    delete process.env.FIELD_ENC_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_KEY) process.env.FIELD_ENC_KEY = ORIGINAL_KEY;
    else delete process.env.FIELD_ENC_KEY;
  });

  it('未配置密钥时维持明文落库（向后兼容）', async () => {
    const user = await db.createUser(`enc-plain-${Date.now()}@example.com`, 'hash');
    await db.saveDossier(user.id, 'dev_plain', makeDossierData(), makeResult());
    const rows = await db.getDossierHistoryByUserId(user.id);
    expect(rows[0].chapter2.boundaryText).toBe('我的边界是深海');
    expect(rows[0].chapter3.secretWords).toBe('玻璃与月光');
    expect(rows[0].chapter1.avatarUrls).toEqual(['data:image/png;base64,PRIVATE_AVATAR']);
    expect(rows[0].chapter1.durationSeconds).toBe(37);
    expect(rows[0].selectedShadowTags).toEqual(['私密标签']);
    expect(rows[0].diagnosticResult?.shadowDeconstruction).toBe('诊断中的私密阴影解读');
    expect(rows[0].quizPayload.userTextAnswers['q-private']).toBe('开放题私密答案');
    expect(rows[0].quizPayload.questionLogs[0].finalValue.textInput).toBe('日志中的私密答案');
    expect((rows[0].telemetry.fieldTelemetryMap as Record<string, string>).secret).toBe('private-telemetry');

    const stats = await db.getUserStats(user.id);
    expect(stats?.avatarUrls).toEqual(['data:image/png;base64,PRIVATE_AVATAR']);
    const telemetry = await db.getAdminTelemetry();
    expect(telemetry.banks.some((bank) => bank.bankId === 'encrypted_bank' && bank.avgDurationSeconds === 42)).toBe(true);
  });

  it('配置密钥后落库加密且读回解密正确', async () => {
    process.env.FIELD_ENC_KEY = TEST_KEY;
    const user = await db.createUser(`enc-keyed-${Date.now()}@example.com`, 'hash');
    await db.saveDossier(user.id, 'dev_keyed', makeDossierData(), makeResult());
    const rows = await db.getDossierHistoryByUserId(user.id);
    expect(rows[0].chapter1.surfaceTrait).toBe('人前冷静');
    expect(rows[0].chapter1.innerDesire).toBe('渴望失控');
    expect(rows[0].chapter2.fantasyText).toBe('幻想在极光下奔跑');
    expect(rows[0].chapter2.relationPreference).toBe('需要深度信任');
    expect(rows[0].chapter2.awakeningMoment).toBe('凌晨三点的雨声');
    expect(rows[0].chapter3.secretWords).toBe('玻璃与月光');
    expect(rows[0].chapter3.secretRule).toBe('绝不先说再见');
    expect(rows[0].chapter1.durationSeconds).toBe(37);
  });

  it('配置密钥后把存量明文原地升级为密文', async () => {
    const user = await db.createUser(`enc-legacy-${Date.now()}@example.com`, 'hash');
    // 先无密钥落一条明文
    await db.saveDossier(user.id, 'dev_legacy', makeDossierData(), makeResult());
    // 再配置密钥
    process.env.FIELD_ENC_KEY = TEST_KEY;
    await upgradeSensitiveStorageEncryption();
    const rows = await db.getDossierHistoryByUserId(user.id);
    expect(rows[0].chapter2.boundaryText).toBe('我的边界是深海');
    expect(rows[0].chapter3.secretRule).toBe('绝不先说再见');

    // 升级后缺少密钥必须读取失败，证明记录不再以明文形式落库。
    delete process.env.FIELD_ENC_KEY;
    await expect(db.getDossierHistoryByUserId(user.id)).rejects.toThrow('FIELD_ENC_KEY');
  });

  it('升级完成后写入标记，再次调用直接跳过', async () => {
    process.env.FIELD_ENC_KEY = TEST_KEY;
    const user = await db.createUser(`enc-marker-${Date.now()}@example.com`, 'hash');
    await db.saveDossier(user.id, 'dev_marker', makeDossierData(), makeResult());

    // 标记已由前序"存量明文升级"用例写入；再次调用应快速返回且不破坏数据。
    await expect(upgradeSensitiveStorageEncryption()).resolves.toBeUndefined();

    const rows = await db.getDossierHistoryByUserId(user.id);
    expect(rows[0].chapter3.secretWords).toBe('玻璃与月光');
    expect(rows[0].quizPayload.userTextAnswers['q-private']).toBe('开放题私密答案');
  });
});
