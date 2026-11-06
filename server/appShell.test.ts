import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAdminApp, createUserApp } from './app.js';
import { getRawDatabase } from './db/connection.js';
import { getAbuseIdentityKey } from './utils/abuseLimiter.js';

describe('user/admin interface separation', () => {
  const userApp = createUserApp();
  const adminApp = createAdminApp();

  it('user app never exposes admin interfaces', async () => {
    await request(userApp).get('/api/admin/verify').expect(404);
    await request(userApp)
      .get('/api/admin/overview')
      .set('x-admin-token', 'test-only-admin-token')
      .expect(404);
    await request(userApp).get('/api/admin/prompt-templates').expect(404);
    await request(userApp).get('/api/admin/dossiers').expect(404);
  });

  it('user app keeps serving user-facing endpoints', async () => {
    await request(userApp)
      .post('/api/visit')
      .set('X-Device-Id', 'dev_separation_test')
      .send({ path: '/' })
      .expect(200);
  });

  it('limits ordinary JSON to 2MB while media submission routes keep the larger parser', async () => {
    await request(userApp)
      .post('/api/visit')
      .set('X-Device-Id', 'dev_body_limit_test')
      .send({ path: '/', padding: 'x'.repeat(2 * 1024 * 1024) })
      .expect(413)
      .expect((res) => expect(res.body.message).toContain('请求体过大'));

    // 同样大小在媒体任务路由可完成解析，随后才因未登录被业务中间件拒绝。
    await request(userApp)
      .post('/api/tasks/body-limit-test/complete')
      .set('x-forwarded-for', '198.51.100.211')
      .send({ textContent: '测试', padding: 'x'.repeat(2 * 1024 * 1024) })
      .expect(401);
  });

  it('keeps ordinary 2-3k character question-bank content on the normal parser without consuming expensive-route quota', async () => {
    const ip = '198.51.100.212';
    const identityKey = getAbuseIdentityKey('expensive-request', { type: 'ip', value: ip });
    await request(userApp)
      .post('/api/banks')
      .set('x-forwarded-for', ip)
      .send({
        title: '普通长文本题库',
        questions: [{
          id: 'long-text-question',
          title: '题'.repeat(3_000),
          type: 'open_text',
        }],
      })
      .expect(401);

    const quota = getRawDatabase().prepare(`
      SELECT request_count FROM abuse_rate_limits
      WHERE scope = 'expensive-request' AND identity_key = ?
    `).get(identityKey);
    expect(quota).toBeUndefined();
  });

  it('admin app exposes admin interfaces only', async () => {
    await request(adminApp).post('/api/admin/verify').expect(401);
    await request(adminApp).get('/api/auth/stats').expect(404);
    await request(adminApp).post('/api/analyze-dossier').send({}).expect(404);
    await request(adminApp).post('/api/visit').send({}).expect(404);
    await request(adminApp).post('/api/events').send({}).expect(404);
  });
});
