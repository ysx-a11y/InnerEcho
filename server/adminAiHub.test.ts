import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { config } from './config.js';
import type { Express } from 'express';

describe('Admin AI Agent & Prompt Hub API', () => {
  let app: Express;
  const adminHeaders = {
    'x-admin-token': config.adminToken,
    'content-type': 'application/json',
  };

  beforeAll(async () => {
    app = await createApp();
  });

  it('GET /api/admin/ai/agents returns seeded agents', async () => {
    const res = await request(app)
      .get('/api/admin/ai/agents')
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);

    const keys = res.body.items.map((a: { agentKey: string }) => a.agentKey);
    expect(keys).toContain('dossier_analyst');
    expect(keys).toContain('interrogator');
    expect(keys).toContain('interrogation_recorder');
  });

  it('PATCH /api/admin/ai/agents/:id updates agent configuration', async () => {
    const res = await request(app)
      .patch('/api/admin/ai/agents/agent_interrogator')
      .set(adminHeaders)
      .send({
        temperature: 0.62,
        remark: '调优审讯官温度至0.62',
        adminNotes: '测试变更',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agent.temperature).toBe(0.62);
    expect(res.body.agent.remark).toBe('调优审讯官温度至0.62');
  });

  it('manages prompt templates and immutable version snapshots with instant rollback', async () => {
    // 1. 创建提示词模版，验证自动产生 v1 快照
    const createRes = await request(app)
      .post('/api/admin/ai/templates')
      .set(adminHeaders)
      .send({
        name: '测试审讯官风格A',
        description: '高压心理剖析型',
        content: '你是主审官A，紧盯被审人{{user.occupation}}的弱点。',
        agentId: 'agent_interrogator',
        changeSummary: '创建初始版本v1',
        remark: '测试模板',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const tmplId = createRes.body.template.id;
    const v1Id = createRes.body.template.activeVersionId;
    expect(v1Id).toBeTruthy();

    // 2. 升版：创建版本 v2 快照
    const v2Res = await request(app)
      .post(`/api/admin/ai/templates/${tmplId}/versions`)
      .set(adminHeaders)
      .send({
        systemPrompt: '你是升级版主审官A2，不仅逼问职业{{user.occupation}}，还逼问自白{{user.open_confession}}。',
        changeSummary: '强化对自白的逼问维度',
        remark: '升级至v2',
        adminNotes: '版本v2创建备忘',
      });

    expect(v2Res.status).toBe(201);
    expect(v2Res.body.success).toBe(true);
    expect(v2Res.body.version.versionNum).toBe(2);
    const v2Id = v2Res.body.version.id;

    // 3. 查询版本历史列表
    const listVersionsRes = await request(app)
      .get(`/api/admin/ai/templates/${tmplId}/versions`)
      .set(adminHeaders);

    expect(listVersionsRes.status).toBe(200);
    expect(listVersionsRes.body.versions).toHaveLength(2);
    expect(listVersionsRes.body.versions[0].versionNum).toBe(2);
    expect(listVersionsRes.body.versions[1].versionNum).toBe(1);

    // 4. 验证模板当前活跃版本为 v2
    const getTmplRes = await request(app)
      .get(`/api/admin/ai/templates/${tmplId}`)
      .set(adminHeaders);
    expect(getTmplRes.body.template.activeVersionId).toBe(v2Id);
    expect(getTmplRes.body.template.activeVersionNum).toBe(2);

    // 5. 执行一键回滚至 v1
    const rollbackRes = await request(app)
      .post(`/api/admin/ai/templates/${tmplId}/rollback`)
      .set(adminHeaders)
      .send({
        targetVersionId: v1Id,
        adminNotes: 'v2过于激进，紧急回滚至v1',
        remark: '一键回滚操作',
      });

    expect(rollbackRes.status).toBe(200);
    expect(rollbackRes.body.success).toBe(true);
    expect(rollbackRes.body.template.activeVersionId).toBe(v1Id);
    expect(rollbackRes.body.template.activeVersionNum).toBe(1);
    expect(rollbackRes.body.template.content).toContain('你是主审官A');
  });

  it('GET /api/admin/ai/variables returns prompt variables', async () => {
    const res = await request(app)
      .get('/api/admin/ai/variables')
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.variables.length).toBeGreaterThanOrEqual(10);
    const keys = res.body.variables.map((v: { variableKey: string }) => v.variableKey);
    expect(keys).toContain('user.occupation');
    expect(keys).toContain('dossier.scores_table');
    expect(keys).toContain('interrogate.dossier_brief');
  });

  it('POST /api/admin/ai/playground/run performs dry run in sandbox', async () => {
    const res = await request(app)
      .post('/api/admin/ai/playground/run')
      .set(adminHeaders)
      .send({
        agentId: 'agent_dossier_analyst',
        draftSystemPrompt: '解构来访者{{user.occupation}}的心理反差。',
        mockSource: 'preset_mock',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.renderedFullPrompt).toContain('外企合规法务总监');
    expect(res.body.validation.isValid).toBe(true);
    expect(res.body.metrics.durationMs).toBeGreaterThanOrEqual(0);
  });
});

