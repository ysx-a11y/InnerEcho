import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, createAdminApp } from './app.js';
import { db } from './db.js';
import type { FullDossierData, LlmAnalysisJson } from './types.js';

const app = createApp();
const adminApp = createAdminApp();
const ADMIN_TOKEN = 'test-only-admin-token';

describe('Dossiers Mirror Resonance Feedback API', () => {
  it('allows user to submit resonance rating and custom reflection text', async () => {
    const deviceId = `device_resonance_${Date.now()}`;

    // 1. Save a sample dossier in DB
    const dossierData: FullDossierData = {
      chapter1: {
        nickname: '共鸣测试者',
        occupation: '心理咨询师',
        personaTrait: '温和包容',
        age: '28',
        maritalStatus: '未婚',
        hasBoyfriend: '无',
        surfaceTrait: '专业理智、倾听他人',
        innerDesire: '渴望在被完全了解的同时交出控制权',
      },
      chapter2: {
        boundaryText: '完全信任下的支配与引导',
        fantasyText: '暗室中的声音指令',
        relationPreference: '深度契约',
        awakeningMoment: '工作压力极大后的顿悟',
      },
      chapter3: {
        secretWords: '静默',
        secretRule: '不得私自窥探',
      },
      depthRating: 'deep',
      selectedShadowTags: ['角色倒错', '深度臣服'],
    };

    const diagnosticResult: LlmAnalysisJson = {
      credibilityScore: 92,
      credibilityLevel: 'high',
      archetypeTitle: '暗夜执笔者',
      archetypeSubtitle: '在理智与失控中漫游',
      dominanceIndex: 75,
      restraintIndex: 85,
      submissionIndex: 60,
      sensoryThreshold: 80,
      personaDeconstruction: '外在温和专业',
      shadowDeconstruction: '内在渴望被完全支配',
      psychologicalSublimation: '接纳双面自我',
      resonanceKeywords: ['支配', '深层臣服'],
    };

    const { id: dossierId } = await db.saveDossier(null, deviceId, dossierData, diagnosticResult);
    expect(dossierId).toBeTruthy();

    // 2. Submit invalid resonance level -> 400
    const invalidRes = await request(app)
      .post(`/api/dossiers/${dossierId}/resonance`)
      .set('X-Device-Id', deviceId)
      .send({ resonanceLevel: 'invalid_level' })
      .expect(400);
    expect(invalidRes.body.success).toBe(false);

    // 3. Submit valid resonance feedback
    const reflectionText = '算法剖析非常敏锐，确实击中了我从未言说的控制倒错需求。';
    const resonanceRes = await request(app)
      .post(`/api/dossiers/${dossierId}/resonance`)
      .set('X-Device-Id', deviceId)
      .send({
        resonanceLevel: 'exact',
        resonanceText: reflectionText,
      })
      .expect(200);

    expect(resonanceRes.body.success).toBe(true);
    expect(resonanceRes.body.resonanceLevel).toBe('exact');
    expect(resonanceRes.body.resonanceText).toBe(reflectionText);

    // 3b. 匿名越权防护：其他设备不能改写本卷宗的共鸣印记
    await request(app)
      .post(`/api/dossiers/${dossierId}/resonance`)
      .set('X-Device-Id', 'intruder_device')
      .send({ resonanceLevel: 'guarded', resonanceText: '越权覆盖' })
      .expect(404);

    // 4. Verify admin dossier detail returns decrypted resonance data
    const adminRes = await request(adminApp)
      .get(`/api/admin/dossiers/${dossierId}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.dossier.resonanceLevel).toBe('exact');
    expect(adminRes.body.dossier.resonanceText).toBe(reflectionText);
    expect(adminRes.body.dossier.resonanceAt).toBeTruthy();
  });
});
