import type Database from 'better-sqlite3';
import type {
  AuthUser,
  ChapterOneData,
  UserStats,
  AdminUserSummary,
  AdminUserDetails,
  AdminUserListResult,
} from '../../types.js';
import type { AccountLineageSummary } from '../../../shared/apiContracts.js';
import {
  genId,
  safeJsonParse,
  sanitizeChapter1ForProfile,
} from '../helpers.js';
import {
  decodeJsonField,
  encodePrivateJson,
  decodePrivateJson,
} from '../crypto.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  generation: number;
  lineage_id?: string | null;
  account_status?: string;
  admin_notes?: string | null;
  remark?: string | null;
  token_invalidated_at: string | null;
  deleted_at: string | null;
}

export class UserRepo {
  constructor(private db: Database.Database) {}

  async bindUserDevice(userId: string, deviceId: string): Promise<void> {
    if (!userId || !deviceId) return;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO user_devices (id, user_id, device_id, last_login_at, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, device_id) DO UPDATE SET last_login_at = excluded.last_login_at`
      )
      .run(genId('udev'), userId, deviceId, now, now);
  }

  async findUserByEmail(email: string): Promise<AuthUser & { passwordHash: string; createdAt: string } | null> {
    const target = (email || '').trim().toLowerCase();
    const row = this.db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL')
      .get(target) as UserRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      generation: row.generation,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      tokenInvalidatedAt: row.token_invalidated_at,
      deletedAt: row.deleted_at,
    };
  }

  async findAnyUserByEmail(email: string): Promise<UserRow | null> {
    const target = (email || '').trim().toLowerCase();
    const row = this.db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ?')
      .get(target) as UserRow | undefined;
    return row ?? null;
  }

  async findUserById(id: string): Promise<AuthUser & { passwordHash: string; createdAt: string } | null> {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
      .get(id) as UserRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      generation: row.generation,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      tokenInvalidatedAt: row.token_invalidated_at,
      deletedAt: row.deleted_at,
    };
  }

  async countUsersByEmail(email: string): Promise<number> {
    const target = (email || '').trim().toLowerCase();
    const row = this.db
      .prepare('SELECT COUNT(*) as c FROM users WHERE LOWER(email) = ?')
      .get(target) as { c: number } | undefined;
    return row?.c ?? 0;
  }

  async createUser(email: string, passwordHash: string): Promise<AuthUser> {
    const conflict = await this.findAnyUserByEmail(email);
    if (conflict && !conflict.deleted_at) {
      throw new Error('该账号已注册，请直接登录');
    }
    const targetEmail = email.trim().toLowerCase();
    const existingLineage = this.db
      .prepare('SELECT id, is_blocked, total_generations FROM account_lineages WHERE root_key = ?')
      .get(targetEmail) as { id: string; is_blocked: number; total_generations: number } | undefined;

    if (existingLineage && existingLineage.is_blocked === 1) {
      throw new Error('该账号已被风控封禁，无法注册');
    }

    const generation = (await this.countUsersByEmail(email)) + 1;
    const now = new Date().toISOString();
    const user: AuthUser & { createdAt: string } = {
      id: genId('usr'),
      email: targetEmail,
      generation,
      createdAt: now,
    };

    let lineageId = existingLineage?.id;
    if (!lineageId) {
      lineageId = genId('lin');
      this.db
        .prepare(`
          INSERT INTO account_lineages (
            id, root_key, first_registered_at, last_active_at, total_generations,
            current_user_id, risk_level, is_blocked, admin_notes, remark, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 1, ?, 'normal', 0, NULL, '用户注册初始血缘', ?, ?)
        `)
        .run(lineageId, targetEmail, now, now, user.id, now, now);
    } else {
      this.db
        .prepare(`
          UPDATE account_lineages
          SET total_generations = total_generations + 1,
              current_user_id = ?,
              last_active_at = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .run(user.id, now, now, lineageId);
    }

