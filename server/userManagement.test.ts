import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
import type { FullDossierData, LlmAnalysisJson } from './types.js';

const app = createApp();
const ADMIN_TOKEN = config.adminToken;

const TINY_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function buildDossier(nickname: string): FullDossierData {
  return {
    chapter1: {
      nickname,
      age: '26',
      occupation: '测试专员',
      innerDesire: '隐秘渴望测试',
      avatarUrl: TINY_AVATAR,
      avatarUrls: [TINY_AVATAR],
    },
    chapter2: {
      boundaryText: '绝对安全底线',
      fantasyText: '私密遐想场景',
      relationPreference: '深度契合',
      awakeningMoment: '初次觉醒时刻',
    },
    chapter3: { secretWords: '绝密自白', secretRule: '规则条款' },
    selectedShadowTags: ['暗黑依恋', '心智掌控'],
    depthRating: 'deep',
    telemetry: {
      submitTimestamp: '2026-08-16 03:00:00',
      isDarkMode: true,
      isLateNight: true,
      totalKeystrokes: 120,
      totalBackspaces: 8,
      deletionRatePercent: 6,
      hesitationPauses: 3,
      fieldTelemetryMap: {},
      topStruggledFields: [],
      flipFlopCount: 0,
      flipFlopLog: [],
      avgTouchDurationMs: 300,
    },
    selectedBankIds: ['standard_bdsm_50'],
    completedBanks: [],
    aggregatedScores: { dominance: 78, submission: 22 },
    collectedTags: ['暗黑依恋'],
    questionLogs: [],
    userTextAnswers: {},
    userMediaAttachments: {},
    totalDurationSeconds: 45,
  };
}

function buildDiagnostic(): LlmAnalysisJson {
  return {
    credibilityScore: 95,
    credibilityLevel: 'high',
    archetypeTitle: '高阶灵魂观测者',
    archetypeSubtitle: '深沉冷静的观察者',
    dominanceIndex: 85,
    submissionIndex: 20,
    restraintIndex: 60,
    sensoryThreshold: 80,
    personaDeconstruction: '具备极高自我觉察与深层掌控力',
    shadowDeconstruction: '在安全边界内释放深层本能',
    psychologicalSublimation: '接纳反差，把控制与交付都变成主动选择。',
    resonanceKeywords: ['暗黑依恋', '心智掌控'],
  };
}

