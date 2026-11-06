import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const app = createApp();
const password = 'validPass123';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('账号生命周期：注销后同邮箱可重新注册', () => {
  it('注销后同一邮箱可再次注册，生成新 UUID 且 generation 递增', async () => {
    const agent = request.agent(app);
    const mail = uniqueEmail('cycle');

    const reg1 = await agent
      .post('/api/auth/register')
      .send({ email: mail, password })
      .expect(200);
    expect(reg1.body.user.generation).toBe(1);
    const firstId = reg1.body.user.id as string;

    await agent
      .post('/api/auth/delete-account')
      .send({ confirmEmail: mail })
      .expect(200);

    // 注销后旧账号无法登录
    await agent
      .post('/api/auth/login')
      .send({ email: mail, password })
      .expect(400);

    // 同一邮箱重新注册成功（不再是 410），新 UUID，generation = 2
    const reg2 = await agent
      .post('/api/auth/register')
      .send({ email: mail, password })
      .expect(200);
    expect(reg2.body.user.generation).toBe(2);
    expect(reg2.body.user.id).not.toBe(firstId);

    // 新账号可正常登录
    await agent
      .post('/api/auth/login')
      .send({ email: mail, password })
      .expect(200);
  });

  it('活跃账号重复注册同一邮箱仍返回 409', async () => {
    const agent = request.agent(app);
    const mail = uniqueEmail('dup');

    await agent
      .post('/api/auth/register')
      .send({ email: mail, password })
      .expect(200);
    await agent
      .post('/api/auth/register')
      .send({ email: mail, password })
      .expect(409);
  });

  it('多次 注销→注册 cycle 持续递增 generation', async () => {
    const agent = request.agent(app);
    const mail = uniqueEmail('multi');

    for (let i = 1; i <= 3; i++) {
      const reg = await agent
        .post('/api/auth/register')
        .send({ email: mail, password })
        .expect(200);
      expect(reg.body.user.generation).toBe(i);
      await agent
        .post('/api/auth/delete-account')
        .send({ confirmEmail: mail })
        .expect(200);
    }

    const finalReg = await agent
      .post('/api/auth/register')
      .send({ email: mail, password })
      .expect(200);
    expect(finalReg.body.user.generation).toBe(4);
  });
});
