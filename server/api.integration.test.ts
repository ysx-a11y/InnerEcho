import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUserApp } from './app.js';
import { db } from './db.js';
import { getRawDatabase } from './db/connection.js';
import * as llmModule from './utils/llm.js';
import type { LlmAnalysisJson } from './types.js';

const app = createUserApp();
const password = 'validPass123';
const originalFieldEncryptionKey = process.env.FIELD_ENC_KEY;
const testFieldEncryptionKey = Buffer.from('integration-field-key-32-bytes!!').toString('base64');

const fakeLlmResponse: LlmAnalysisJson = {
  credibilityScore: 90,
  credibilityLevel: 'high',
  archetypeTitle: '测试原型',
  personaDeconstruction: '测试内容',
  shadowDeconstruction: '测试内容',
  psychologicalSublimation: '测试内容',
  resonanceKeywords: ['测试关键词'],
};

afterEach(() => {
  vi.restoreAllMocks();
  if (originalFieldEncryptionKey) process.env.FIELD_ENC_KEY = originalFieldEncryptionKey;
  else delete process.env.FIELD_ENC_KEY;
});

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function register(agent: ReturnType<typeof request.agent>, label: string) {
  return agent
    .post('/api/auth/register')
    .send({ email: uniqueEmail(label), password })
    .expect(200);
}

async function fillBasicInfo(agent: ReturnType<typeof request.agent>) {
  return agent
    .post('/api/auth/basic-info')
    .send({ nickname: '任务测试员', occupation: '测试职业' })
    .expect(200);
}

