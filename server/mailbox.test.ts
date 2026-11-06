import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAdminApp, createUserApp } from './app.js';

const userApp = createUserApp();
const adminApp = createAdminApp();
const ADMIN_TOKEN = 'test-only-admin-token';
const password = 'validPass123';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('暗室信箱 API', () => {
  it('投递后可读取；缺少设备指纹与过短内容被拒', async () => {
    const deviceId = `dev_mail_${Date.now()}`;

    await request(userApp)
      .post('/api/mailbox/send')
      .send({ content: '没有设备指纹的投递' })
      .expect(400);

    await request(userApp)
      .post('/api/mailbox/send')
      .set('X-Device-Id', deviceId)
      .send({ content: 'ab' })
      .expect(400);

    const sent = await request(userApp)
      .post('/api/mailbox/send')
      .set('X-Device-Id', deviceId)
      .send({ content: '希望增加更多情境卷宗', category: 'suggestion' })
      .expect(200);
    expect(sent.body.success).toBe(true);
    expect(sent.body.message.id).toBeTruthy();

    const mine = await request(userApp)
      .get('/api/mailbox/my')
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(mine.body.messages).toHaveLength(1);
    expect(mine.body.messages[0].category).toBe('suggestion');
    expect(mine.body.hasUnreadReply).toBe(false);
  });

  it('共享设备登出后，匿名请求读不到账号的密信', async () => {
    const agent = request.agent(userApp);
    const deviceId = `dev_shared_${Date.now()}`;

    await agent
      .post('/api/auth/register')
      .send({ email: uniqueEmail('mailbox-owner'), password })
      .expect(200);

    const sent = await agent
      .post('/api/mailbox/send')
      .set('X-Device-Id', deviceId)
      .send({ content: '绑定账号后投递的私密信件，登出后不应被同设备的匿名访客读到' })
      .expect(200);
    const messageId = sent.body.message.id as string;

    // 账号本人（带会话）仍能看到自己的密信
    const ownRes = await agent
      .get('/api/mailbox/my')
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(ownRes.body.messages.some((item: any) => item.id === messageId)).toBe(true);

    // 同一台设备、未携带登录态：模拟共享设备的下一位访客
    const anonRes = await request(userApp)
      .get('/api/mailbox/my')
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(anonRes.body.messages).toHaveLength(0);
    expect(anonRes.body.hasUnreadReply).toBe(false);
  });

  it('管理员回复后用户可见未读提示，标记已读后清除', async () => {
    const deviceId = `dev_reply_${Date.now()}`;
    const sent = await request(userApp)
      .post('/api/mailbox/send')
      .set('X-Device-Id', deviceId)
      .send({ content: '想问问这个结果该怎么理解', category: 'question' })
      .expect(200);
    const messageId = sent.body.message.id as string;

    const pending = await request(adminApp)
      .get('/api/admin/mailbox')
      .query({ status: 'pending', pageSize: 100 })
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(pending.body.items.some((item: any) => item.id === messageId)).toBe(true);

    await request(adminApp)
      .post(`/api/admin/mailbox/${messageId}/reply`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ replyContent: '已经收到，你的判断没有错。' })
      .expect(200);

    const replied = await request(userApp)
      .get('/api/mailbox/my')
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(replied.body.hasUnreadReply).toBe(true);
    expect(replied.body.messages[0].replyContent).toBe('已经收到，你的判断没有错。');

    await request(userApp)
      .post('/api/mailbox/read')
      .set('X-Device-Id', deviceId)
      .expect(200);

    const readRes = await request(userApp)
      .get('/api/mailbox/my')
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(readRes.body.hasUnreadReply).toBe(false);
  });
});
