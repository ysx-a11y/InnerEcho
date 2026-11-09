import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAdminApp } from './app.js';
import { db } from './db.js';
import * as llmModule from './utils/llm.js';
import type { FullDossierData, LlmAnalysisJson, TelemetryMetrics } from './types.js';

const app = createAdminApp();
const ADMIN_TOKEN = 'test-only-admin-token';

const telemetry: TelemetryMetrics = {
  submitTimestamp: '2026-08-12 10:00:00',
  isDarkMode: true,
  isLateNight: false,
  totalKeystrokes: 100,
  totalBackspaces: 12,
  deletionRatePercent: 12,
  hesitationPauses: 4,
  fieldTelemetryMap: {},
  topStruggledFields: [],
  flipFlopCount: 2,
  flipFlopLog: [],
  avgTouchDurationMs: 300,
};

function buildDossier(nickname: string): FullDossierData {
  return {
    chapter1: {
      nickname,
      occupation: '测试职业',
      personaTrait: '温和克制',
      age: '28',
      maritalStatus: '未婚',
      hasBoyfriend: '否',
      surfaceTrait: '表面面具自述',
      innerDesire: '隐秘渴望自白',
    },
    chapter2: {
      boundaryText: '边界试探',
      fantasyText: '幻想时刻',
      relationPreference: '信任交付',
      awakeningMoment: '觉醒瞬间',
    },
    chapter3: {
      secretWords: '密室第一句话',
      secretRule: '私密法则',
    },
    selectedShadowTags: ['反差情绪'],
    depthRating: 'deep',
    telemetry,
    selectedBankIds: ['standard_bdsm_50'],
    totalDurationSeconds: 123,
    questionLogs: [
      {
        questionId: 'std_bdsm_1',
        bankId: 'standard_bdsm_50',
        enterTimestamp: 1700000000000,
        durationMs: 45000,
        interactionCount: 3,
        actionLogs: ['enter:1700000000000', 'leave:1700000045000'],
        isLeftBlank: false,
        finalValue: { selectedOptions: ['opt_0'] },
      },
    ],
    completedBanks: [],
    aggregatedScores: { dominance: 60 },
    collectedTags: ['反差'],
    userTextAnswers: {},
    userMediaAttachments: {},
  };
}

