import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createUserApp } from './app.js';
import { db } from './db.js';
import type { FullDossierData, LlmAnalysisJson } from './types.js';

const app = createUserApp();
const password = 'validPass123';
const originalFieldEncryptionKey = process.env.FIELD_ENC_KEY;
const testFieldEncryptionKey = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');

afterEach(() => {
  if (originalFieldEncryptionKey) process.env.FIELD_ENC_KEY = originalFieldEncryptionKey;
  else delete process.env.FIELD_ENC_KEY;
});

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function buildDossier(bankIds: string[]): FullDossierData {
  return {
    chapter1: {
      nickname: '复测测试者',
      occupation: '测试职业',
      age: '26',
      maritalStatus: '未婚',
      surfaceTrait: '外在克制',
      innerDesire: '内在渴望失控',
    },
    chapter2: {
      boundaryText: '边界',
      fantasyText: '幻想',
      relationPreference: '关系偏好',
      awakeningMoment: '觉醒时刻',
    },
    chapter3: { secretWords: '秘密词', secretRule: '秘密规则' },
    depthRating: 'medium',
    selectedShadowTags: ['角色互换'],
    selectedBankIds: bankIds,
  };
}

function buildAnalysis(overrides: Partial<LlmAnalysisJson> = {}): LlmAnalysisJson {
  return {
    credibilityScore: 88,
    credibilityLevel: 'high',
    archetypeTitle: '测试原型',
    archetypeSubtitle: '测试副标题',
    disparityScore: 60,
    dominanceIndex: 40,
    submissionIndex: 50,
    restraintIndex: 70,
    sensoryThreshold: 30,
    personaDeconstruction: '不应对外返回的人格剖析',
    shadowDeconstruction: '不应对外返回的阴影解构',
    psychologicalSublimation: '不应对外返回的升华建议',
    resonanceKeywords: ['关键词'],
    ...overrides,
  };
}

/** 两次保存之间留出毫秒差，保证按 created_at 升序的先后关系稳定。 */
async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 5));
}