describe('critical API flows', () => {
  it('streams a form-encoded PNG poster download with a safe filename', async () => {
    const response = await request(app)
      .post('/api/download-poster')
      .type('form')
      .send({
        base64Data: 'data:image/png;base64,iVBORw0KGgo=',
        filename: '../InnerEcho\r\nunsafe.png',
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('image/png');
    expect(response.headers['content-disposition']).toContain('attachment;');
    expect(response.headers['content-disposition']).not.toContain('..');
    expect(response.headers['content-disposition']).not.toContain('unsafe.png\r\n');
  });

  it('records a page visit with device id and sec-fetch-site', async () => {
    await request(app)
      .post('/api/visit')
      .set('X-Device-Id', 'dev_integration_visit')
      .set('Sec-Fetch-Site', 'none')
      .send({ path: '/' })
      .expect(200)
      .expect((res) => expect(res.body.recorded).toBe(true));

    const row = getRawDatabase()
      .prepare(
        "SELECT sec_fetch_site FROM page_visits WHERE device_id = 'dev_integration_visit' ORDER BY id DESC LIMIT 1"
      )
      .get() as { sec_fetch_site: string } | undefined;
    expect(row?.sec_fetch_site).toBe('none');

    const stats = await db.getVisitStats();
    expect(stats.todayVisits).toBeGreaterThanOrEqual(1);
    expect(stats.totalVisits).toBeGreaterThanOrEqual(1);
  });

  it('ignores crawler visits (e.g. Applebot full-render crawl)', async () => {
    const before = await db.getVisitStats();
    const beforeTotal = before.totalVisits;

    await request(app)
      .post('/api/visit')
      .set('User-Agent', 'Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)')
      .set('X-Device-Id', 'dev_bot_visit')
      .send({ path: '/' })
      .expect(200)
      .expect((res) => expect(res.body).toMatchObject({ recorded: false, reason: 'bot' }));

    const stats = await db.getVisitStats();
    expect(stats.totalVisits).toBe(beforeTotal);
  });

  it('records a card export event with device id', async () => {
    await request(app)
      .post('/api/events')
      .set('X-Device-Id', 'dev_integration_export')
      .send({ event: 'export_card', dossierId: 'dos_export_test' })
      .expect(200)
      .expect((res) => expect(res.body.recorded).toBe(true));

    const overview = await db.getAdminOverview('today');
    const cardEvent = overview.eventStats.find((e) => e.eventType === 'export_card');
    expect(cardEvent).toBeDefined();
    expect(cardEvent?.count).toBeGreaterThanOrEqual(1);
    expect(cardEvent?.devices).toBeGreaterThanOrEqual(1);
  });

  it('rejects unknown event types', async () => {
    await request(app)
      .post('/api/events')
      .set('X-Device-Id', 'dev_integration_export')
      .send({ event: 'delete_all' })
      .expect(400);
  });

  it('ignores bot card export events', async () => {
    const before = await db.getAdminOverview('today');
    const beforeCount = before.eventStats.find((e) => e.eventType === 'export_card')?.count ?? 0;

    await request(app)
      .post('/api/events')
      .set('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
      .set('X-Device-Id', 'dev_bot_export')
      .send({ event: 'export_card' })
      .expect(200)
      .expect((res) => expect(res.body).toMatchObject({ recorded: false, reason: 'bot' }));

    const after = await db.getAdminOverview('today');
    const afterCount = after.eventStats.find((e) => e.eventType === 'export_card')?.count ?? 0;
    expect(afterCount).toBe(beforeCount);
  });

  it('public /api/stats is closed', async () => {
    await request(app).get('/api/stats').expect(404);
  });

  it('invalidates an older cookie after changing the password', async () => {
    const agent = request.agent(app);
    const registered = await register(agent, 'password');
    const oldCookie = registered.headers['set-cookie'];
    expect(oldCookie).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await agent
      .post('/api/auth/change-password')
      .send({
        oldPassword: password,
        newPassword: 'newValidPass456',
        confirmPassword: 'newValidPass456',
      })
      .expect(200);

    await request(app)
      .get('/api/auth/me')
      .set('Cookie', oldCookie)
      .expect(401);
    await agent.get('/api/auth/me').expect(200);
  });

  it('isolates user-owned banks; public access requires admin approval', async () => {
    const owner = request.agent(app);
    const stranger = request.agent(app);
    await register(owner, 'bank-owner');
    await register(stranger, 'bank-stranger');

    const created = await owner
      .post('/api/banks')
      .send({ title: 'Integration bank', questions: [] })
      .expect(201);
    const bankId = created.body.bank.id as string;

    await stranger.get(`/api/banks/${bankId}`).expect(404);
    await request(app).get(`/api/banks/public/${bankId}`).expect(404);

    await owner
      .put(`/api/banks/${bankId}`)
      .send({ isPublished: true })
      .expect(200);
    // 提交发布后进入待审核：即使拿到 ID 也不能公开加载，全网公开列表也不应包含
    await request(app).get(`/api/banks/public/${bankId}`).expect(404);
    const preRes = await request(app).get('/api/banks/public').expect(200);
    expect(preRes.body.banks.some((b: any) => b.id === bankId)).toBe(false);

    // 管理员审核通过后公开加载并在公开题库列表中展示
    await db.setAdminBankAuditStatus(bankId, 'approved');
    await request(app).get(`/api/banks/public/${bankId}`).expect(200);
    const postRes = await request(app).get('/api/banks/public').expect(200);
    expect(postRes.body.banks.some((b: any) => b.id === bankId)).toBe(true);
  });

  it('resolves user-created bank titles in admin telemetry and overview', async () => {
    process.env.FIELD_ENC_KEY = testFieldEncryptionKey;
    const agent = request.agent(app);
    await register(agent, 'bank-name');

    const created = await agent
      .post('/api/banks')
      .send({ title: '自建题库名称', questions: [] })
      .expect(201);
    const bankId = created.body.bank.id as string;

    await db.saveDossier(
      null,
      'dev_bank_name_test',
      {
        chapter1: { nickname: '题库名测试' },
        selectedBankIds: [bankId],
        depthRating: 'medium',
      },
      fakeLlmResponse,
    );

    const telemetry = await db.getAdminTelemetry('today');
    expect(telemetry.bankNames[bankId]).toBe('自建题库名称');

    const overview = await db.getAdminOverview('today');
    expect(overview.bankNames[bankId]).toBe('自建题库名称');
  });

  it('validates analysis input and persists fallback results only for a session', async () => {
    // Mock callLlm 避免真实 API 调用
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: fakeLlmResponse,
    });

    await request(app)
      .post('/api/analyze-dossier')
      .send({ dossierData: {}, unexpected: true })
      .expect(400);

    const anonymous = await request(app)
      .post('/api/analyze-dossier')
      .send({ dossierData: { chapter1: { nickname: '无会话署名' } } })
      .expect(400);
    expect(anonymous.body).toMatchObject({ success: false, saved: false });
    expect(String(anonymous.body.message)).toContain('缺少会话标识');

    // 契约：即便带设备标识，没有署名的卷宗也不再入库（管理端需要能区分受访者）
    const identifiedAnonymous = await request(app)
      .post('/api/analyze-dossier')
      .set('X-Device-Id', 'dev_anonymous_analysis')
      .send({ dossierData: {} })
      .expect(400);
    expect(identifiedAnonymous.body).toMatchObject({ success: false });
    expect(identifiedAnonymous.body.zodErrors?.[0]?.path).toEqual(['dossierData', 'chapter1', 'nickname']);

    const identifiedNamed = await request(app)
      .post('/api/analyze-dossier')
      .set('X-Device-Id', 'dev_named_analysis')
      .send({ dossierData: { chapter1: { nickname: '署名回归' } } })
      .expect(200);
    expect(identifiedNamed.body).toMatchObject({ success: true, saved: true });
    expect(identifiedNamed.body.dossierId).toBeTruthy();

    // 回归：第一章含性别字段必须通过校验（strict schema 曾漏掉 gender 导致全网 400）
    const withGender = await request(app)
      .post('/api/analyze-dossier')
      .set('X-Device-Id', 'dev_gender_regression')
      .send({ dossierData: { chapter1: { gender: '女', nickname: '回归测试' } } })
      .expect(200);
    expect(withGender.body).toMatchObject({ success: true, saved: true });

    const agent = request.agent(app);
    await register(agent, 'analysis');
    const saved = await agent
      .post('/api/analyze-dossier')
      .send({ dossierData: { chapter1: { nickname: '回归会员', occupation: '开发者' } } })
      .expect(200);
    expect(saved.body).toMatchObject({ success: true, saved: true });
    expect(saved.body.dossierId).toBeTruthy();

    const session = await agent.get('/api/auth/me').expect(200);
    // 新契约：/api/auth/me 仅返回轻量摘要（不含报告全文），全文按需拉取
    expect(session.body.latestDossier?.id).toBeTruthy();
    expect(session.body.latestDossier?.diagnosticResult).toBeUndefined();

    const full = await agent
      .get(`/api/dossiers/${saved.body.dossierId}`)
      .expect(200);
    expect(full.body.success).toBe(true);
    expect(full.body.dossier?.diagnosticResult).toBeTruthy();
  });

  it('persists and restores full basic info for a logged-in user', async () => {
    process.env.FIELD_ENC_KEY = testFieldEncryptionKey;
    const agent = request.agent(app);
    await register(agent, 'basic-info');

    await agent
      .post('/api/auth/basic-info')
      .send({
        nickname: '全字段测试',
        gender: '女',
        occupation: '设计师',
        personaTrait: '高冷精英',
        age: '26',
        maritalStatus: '单身',
        hasBoyfriend: '无',
        surfaceTrait: '人前安静',
        innerDesire: '暗面渴望',
      })
      .expect(200);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.basicInfo).toMatchObject({
      nickname: '全字段测试',
      gender: '女',
      occupation: '设计师',
      personaTrait: '高冷精英',
      age: '26',
      maritalStatus: '单身',
      hasBoyfriend: '无',
      surfaceTrait: '人前安静',
      innerDesire: '暗面渴望',
    });
    // 照片与时长不随基础信息回传，避免 /me 每次拉大图
    expect(me.body.basicInfo.avatarUrls).toBeUndefined();
    expect(me.body.basicInfo.avatarUrl).toBeUndefined();
    expect(me.body.basicInfo.durationSeconds).toBeUndefined();
  });

  it('restores anonymous device basic info from the latest anonymous dossier', async () => {
    process.env.FIELD_ENC_KEY = testFieldEncryptionKey;
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: fakeLlmResponse,
    });

    await request(app)
      .post('/api/analyze-dossier')
      .set('X-Device-Id', 'dev_restore_me')
      .send({
        dossierData: {
          chapter1: {
            nickname: '匿名回填',
            gender: '保密',
            occupation: '学生',
            personaTrait: '乖乖女',
            age: '20',
            maritalStatus: '单身',
            hasBoyfriend: '无',
            surfaceTrait: '文静',
            innerDesire: '被支配',
          },
        },
      })
      .expect(200);

    const restored = await request(app)
      .get('/api/basic-info/device')
      .set('X-Device-Id', 'dev_restore_me')
      .expect(200);
    expect(restored.body.basicInfo).toMatchObject({
      nickname: '匿名回填',
      gender: '保密',
      occupation: '学生',
      personaTrait: '乖乖女',
      age: '20',
      maritalStatus: '单身',
      hasBoyfriend: '无',
      surfaceTrait: '文静',
      innerDesire: '被支配',
    });
  });

  it('does not leak logged-in account basic info via anonymous device restore', async () => {
    process.env.FIELD_ENC_KEY = testFieldEncryptionKey;
    const agent = request.agent(app);
    await register(agent, 'leak-check');
    await agent
      .post('/api/auth/basic-info')
      .send({ nickname: '账号专属昵称' })
      .expect(200);

    // 同一设备号但未带会话：不应返回账号档案（只允许匿名卷宗恢复）
    const restored = await request(app)
      .get('/api/basic-info/device')
      .set('X-Device-Id', 'dev_leak_check')
      .expect(200);
    expect(restored.body.basicInfo).toBeNull();
  });

  it('manages task acceptance, completion, and retrieval flows', async () => {
    process.env.FIELD_ENC_KEY = testFieldEncryptionKey;
    const userAgent = request.agent(app);
    // 1. 游客可浏览任务列表（无个人进度）
    const guestGet = await request(app).get('/api/tasks').expect(200);
    expect(guestGet.body.success).toBe(true);
    expect(guestGet.body.tasks.length).toBeGreaterThan(0);
    expect(guestGet.body.tasks[0].status).toBe('available');
    expect(guestGet.body.completedCount).toBe(0);
    expect(guestGet.body.completedHistory).toEqual([]);

    // 2. 注册并登录一个新用户
    await register(userAgent, 'tasks-user');

    // 3. 获取任务列表，确认默认状态都是 available 且数量正确
    const initialGet = await userAgent.get('/api/tasks').expect(200);
    expect(initialGet.body.success).toBe(true);
    expect(initialGet.body.tasks.length).toBeGreaterThan(0);
    expect(initialGet.body.tasks[0].status).toBe('available');
    expect(initialGet.body.completedCount).toBe(0);

    const testTaskId = initialGet.body.tasks[0].id;

    // 4. 未填写基础信息时接取任务应被拒绝（403）
    const blockedAccept = await userAgent
      .post(`/api/tasks/${testTaskId}/accept`)
      .expect(403);
    expect(blockedAccept.body.message).toContain('基础信息');

    // 5. 填写基础信息后接取该任务
    await fillBasicInfo(userAgent);
    const acceptRes = await userAgent
      .post(`/api/tasks/${testTaskId}/accept`)
      .expect(200);
    expect(acceptRes.body.success).toBe(true);

    // 6. 再次接取该任务，应返回 400（已在进行中）
    await userAgent
      .post(`/api/tasks/${testTaskId}/accept`)
      .expect(400);

    // 7. 获取任务列表，验证该任务 status 为 accepted，且含有 activeTaskInstance
    const afterAcceptGet = await userAgent.get('/api/tasks').expect(200);
    const acceptedTask = afterAcceptGet.body.tasks.find((t: any) => t.id === testTaskId);
    expect(acceptedTask.status).toBe('accepted');
    expect(acceptedTask.activeTaskInstance).toBeDefined();

    // 8. 完成任务（含文本与附件）
    const completeRes = await userAgent
      .post(`/api/tasks/${testTaskId}/complete`)
      .send({
        textContent: '今天感觉很放松，梦到了深海与极光。',
        attachments: [
          {
            id: 'media_test_1',
            name: 'dream_snapshot.png',
            type: 'image',
            mimeType: 'image/png',
            sizeBytes: 1024,
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          }
        ]
      })
      .expect(200);
    expect(completeRes.body.success).toBe(true);

    // 附件服务端校验：单附件超 30MB 拒绝
    await userAgent
      .post(`/api/tasks/${testTaskId}/complete`)
      .send({
        textContent: '测试超限附件',
        attachments: [{
          id: 'media_test_big',
          name: 'big.mp4',
          type: 'video',
          mimeType: 'video/mp4',
          sizeBytes: 30 * 1024 * 1024 + 1,
          dataUrl: 'data:video/mp4;base64,AAAA',
        }],
      })
      .expect(400);

    // 主动内容即使声明类型与 data URL 一致也拒绝，避免 HTML/SVG 被当作附件预览。
    await userAgent
      .post(`/api/tasks/${testTaskId}/complete`)
      .send({
        textContent: '测试主动内容附件',
        attachments: [{
          id: 'media_test_active',
          name: 'active.html',
          type: 'document',
          mimeType: 'text/html',
          sizeBytes: 6,
          dataUrl: 'data:text/html;base64,PGh0bWw+',
        }],
      })
      .expect(400);

    // 附件服务端校验：总量超 30MB 拒绝
    await userAgent
      .post(`/api/tasks/${testTaskId}/complete`)
      .send({
        textContent: '测试总量超限附件',
        attachments: [
          {
            id: 'media_total_1',
            name: 'a.mp4',
            type: 'video',
            mimeType: 'video/mp4',
            sizeBytes: 20 * 1024 * 1024,
            dataUrl: 'data:video/mp4;base64,AAAA',
          },
          {
            id: 'media_total_2',
            name: 'b.mp4',
            type: 'video',
            mimeType: 'video/mp4',
            sizeBytes: 20 * 1024 * 1024,
            dataUrl: 'data:video/mp4;base64,AAAA',
          },
        ],
      })
      .expect(400)
      .expect((res) => expect(res.body.message).toContain('总大小不能超过 30MB'));

    // 附件服务端校验：dataUrl 与声明类型不一致拒绝
    await userAgent
      .post(`/api/tasks/${testTaskId}/complete`)
      .send({
        textContent: '测试类型不匹配附件',
        attachments: [{
          id: 'media_test_mismatch',
          name: 'fake.png',
          type: 'image',
          mimeType: 'image/png',
          sizeBytes: 100,
          dataUrl: 'data:text/html;base64,PGh0bWw+',
        }],
      })
      .expect(400);

    // 9. 获取任务列表，验证 status 回归 available，且 completedCount 为 1，历史记录有一条
    const finalGet = await userAgent.get('/api/tasks').expect(200);
    expect(finalGet.body.completedCount).toBe(1);
    expect(finalGet.body.completedHistory.length).toBe(1);
    expect(finalGet.body.completedHistory[0].taskId).toBe(testTaskId);
    expect(finalGet.body.completedHistory[0].textContent).toBe('今天感觉很放松，梦到了深海与极光。');
    expect(finalGet.body.completedHistory[0].attachments[0].id).toBe('media_test_1');
  });

  it('enforces task acceptance limits atomically under concurrent requests', async () => {
    const userAgent = request.agent(app);
    await register(userAgent, 'tasks-race');
    await fillBasicInfo(userAgent);
    await userAgent.post('/api/tasks').send({
      title: '并发约束测试任务',
      description: '用于验证第三个并发接取请求会被数据库原子拒绝',
      category: 'subconscious',
    }).expect(200);
    const initial = await userAgent.get('/api/tasks').expect(200);
    const taskIds = initial.body.tasks.slice(0, 3).map((task: { id: string }) => task.id);
    expect(taskIds).toHaveLength(3);

    const responses = await Promise.all(taskIds.map((taskId: string) => (
      userAgent.post(`/api/tasks/${taskId}/accept`)
    )));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200, 400]);

    const after = await userAgent.get('/api/tasks').expect(200);
    const accepted = after.body.tasks.filter((task: { status: string }) => task.status === 'accepted');
    expect(accepted).toHaveLength(2);
  });

  it('enforces requireAudio only on designated voice task and supports abandon flow', async () => {
    process.env.FIELD_ENC_KEY = testFieldEncryptionKey;
    const userAgent = request.agent(app);
    await register(userAgent, 'tasks-audio-abandon');
    await fillBasicInfo(userAgent);

    const initial = await userAgent.get('/api/tasks').expect(200);
    const voiceTask = initial.body.tasks.find((t: { id: string; requireAudio?: boolean }) => t.id === 'task_shadow_voice_1');
    expect(voiceTask).toBeDefined();
    expect(voiceTask.requireAudio).toBe(true);

    // 接取 task_shadow_voice_1
    await userAgent.post('/api/tasks/task_shadow_voice_1/accept').expect(200);

    // 未提供录音提交：应返回 400 并提示需要录音
    const failNoAudio = await userAgent
      .post('/api/tasks/task_shadow_voice_1/complete')
      .send({ textContent: '没有录音' })
      .expect(400);
    expect(failNoAudio.body.message).toContain('录制并上传语音音频成果');

    // 放弃该任务：状态更新为 abandoned 且释放活跃槽位
    const abandonRes = await userAgent
      .post('/api/tasks/task_shadow_voice_1/abandon')
      .expect(200);
    expect(abandonRes.body.success).toBe(true);
    expect(abandonRes.body.message).toContain('已放弃');

    // 重新获取列表，验证状态为 available，可再次接取
    const afterAbandon = await userAgent.get('/api/tasks').expect(200);
    const reVoiceTask = afterAbandon.body.tasks.find((t: { id: string }) => t.id === 'task_shadow_voice_1');
    expect(reVoiceTask.status).toBe('available');

    // 重新接取并携带音频完成
    await userAgent.post('/api/tasks/task_shadow_voice_1/accept').expect(200);
    const completeWithAudio = await userAgent
      .post('/api/tasks/task_shadow_voice_1/complete')
      .send({
        textContent: '语音自白内容',
        attachments: [{
          id: 'audio_test_1',
          name: 'voice.webm',
          type: 'audio',
          mimeType: 'audio/webm',
          sizeBytes: 2048,
          dataUrl: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAAA',
        }],
      })
      .expect(200);
    expect(completeWithAudio.body.success).toBe(true);
  });

  it('manages special price-tag task evaluation, tied ranking, and 1-hour cooldown', async () => {
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);
    const agent3 = request.agent(app);

    await register(agent1, 'special1');
    await fillBasicInfo(agent1);
    await register(agent2, 'special2');
    await fillBasicInfo(agent2);
    await register(agent3, 'special3');
    await fillBasicInfo(agent3);

    // 1. Initial query before submission
    const initRes = await agent1
      .get('/api/tasks/special/price-tag')
      .set('x-device-id', 'dev_special_1')
      .expect(200);
    expect(initRes.body.success).toBe(true);
    expect(initRes.body.evaluation).toBeNull();

    // 2. User 1 submits 100,000
    const res1 = await agent1
      .post('/api/tasks/special/price-tag')
      .set('x-device-id', 'dev_special_1')
      .send({
        price: 100000,
        selfEvaluation: '白天是体面的顾问，夜晚渴望彻底被买断',
      })
      .expect(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.evaluation.rank).toBe(1);
    expect(res1.body.evaluation.totalParticipants).toBe(1);
    expect(res1.body.evaluation.price).toBe(100000);

    // 3. User 2 submits same price 100,000 (tied highest -> both rank 1)
    const res2 = await agent2
      .post('/api/tasks/special/price-tag')
      .set('x-device-id', 'dev_special_2')
      .send({
        price: 100000,
        selfEvaluation: '并列最高身价自白',
      })
      .expect(200);
    expect(res2.body.evaluation.rank).toBe(1);
    expect(res2.body.evaluation.totalParticipants).toBe(2);

    // 4. User 3 submits lower price 50,000 (2 users higher -> rank 3)
    const res3 = await agent3
      .post('/api/tasks/special/price-tag')
      .set('x-device-id', 'dev_special_3')
      .send({
        price: 50000,
        selfEvaluation: '五万身价自白',
      })
      .expect(200);
    expect(res3.body.evaluation.rank).toBe(3);
    expect(res3.body.evaluation.totalParticipants).toBe(3);
    expect(res3.body.evaluation.defeatedPercentage).toBe(0.1);

    // 5. User 3 attempts to re-submit immediately -> 400 with cooldown error
    const cooldownRes = await agent3
      .post('/api/tasks/special/price-tag')
      .set('x-device-id', 'dev_special_3')
      .send({
        price: 80000,
        selfEvaluation: '修改定价',
      })
      .expect(400);
    expect(cooldownRes.body.success).toBe(false);
    expect(cooldownRes.body.message).toContain('1 小时');
    expect(cooldownRes.body.cooldownRemainingSeconds).toBeGreaterThan(3500);

    // 6. User 3 re-reads evaluation via GET
    const readRes = await agent3
      .get('/api/tasks/special/price-tag')
      .set('x-device-id', 'dev_special_3')
      .expect(200);
    expect(readRes.body.evaluation.price).toBe(50000);
    expect(readRes.body.evaluation.canEdit).toBe(false);

    // 7. Test Special Price Leaderboard & Upvote / Downvote
    const leaderRes = await agent1
      .get('/api/tasks/special/price-tag/leaderboard')
      .set('x-device-id', 'dev_special_1')
      .expect(200);
    expect(leaderRes.body.success).toBe(true);
    expect(leaderRes.body.top10.length).toBe(3);
    expect(leaderRes.body.myStatus.hasSubmitted).toBe(true);

    const user3EvalId = res3.body.evaluation.id;

    // Agent 1 upvotes user 3
    const voteUpRes = await agent1
      .post('/api/tasks/special/price-tag/vote')
      .set('x-device-id', 'dev_special_1')
      .send({ evaluationId: user3EvalId, voteType: 'up' })
      .expect(200);
    expect(voteUpRes.body.success).toBe(true);
    expect(voteUpRes.body.upvotes).toBe(1);
    expect(voteUpRes.body.netScore).toBe(1);
    expect(voteUpRes.body.userVote).toBe('up');

    // Agent 2 upvotes user 3 as well
    await agent2
      .post('/api/tasks/special/price-tag/vote')
      .set('x-device-id', 'dev_special_2')
      .send({ evaluationId: user3EvalId, voteType: 'up' })
      .expect(200);

    // Verify User 3 is now top 1 in the 7-day net score leaderboard
    const updatedLeader = await agent3
      .get('/api/tasks/special/price-tag/leaderboard')
      .set('x-device-id', 'dev_special_3')
      .expect(200);
    expect(updatedLeader.body.top10[0].id).toBe(user3EvalId);
    expect(updatedLeader.body.top10[0].netScore).toBe(2);
    expect(updatedLeader.body.myStatus.rank).toBe(1);

    // Self-vote is rejected (prevents leaderboard manipulation)
    await agent3
      .post('/api/tasks/special/price-tag/vote')
      .set('x-device-id', 'dev_special_3')
      .send({ evaluationId: user3EvalId, voteType: 'up' })
      .expect(400);

    // Voting on a nonexistent evaluation is rejected
    await agent1
      .post('/api/tasks/special/price-tag/vote')
      .set('x-device-id', 'dev_special_1')
      .send({ evaluationId: 'spv_nonexistent', voteType: 'up' })
      .expect(404);
  });

  it('manages betrothal-gift special task evaluation, ranking, and voting', async () => {
    const bride1 = request.agent(app);
    const bride2 = request.agent(app);

    await register(bride1, 'bride1');
    await fillBasicInfo(bride1);
    await register(bride2, 'bride2');
    await fillBasicInfo(bride2);

    // 1. Initial query before submission
    const initRes = await bride1
      .get('/api/tasks/special/betrothal-gift')
      .set('x-device-id', 'dev_bride_1')
      .expect(200);
    expect(initRes.body.success).toBe(true);
    expect(initRes.body.evaluation).toBeNull();

    // 2. Bride 1 submits 288,888 bride price & husband confession
    const res1 = await bride1
      .post('/api/tasks/special/betrothal-gift')
      .set('x-device-id', 'dev_bride_1')
      .send({
        price: 288888,
        selfEvaluation: '他人前是温和的合伙人，在床上是我不可违抗的绝对主宰',
      })
      .expect(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.message).toContain('彩礼与伴侣自白');
    expect(res1.body.evaluation.price).toBe(288888);
    expect(res1.body.evaluation.rank).toBe(1);

    // 3. Bride 2 submits 188,888 bride price
    const res2 = await bride2
      .post('/api/tasks/special/betrothal-gift')
      .set('x-device-id', 'dev_bride_2')
      .send({
        price: 188888,
        selfEvaluation: '看似老实的普通员工，实际是掌控我所有财务和羞耻边界的绳师',
      })
      .expect(200);
    expect(res2.body.evaluation.price).toBe(188888);
    expect(res2.body.evaluation.rank).toBe(2);

    // 4. Leaderboard & Voting
    const leaderRes = await bride1
      .get('/api/tasks/special/betrothal-gift/leaderboard')
      .set('x-device-id', 'dev_bride_1')
      .expect(200);
    expect(leaderRes.body.success).toBe(true);
    expect(leaderRes.body.top10.length).toBe(2);

    // Bride 1 upvotes Bride 2
    const voteRes = await bride1
      .post('/api/tasks/special/betrothal-gift/vote')
      .set('x-device-id', 'dev_bride_1')
      .send({ evaluationId: res2.body.evaluation.id, voteType: 'up' })
      .expect(200);
    expect(voteRes.body.success).toBe(true);
    expect(voteRes.body.upvotes).toBe(1);
    expect(voteRes.body.netScore).toBe(1);
  });

  it('traps malicious probes with honeypot and blocks subsequent API access for that IP', async () => {
    const attackerIp = '198.51.100.88';

    // 1. Attacker attempts to scan sensitive config /.env
    const probeRes = await request(app)
      .get('/.env')
      .set('x-forwarded-for', attackerIp)
      .set('user-agent', 'Nikto/2.1.6')
      .expect(404);

    expect(probeRes.body.message).toBe('Not Found');

    // 2. Attacker tries to call normal API endpoint from the same IP -> blocked with 403
    const blockedRes = await request(app)
      .get('/api/tasks')
      .set('x-forwarded-for', attackerIp)
      .expect(403);

    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.message).toBe('Access denied.');

    // 3. Other innocent users from a different IP are completely unaffected
    const innocentRes = await request(app)
      .get('/api/tasks')
      .set('x-forwarded-for', '198.51.100.99')
      .expect(200);

    expect(innocentRes.body.success).toBe(true);
  });

  it('limits special-price voting to 20 requests per trusted IP per day', async () => {
    const targetDevice = 'dev_vote_limit_target';
    const targetAgent = request.agent(app);
    await register(targetAgent, 'targetVote');
    await fillBasicInfo(targetAgent);
    const target = await targetAgent
      .post('/api/tasks/special/price-tag')
      .set('x-device-id', targetDevice)
      .set('x-forwarded-for', '198.51.100.140')
      .send({ price: 12345, selfEvaluation: '投票限流测试目标' })
      .expect(200);
    const evaluationId = target.body.evaluation.id as string;

    for (let index = 0; index < 20; index += 1) {
      await request(app)
        .post('/api/tasks/special/price-tag/vote')
        .set('x-device-id', 'dev_vote_limit_voter')
        .set('x-forwarded-for', '198.51.100.141')
        .send({ evaluationId, voteType: 'up' })
        .expect(200);
    }

    const limited = await request(app)
      .post('/api/tasks/special/price-tag/vote')
      .set('x-device-id', 'dev_vote_limit_voter')
      .set('x-forwarded-for', '198.51.100.141')
      .send({ evaluationId, voteType: 'up' })
      .expect(429);
    expect(limited.body.message).toContain('20 次');
    expect(limited.headers['ratelimit-limit']).toBe('20');
    expect(limited.headers['ratelimit-remaining']).toBe('0');

    await request(app)
      .post('/api/tasks/special/price-tag/vote')
      .set('x-device-id', 'dev_vote_limit_other_ip')
      .set('x-forwarded-for', '198.51.100.142')
      .send({ evaluationId, voteType: 'down' })
      .expect(200);
  });

  it('allows the owner to reanalyze a dossier in place for one manual retry', async () => {
    const deviceId = 'dev_reanalyze_owner';
    const crediblePayload = {
      chapter1: { nickname: '重跑样本', occupation: '开发者' },
      chapter2: {},
      chapter3: {},
      completedBanks: [{
        id: 'bank_retry',
        title: '重试题库',
        category: 'demo',
        questions: Array.from({ length: 8 }, (_, index) => ({
          id: `q${index + 1}`,
          title: `题 ${index + 1}`,
          type: 'single_choice',
          options: Array.from({ length: 5 }, (_, option) => ({
            id: `q${index + 1}_o${option}`,
            text: `选项${option + 1}`,
          })),
        })),
      }],
      totalDurationSeconds: 96,
      questionLogs: [3200, 5100, 7400, 4600, 6100, 8800, 3900, 9200].map((duration, index) => ({
        questionId: `q${index + 1}`,
        durationMs: duration,
        interactionCount: 4,
        isLeftBlank: false,
        finalValue: { selectedOptions: [`q${index + 1}_o${index % 5}`] },
      })),
    };

    const saved = await db.saveDossier(null, deviceId, crediblePayload, fakeLlmResponse);

    const llmSpy = vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: { ...fakeLlmResponse, archetypeTitle: '重试成功' },
    });

    const ok = await request(app)
      .post(`/api/dossiers/${saved.id}/reanalyze`)
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(ok.body).toMatchObject({ success: true });
    expect(ok.body.data.archetypeTitle).toBe('重试成功');

    const persisted = await db.getDossierRowById(saved.id);
    expect(persisted?.diagnosticResult?.archetypeTitle).toBe('重试成功');

    // 他人设备无权重跑他人卷宗
    await request(app)
      .post(`/api/dossiers/${saved.id}/reanalyze`)
      .set('X-Device-Id', 'dev_reanalyze_stranger')
      .expect(404);

    // 重跑仍失败时保留原诊断结果，并回报 llmFailed
    llmSpy.mockResolvedValue({ ok: false, degenerate: true, errorMessage: 'LLM 返回明显异常结果' });
    const failed = await request(app)
      .post(`/api/dossiers/${saved.id}/reanalyze`)
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(failed.body).toMatchObject({ success: false, llmFailed: true });

    const afterFailure = await db.getDossierRowById(saved.id);
    expect(afterFailure?.diagnosticResult?.archetypeTitle).toBe('重试成功');
  });
});