function buildDiagnostic(overrides: Partial<LlmAnalysisJson> = {}): LlmAnalysisJson {
  return {
    credibilityScore: 88,
    credibilityLevel: 'high',
    archetypeTitle: '测试原型',
    dominanceIndex: 80,
    submissionIndex: 20,
    restraintIndex: 65,
    sensoryThreshold: 55,
    personaDeconstruction: '面具解构',
    shadowDeconstruction: '暗面解构',
    psychologicalSublimation: '升华建议',
    resonanceKeywords: ['关键词A'],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin API (real DB)', () => {
  it('validates the admin token', async () => {
    await request(app).post('/api/admin/verify').expect(401);
    await request(app)
      .post('/api/admin/verify')
      .set('x-admin-token', 'wrong-token')
      .expect(403);
    await request(app)
      .post('/api/admin/verify')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200)
      .expect((res) => expect(res.body.success).toBe(true));
  });

  it('protects and validates the paginated security-events endpoint without leaking secrets or business bodies', async () => {
    await request(app).get('/api/admin/security-events').expect(401);
    await db.clearSecurityEvents();
    await db.recordSecurityEvent({
      eventType: 'admin_new_source',
      severity: 'warning',
      requestId: 'security-api-request-1',
      ipAddress: '198.51.100.120',
      userAgent: 'security-api-test',
      method: 'SYSTEM',
      route: '/verify',
      statusCode: 0,
      targetType: 'admin',
      metadata: { count: 1, windowSeconds: 600 },
      nowMs: Date.now() - 1,
    });
    await db.recordSecurityEvent({
      eventType: 'admin_auth_failure_burst',
      severity: 'critical',
      requestId: 'security-api-request-2',
      ipAddress: '198.51.100.121',
      userAgent: 'security-api-test',
      method: 'SYSTEM',
      route: '/verify',
      statusCode: 0,
      targetType: 'admin',
      metadata: { count: 3, windowSeconds: 600 },
    });

    const response = await request(app)
      .get('/api/admin/security-events')
      .query({ eventType: 'admin_auth_failure_burst', severity: 'critical', limit: 1, offset: 0 })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(response.body).toMatchObject({ success: true, total: 1, chainValid: true });
    expect(response.body.events).toHaveLength(1);
    expect(response.body.events[0]).toMatchObject({
      eventType: 'admin_auth_failure_burst',
      severity: 'critical',
      metadata: { count: 3, windowSeconds: 600 },
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(ADMIN_TOKEN);
    expect(serialized).not.toContain('previous_event_hash');
    expect(serialized).not.toContain('event_hash');
    expect(serialized).not.toContain('quizPayload');

    for (const query of [
      { limit: 0 },
      { limit: 201 },
      { offset: -1 },
      { severity: 'emergency' },
      { unexpected: 'value' },
    ]) {
      await request(app)
        .get('/api/admin/security-events')
        .query(query)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(400);
    }
  });

  it('reanchors the security event chain and records a traceable audit trail', async () => {
    await db.clearSecurityEvents();
    await db.recordSecurityEvent({
      eventType: 'admin_sensitive_read',
      severity: 'info',
      requestId: 'pre-reanchor-event',
      ipAddress: '198.51.100.130',
      userAgent: 'reanchor-audit-test',
      method: 'GET',
      route: '/users',
      statusCode: 200,
      targetType: 'users',
      metadata: { count: 1 },
    });
    const before = await db.getSecurityEventChainSnapshot();
    expect(before.chainValid).toBe(true);

    const response = await request(app)
      .post('/api/admin/security-events/reanchor')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(response.body).toMatchObject({ success: true, chainValid: true });
    expect(response.body.audit.before.lastEventHash).toBe(before.lastEventHash);
    expect(response.body.audit.after.eventCount).toBeGreaterThanOrEqual(before.eventCount);
    expect(typeof response.body.audit.requestId).toBe('string');
    expect(response.body.audit.durationMs).toBeGreaterThanOrEqual(0);
    expect(
      response.body.audit.auditFile === null || typeof response.body.audit.auditFile === 'string'
    ).toBe(true);

    const listed = await db.listSecurityEvents({ eventType: 'security_chain_reanchor', limit: 5, offset: 0 });
    expect(listed.total).toBe(1);
    expect(listed.chainValid).toBe(true);
    const metadata = JSON.parse(listed.items[0].metadata_json);
    expect(metadata).toMatchObject({
      result: 'success',
      beforeEventCount: before.eventCount,
      beforeLastEventHash: before.lastEventHash,
      beforeChainValid: true,
      afterChainValid: true,
    });

    await request(app).post('/api/admin/security-events/reanchor').expect(401);
  });

  it('returns a real overview with seeded dossier', async () => {
    const saved = await db.saveDossier(null, 'dev_admin_test', buildDossier('概览测试员'), buildDiagnostic());
    expect(saved.id).toBeTruthy();

    const res = await request(app)
      .get('/api/admin/overview')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.overview.totals.dossiers).toBeGreaterThanOrEqual(1);
    expect(res.body.overview.today.dossiers).toBeGreaterThanOrEqual(1);
    expect(res.body.overview.weekly).toHaveLength(7);
    expect(res.body.overview.recent.some((r: any) => r.nickname === '概览测试员')).toBe(true);
  });

  it('returns overview stats filtered by custom time ranges and custom date', async () => {
    const resYesterday = await request(app)
      .get('/api/admin/overview')
      .query({ range: 'yesterday' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(resYesterday.body.success).toBe(true);
    expect(resYesterday.body.overview.selectedPeriod).toBeDefined();

    const resWeek = await request(app)
      .get('/api/admin/overview')
      .query({ range: 'week' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(resWeek.body.success).toBe(true);
    expect(resWeek.body.overview.selectedPeriod).toBeDefined();

    const resMonth = await request(app)
      .get('/api/admin/overview')
      .query({ range: 'month' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(resMonth.body.success).toBe(true);
    expect(resMonth.body.overview.selectedPeriod).toBeDefined();

    const resQuarter = await request(app)
      .get('/api/admin/overview')
      .query({ range: 'quarter' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(resQuarter.body.success).toBe(true);
    expect(resQuarter.body.overview.selectedPeriod).toBeDefined();

    const resYear = await request(app)
      .get('/api/admin/overview')
      .query({ range: 'year' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(resYear.body.success).toBe(true);
    expect(resYear.body.overview.selectedPeriod).toBeDefined();

    const resCustom = await request(app)
      .get('/api/admin/overview')
      .query({ range: 'custom', customDate: '2026-08-12' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(resCustom.body.success).toBe(true);
    expect(resCustom.body.overview.selectedPeriod).toBeDefined();

    await request(app)
      .get('/api/admin/overview')
      .query({ range: 'custom', customDate: 'invalid-date' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(400);
  });

  it('returns overview with uniquePeople, age, occupation, task distributions and supports telemetry filters', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body.overview.totals.uniquePeople).toBeGreaterThanOrEqual(1);
    expect(res.body.overview.today.uniquePeople).toBeGreaterThanOrEqual(1);
    expect(res.body.overview.ageDistribution).toBeInstanceOf(Array);
    expect(res.body.overview.occupationDistribution).toBeInstanceOf(Array);
    expect(res.body.overview.taskStats).toBeInstanceOf(Array);

    const telemetryRes = await request(app)
      .get('/api/admin/telemetry')
      .query({ range: 'week' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(telemetryRes.body.success).toBe(true);
    expect(telemetryRes.body.telemetry.banks).toBeDefined();
    expect(telemetryRes.body.telemetry.timeDistribution).toBeDefined();
  });

  it('creates, updates, activates and safely deletes prompt templates', async () => {
    const initial = await request(app)
      .get('/api/admin/prompt-templates')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    const initialActiveId = initial.body.activeId as string;
    expect(initial.body.items.some((item: any) => item.isBuiltin)).toBe(true);

    const contentA = '模板 A：请根据输入生成结构化报告，并输出 archetypeTitle、personaDeconstruction、shadowDeconstruction、psychologicalSublimation、resonanceKeywords。'.repeat(3);
    const contentB = '模板 B：请使用自然语言生成 JSON 报告，并保留 archetypeTitle、archetypeSubtitle、disparityScore、personaDeconstruction、shadowDeconstruction、psychologicalSublimation、resonanceKeywords。'.repeat(3);

    const createdA = await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '测试模板 A', description: 'API 测试', content: contentA, categories: ['all'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(201);
    const createdB = await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '测试模板 B', description: '', content: contentB, categories: ['all'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(201);

    await request(app)
      .patch(`/api/admin/prompt-templates/${createdA.body.template.id}`)
      .send({ description: '已更新说明' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200)
      .expect((res) => expect(res.body.template.description).toBe('已更新说明'));

    await request(app)
      .post(`/api/admin/prompt-templates/${createdB.body.template.id}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200)
      .expect((res) => expect(res.body.template.isActive).toBe(true));

    await request(app)
      .delete(`/api/admin/prompt-templates/${createdB.body.template.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(409);
    await request(app)
      .delete(`/api/admin/prompt-templates/${createdA.body.template.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    await request(app)
      .post(`/api/admin/prompt-templates/${initialActiveId}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    await request(app)
      .delete(`/api/admin/prompt-templates/${createdB.body.template.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
  });

  it('rejects category overlap when editing an active prompt template', async () => {
    const content = '模板内容：请输出结构化 JSON 报告，包含 archetypeTitle、personaDeconstruction、shadowDeconstruction、psychologicalSublimation、resonanceKeywords。'.repeat(3);
    const initial = await request(app)
      .get('/api/admin/prompt-templates')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    const builtinId = initial.body.items.find((item: any) => item.isBuiltin).id as string;

    const createdA = await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '分类模板 A', description: '', content, categories: ['scenario'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(201);
    await request(app)
      .post(`/api/admin/prompt-templates/${createdA.body.template.id}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    const createdB = await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '分类模板 B', description: '', content, categories: ['scientific'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(201);
    await request(app)
      .post(`/api/admin/prompt-templates/${createdB.body.template.id}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    // 生效中的 B 不能直接占用已被生效中的 A 覆盖的 scenario
    await request(app)
      .patch(`/api/admin/prompt-templates/${createdB.body.template.id}`)
      .send({ categories: ['scientific', 'scenario'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(409);

    // 未生效模板允许预选已被占用的分类（启用时才执行接管）
    const createdC = await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '分类模板 C', description: '', content, categories: ['scenario'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(201);
    await request(app)
      .patch(`/api/admin/prompt-templates/${createdC.body.template.id}`)
      .send({ categories: ['scenario', 'scientific'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    // 清理：恢复内置模板生效后，其余模板均为未生效可删除
    await request(app)
      .post(`/api/admin/prompt-templates/${builtinId}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    for (const id of [createdC.body.template.id, createdB.body.template.id, createdA.body.template.id]) {
      await request(app)
        .delete(`/api/admin/prompt-templates/${id}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
    }
  });

  it('rejects activating prompt templates without bound categories', async () => {
    const content = '模板内容：请输出结构化 JSON 报告，包含 archetypeTitle、personaDeconstruction、shadowDeconstruction、psychologicalSublimation、resonanceKeywords。'.repeat(3);

    // 未绑定分类的模板可保存，但不能启用
    const created = await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '未绑定模板', description: '', content, categories: [] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(201);
    expect(created.body.template.categories).toEqual([]);
    await request(app)
      .post(`/api/admin/prompt-templates/${created.body.template.id}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(409);

    // 创建即启用 + 空分类：直接拒绝
    await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '未绑定立即启用', description: '', content, categories: [], activate: true })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(409);

    // 生效中的模板不能被清空分类
    const active = await request(app)
      .post('/api/admin/prompt-templates')
      .send({ name: '生效模板', description: '', content, categories: ['scenario'] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(201);
    await request(app)
      .post(`/api/admin/prompt-templates/${active.body.template.id}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    await request(app)
      .patch(`/api/admin/prompt-templates/${active.body.template.id}`)
      .send({ categories: [] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(409);

    // 清理：恢复内置模板生效后删除临时模板
    const initial = await request(app)
      .get('/api/admin/prompt-templates')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    const builtinId = initial.body.items.find((item: any) => item.isBuiltin).id as string;
    await request(app)
      .post(`/api/admin/prompt-templates/${builtinId}/activate`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    for (const id of [active.body.template.id, created.body.template.id]) {
      await request(app)
        .delete(`/api/admin/prompt-templates/${id}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
    }
  });

  it('ignores active prompt templates without categories when scheduling', async () => {
    const empty = await db.createPromptTemplate({
      name: '空分类调度测试',
      description: '',
      content: '模板内容：请输出结构化 JSON 报告，包含 archetypeTitle、personaDeconstruction、shadowDeconstruction、psychologicalSublimation、resonanceKeywords。'.repeat(3),
      categories: [],
    });
    await db.activatePromptTemplate(empty.id);

    const picked = await db.getActivePromptTemplate('scenario');
    expect(picked).not.toBeNull();
    expect(picked!.id).not.toBe(empty.id);

    // 清理：恢复内置模板生效后删除空分类模板
    const all = await db.listPromptTemplates();
    const builtinId = all.find((t) => t.isBuiltin)!.id;
    await db.activatePromptTemplate(builtinId);
    await db.deletePromptTemplate(empty.id);
  });

  it('lists dossiers with search/filter and returns decrypted fields', async () => {
    const saved = await db.saveDossier(null, 'dev_admin_list', buildDossier('列表检索员'), buildDiagnostic());

    const res = await request(app)
      .get('/api/admin/dossiers')
      .query({ search: '列表检索员', depth: 'deep', credibility: 'high', limit: 20 })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    const item = res.body.items.find((d: any) => d.id === saved.id);
    expect(item).toBeTruthy();
    expect(item.q_innerDesire).toBe('隐秘渴望自白');
    expect(item.credibilityScore).toBe(88);
    expect(item.auditStatus).toBe('pending');
  });

  it('returns a global device→user map for cross-page dossier grouping', async () => {
    const user = await db.createUser('group-map@example.com', 'test_password_hash_123');
    await db.saveDossier(user.id, 'dev_group_map', buildDossier('映射用户'), buildDiagnostic());
    await db.saveDossier(null, 'dev_group_map', buildDossier('映射游客'), buildDiagnostic());

    const res = await request(app)
      .get('/api/admin/dossiers')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deviceUserMap).toBeDefined();
    expect(res.body.deviceUserMap['dev_group_map']).toBe(user.id);
  });

  it('updates audit status / admin notes, then reflects them', async () => {
    const saved = await db.saveDossier(null, 'dev_admin_patch', buildDossier('审核对象'), buildDiagnostic());

    await request(app)
      .patch(`/api/admin/dossiers/${saved.id}`)
      .send({ auditStatus: 'approved', adminNotes: '已人工核验' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200)
      .expect((res) => {
        expect(res.body.dossier.auditStatus).toBe('approved');
        expect(res.body.dossier.adminNotes).toBe('已人工核验');
      });

    const filtered = await request(app)
      .get('/api/admin/dossiers')
      .query({ status: 'approved' })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(filtered.body.items.some((d: any) => d.id === saved.id)).toBe(true);
  });

  it('deletes a single dossier and 404s afterwards', async () => {
    const saved = await db.saveDossier(null, 'dev_admin_del', buildDossier('待删除'), buildDiagnostic());

    await request(app)
      .delete(`/api/admin/dossiers/${saved.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    await request(app)
      .get(`/api/admin/dossiers/${saved.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(404);
  });

  it('batch deletes dossiers', async () => {
    const a = await db.saveDossier(null, 'dev_admin_b1', buildDossier('批量一'), buildDiagnostic());
    const b = await db.saveDossier(null, 'dev_admin_b2', buildDossier('批量二'), buildDiagnostic());

    await request(app)
      .delete('/api/admin/dossiers')
      .send({ ids: [a.id, b.id] })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200)
      .expect((res) => expect(res.body.deleted).toBe(2));
  });

  it('returns telemetry aggregates from real data', async () => {
    await db.saveDossier(null, 'dev_admin_tel', buildDossier('遥测样本'), buildDiagnostic());

    const res = await request(app)
      .get('/api/admin/telemetry')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.telemetry.banks.some((b: any) => b.bankId.includes('standard_bdsm_50'))).toBe(true);
    expect(res.body.telemetry.topQuestions.some((q: any) => q.questionId === 'std_bdsm_1')).toBe(true);
    expect(res.body.telemetry.timeDistribution).toHaveLength(5);
  });

  it('re-analyzes a dossier and overwrites its diagnostic result', async () => {
    const saved = await db.saveDossier(null, 'dev_admin_re', buildDossier('重评对象'), buildDiagnostic());
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: buildDiagnostic({ archetypeTitle: '重评后的原型', credibilityScore: 95 }),
    });

    const res = await request(app)
      .post(`/api/admin/dossiers/${saved.id}/reanalyze`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.archetypeTitle).toBeTruthy();

    const detail = await request(app)
      .get(`/api/admin/dossiers/${saved.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(detail.body.dossier.archetypeTitle).toBe(res.body.data.archetypeTitle);
  });

  it('returns a list of admin tasks', async () => {
    const user = await db.createUser('admin-test-task-user@example.com', 'pwd');
    const activeTask = await db.createUserTask(user.id, 'task_subconscious_1');
    const completedTask = await db.createUserTask(user.id, 'task_dream_1');
    await db.completeUserTask(completedTask.id, '这是测试完成的文本', JSON.stringify([{ id: 'att_1', type: 'image', url: 'data:image/png;base64,123' }]));

    const res = await request(app)
      .get('/api/admin/tasks')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    const activeItem = res.body.items.find((item: any) => item.id === activeTask.id);
    const completedItem = res.body.items.find((item: any) => item.id === completedTask.id);

    expect(activeItem).toBeDefined();
    expect(activeItem.status).toBe('accepted');
    expect(activeItem.email).toBe('admin-test-task-user@example.com');
    expect(activeItem.title).toBe('记录今天最想卸下防备的瞬间');

    expect(completedItem).toBeDefined();
    expect(completedItem.status).toBe('completed');
    expect(completedItem.textContent).toBe('这是测试完成的文本');
    expect(completedItem.attachments).toHaveLength(1);
    expect(completedItem.attachments[0].id).toBe('att_1');
  });

  it('supports filtering tasks by status and category', async () => {
    const user = await db.createUser('admin-filter-test-user@example.com', 'pwd');
    const taskSub = await db.createUserTask(user.id, 'task_subconscious_1');
    const taskDream = await db.createUserTask(user.id, 'task_dream_1');
    await db.completeUserTask(taskDream.id, '梦境自白完成', JSON.stringify([]));

    // Filter by status=completed
    const completedRes = await request(app)
      .get('/api/admin/tasks?status=completed')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(completedRes.body.success).toBe(true);
    expect(completedRes.body.items.every((it: any) => it.status === 'completed')).toBe(true);
    expect(completedRes.body.items.some((it: any) => it.id === taskDream.id)).toBe(true);
    expect(completedRes.body.items.some((it: any) => it.id === taskSub.id)).toBe(false);

    // Filter by category=secret (dream/shadow)
    const secretRes = await request(app)
      .get('/api/admin/tasks?category=secret')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);

    expect(secretRes.body.success).toBe(true);
    expect(secretRes.body.items.every((it: any) => it.category === 'dream' || it.category === 'shadow')).toBe(true);
  });

  describe('Admin Question Bank Management (/api/admin/banks)', () => {
    it('returns question bank list with stats and preset banks included', async () => {
      const res = await request(app)
        .get('/api/admin/banks')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.presetCount).toBeGreaterThanOrEqual(3);
      expect(res.body.stats.totalQuestions).toBeGreaterThan(0);

      const standardPreset = res.body.items.find((b: any) => b.id === 'standard_bdsm_50');
      expect(standardPreset).toBeDefined();
      expect(standardPreset.isBuiltin).toBe(true);
      expect(standardPreset.isPublished).toBe(true);
      expect(standardPreset.questionCount).toBe(50);

      // 新增内置题库必须同步登记到服务端预置列表，否则管理端题库管理看不到它
      const normalInsulation = res.body.items.find((b: any) => b.id === 'normal_insulation_18');
      expect(normalInsulation).toBeDefined();
      expect(normalInsulation.isBuiltin).toBe(true);
      expect(normalInsulation.category).toBe('direct');
      expect(normalInsulation.questionCount).toBe(18);
    });

    it('fetches a single preset bank detail by id', async () => {
      const res = await request(app)
        .get('/api/admin/banks/standard_bdsm_50')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.bank).toBeDefined();
      expect(res.body.bank.id).toBe('standard_bdsm_50');
      expect(res.body.bank.isBuiltin).toBe(true);
      expect(res.body.bank.questions).toHaveLength(50);
      expect(res.body.bank.dimensions).toBeDefined();
    });

    it('returns 404 for non-existent bank', async () => {
      const res = await request(app)
        .get('/api/admin/banks/non_existent_bank_123')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('creates, updates, toggles publish status, and deletes a custom bank', async () => {
      // 1. Create
      const createRes = await request(app)
        .post('/api/admin/banks')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({
          title: '测试自建高阶题库',
          subtitle: '测试副标题',
          description: '测试描述',
          category: 'direct',
          badgeColor: '#ec4899',
          estimatedMinutes: 6,
          isPublished: false,
          questions: [
            {
              id: 'q1',
              title: '你偏好哪种角色？',
              type: 'single_choice',
              options: [
                { id: 'opt_1', text: '支配方', scores: { dom: 10 } },
                { id: 'opt_2', text: '服从方', scores: { sub: 10 } },
              ],
            },
          ],
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);
      const bankId = createRes.body.bank.id;
      expect(bankId).toBeDefined();
      expect(createRes.body.bank.title).toBe('测试自建高阶题库');
      expect(createRes.body.bank.isPublished).toBe(false);
      expect(createRes.body.bank.auditStatus).toBe('draft');

      // 2. Fetch
      const getRes = await request(app)
        .get(`/api/admin/banks/${bankId}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(getRes.body.bank.title).toBe('测试自建高阶题库');
      expect(getRes.body.bank.questions).toHaveLength(1);

      // 3. Update
      const patchRes = await request(app)
        .patch(`/api/admin/banks/${bankId}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({
          title: '测试自建高阶题库 (更新版)',
          estimatedMinutes: 10,
        })
        .expect(200);
      expect(patchRes.body.bank.title).toBe('测试自建高阶题库 (更新版)');
      expect(patchRes.body.bank.estimatedMinutes).toBe(10);

      // 4. Toggle Publish
      const toggleRes = await request(app)
        .post(`/api/admin/banks/${bankId}/toggle-publish`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(toggleRes.body.bank.isPublished).toBe(true);
      expect(toggleRes.body.bank.auditStatus).toBe('approved');

      // 5. Delete
      const delRes = await request(app)
        .delete(`/api/admin/banks/${bankId}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(delRes.body.success).toBe(true);

      // 6. Verify Deleted
      await request(app)
        .get(`/api/admin/banks/${bankId}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(404);
    });

    it('protects preset banks from direct update and deletion', async () => {
      // Attempt to patch preset
      const patchRes = await request(app)
        .patch('/api/admin/banks/standard_bdsm_50')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ title: '非法篡改内置' })
        .expect(409);
      expect(patchRes.body.success).toBe(false);

      // Attempt to toggle publish preset
      const toggleRes = await request(app)
        .post('/api/admin/banks/standard_bdsm_50/toggle-publish')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(409);
      expect(toggleRes.body.success).toBe(false);

      // Attempt to approve preset (no review needed)
      const approveRes = await request(app)
        .post('/api/admin/banks/standard_bdsm_50/approve')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(409);
      expect(approveRes.body.success).toBe(false);

      // Attempt to delete preset
      const delRes = await request(app)
        .delete('/api/admin/banks/standard_bdsm_50')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(409);
      expect(delRes.body.success).toBe(false);
    });

    it('approves and rejects custom banks through audit endpoints', async () => {
      const createRes = await request(app)
        .post('/api/admin/banks')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({
          title: '待审核题库',
          questions: [{ id: 'q1', title: '问题一', type: 'open_text' }],
          isPublished: false,
        })
        .expect(201);
      const bankId = createRes.body.bank.id as string;

      // 1. Approve -> published + approved
      const approveRes = await request(app)
        .post(`/api/admin/banks/${bankId}/approve`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(approveRes.body.bank.auditStatus).toBe('approved');
      expect(approveRes.body.bank.isPublished).toBe(true);

      // 2. Reject -> unpublished + rejected
      const rejectRes = await request(app)
        .post(`/api/admin/banks/${bankId}/reject`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(rejectRes.body.bank.auditStatus).toBe('rejected');
      expect(rejectRes.body.bank.isPublished).toBe(false);

      // 3. List filters
      const pendingList = await request(app)
        .get('/api/admin/banks?status=pending')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(pendingList.body.items.some((b: any) => b.id === bankId)).toBe(false);

      const rejectedList = await request(app)
        .get('/api/admin/banks?status=rejected')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(rejectedList.body.items.some((b: any) => b.id === bankId)).toBe(true);

      // Cleanup
      await request(app)
        .delete(`/api/admin/banks/${bankId}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
    });

    it('filters banks by search, category, status, and source', async () => {
      // Filter by source=preset
      const presetOnly = await request(app)
        .get('/api/admin/banks?source=preset')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(presetOnly.body.items.every((b: any) => b.isBuiltin === true)).toBe(true);

      // Filter by category=scientific
      const scientificOnly = await request(app)
        .get('/api/admin/banks?category=scientific')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(scientificOnly.body.items.every((b: any) => b.category === 'scientific')).toBe(true);

      // Filter by search=背德
      const searchRes = await request(app)
        .get('/api/admin/banks?search=' + encodeURIComponent('背德'))
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      expect(searchRes.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('User Management API', () => {
    it('lists users and returns aggregate stats with hasDossier classification', async () => {
      // 1. Create a user without dossier
      const user = await db.createUser('user_mgmt_test@example.com', 'test_password_hash_123');
      await db.bindUserDevice(user.id, 'dev_user_mgmt_123');
      const userId = user.id;

      // 2. Fetch admin user list
      const listRes = await request(app)
        .get('/api/admin/users')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(listRes.body.success).toBe(true);
      expect(listRes.body.stats).toBeDefined();
      expect(listRes.body.stats.totalUsers).toBeGreaterThanOrEqual(1);
      expect(listRes.body.stats.withoutDossierCount).toBeGreaterThanOrEqual(1);

      const found = listRes.body.items.find((u: any) => u.id === userId);
      expect(found).toBeDefined();
      expect(found.email).toBe('user_mgmt_test@example.com');
      expect(found.dossierCount).toBe(0);

      // 3. Filter by hasDossier=no
      const noDossierRes = await request(app)
        .get('/api/admin/users?hasDossier=no')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(noDossierRes.body.items.some((u: any) => u.id === userId)).toBe(true);

      // 4. Fetch details
      const detailRes = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(detailRes.body.success).toBe(true);
      expect(detailRes.body.details.user.id).toBe(userId);
      expect(detailRes.body.details.devices.length).toBeGreaterThanOrEqual(1);

      // 5. Soft-delete user
      const delRes = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(delRes.body.success).toBe(true);

      // 6. Filter by status=deleted
      const deletedList = await request(app)
        .get('/api/admin/users?status=deleted')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(deletedList.body.items.some((u: any) => u.id === userId)).toBe(true);
    });

    it('GET /api/admin/pending-counts returns pending counts for banks and echoes', async () => {
      const res = await request(app)
        .get('/api/admin/pending-counts')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pendingCounts).toBeDefined();
      expect(typeof res.body.pendingCounts.banks).toBe('number');
      expect(typeof res.body.pendingCounts.echoes).toBe('number');
    });
  });
});