describe('题库完成情况与复测对比 API', () => {
  it('匿名访客按设备标识聚合完成次数，且不与其他设备串台', async () => {
    const deviceA = `dev_completion_a_${Date.now()}`;
    const deviceB = `dev_completion_b_${Date.now()}`;
    const bankAlpha = `bank_alpha_${Date.now()}`;
    const bankBeta = `bank_beta_${Date.now()}`;

    const first = await db.saveDossier(null, deviceA, buildDossier([bankAlpha]), buildAnalysis());
    await tick();
    const second = await db.saveDossier(null, deviceA, buildDossier([bankAlpha]), buildAnalysis({ archetypeTitle: '第二次原型' }));
    await tick();
    await db.saveDossier(null, deviceA, buildDossier([bankBeta]), buildAnalysis());

    const res = await request(app)
      .get('/api/banks/completion')
      .set('X-Device-Id', deviceA)
      .expect(200);

    expect(res.body.success).toBe(true);
    const alpha = res.body.completions.find((item: { bankId: string }) => item.bankId === bankAlpha);
    const beta = res.body.completions.find((item: { bankId: string }) => item.bankId === bankBeta);
    expect(alpha.count).toBe(2);
    expect(alpha.firstAt).toBe(first.createdAt);
    expect(alpha.lastAt).toBe(second.createdAt);
    expect(alpha.lastDossierId).toBe(second.id);
    expect(beta.count).toBe(1);

    // 其他设备看不到这台设备的完成记录
    const otherRes = await request(app)
      .get('/api/banks/completion')
      .set('X-Device-Id', deviceB)
      .expect(200);
    expect(otherRes.body.completions).toEqual([]);
  });

  it('无设备标识的访客返回空完成列表，不报错', async () => {
    const res = await request(app).get('/api/banks/completion').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.completions).toEqual([]);
  });

  it('登录用户的完成情况按账号统计，且不会把同设备的匿名卷宗算进账号', async () => {
    const agent = request.agent(app);
    const deviceId = `dev_completion_logged_${Date.now()}`;
    const accountBank = `bank_account_${Date.now()}`;
    const anonymousBank = `bank_anonymous_${Date.now()}`;

    const registerRes = await agent
      .post('/api/auth/register')
      .send({ email: uniqueEmail('completion'), password })
      .expect(200);
    const userId = registerRes.body.user.id as string;

    // 同一台设备上的匿名卷宗：不应回传给登录账号
    await db.saveDossier(null, deviceId, buildDossier([anonymousBank]), buildAnalysis());
    await db.saveDossier(userId, deviceId, buildDossier([accountBank]), buildAnalysis());

    const res = await agent
      .get('/api/banks/completion')
      .set('X-Device-Id', deviceId)
      .expect(200);

    const bankIds = res.body.completions.map((item: { bankId: string }) => item.bankId);
    expect(bankIds).toContain(accountBank);
    expect(bankIds).not.toContain(anonymousBank);
  });

  it('复测对比只返回本人该题库的指标，按时间升序，且不含报告正文与内部可信度', async () => {
    const otherAgent = request.agent(app);
    const agent = request.agent(app);
    const bankId = `bank_retest_${Date.now()}`;
    const otherBank = `bank_retest_other_${Date.now()}`;

    const registerRes = await agent
      .post('/api/auth/register')
      .send({ email: uniqueEmail('retest'), password })
      .expect(200);
    const userId = registerRes.body.user.id as string;

    const otherRegisterRes = await otherAgent
      .post('/api/auth/register')
      .send({ email: uniqueEmail('retest-other'), password })
      .expect(200);
    const otherUserId = otherRegisterRes.body.user.id as string;

    const first = await db.saveDossier(userId, null, buildDossier([bankId]), buildAnalysis({ archetypeTitle: '首次原型' }));
    await tick();
    const second = await db.saveDossier(
      userId,
      null,
      buildDossier([bankId]),
      buildAnalysis({ archetypeTitle: '最近原型', disparityScore: 75, submissionIndex: 66 })
    );
    await db.saveDossier(otherUserId, null, buildDossier([bankId]), buildAnalysis({ archetypeTitle: '他人的原型' }));
    await db.saveDossier(userId, null, buildDossier([otherBank]), buildAnalysis({ archetypeTitle: '别的题库' }));

    const res = await agent.get(`/api/dossiers/retest/${bankId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.bankId).toBe(bankId);
    expect(res.body.attempts).toHaveLength(2);
    expect(res.body.attempts[0].dossierId).toBe(first.id);
    expect(res.body.attempts[0].archetypeTitle).toBe('首次原型');
    expect(res.body.attempts[1].dossierId).toBe(second.id);
    expect(res.body.attempts[1].archetypeTitle).toBe('最近原型');
    expect(res.body.attempts[1].disparityScore).toBe(75);
    expect(res.body.attempts[1].submissionIndex).toBe(66);
    expect(res.body.attempts[0].selectedShadowTags).toEqual(['角色互换']);

    // 不外泄报告正文与内部可信度
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('不应对外返回');
    expect(serialized).not.toContain('credibilityScore');
    expect(serialized).not.toContain('其他人的原型');
  });

  it('未登录访问复测对比返回 401，无记录返回 404', async () => {
    await request(app).get('/api/dossiers/retest/bank_none').expect(401);

    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ email: uniqueEmail('retest-empty'), password })
      .expect(200);
    await agent.get('/api/dossiers/retest/bank_none').expect(404);
  });

  it('开启字段加密后，复测指标仍能正确解密返回', async () => {
    process.env.FIELD_ENC_KEY = testFieldEncryptionKey;
    const agent = request.agent(app);
    const bankId = `bank_retest_enc_${Date.now()}`;

    const registerRes = await agent
      .post('/api/auth/register')
      .send({ email: uniqueEmail('retest-encrypted'), password })
      .expect(200);
    const userId = registerRes.body.user.id as string;

    await db.saveDossier(userId, null, buildDossier([bankId]), buildAnalysis({ archetypeTitle: '加密原型', restraintIndex: 81 }));
    await tick();
    await db.saveDossier(userId, null, buildDossier([bankId]), buildAnalysis({ archetypeTitle: '加密原型二', restraintIndex: 55 }));

    const res = await agent.get(`/api/dossiers/retest/${bankId}`).expect(200);
    expect(res.body.attempts).toHaveLength(2);
    expect(res.body.attempts[0].archetypeTitle).toBe('加密原型');
    expect(res.body.attempts[0].restraintIndex).toBe(81);
    expect(res.body.attempts[1].archetypeTitle).toBe('加密原型二');
    expect(res.body.attempts[1].restraintIndex).toBe(55);
  });
});