    try {
      this.db
        .prepare(
          'INSERT INTO users (id, email, password_hash, created_at, token_invalidated_at, deleted_at, generation, lineage_id, account_status, remark) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)'
        )
        .run(user.id, user.email, passwordHash, user.createdAt, generation, lineageId, 'active', '正常注册');
    } catch (err) {
      // better-sqlite3 抛的是扩展错误码（SQLITE_CONSTRAINT_UNIQUE / SQLITE_CONSTRAINT_PRIMARYKEY），
      // 需用前缀匹配才能兼容并发注册同邮箱时的唯一索引兜底，保证返回 409 而非 500。
      if (err instanceof Error && (err as { code?: string }).code?.startsWith('SQLITE_CONSTRAINT')) {
        throw new Error('该账号已注册，请直接登录');
      }
      throw err;
    }
    return user;
  }

  async upsertUserBasicInfo(userId: string, input: ChapterOneData): Promise<void> {
    const now = new Date().toISOString();
    const profileCh1 = sanitizeChapter1ForProfile(input);
    const chapter1Enc = encodePrivateJson(userId, 'chapter1', {}, profileCh1);
    this.db
      .prepare(
        `INSERT INTO user_profiles (user_id, nickname, occupation, persona_trait, chapter1_enc, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           nickname = excluded.nickname,
           occupation = excluded.occupation,
           persona_trait = excluded.persona_trait,
           chapter1_enc = excluded.chapter1_enc,
           updated_at = excluded.updated_at`
      )
      .run(
        userId,
        (input.nickname ?? '').trim(),
        (input.occupation ?? '').trim(),
        (input.personaTrait ?? '').trim(),
        chapter1Enc,
        now
      );
  }

  async getUserBasicInfo(userId: string): Promise<ChapterOneData | null> {
    const row = this.db
      .prepare('SELECT chapter1_enc, nickname, occupation, persona_trait FROM user_profiles WHERE user_id = ?')
      .get(userId) as {
        chapter1_enc: string;
        nickname: string;
        occupation: string;
        persona_trait: string;
      } | undefined;
    if (!row) return null;
    const stored = decodePrivateJson<ChapterOneData>(userId, 'chapter1', row.chapter1_enc, {});
    if (stored && typeof stored === 'object' && (stored.nickname ?? '').trim()) {
      return sanitizeChapter1ForProfile(stored);
    }
    return {
      nickname: row.nickname ?? '',
      occupation: row.occupation ?? '',
      personaTrait: row.persona_trait ?? '',
    };
  }

  async getDeviceBasicInfo(
    deviceId: string,
    formatDossierRowFn: (row: any) => { chapter1?: ChapterOneData }
  ): Promise<ChapterOneData | null> {
    if (!deviceId) return null;
    const row = this.db
      .prepare(
        `SELECT * FROM dossiers
         WHERE device_id = ? AND user_id IS NULL AND trim(coalesce(nickname, '')) != ''
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(deviceId);
    if (row) {
      const ch1 = formatDossierRowFn(row).chapter1;
      if (ch1 && (ch1.nickname ?? '').trim()) return sanitizeChapter1ForProfile(ch1);
    }
    return null;
  }

  async hasUserBasicInfo(userId: string): Promise<boolean> {
    const rows = this.db
      .prepare(
        `SELECT 1 AS c FROM user_profiles WHERE user_id = ? AND trim(nickname) != ''
         UNION ALL
         SELECT 1 AS c FROM dossiers WHERE user_id = ? AND trim(nickname) != ''
         LIMIT 1`
      )
      .all(userId, userId);
    return rows.length > 0;
  }

  async updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE users SET password_hash = ?, token_invalidated_at = ? WHERE id = ?')
      .run(newPasswordHash, now, userId);
  }

  async softDeleteUser(userId: string): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare("UPDATE users SET deleted_at = ?, token_invalidated_at = ?, account_status = 'deleted' WHERE id = ? AND deleted_at IS NULL")
      .run(now, now, userId);
    this.db
      .prepare('UPDATE account_lineages SET current_user_id = NULL, updated_at = ? WHERE current_user_id = ?')
      .run(now, userId);
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    const user = this.db
      .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
      .get(userId) as UserRow | undefined;
    if (!user) return null;

    const dossierRow = this.db
      .prepare(
        `SELECT
           COUNT(*) as count,
           MAX(created_at) as last_at,
           (SELECT nickname FROM dossiers WHERE user_id = ? AND nickname IS NOT NULL AND nickname != '' ORDER BY created_at DESC LIMIT 1) as nickname,
           (SELECT avatar_urls FROM dossiers WHERE user_id = ? AND avatar_urls IS NOT NULL AND avatar_urls != '' ORDER BY created_at DESC LIMIT 1) as avatar_urls,
           (SELECT id FROM dossiers WHERE user_id = ? AND avatar_urls IS NOT NULL AND avatar_urls != '' ORDER BY created_at DESC LIMIT 1) as avatar_dossier_id
         FROM dossiers WHERE user_id = ?`
      )
      .get(userId, userId, userId, userId) as {
        count: number;
        last_at: string | null;
        nickname: string | null;
        avatar_urls: string | null;
        avatar_dossier_id: string | null;
      } | undefined;

    const avatarUrls = dossierRow?.avatar_dossier_id
      ? decodeJsonField<string[]>(dossierRow.avatar_dossier_id, 'avatar_urls', dossierRow.avatar_urls, [])
      : [];
    return {
      userId: user.id,
      email: user.email,
      nickname: dossierRow?.nickname ?? null,
      avatarUrls,
      dossierCount: dossierRow?.count ?? 0,
      lastDossierAt: dossierRow?.last_at ?? null,
      createdAt: user.created_at,
    };
  }

  async listAdminUsers(query: {
    search?: string;
    hasDossier?: 'all' | 'yes' | 'no';
    status?: 'all' | 'active' | 'deleted';
    sort?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<AdminUserListResult> {
    const limit = Math.max(1, Math.min(200, query.limit ?? 50));
    const offset = Math.max(0, query.offset ?? 0);
    const order = query.order === 'asc' ? 'ASC' : 'DESC';

    const totalRow = this.db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number } | undefined;
    const activeRow = this.db.prepare('SELECT COUNT(*) c FROM users WHERE deleted_at IS NULL').get() as { c: number } | undefined;
    const deletedRow = this.db.prepare('SELECT COUNT(*) c FROM users WHERE deleted_at IS NOT NULL').get() as { c: number } | undefined;
    const withDossierRow = this.db.prepare('SELECT COUNT(DISTINCT user_id) c FROM dossiers WHERE user_id IS NOT NULL').get() as { c: number } | undefined;
    const withoutDossierRow = this.db.prepare('SELECT COUNT(*) c FROM users u WHERE NOT EXISTS (SELECT 1 FROM dossiers d WHERE d.user_id = u.id) AND u.deleted_at IS NULL').get() as { c: number } | undefined;
    const registeredDossierRow = this.db.prepare('SELECT COUNT(*) c FROM dossiers WHERE user_id IS NOT NULL').get() as { c: number } | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status === 'active') {
      conditions.push('u.deleted_at IS NULL');
    } else if (query.status === 'deleted') {
      conditions.push('u.deleted_at IS NOT NULL');
    }

    if (query.hasDossier === 'yes') {
      conditions.push('EXISTS (SELECT 1 FROM dossiers d WHERE d.user_id = u.id)');
    } else if (query.hasDossier === 'no') {
      conditions.push('NOT EXISTS (SELECT 1 FROM dossiers d WHERE d.user_id = u.id)');
    }

    if (query.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      conditions.push(`(
        u.email LIKE ? OR 
        u.id LIKE ? OR 
        EXISTS (SELECT 1 FROM user_devices ud WHERE ud.user_id = u.id AND ud.device_id LIKE ?) OR
        EXISTS (SELECT 1 FROM dossiers d WHERE d.user_id = u.id AND (d.nickname LIKE ? OR d.occupation LIKE ?)) OR
        EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = u.id AND (up.nickname LIKE ? OR up.occupation LIKE ?))
      )`);
      params.push(term, term, term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = this.db.prepare(`SELECT COUNT(*) c FROM users u ${whereClause}`).get(...params) as { c: number } | undefined;
    const total = countRow?.c ?? 0;

    let orderField = 'u.created_at';
    if (query.sort === 'dossierCount') {
      orderField = 'dossier_count';
    } else if (query.sort === 'lastLoginAt') {
      orderField = 'last_login_at';
    } else if (query.sort === 'userBankCount') {
      orderField = 'user_bank_count';
    } else if (query.sort === 'taskCount') {
      orderField = 'task_count';
    }

    const sql = `
      SELECT 
        u.id,
        u.email,
        u.generation,
        u.created_at,
        u.deleted_at,
        (SELECT COUNT(*) FROM dossiers d WHERE d.user_id = u.id) as dossier_count,
        (SELECT MAX(d.created_at) FROM dossiers d WHERE d.user_id = u.id) as latest_dossier_at,
        COALESCE(
          (SELECT d.nickname FROM dossiers d WHERE d.user_id = u.id ORDER BY d.created_at DESC LIMIT 1),
          (SELECT up.nickname FROM user_profiles up WHERE up.user_id = u.id)
        ) as latest_nickname,
        COALESCE(
          (SELECT d.occupation FROM dossiers d WHERE d.user_id = u.id ORDER BY d.created_at DESC LIMIT 1),
          (SELECT up.occupation FROM user_profiles up WHERE up.user_id = u.id)
        ) as latest_occupation,
        COALESCE(
          (SELECT d.persona_trait FROM dossiers d WHERE d.user_id = u.id ORDER BY d.created_at DESC LIMIT 1),
          (SELECT up.persona_trait FROM user_profiles up WHERE up.user_id = u.id)
        ) as latest_persona_trait,
        (SELECT d.depth_rating FROM dossiers d WHERE d.user_id = u.id ORDER BY d.created_at DESC LIMIT 1) as latest_depth_rating,
        (SELECT COUNT(*) FROM user_devices ud WHERE ud.user_id = u.id) as device_count,
        (SELECT MAX(ud.last_login_at) FROM user_devices ud WHERE ud.user_id = u.id) as last_login_at,
        (SELECT COUNT(*) FROM user_banks ub WHERE ub.user_id = u.id) as user_bank_count,
        (SELECT COUNT(*) FROM user_tasks ut WHERE ut.user_id = u.id) as task_count,
        (SELECT COUNT(*) FROM echo_whispers ew WHERE ew.user_id = u.id) as echo_count
      FROM users u
      ${whereClause}
      ORDER BY ${orderField} ${order}
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(sql).all(...params, limit, offset) as any[];

    const userIds = rows.map((r) => r.id);
    const deviceMap: Record<string, string[]> = {};
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const devRows = this.db
        .prepare(`SELECT user_id, device_id FROM user_devices WHERE user_id IN (${placeholders})`)
        .all(...userIds) as { user_id: string; device_id: string }[];
      for (const dr of devRows) {
        if (!deviceMap[dr.user_id]) deviceMap[dr.user_id] = [];
        deviceMap[dr.user_id].push(dr.device_id);
      }
    }

    const items: AdminUserSummary[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      generation: r.generation ?? 1,
      createdAt: r.created_at,
      deletedAt: r.deleted_at ?? null,
      lastLoginAt: r.last_login_at ?? null,
      deviceCount: r.device_count ?? 0,
      devices: deviceMap[r.id] ?? [],
      dossierCount: r.dossier_count ?? 0,
      latestNickname: r.latest_nickname ?? null,
      latestOccupation: r.latest_occupation ?? null,
      latestPersonaTrait: r.latest_persona_trait ?? null,
      latestDepthRating: r.latest_depth_rating ?? null,
      latestDossierAt: r.latest_dossier_at ?? null,
      userBankCount: r.user_bank_count ?? 0,
      taskCount: r.task_count ?? 0,
      echoCount: r.echo_count ?? 0,
    }));

    return {
      items,
      total,
      stats: {
        totalUsers: totalRow?.c ?? 0,
        activeUsers: activeRow?.c ?? 0,
        deletedUsers: deletedRow?.c ?? 0,
        withDossierCount: withDossierRow?.c ?? 0,
        withoutDossierCount: withoutDossierRow?.c ?? 0,
        totalRegisteredDossiers: registeredDossierRow?.c ?? 0,
      },
    };
  }

  async getAdminUserDetails(
    userId: string,
    resolveBankNamesFn: (bankIds: string[]) => Promise<Record<string, string>>
  ): Promise<AdminUserDetails | null> {
    const userRow = this.db
      .prepare('SELECT id, email, generation, created_at, deleted_at, token_invalidated_at FROM users WHERE id = ?')
      .get(userId) as any;
    if (!userRow) return null;

    let basicInfo = await this.getUserBasicInfo(userId);

    // 用户管理弹窗需要展示第一章登记照片；普通 /me 基础信息出于性能会剥离
    // 大图（sanitizeChapter1ForProfile），这里从最新卷宗补回解密后的照片。
    const avatarRow = this.db
      .prepare(
        `SELECT id, nickname, occupation, persona_trait, avatar_urls
         FROM dossiers
         WHERE user_id = ? AND avatar_urls IS NOT NULL AND avatar_urls != ''
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(userId) as {
        id: string;
        nickname: string;
        occupation: string;
        persona_trait: string;
        avatar_urls: string;
      } | undefined;

    const avatarUrls = avatarRow
      ? decodeJsonField<string[]>(avatarRow.id, 'avatar_urls', avatarRow.avatar_urls, [])
      : [];

    if (!basicInfo && avatarRow) {
      basicInfo = {
        nickname: avatarRow.nickname ?? '',
        occupation: avatarRow.occupation ?? '',
        personaTrait: avatarRow.persona_trait ?? '',
        avatarUrls,
      };
    } else if (basicInfo) {
      basicInfo = { ...basicInfo, avatarUrls };
    }

    const devices = this.db
      .prepare('SELECT device_id, last_login_at, created_at FROM user_devices WHERE user_id = ? ORDER BY last_login_at DESC')
      .all(userId) as { device_id: string; last_login_at: string; created_at: string }[];

    const dossiers = this.db
      .prepare('SELECT id, nickname, occupation, persona_trait, depth_rating, selected_shadow_tags, audit_status, bank_ids, created_at FROM dossiers WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as any[];

    const banks = this.db
      .prepare('SELECT id, title, subtitle, questions_json, is_published, audit_status, created_at, updated_at FROM user_banks WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as any[];

    const tasks = this.db
      .prepare('SELECT id, task_id, status, accepted_at, completed_at FROM user_tasks WHERE user_id = ? ORDER BY accepted_at DESC')
      .all(userId) as any[];

    const echoes = this.db
      .prepare('SELECT id, surface_role, shadow_desire, shadow_tag, echo_count, audit_status, created_at FROM echo_whispers WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as any[];

    const dossierBankIds = dossiers.flatMap((d) =>
      (d.bank_ids ?? '').split(',').map((id: string) => id.trim()).filter(Boolean)
    );
    const bankNames = await resolveBankNamesFn(dossierBankIds);

    return {
      user: {
        id: userRow.id,
        email: userRow.email,
        generation: userRow.generation ?? 1,
        createdAt: userRow.created_at,
        deletedAt: userRow.deleted_at ?? null,
        tokenInvalidatedAt: userRow.token_invalidated_at ?? null,
      },
      basicInfo,
      devices: devices.map((d) => ({
        deviceId: d.device_id,
        lastLoginAt: d.last_login_at,
        createdAt: d.created_at,
      })),
      dossiers: dossiers.map((d) => ({
        id: d.id,
        nickname: d.nickname,
        occupation: d.occupation,
        personaTrait: d.persona_trait,
        depthRating: d.depth_rating,
        bankIds: d.bank_ids ?? '',
        createdAt: d.created_at,
        auditStatus: d.audit_status,
        selectedShadowTags: safeJsonParse<string[]>(d.selected_shadow_tags, []),
      })),
      banks: banks.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        questionCount: safeJsonParse<any[]>(b.questions_json, []).length,
        isPublished: b.is_published === 1,
        auditStatus: b.audit_status,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        taskId: t.task_id,
        status: t.status,
        acceptedAt: t.accepted_at,
        completedAt: t.completed_at,
      })),
      echoes: echoes.map((e) => ({
        id: e.id,
        surfaceRole: e.surface_role,
        shadowDesire: e.shadow_desire,
        shadowTag: e.shadow_tag,
        echoCount: e.echo_count,
        auditStatus: e.audit_status,
        createdAt: e.created_at,
      })),
      bankNames,
    };
  }

  async deleteAdminUser(userId: string): Promise<boolean> {
    const now = new Date().toISOString();
    this.db
      .prepare("UPDATE users SET deleted_at = ?, token_invalidated_at = ?, account_status = 'deleted' WHERE id = ?")
      .run(now, now, userId);
    this.db
      .prepare('UPDATE account_lineages SET current_user_id = NULL, updated_at = ? WHERE current_user_id = ?')
      .run(now, userId);
    return true;
  }

  getAccountLineage(lineageId: string): AccountLineageSummary | null {
    const row = this.db
      .prepare('SELECT * FROM account_lineages WHERE id = ?')
      .get(lineageId) as any;
    if (!row) return null;
    return {
      id: row.id,
      rootKey: row.root_key,
      firstRegisteredAt: row.first_registered_at,
      lastActiveAt: row.last_active_at,
      totalGenerations: row.total_generations,
      currentUserId: row.current_user_id,
      riskLevel: row.risk_level,
      isBlocked: row.is_blocked,
      adminNotes: row.admin_notes,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getAccountLineageByRootKey(rootKey: string): AccountLineageSummary | null {
    const target = (rootKey || '').trim().toLowerCase();
    const row = this.db
      .prepare('SELECT * FROM account_lineages WHERE root_key = ?')
      .get(target) as any;
    if (!row) return null;
    return {
      id: row.id,
      rootKey: row.root_key,
      firstRegisteredAt: row.first_registered_at,
      lastActiveAt: row.last_active_at,
      totalGenerations: row.total_generations,
      currentUserId: row.current_user_id,
      riskLevel: row.risk_level,
      isBlocked: row.is_blocked,
      adminNotes: row.admin_notes,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getLineageGenerations(lineageId: string): UserRow[] {
    return this.db
      .prepare('SELECT * FROM users WHERE lineage_id = ? ORDER BY generation ASC')
      .all(lineageId) as UserRow[];
  }

  updateLineageRisk(
    lineageId: string,
    input: { riskLevel?: string; isBlocked?: number; adminNotes?: string; remark?: string }
  ): boolean {
    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (input.riskLevel !== undefined) {
      updates.push('risk_level = ?');
      params.push(input.riskLevel);
    }
    if (input.isBlocked !== undefined) {
      updates.push('is_blocked = ?');
      params.push(input.isBlocked ? 1 : 0);
    }
    if (input.adminNotes !== undefined) {
      updates.push('admin_notes = ?');
      params.push(input.adminNotes);
    }
    if (input.remark !== undefined) {
      updates.push('remark = ?');
      params.push(input.remark);
    }
    params.push(lineageId);

    const result = this.db
      .prepare(`UPDATE account_lineages SET ${updates.join(', ')} WHERE id = ?`)
      .run(...params);
    return result.changes > 0;
  }
}
