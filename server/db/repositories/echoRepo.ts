import type Database from 'better-sqlite3';
import type {
  EchoWhisperContract,
  AdminEchoWhisperContract,
  EchoAuditStatus,
} from '../../../shared/apiContracts.js';
import { fuzzCount } from '../helpers.js';

export interface EchoWhisperRowDb {
  id: string;
  user_id: string | null;
  device_id: string;
  surface_role: string;
  shadow_desire: string;
  shadow_tag: string;
  echo_count: number;
  audit_status: string;
  admin_notes?: string | null;
  remark?: string | null;
  created_at: string;
}

export class EchoRepo {
  constructor(private db: Database.Database) {}

  async listApprovedEchoes(
    deviceId?: string | null,
    tag?: string | null,
    limit = 30,
    offset = 0,
    userId?: string | null
  ): Promise<{ items: EchoWhisperContract[]; hasMore: boolean }> {
    const safeLimit = Math.max(1, Math.min(100, limit));
    const safeOffset = Math.max(0, offset);

    let sql = `SELECT * FROM echo_whispers WHERE audit_status = 'approved'`;
    const params: unknown[] = [];

    if (tag && tag !== 'all') {
      sql += ` AND shadow_tag = ?`;
      params.push(tag);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(safeLimit + 1, safeOffset);

    const rows = this.db.prepare(sql).all(...params) as EchoWhisperRowDb[];
    const hasMore = rows.length > safeLimit;
    const items = rows.slice(0, safeLimit);

    // 「已共鸣」只认账号归属：登录态按 user_id，设备仅用于未绑定账号的匿名记录。
    let resonatedSet = new Set<string>();
    if (items.length > 0 && (userId || deviceId)) {
      const identitySql = userId
        ? (deviceId ? '(user_id = ? OR (user_id IS NULL AND device_id = ?))' : 'user_id = ?')
        : '(user_id IS NULL AND device_id = ?)';
      const identityParams: unknown[] = userId
        ? (deviceId ? [userId, deviceId] : [userId])
        : [deviceId];
      const placeholders = items.map(() => '?').join(',');
      const ids = items.map((r) => r.id);
      const resRows = this.db
        .prepare(`SELECT echo_id FROM echo_resonances WHERE ${identitySql} AND echo_id IN (${placeholders})`)
        .all(...identityParams, ...ids) as { echo_id: string }[];
      resonatedSet = new Set(resRows.map((r) => r.echo_id));
    }

    const contracts: EchoWhisperContract[] = items.map((r) => ({
      id: r.id,
      surfaceRole: r.surface_role,
      shadowDesire: r.shadow_desire,
      shadowTag: r.shadow_tag,
      fuzzedEchoes: `${fuzzCount(r.echo_count)} 灵魂共鸣`,
      echoCount: r.echo_count,
      isResonated: resonatedSet.has(r.id),
      isPreset: r.device_id === 'system_preset',
      // 「我的」只按账号归属判定；只有未绑定账号的匿名记录才回落到设备归属。
      isMine: r.user_id ? r.user_id === userId : !!deviceId && r.device_id === deviceId,
      auditStatus: r.audit_status as EchoAuditStatus,
      createdAt: r.created_at,
    }));

    return { items: contracts, hasMore };
  }

  async listMyPendingEchoes(deviceId: string, userId?: string | null): Promise<EchoWhisperContract[]> {
    // 登录态只认账号归属；device_id 只匹配未绑定账号的匿名遗留。
    const conditions: string[] = ['(user_id IS NULL AND device_id = ?)'];
    const params: unknown[] = [deviceId];
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    const sql = `SELECT * FROM echo_whispers WHERE audit_status = 'pending' AND (${conditions.join(' OR ')}) ORDER BY created_at DESC LIMIT 10`;

    const rows = this.db.prepare(sql).all(...params) as EchoWhisperRowDb[];
    return rows.map((r) => ({
      id: r.id,
      surfaceRole: r.surface_role,
      shadowDesire: r.shadow_desire,
      shadowTag: r.shadow_tag,
      fuzzedEchoes: `${fuzzCount(r.echo_count)} 灵魂共鸣`,
      echoCount: r.echo_count,
      isResonated: false,
      isMine: true,
      auditStatus: 'pending',
      createdAt: r.created_at,
    }));
  }

  async createEchoWhisper(payload: {
    deviceId: string;
    userId?: string | null;
    surfaceRole: string;
    shadowDesire: string;
    shadowTag: string;
  }): Promise<EchoWhisperContract> {
    const countConditions: string[] = ['(user_id IS NULL AND device_id = ?)'];
    const countParams: unknown[] = [payload.deviceId];
    if (payload.userId) {
      countConditions.push('user_id = ?');
      countParams.push(payload.userId);
    }
    const countSql = `SELECT COUNT(*) c FROM echo_whispers WHERE (${countConditions.join(' OR ')}) AND datetime(created_at) > datetime('now', '-24 hours')`;

    const countRow = this.db.prepare(countSql).get(...countParams) as { c: number } | undefined;
    if ((countRow?.c ?? 0) >= 2) {
      throw new Error('24小时内最多投掷 2 条心声，让思绪沉淀一下吧。');
    }

    const id = `echo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const insertTx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO echo_whispers (id, user_id, device_id, surface_role, shadow_desire, shadow_tag, echo_count, audit_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 'pending', ?)`
        )
        .run(
          id,
          payload.userId ?? null,
          payload.deviceId,
          payload.surfaceRole.trim(),
          payload.shadowDesire.trim(),
          payload.shadowTag.trim(),
          now
        );
    });
    insertTx();

    return {
      id,
      surfaceRole: payload.surfaceRole.trim(),
      shadowDesire: payload.shadowDesire.trim(),
      shadowTag: payload.shadowTag.trim(),
      fuzzedEchoes: '1 灵魂共鸣',
      echoCount: 1,
      isResonated: false,
      isMine: true,
      auditStatus: 'pending',
      createdAt: now,
    };
  }

  async resonateEchoWhisper(
    echoId: string,
    deviceId: string,
    userId?: string | null
  ): Promise<{ echoCount: number; fuzzedEchoes: string; isResonated: boolean }> {
    // 共鸣状态同样只认账号归属；登录态下同一设备上旧账号的共鸣记录不可见、不可取消。
    const existingSql = userId
      ? `SELECT id FROM echo_resonances
         WHERE echo_id = ? AND (user_id = ? OR (user_id IS NULL AND device_id = ?))
         ORDER BY (user_id IS NULL) ASC, created_at ASC LIMIT 1`
      : `SELECT id FROM echo_resonances
         WHERE echo_id = ? AND (user_id IS NULL AND device_id = ?)
         ORDER BY created_at ASC LIMIT 1`;
    const existing = this.db
      .prepare(existingSql)
      .get(...(userId ? [echoId, userId, deviceId] : [echoId, deviceId])) as { id: string } | undefined;

    if (existing) {
      const cancelTx = this.db.transaction(() => {
        this.db.prepare('DELETE FROM echo_resonances WHERE id = ?').run(existing.id);
        this.db.prepare('UPDATE echo_whispers SET echo_count = MAX(1, echo_count - 1) WHERE id = ?').run(echoId);
      });
      cancelTx();

      const updated = this.db
        .prepare('SELECT echo_count FROM echo_whispers WHERE id = ?')
        .get(echoId) as { echo_count: number } | undefined;
      const finalCount = updated?.echo_count ?? 1;
      return {
        echoCount: finalCount,
        fuzzedEchoes: `${fuzzCount(finalCount)} 灵魂共鸣`,
        isResonated: false,
      };
    }

    const resId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const addTx = this.db.transaction(() => {
      this.db
        .prepare('INSERT INTO echo_resonances (id, echo_id, device_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(resId, echoId, deviceId, userId ?? null, now);
      this.db.prepare('UPDATE echo_whispers SET echo_count = echo_count + 1 WHERE id = ?').run(echoId);
    });
    addTx();

    const updated = this.db
      .prepare('SELECT echo_count FROM echo_whispers WHERE id = ?')
      .get(echoId) as { echo_count: number } | undefined;
    const finalCount = updated?.echo_count ?? 1;
    return {
      echoCount: finalCount,
      fuzzedEchoes: `${fuzzCount(finalCount)} 灵魂共鸣`,
      isResonated: true,
    };
  }

  async deleteEchoWhisper(echoId: string, deviceId: string, userId?: string | null): Promise<boolean> {
    const conditions: string[] = ['(user_id IS NULL AND device_id = ?)'];
    const params: unknown[] = [echoId, deviceId];
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    const sql = `DELETE FROM echo_whispers WHERE id = ? AND (${conditions.join(' OR ')})`;

    const deleteTx = this.db.transaction(() => {
      const info = this.db.prepare(sql).run(...params);
      if (info.changes > 0) {
        this.db.prepare('DELETE FROM echo_resonances WHERE echo_id = ?').run(echoId);
      }
      return info.changes > 0;
    });
    return deleteTx();
  }

  async listAdminEchoes(query: {
    status?: string;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: AdminEchoWhisperContract[]; total: number }> {
    const limit = Math.max(1, Math.min(200, query.limit ?? 50));
    const offset = Math.max(0, query.offset ?? 0);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status && query.status !== 'all') {
      conditions.push('audit_status = ?');
      params.push(query.status);
    }
    if (query.tag && query.tag !== 'all') {
      conditions.push('shadow_tag = ?');
      params.push(query.tag);
    }
    if (query.search && query.search.trim()) {
      conditions.push('(surface_role LIKE ? OR shadow_desire LIKE ?)');
      params.push(`%${query.search.trim()}%`, `%${query.search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) c FROM echo_whispers ${whereClause}`)
      .get(...params) as { c: number } | undefined;
    const rows = this.db
      .prepare(`SELECT * FROM echo_whispers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as EchoWhisperRowDb[];

    const items: AdminEchoWhisperContract[] = rows.map((r) => ({
      id: r.id,
      surfaceRole: r.surface_role,
      shadowDesire: r.shadow_desire,
      shadowTag: r.shadow_tag,
      echoCount: r.echo_count,
      auditStatus: r.audit_status as EchoAuditStatus,
      createdAt: r.created_at,
      deviceId: r.device_id,
      userId: r.user_id,
      adminNotes: r.admin_notes ?? null,
      remark: r.remark ?? null,
    }));

    return { items, total: totalRow?.c ?? 0 };
  }

  async updateAdminEchoStatus(
    id: string,
    auditStatus: EchoAuditStatus,
    options?: { adminNotes?: string; remark?: string }
  ): Promise<boolean> {
    const updates: string[] = ['audit_status = ?'];
    const params: unknown[] = [auditStatus];

    if (options?.adminNotes !== undefined) {
      updates.push('admin_notes = ?');
      params.push(options.adminNotes);
    }
    if (options?.remark !== undefined) {
      updates.push('remark = ?');
      params.push(options.remark);
    }
    params.push(id);

    const info = this.db.prepare(`UPDATE echo_whispers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return info.changes > 0;
  }

  async batchDeleteEchoes(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const batchTx = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM echo_resonances WHERE echo_id IN (${placeholders})`).run(...ids);
      return this.db.prepare(`DELETE FROM echo_whispers WHERE id IN (${placeholders})`).run(...ids).changes;
    });
    return batchTx();
  }

  async getPendingAuditCounts(): Promise<{ banks: number; echoes: number }> {
    const bankRow = this.db
      .prepare("SELECT COUNT(*) as c FROM user_banks WHERE audit_status = 'pending'")
      .get() as { c: number } | undefined;
    const echoRow = this.db
      .prepare("SELECT COUNT(*) as c FROM echo_whispers WHERE audit_status = 'pending'")
      .get() as { c: number } | undefined;
    return {
      banks: bankRow?.c ?? 0,
      echoes: echoRow?.c ?? 0,
    };
  }
}
