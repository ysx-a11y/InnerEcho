import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminApp, createApp } from './app.js';
import { db } from './db.js';
import type { FullDossierData, LlmAnalysisJson } from './types.js';

const { chatMock } = vi.hoisted(() => ({ chatMock: vi.fn() }));

vi.mock('./utils/llmChat.js', () => ({
  callLlmChat: chatMock,
}));

const app = createApp();
const adminApp = createAdminApp();
const adminRequest = request(adminApp);
const ADMIN_TOKEN = 'test-only-admin-token';
const password = 'validPass123';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

const dossierData: FullDossierData = {
  chapter1: {
    nickname: '审讯测试者',
    occupation: '编辑',
    personaTrait: '克制',
    age: '30',
    maritalStatus: '未婚',
    hasBoyfriend: '无',
    surfaceTrait: '冷静、很少表达情绪',
    innerDesire: '希望被问到不敢自己面对的部分',
  },
  chapter2: {
    boundaryText: '可以追问，但不要替我编造',
    fantasyText: '被看穿',
    relationPreference: '短暂而直接的对话',
    awakeningMoment: '独自整理旧物时',
  },
  chapter3: {
    secretWords: '沉默',
    secretRule: '不向外转述',
  },
  depthRating: 'medium',
  selectedShadowTags: ['回避', '被看穿'],
};

const diagnosticResult: LlmAnalysisJson = {
  credibilityScore: 80,
  credibilityLevel: 'medium',
  archetypeTitle: '沉默的编辑',
  archetypeSubtitle: '在字句之间藏起自己',
  dominanceIndex: 40,
  restraintIndex: 70,
  submissionIndex: 55,
  sensoryThreshold: 50,
  personaDeconstruction: '外在冷静',
  shadowDeconstruction: '害怕被准确描述',
  psychologicalSublimation: '用写作消化',
  resonanceKeywords: ['沉默', '回避'],
};

interface TestUser {
  agent: ReturnType<typeof request.agent>;
  userId: string;
  email: string;
  deviceId: string;
}

async function createUserWithDossier(label: string): Promise<TestUser> {
  const agent = request.agent(app);
  const email = uniqueEmail(label);
  const reg = await agent.post('/api/auth/register').send({ email, password }).expect(200);
  const userId = reg.body.user.id as string;
  const deviceId = `dev_itr_${Math.random().toString(36).slice(2, 10)}`;
  await db.saveDossier(userId, deviceId, dossierData, diagnosticResult);
  return { agent, userId, email, deviceId };
}

beforeEach(() => {
  chatMock.mockReset();
  chatMock.mockImplementation(async (input: { messages: { role: string; content: string }[] }) => {
    const system = input.messages?.[0]?.content ?? '';
    if (system.includes('记录员')) {
      return { ok: true, content: '你在审讯里始终绕开「被准确描述」这件事。', durationMs: 1 };
    }
    return { ok: true, content: '你在回避什么？', durationMs: 1 };
  });
});

function lastSystemPrompt(): string {
  const call = chatMock.mock.calls.at(-1)?.[0] as
    | { messages?: { role: string; content: string }[] }
    | undefined;
  return call?.messages?.[0]?.content ?? '';
}

describe('审讯室 API', () => {
  it('未登录访问返回 401，登录但未完成卷宗返回 hasDossier=false 且发送被拒', async () => {
    await request(app).get('/api/interrogation/state').expect(401);

    const agent = request.agent(app);
    const email = uniqueEmail('itr-nodossier');
    await agent.post('/api/auth/register').send({ email, password }).expect(200);

    const state = await agent.get('/api/interrogation/state').expect(200);
    expect(state.body.success).toBe(true);
    expect(state.body.hasDossier).toBe(false);
    expect(state.body.config.maxTurns).toBe(5);
    expect(state.body.session).toBeNull();

    const res = await agent.post('/api/interrogation/messages').send({ message: '你好' }).expect(403);
    expect(res.body.code).toBe('no_dossier');
  });

  it('完成卷宗后可交互，达到轮数上限后拒绝继续并允许生成总结', async () => {
    const user = await createUserWithDossier('itr-flow');

    const state = await user.agent.get('/api/interrogation/state').expect(200);
    expect(state.body.hasDossier).toBe(true);
    expect(state.body.remainingTurns).toBe(5);

    for (let turn = 1; turn <= 5; turn += 1) {
      const res = await user.agent
        .post('/api/interrogation/messages')
        .send({ message: `第 ${turn} 句陈述：我其实不想被看穿。` })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reply).toBe('你在回避什么？');
      expect(res.body.session.turnCount).toBe(turn);
      expect(res.body.remainingTurns).toBe(5 - turn);
    }

    const exhaustedState = await user.agent.get('/api/interrogation/state').expect(200);
    expect(exhaustedState.body.session.status).toBe('exhausted');
    expect(exhaustedState.body.messages).toHaveLength(10);
    expect(exhaustedState.body.remainingTurns).toBe(0);

    const blocked = await user.agent
      .post('/api/interrogation/messages')
      .send({ message: '再来一句' })
      .expect(409);
    expect(blocked.body.code).toBe('exhausted');

    const summary = await user.agent.post('/api/interrogation/summary').send({}).expect(200);
    expect(summary.body.success).toBe(true);
    expect(summary.body.summary).toContain('被准确描述');
    expect(summary.body.session.status).toBe('summarized');

    const closed = await user.agent
      .post('/api/interrogation/messages')
      .send({ message: '还能继续吗' })
      .expect(409);
    expect(closed.body.code).toBe('closed');
  });

  it('总结在对话未结束前不可生成', async () => {
    const user = await createUserWithDossier('itr-early-summary');
    await user.agent.post('/api/interrogation/messages').send({ message: '第一句' }).expect(200);

    const res = await user.agent.post('/api/interrogation/summary').send({}).expect(409);
    expect(res.body.code).toBe('not_finished');
    expect(res.body.session.turnCount).toBe(1);
  });

  it('会话与消息只按账号归属，同一设备上的另一个账号看不到别人的审讯', async () => {
    const first = await createUserWithDossier('itr-owner');
    await first.agent.post('/api/interrogation/messages').send({ message: '只属于我的陈述' }).expect(200);

    const second = await createUserWithDossier('itr-other');
    // 模拟同一浏览器设备：第二个账号带着同一个 X-Device-Id 请求。
    const state = await second.agent
      .get('/api/interrogation/state')
      .set('X-Device-Id', first.deviceId)
      .expect(200);
    expect(state.body.session).toBeNull();
    expect(state.body.messages).toHaveLength(0);
    expect(state.body.remainingTurns).toBe(5);
  });

  it('超长陈述被输入额度拒绝', async () => {
    const user = await createUserWithDossier('itr-long');
    // 1500 个汉字 ≈ 1500 token，超过默认输入预算 1200（同时仍在 2000 字符格式上限内）。
    const res = await user.agent
      .post('/api/interrogation/messages')
      .send({ message: '我'.repeat(1500) })
      .expect(400);
    expect(res.body.code).toBe('input_too_long');

    const empty = await user.agent.post('/api/interrogation/messages').send({ message: '   ' }).expect(400);
    expect(empty.body.success).toBe(false);
  });
});

