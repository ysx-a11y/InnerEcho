import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAdminApp } from './app.js';
import { db } from './db.js';

const app = createAdminApp();
const ADMIN_TOKEN = 'test-only-admin-token';

describe('Admin Data Dictionary & Account Lineage API', () => {
  it('GET /api/admin/dict/types returns all 6 built-in dictionary types with remarks', async () => {
    const res = await request(app)
      .get('/api/admin/dict/types')
      .set('x-admin-token', ADMIN_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.types).toBeInstanceOf(Array);
    expect(res.body.types.length).toBeGreaterThanOrEqual(6);

    const userAccountStatus = res.body.types.find(
      (t: { code: string }) => t.code === 'user_account_status'
    );
    expect(userAccountStatus).toBeDefined();
    expect(userAccountStatus.name).toBe('用户账号状态');
    expect(userAccountStatus.remark).toBeTruthy();
  });

  it('GET /api/admin/dict/items/:typeCode returns dict items with colors and remarks', async () => {
    const res = await request(app)
      .get('/api/admin/dict/items/user_account_status')
      .set('x-admin-token', ADMIN_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.items.length).toBeGreaterThanOrEqual(4);

    const activeItem = res.body.items.find((i: { value: string }) => i.value === 'active');
    expect(activeItem).toBeDefined();
    expect(activeItem.label).toBe('正常活跃');
    expect(activeItem.badgeColor).toBe('teal');
    expect(activeItem.remark).toBeTruthy();
  });

  it('POST /api/admin/dict/items creates or updates a dictionary item', async () => {
    const res = await request(app)
      .post('/api/admin/dict/items')
      .set('x-admin-token', ADMIN_TOKEN)
      .send({
        typeCode: 'user_account_status',
        value: 'shadow_banned',
        label: '静默降权',
        badgeColor: 'violet',
        badgeVariant: 'outline',
        sortOrder: 50,
        remark: '测试动态新增的字典状态',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.value).toBe('shadow_banned');
    expect(res.body.item.label).toBe('静默降权');
    expect(res.body.item.badgeColor).toBe('violet');
    expect(res.body.item.remark).toBe('测试动态新增的字典状态');
  });

  it('GET /api/admin/dict/transitions/:typeCode and POST check-transition validate state machine rules', async () => {
    const listRes = await request(app)
      .get('/api/admin/dict/transitions/echo_audit_status')
      .set('x-admin-token', ADMIN_TOKEN);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.transitions).toBeInstanceOf(Array);
    expect(listRes.body.transitions.length).toBeGreaterThan(0);

    // 校验合法流转: pending -> approved 是合法的
    const validCheck = await request(app)
      .post('/api/admin/dict/check-transition')
      .set('x-admin-token', ADMIN_TOKEN)
      .send({
        typeCode: 'echo_audit_status',
        fromValue: 'pending',
        toValue: 'approved',
      });
    expect(validCheck.status).toBe(200);
    expect(validCheck.body.isAllowed).toBe(true);

    // 校验非法流转: hidden -> pending 未预置允许
    const invalidCheck = await request(app)
      .post('/api/admin/dict/check-transition')
      .set('x-admin-token', ADMIN_TOKEN)
      .send({
        typeCode: 'echo_audit_status',
        fromValue: 'hidden',
        toValue: 'pending',
      });
    expect(invalidCheck.status).toBe(200);
    expect(invalidCheck.body.isAllowed).toBe(false);
  });

  it('Account Lineage: links generations across deletion and supports risk management', async () => {
    const testEmail = `lineage_test_${Date.now()}@domain.com`;

    // 1. 注册 Gen 1 用户
    const userGen1 = await db.users.createUser(testEmail, 'hash_pwd_gen1');
    expect(userGen1).toBeDefined();

    // 2. 查血缘：首次注册自动建立血缘
    const lineageGen1 = db.users.getAccountLineageByRootKey(testEmail);
    expect(lineageGen1).toBeDefined();
    expect(lineageGen1?.totalGenerations).toBe(1);
    expect(lineageGen1?.currentUserId).toBe(userGen1.id);
    expect(lineageGen1?.isBlocked).toBe(0);
    expect(lineageGen1?.remark).toBeTruthy();

    // 3. 注销 Gen 1 用户
    await db.users.softDeleteUser(userGen1.id);

    // 查血缘：currentUserId 变为 null
    const lineageAfterDelete = db.users.getAccountLineage(lineageGen1!.id);
    expect(lineageAfterDelete?.currentUserId).toBeNull();

    // 4. 用户重新注册同一邮箱 (Gen 2 重生)
    const userGen2 = await db.users.createUser(testEmail, 'hash_pwd_gen2');
    expect(userGen2.generation).toBe(2);
    expect(userGen2.id).not.toBe(userGen1.id);

    // 5. 查血缘：世代数自增为 2，currentUserId 切换为 userGen2.id
    const lineageGen2 = db.users.getAccountLineage(lineageGen1!.id);
    expect(lineageGen2?.totalGenerations).toBe(2);
    expect(lineageGen2?.currentUserId).toBe(userGen2.id);

    // 6. 管理台 API: 获取族谱详情
    const apiLineageRes = await request(app)
      .get(`/api/admin/users/lineage/${lineageGen1!.id}`)
      .set('x-admin-token', ADMIN_TOKEN);

    expect(apiLineageRes.status).toBe(200);
    expect(apiLineageRes.body.success).toBe(true);
    expect(apiLineageRes.body.generations).toHaveLength(2);
    expect(apiLineageRes.body.generations[0].accountStatus).toBe('deleted');
    expect(apiLineageRes.body.generations[1].accountStatus).toBe('active');

    // 7. 管理台 API: 调整血缘风控并留存管理员私密批注
    const updateRiskRes = await request(app)
      .put(`/api/admin/users/lineage/${lineageGen1!.id}/risk`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({
        riskLevel: 'high',
        isBlocked: 1,
        adminNotes: '涉嫌批量机器发信，实施根血缘封禁',
        remark: '运营风控人工介入',
      });

    expect(updateRiskRes.status).toBe(200);
    expect(updateRiskRes.body.success).toBe(true);
    expect(updateRiskRes.body.lineage.riskLevel).toBe('high');
    expect(updateRiskRes.body.lineage.isBlocked).toBe(1);
    expect(updateRiskRes.body.lineage.adminNotes).toBe('涉嫌批量机器发信，实施根血缘封禁');
    expect(updateRiskRes.body.lineage.remark).toBe('运营风控人工介入');

    // 8. 验证血缘硬封禁后，无法注销后再注册
    await db.users.softDeleteUser(userGen2.id);
    await expect(db.users.createUser(testEmail, 'hash_pwd_gen3')).rejects.toThrow(
      '该账号已被风控封禁，无法注册'
    );
  });
});