describe('Admin User Management & Pending Counts Test Suite', () => {
  it('handles user listing, multidimensional filtering, user detail inspection, and soft deletion', async () => {
    // 1. 创建两个独立测试用户 (一个有卷宗，一个无卷宗)
    const timestamp = Date.now();
    const userWithDossier = await db.createUser(`user_with_dossier_${timestamp}@test.com`, 'SecurePass123!');
    const userWithoutDossier = await db.createUser(`user_no_dossier_${timestamp}@test.com`, 'SecurePass123!');

    // 创建卷宗与自建题库
    await db.bindUserDevice(userWithDossier.id, `device_user_a_${timestamp}`);
    await db.saveDossier(userWithDossier.id, `device_user_a_${timestamp}`, buildDossier('卷宗用户'), buildDiagnostic());

    // 为用户 A 创建自建题库与深夜回响
    const customBank = await db.createUserBank({
      userId: userWithDossier.id,
      title: `用户自建专属题库_${timestamp}`,
      description: '自动化测试专用自建题库',
      category: 'direct',
      questions: [
        {
          id: 'q1',
          title: '你最渴望的服从形式是什么？',
          type: 'single_choice',
          options: [
            { text: '言语指令', weight: 3 },
            { text: '眼神压迫', weight: 5 },
          ],
        },
      ],
    });

    const userEcho = await db.createEchoWhisper({
      deviceId: `device_user_a_${timestamp}`,
      userId: userWithDossier.id,
      surfaceRole: '高级测试主管',
      shadowDesire: '在工作管理之外，极度渴望被剥夺一切决策权。',
      shadowTag: '心智掌控',
    });

    // 2. 查询用户管理列表 (验证统计指标与基础数据)
    const listRes = await request(app)
      .get('/api/admin/users')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(listRes.body.stats).toBeDefined();
    expect(listRes.body.stats.totalUsers).toBeGreaterThanOrEqual(2);
    expect(listRes.body.stats.withDossierCount).toBeGreaterThanOrEqual(1);
    expect(listRes.body.stats.withoutDossierCount).toBeGreaterThanOrEqual(1);

    // 3. 搜索过滤: 仅检索特定邮箱前缀
    const searchRes = await request(app)
      .get('/api/admin/users')
      .query({ search: `user_with_dossier_${timestamp}` })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(searchRes.body.items.length).toBe(1);
    const foundUserA = searchRes.body.items[0];
    expect(foundUserA.id).toBe(userWithDossier.id);
    expect(foundUserA.dossierCount).toBe(1);
    expect(foundUserA.userBankCount).toBe(1);
    expect(foundUserA.echoCount).toBe(1);

    // 4. 筛选过滤: hasDossier=no
    const noDossierList = await request(app)
      .get('/api/admin/users')
      .query({ hasDossier: 'no' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(noDossierList.body.items.some((u: any) => u.id === userWithoutDossier.id)).toBe(true);
    expect(noDossierList.body.items.some((u: any) => u.id === userWithDossier.id)).toBe(false);

    // 5. 查看用户完整详情 (画像数据钻取)
    const detailRes = await request(app)
      .get(`/api/admin/users/${userWithDossier.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(detailRes.body.success).toBe(true);
    const details = detailRes.body.details;
    expect(details.user.id).toBe(userWithDossier.id);
    expect(details.dossiers.length).toBe(1);
    expect(details.banks.length).toBe(1);
    expect(details.banks[0].id).toBe(customBank.id);
    expect(details.echoes.length).toBe(1);
    expect(details.echoes[0].id).toBe(userEcho.id);
    expect(details.devices.length).toBeGreaterThanOrEqual(1);
    expect(details.basicInfo).not.toBeNull();
    expect(details.basicInfo.avatarUrls).toEqual([TINY_AVATAR]);

    // 6. 不存在的用户返回 404
    await request(app)
      .get('/api/admin/users/non_existent_uuid')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(404);

    // 7. 执行用户软删除 / 注销
    const deleteRes = await request(app)
      .delete(`/api/admin/users/${userWithoutDossier.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.deleted).toBe(true);

    // 8. 过滤 status=deleted 验证已被软删除
    const deletedRes = await request(app)
      .get('/api/admin/users')
      .query({ status: 'deleted' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(deletedRes.body.items.some((u: any) => u.id === userWithoutDossier.id)).toBe(true);

    // 9. 过滤 status=active 验证不再包含该用户
    const activeRes = await request(app)
      .get('/api/admin/users')
      .query({ status: 'active' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(activeRes.body.items.some((u: any) => u.id === userWithoutDossier.id)).toBe(false);
  });

  it('GET /api/admin/pending-counts reflects real-time audit queue fluctuations', async () => {
    // 初始状态查询
    const initialCounts = await request(app)
      .get('/api/admin/pending-counts')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(initialCounts.body.success).toBe(true);
    const initialBanks = initialCounts.body.pendingCounts.banks;
    const initialEchoes = initialCounts.body.pendingCounts.echoes;

    // 创建一个新的待审核题库
    const tempAuthor = await db.createUser(`bank_author_${Date.now()}@test.com`, 'SecurePass123!');
    const newBank = await db.createUserBank({
      userId: tempAuthor.id,
      title: `待审核待测题库_${Date.now()}`,
      description: '角标测试',
      category: 'scenario',
      questions: [],
      isPublished: true,
    });

    // 创建一个新的待审核回响
    const newEcho = await db.createEchoWhisper({
      deviceId: `device_pending_${Date.now()}`,
      surfaceRole: '法医',
      shadowDesire: '在冰冷现实中渴望体会彻底失控的炽热温度。',
      shadowTag: '感官剥夺',
    });

    // 再次查询待审核数，应各自递增 1
    const afterCreationCounts = await request(app)
      .get('/api/admin/pending-counts')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(afterCreationCounts.body.pendingCounts.banks).toBe(initialBanks + 1);
    expect(afterCreationCounts.body.pendingCounts.echoes).toBe(initialEchoes + 1);

    // 审核通过题库
    await request(app)
      .post(`/api/admin/banks/${newBank.id}/approve`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    // 审核驳回回响
    await request(app)
      .patch(`/api/admin/echoes/${newEcho.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ auditStatus: 'rejected' })
      .expect(200);

    // 再次查询，待审核计数应回落
    const afterProcessedCounts = await request(app)
      .get('/api/admin/pending-counts')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(afterProcessedCounts.body.pendingCounts.banks).toBe(initialBanks);
    expect(afterProcessedCounts.body.pendingCounts.echoes).toBe(initialEchoes);
  });
});