describe('管理端审讯室配置', () => {
  it('需要管理员令牌，可读写额度并做范围校验', async () => {
    await adminRequest.get('/api/admin/interrogation/config').expect(401);

    const initial = await adminRequest
      .get('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .expect(200);
    expect(initial.body.config.maxTurns).toBe(5);

    const updated = await adminRequest
      .put('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .send({ maxTurns: 2, maxInputTokens: 512, maxOutputTokens: 128 })
      .expect(200);
    expect(updated.body.config).toMatchObject({ maxTurns: 2, maxInputTokens: 512, maxOutputTokens: 128 });

    const invalid = await adminRequest
      .put('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .send({ maxTurns: 99 })
      .expect(400);
    expect(invalid.body.success).toBe(false);

    const empty = await adminRequest
      .put('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .send({})
      .expect(400);
    expect(empty.body.success).toBe(false);

    // 配置对前端即时生效：新会话 2 轮即到上限
    const user = await createUserWithDossier('itr-config');
    const state = await user.agent.get('/api/interrogation/state').expect(200);
    expect(state.body.config.maxTurns).toBe(2);
    await user.agent.post('/api/interrogation/messages').send({ message: '一' }).expect(200);
    const second = await user.agent.post('/api/interrogation/messages').send({ message: '二' }).expect(200);
    expect(second.body.remainingTurns).toBe(0);
    expect(second.body.session.status).toBe('exhausted');

    const sessions = await adminRequest
      .get('/api/admin/interrogation/sessions?limit=5')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .expect(200);
    expect(Array.isArray(sessions.body.items)).toBe(true);

    // 复原默认，避免影响同文件之外的用例（同进程内共享 db）。
    await adminRequest
      .put('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .send({ maxTurns: 5, maxInputTokens: 1200, maxOutputTokens: 300 })
      .expect(200);
  });

  it('自定义审讯者/总结提示词即时生效，留空可恢复默认', async () => {
    const defaults = await adminRequest
      .get('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .expect(200);
    expect(defaults.body.config.interrogatorPrompt).toContain('InnerEcho 审讯室');
    expect(defaults.body.config.interrogatorPrompt).toContain('{{dossier}}');
    expect(defaults.body.config.summaryPrompt).toContain('记录员');

    const customInterrogator = '你是 TEST-INTERROGATOR 审讯者。\n【来访者档案】\n{{dossier}}\n只问一句。';
    const customSummary = '你是 TEST-RECORDER 记录员。只写一句话总结。';
    const saved = await adminRequest
      .put('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .send({ maxTurns: 1, interrogatorPrompt: customInterrogator, summaryPrompt: customSummary })
      .expect(200);
    expect(saved.body.config.interrogatorPrompt).toBe(customInterrogator);
    expect(saved.body.config.summaryPrompt).toBe(customSummary);

    const user = await createUserWithDossier('itr-prompt');
    const first = await user.agent
      .post('/api/interrogation/messages')
      .send({ message: '我没什么好说的。' })
      .expect(200);
    expect(first.body.session.status).toBe('exhausted');

    const turnPrompt = lastSystemPrompt();
    expect(turnPrompt).toContain('TEST-INTERROGATOR');
    expect(turnPrompt).toContain('审讯测试者');
    expect(turnPrompt).not.toContain('{{dossier}}');

    const summary = await user.agent.post('/api/interrogation/summary').expect(200);
    expect(summary.body.success).toBe(true);
    expect(lastSystemPrompt()).toContain('TEST-RECORDER');

    const reset = await adminRequest
      .put('/api/admin/interrogation/config')
      .set('X-Admin-Token', ADMIN_TOKEN)
      .send({ maxTurns: 5, maxInputTokens: 1200, maxOutputTokens: 300, interrogatorPrompt: '', summaryPrompt: '' })
      .expect(200);
    expect(reset.body.config.interrogatorPrompt).toContain('InnerEcho 审讯室');
    expect(reset.body.config.interrogatorPrompt).not.toContain('TEST-INTERROGATOR');
    expect(reset.body.config.summaryPrompt).toContain('记录员');
    expect(reset.body.config.summaryPrompt).not.toContain('TEST-RECORDER');
  });
});
