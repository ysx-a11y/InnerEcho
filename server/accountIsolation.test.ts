import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { config } from './config.js';
import { db } from './db.js';

const app = createApp();
const adminToken = config.adminToken;
const password = 'validPass123';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('注销后的设备隔离：新旧账号在前端不得互相可见', () => {
  it('同一设备注销后重新注册，新账号读不到旧账号的密信/待审心声，且不能认领或删除它们', async () => {
    const deviceId = `dev_iso_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const mail = uniqueEmail('iso');

    const oldAgent = request.agent(app);
    const oldReg = await oldAgent
      .post('/api/auth/register')
      .set('X-Device-Id', deviceId)
      .send({ email: mail, password })
      .expect(200);
    const oldUserId = oldReg.body.user.id as string;

    const sent = await oldAgent
      .post('/api/mailbox/send')
      .set('X-Device-Id', deviceId)
      .send({ content: '旧账号注销前留下的私密信件，新账号绝不能读到。' })
      .expect(200);
    const oldMessageId = sent.body.message.id as string;

    const created = await oldAgent
      .post('/api/echoes')
      .set('X-Device-Id', deviceId)
      .send({
        surfaceRole: '夜班急诊医生',
        shadowDesire: '在高压与生死之间保持绝对冷静，只有独处时渴望被完全掌控。',
        shadowTag: '安全束缚',
      })
      .expect(201);
    const echoId = created.body.echo.id as string;

    // 旧账号本人可见自己的密信与待审心声
    const ownMail = await oldAgent.get('/api/mailbox/my').set('X-Device-Id', deviceId).expect(200);
    expect(ownMail.body.messages.some((m: any) => m.id === oldMessageId)).toBe(true);
    const ownEchoes = await oldAgent.get('/api/echoes').set('X-Device-Id', deviceId).expect(200);
    expect(ownEchoes.body.myPendingEchoes?.some((e: any) => e.id === echoId)).toBe(true);

    // 旧账号注销
    await oldAgent
      .post('/api/auth/delete-account')
      .set('X-Device-Id', deviceId)
      .send({ confirmEmail: mail })
      .expect(200);

    // 同一台设备、同一邮箱重新注册（设备指纹不轮换，这是后台的隐秘关联；
    // 但前端数据归属必须完全切开）
    const newAgent = request.agent(app);
    const newReg = await newAgent
      .post('/api/auth/register')
      .set('X-Device-Id', deviceId)
      .send({ email: mail, password })
      .expect(200);
    expect(newReg.body.user.id).not.toBe(oldUserId);

    // 1) 密信：旧账号留下的信件一封都不该出现
    const newMail = await newAgent.get('/api/mailbox/my').set('X-Device-Id', deviceId).expect(200);
    expect(newMail.body.messages).toHaveLength(0);
    expect(newMail.body.hasUnreadReply).toBe(false);
    // 私有数据接口必须禁用浏览器缓存，避免注销后旧响应被 304 复用
    expect(newMail.headers['cache-control']).toBe('no-store');

    // 2) 待审心声：旧账号 pending 的回响不应出现在新账号的 myPendingEchoes
    const newEchoes = await newAgent.get('/api/echoes').set('X-Device-Id', deviceId).expect(200);
    expect(newEchoes.body.myPendingEchoes).toBeUndefined();

    // 3) 过审后全网可见，但绝不标记为「我的」
    await request(app)
      .patch(`/api/admin/echoes/${echoId}`)
      .set('X-Admin-Token', adminToken)
      .send({ auditStatus: 'approved' })
      .expect(200);

    const publicList = await newAgent.get('/api/echoes').set('X-Device-Id', deviceId).expect(200);
    const approved = publicList.body.items.find((e: any) => e.id === echoId);
    expect(approved).toBeDefined();
    expect(approved.isMine).toBe(false);

    // 4) 新账号也删不掉旧账号的心声
    await newAgent.delete(`/api/echoes/${echoId}`).set('X-Device-Id', deviceId).expect(200);
    const afterDeleteAttempt = await request(app)
      .get('/api/echoes')
      .set('X-Device-Id', 'other_device_reader')
      .expect(200);
    expect(afterDeleteAttempt.body.items.some((e: any) => e.id === echoId)).toBe(true);
  });

  it('未绑定账号的匿名遗留仍归本设备（注册后可见）', async () => {
    const deviceId = `dev_iso_anon_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const mail = uniqueEmail('iso-anon');

    // 注册前以访客身份投递密信
    await request(app)
      .post('/api/mailbox/send')
      .set('X-Device-Id', deviceId)
      .send({ content: '登录前以访客身份投递的信件，注册后应仍归这台设备。' })
      .expect(200);

    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .set('X-Device-Id', deviceId)
      .send({ email: mail, password })
      .expect(200);

    const mine = await agent.get('/api/mailbox/my').set('X-Device-Id', deviceId).expect(200);
    expect(mine.body.messages.some((m: any) => String(m.content).includes('登录前'))).toBe(true);
  });

  it('共鸣、身价自评与投票状态也只按账号隔离，新账号可独立操作且不继承旧账号状态', async () => {
    const deviceId = `dev_iso_state_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const peerDeviceId = `dev_iso_peer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const mail = uniqueEmail('iso-state');

    const oldAgent = request.agent(app);
    const oldReg = await oldAgent
      .post('/api/auth/register')
      .set('X-Device-Id', deviceId)
      .send({ email: mail, password })
      .expect(200);
    const oldUserId = oldReg.body.user.id as string;

    // 旧账号发一条心声并过审，然后点亮共鸣
    const created = await oldAgent
      .post('/api/echoes')
      .set('X-Device-Id', deviceId)
      .send({
        surfaceRole: '旧账号的回响',
        shadowDesire: '这条回响属于注销前的旧账号，新账号不得把它标记为自己的共鸣。',
        shadowTag: '绝对臣服',
      })
      .expect(201);
    const echoId = created.body.echo.id as string;
    await request(app)
      .patch(`/api/admin/echoes/${echoId}`)
      .set('X-Admin-Token', adminToken)
      .send({ auditStatus: 'approved' })
      .expect(200);
    const oldResonate = await oldAgent
      .post(`/api/echoes/${echoId}/resonate`)
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(oldResonate.body.isResonated).toBe(true);

    // 旧账号的身价自评，以及另一台设备上的自评（供投票）
    const oldEvaluation = await db.saveSpecialEvaluation({
      taskType: 'price_tag',
      deviceId,
      userId: oldUserId,
      price: 100,
      selfEvaluation: '旧账号的自评文字：不应出现在新账号的「我的状态」里。',
    });
    expect(oldEvaluation.ok).toBe(true);
    const peerEvaluation = await db.saveSpecialEvaluation({
      taskType: 'price_tag',
      deviceId: peerDeviceId,
      price: 50,
      selfEvaluation: '另一台设备的公开自评。',
    });
    expect(peerEvaluation.ok).toBe(true);
    const peerEvaluationId = peerEvaluation.evaluation!.id;

    await oldAgent
      .post('/api/tasks/special/price-tag/vote')
      .set('X-Device-Id', deviceId)
      .send({ evaluationId: peerEvaluationId, voteType: 'up' })
      .expect(200);

    // 注销旧账号，同一设备注册新账号
    await oldAgent
      .post('/api/auth/delete-account')
      .set('X-Device-Id', deviceId)
      .send({ confirmEmail: mail })
      .expect(200);

    const newAgent = request.agent(app);
    await newAgent
      .post('/api/auth/register')
      .set('X-Device-Id', deviceId)
      .send({ email: mail, password })
      .expect(200);

    // 1) 共鸣状态不继承：旧账号点亮的共鸣在新账号看来必须未点亮
    const echoes = await newAgent.get('/api/echoes').set('X-Device-Id', deviceId).expect(200);
    const visibleEcho = echoes.body.items.find((e: any) => e.id === echoId);
    expect(visibleEcho).toBeDefined();
    expect(visibleEcho.isMine).toBe(false);
    expect(visibleEcho.isResonated).toBe(false);

    // 新账号可以独立点亮同一条回响（旧账号的共鸣行不再占用设备唯一键）
    const newResonate = await newAgent
      .post(`/api/echoes/${echoId}/resonate`)
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(newResonate.body.isResonated).toBe(true);

    // 2) 天梯榜的「我的状态」与投票状态不继承旧账号
    const leaderboard = await newAgent
      .get('/api/tasks/special/price-tag/leaderboard')
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(leaderboard.body.myStatus.hasSubmitted).toBe(false);
    expect(leaderboard.body.myStatus.selfEvaluation).toBeNull();
    expect(leaderboard.body.userVotes[peerEvaluationId]).toBeUndefined();
    // 公开榜单不返回任何账号/设备标识
    expect(JSON.stringify(leaderboard.body.top10)).not.toContain(oldUserId);
    expect(JSON.stringify(leaderboard.body.top10)).not.toContain(deviceId);

    // 新账号可以独立给同一条自评投票（旧账号的票按账号键保存，不占用设备唯一键）
    const newVote = await newAgent
      .post('/api/tasks/special/price-tag/vote')
      .set('X-Device-Id', deviceId)
      .send({ evaluationId: peerEvaluationId, voteType: 'up' })
      .expect(200);
    expect(newVote.body.userVote).toBe('up');

    const leaderboardAfterVote = await newAgent
      .get('/api/tasks/special/price-tag/leaderboard')
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(leaderboardAfterVote.body.userVotes[peerEvaluationId]).toBe('up');
  });
});
