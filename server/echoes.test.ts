import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
const adminToken = config.adminToken;

describe('Midnight Echo Well API', () => {
  it('GET /api/echoes returns approved list with preset seed data', async () => {
    const res = await request(app)
      .get('/api/echoes')
      .set('X-Device-Id', 'device_test_reader')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(10);
    expect(res.body.items.some((i: any) => i.isPreset === true)).toBe(true);
  });

  it('POST /api/echoes creates whisper with pending status and blocks PII', async () => {
    const deviceId = `dev_author_${Date.now()}`;

    // 1. 尝试发送包含手机号的违规内容 -> 拦截
    const piiRes = await request(app)
      .post('/api/echoes')
      .set('X-Device-Id', deviceId)
      .send({
        surfaceRole: '测试职业',
        shadowDesire: '请加我电话 13812345678 详聊私密自白内容',
        shadowTag: '绝对臣服',
      })
      .expect(400);

    expect(piiRes.body.success).toBe(false);
    expect(piiRes.body.message).toContain('手机号');

    // 2. 正常投掷自白 -> 状态为 pending 待审
    const castRes = await request(app)
      .post('/api/echoes')
      .set('X-Device-Id', deviceId)
      .send({
        surfaceRole: '夜班急诊医生',
        shadowDesire: '在高压与生死之间保持绝对冷静，只有在私密独处时渴望被紧密束缚与完全掌控。',
        shadowTag: '安全束缚',
      })
      .expect(201);

    expect(castRes.body.success).toBe(true);
    expect(castRes.body.echo).toBeDefined();
    expect(castRes.body.echo.auditStatus).toBe('pending');

    const echoId = castRes.body.echo.id;

    // 3. 其他用户设备请求公开列表 -> 绝不包含未过审的 pending 回响
    const otherUserRes = await request(app)
      .get('/api/echoes')
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    const existsInPublic = otherUserRes.body.items.some((i: any) => i.id === echoId);
    expect(existsInPublic).toBe(false);

    // 4. 作者自己的设备请求 -> 在 myPendingEchoes 中可见
    const authorRes = await request(app)
      .get('/api/echoes')
      .set('X-Device-Id', deviceId)
      .expect(200);

    expect(authorRes.body.myPendingEchoes).toBeDefined();
    const myPending = authorRes.body.myPendingEchoes?.find((i: any) => i.id === echoId);
    expect(myPending).toBeDefined();
    expect(myPending?.auditStatus).toBe('pending');

    // 5. 管理员审核通过该回响
    await request(app)
      .patch(`/api/admin/echoes/${echoId}`)
      .set('X-Admin-Token', adminToken)
      .send({ auditStatus: 'approved' })
      .expect(200);

    // 6. 审核通过后，全网公开列表立即可见
    const afterApprovalRes = await request(app)
      .get('/api/echoes')
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    const foundApproved = afterApprovalRes.body.items.find((i: any) => i.id === echoId);
    expect(foundApproved).toBeDefined();
    expect(foundApproved.surfaceRole).toBe('夜班急诊医生');

    // 7. 点亮共鸣微光 (+1)
    const resonateRes = await request(app)
      .post(`/api/echoes/${echoId}/resonate`)
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    expect(resonateRes.body.success).toBe(true);
    expect(resonateRes.body.isResonated).toBe(true);
    expect(resonateRes.body.echoCount).toBeGreaterThanOrEqual(2);

    // 8. 再次点击共鸣微光（支持取消点赞 toggle）
    const unresonateRes = await request(app)
      .post(`/api/echoes/${echoId}/resonate`)
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    expect(unresonateRes.body.success).toBe(true);
    expect(unresonateRes.body.isResonated).toBe(false);

    // 再次点击重新点亮
    const reResonateRes = await request(app)
      .post(`/api/echoes/${echoId}/resonate`)
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    expect(reResonateRes.body.success).toBe(true);
    expect(reResonateRes.body.isResonated).toBe(true);

    // 9. 标签筛选 (tag filter)
    const tagMatchRes = await request(app)
      .get('/api/echoes?tag=安全束缚')
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    expect(tagMatchRes.body.items.some((i: any) => i.id === echoId)).toBe(true);

    const tagMismatchRes = await request(app)
      .get('/api/echoes?tag=角色扮演')
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    expect(tagMismatchRes.body.items.some((i: any) => i.id === echoId)).toBe(false);

    // 10. 管理员下架 (flagged)
    await request(app)
      .patch(`/api/admin/echoes/${echoId}`)
      .set('X-Admin-Token', adminToken)
      .send({ auditStatus: 'flagged' })
      .expect(200);

    // 11. 下架后公开列表不再展示
    const flaggedPublicRes = await request(app)
      .get('/api/echoes')
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);

    expect(flaggedPublicRes.body.items.some((i: any) => i.id === echoId)).toBe(false);

    // 12. 下架状态下管理员可物理删除
    await request(app)
      .delete(`/api/admin/echoes/${echoId}`)
      .set('X-Admin-Token', adminToken)
      .expect(200);

    // 13. 删除后管理员列表与用户端完全不可见
    const adminListAfterDelete = await request(app)
      .get('/api/admin/echoes')
      .set('X-Admin-Token', adminToken)
      .expect(200);

    expect(adminListAfterDelete.body.items.some((i: any) => i.id === echoId)).toBe(false);
  });

  it('validates echo creation payloads and enforces content constraints', async () => {
    const deviceId = `dev_validate_${Date.now()}`;

    // 空内容校验
    await request(app)
      .post('/api/echoes')
      .set('X-Device-Id', deviceId)
      .send({ surfaceRole: '', shadowDesire: '', shadowTag: '' })
      .expect(400);

    // 自白内容过短 (< 10 字)
    await request(app)
      .post('/api/echoes')
      .set('X-Device-Id', deviceId)
      .send({ surfaceRole: '架构师', shadowDesire: '太短了', shadowTag: '心智掌控' })
      .expect(400);

    // 自白内容过长 (> 500 字)
    await request(app)
      .post('/api/echoes')
      .set('X-Device-Id', deviceId)
      .send({
        surfaceRole: '架构师',
        shadowDesire: '渴望'.repeat(300),
        shadowTag: '心智掌控',
      })
      .expect(400);
  });

  it('rejects unauthenticated admin operations on echoes', async () => {
    await request(app)
      .get('/api/admin/echoes')
      .expect(401);

    await request(app)
      .patch('/api/admin/echoes/fake_id')
      .send({ auditStatus: 'approved' })
      .expect(401);

    await request(app)
      .delete('/api/admin/echoes/fake_id')
      .expect(401);
  });
});
