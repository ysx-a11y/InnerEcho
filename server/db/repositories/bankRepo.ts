import type Database from 'better-sqlite3';
import type {
  UserBankSummary,
  UserBankRecord,
  AdminBankSummary,
  AdminBankDetail,
  AdminBankListResult,
  UserBankAuditStatus,
} from '../../types.js';
import { genId, safeJsonParse } from '../helpers.js';
import { getPresetBankSummaries, getPresetBankById } from '../../presetBanks.js';

export interface UserBankRow {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  badge_color: string | null;
  estimated_minutes: number | null;
  questions_json: string;
  is_published: number;
  audit_status: string;
  created_at: string;
  updated_at: string;
}

export interface UserBankWithUserRow extends UserBankRow {
  user_email?: string | null;
}

export class BankRepo {
  constructor(private db: Database.Database) {}

  formatUserBankSummary(row: UserBankRow): UserBankSummary {
    const questions = safeJsonParse<unknown[]>(row.questions_json, []);
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      subtitle: row.subtitle ?? '',
      description: row.description ?? '',
      category: (row.category ?? 'direct') as 'scientific' | 'direct' | 'scenario' | 'preference',
      badgeColor: row.badge_color,
      estimatedMinutes: row.estimated_minutes,
      questionCount: Array.isArray(questions) ? questions.length : 0,
      isPublished: row.is_published === 1,
      auditStatus: (row.audit_status ?? 'draft') as UserBankAuditStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  formatUserBankRecord(row: UserBankRow): UserBankRecord {
    const questions = safeJsonParse<unknown[]>(row.questions_json, []);
    return {
      ...this.formatUserBankSummary(row),
      questions: Array.isArray(questions) ? questions : [],
    };
  }

  async createUserBank(input: {
    userId: string;
    title: string;
    subtitle?: string;
    description?: string;
    category?: 'scientific' | 'direct' | 'scenario' | 'preference';
    badgeColor?: string | null;
    estimatedMinutes?: number | null;
    questions: unknown[];
    isPublished?: boolean;
  }): Promise<{ id: string; createdAt: string; updatedAt: string }> {
    const id = genId('ubk');
    const now = new Date().toISOString();
    const auditStatus: UserBankAuditStatus = input.isPublished ? 'pending' : 'draft';
    this.db
      .prepare(
        `INSERT INTO user_banks (id, user_id, title, subtitle, description, category, badge_color, estimated_minutes, questions_json, is_published, audit_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.userId,
        input.title,
        input.subtitle ?? '',
        input.description ?? '',
        input.category ?? 'direct',
        input.badgeColor ?? null,
        input.estimatedMinutes ?? null,
        JSON.stringify(input.questions),
        0,
        auditStatus,
        now,
        now
      );
    return { id, createdAt: now, updatedAt: now };
  }

  async getUserBanks(userId: string): Promise<UserBankSummary[]> {
    const rows = this.db
      .prepare('SELECT * FROM user_banks WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as UserBankRow[];
    return rows.map((r) => this.formatUserBankSummary(r));
  }

  async getUserBankById(id: string, userId: string): Promise<UserBankRecord | null> {
    const row = this.db
      .prepare('SELECT * FROM user_banks WHERE id = ? AND user_id = ?')
      .get(id, userId) as UserBankRow | undefined;
    if (!row) return null;
    return this.formatUserBankRecord(row);
  }

  async getPublishedUserBanks(): Promise<UserBankSummary[]> {
    const rows = this.db
      .prepare("SELECT * FROM user_banks WHERE is_published = 1 AND audit_status = 'approved' ORDER BY updated_at DESC")
      .all() as UserBankRow[];
    return rows.map((r) => this.formatUserBankSummary(r));
  }

  async getPublishedUserBankById(id: string): Promise<UserBankRecord | null> {
    const row = this.db
      .prepare("SELECT * FROM user_banks WHERE id = ? AND is_published = 1 AND audit_status = 'approved'")
      .get(id) as UserBankRow | undefined;
    if (!row) return null;
    return this.formatUserBankRecord(row);
  }

  async updateUserBank(
    id: string,
    userId: string,
    patch: {
      title?: string;
      subtitle?: string;
      description?: string;
      category?: 'scientific' | 'direct' | 'scenario' | 'preference';
      badgeColor?: string | null;
      estimatedMinutes?: number | null;
      questions?: unknown[];
      isPublished?: boolean;
    }
  ): Promise<boolean> {
    const current = this.db
      .prepare('SELECT * FROM user_banks WHERE id = ? AND user_id = ?')
      .get(id, userId) as UserBankRow | undefined;
    if (!current) return false;

    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.title !== undefined) { sets.push('title = ?'); params.push(patch.title); }
    if (patch.subtitle !== undefined) { sets.push('subtitle = ?'); params.push(patch.subtitle); }
    if (patch.description !== undefined) { sets.push('description = ?'); params.push(patch.description); }
    if (patch.category !== undefined) { sets.push('category = ?'); params.push(patch.category); }
    if (patch.badgeColor !== undefined) { sets.push('badge_color = ?'); params.push(patch.badgeColor); }
    if (patch.estimatedMinutes !== undefined) { sets.push('estimated_minutes = ?'); params.push(patch.estimatedMinutes); }
    if (patch.questions !== undefined) { sets.push('questions_json = ?'); params.push(JSON.stringify(patch.questions)); }
    if (patch.isPublished !== undefined) {
      sets.push('is_published = ?'); params.push(0);
      sets.push('audit_status = ?'); params.push('pending');
    } else if (
      current.audit_status === 'approved' &&
      (patch.title !== undefined || patch.subtitle !== undefined || patch.description !== undefined ||
        patch.category !== undefined || patch.badgeColor !== undefined || patch.estimatedMinutes !== undefined ||
        patch.questions !== undefined)
    ) {
      sets.push('is_published = ?'); params.push(0);
      sets.push('audit_status = ?'); params.push('pending');
    }
    if (sets.length === 0) {
      return true;
    }
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id, userId);
    const info = this.db.prepare(`UPDATE user_banks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
    return info.changes > 0;
  }

  async deleteUserBank(id: string, userId: string): Promise<boolean> {
    const info = this.db.prepare('DELETE FROM user_banks WHERE id = ? AND user_id = ?').run(id, userId);
    return info.changes > 0;
  }

  async listAdminBanks(query: {
    search?: string;
    category?: string;
    status?: string;
    source?: string;
    sort?: 'createdAt' | 'updatedAt' | 'title' | 'questionCount';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<AdminBankListResult> {
    const presetSummaries = getPresetBankSummaries();
    const presetQuestionTotal = presetSummaries.reduce((sum, b) => sum + b.questionCount, 0);

    const statsRow = this.db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN audit_status = 'draft' THEN 1 ELSE 0 END), 0) AS drafts,
           COALESCE(SUM(CASE WHEN audit_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
           COALESCE(SUM(CASE WHEN audit_status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
           COALESCE(SUM(CASE WHEN audit_status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected,
           COALESCE(SUM(is_published), 0) AS published,
           COALESCE(SUM(json_array_length(questions_json)), 0) AS questions
         FROM user_banks`
      )
      .get() as {
        total: number;
        drafts: number;
        pending: number;
        approved: number;
        rejected: number;
        published: number;
        questions: number;
      } | undefined;

    const customStats = statsRow ?? {
      total: 0, drafts: 0, pending: 0, approved: 0, rejected: 0, published: 0, questions: 0,
    };

    const stats = {
      totalBanks: presetSummaries.length + customStats.total,
      publishedCount: presetSummaries.length + customStats.published,
      draftCount: customStats.drafts,
      pendingCount: customStats.pending,
      rejectedCount: customStats.rejected,
      presetCount: presetSummaries.length,
      customCount: customStats.total,
      totalQuestions: presetQuestionTotal + customStats.questions,
    };

    const includePresets = query.source !== 'custom';
    const includeCustoms = query.source !== 'preset';

    const where: string[] = [];
    const params: unknown[] = [];
    const search = query.search?.trim();
    if (search) {
      where.push('(ub.title LIKE ? OR ub.subtitle LIKE ? OR ub.description LIKE ? OR ub.id LIKE ? OR u.email LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    if (query.category && query.category !== 'all') {
      where.push('ub.category = ?');
      params.push(query.category);
    }
    if (query.status && query.status !== 'all') {
      where.push('ub.audit_status = ?');
      params.push(query.status);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    let filteredPresets = presetSummaries;
    if (includePresets) {
      if (search) {
        const q = search.toLowerCase();
        filteredPresets = filteredPresets.filter((b) =>
          b.title.toLowerCase().includes(q) ||
          b.subtitle.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.userEmail ?? '').toLowerCase().includes(q)
        );
      }
      if (query.category && query.category !== 'all') {
        filteredPresets = filteredPresets.filter((b) => b.category === query.category);
      }
      if (query.status && query.status !== 'all') {
        filteredPresets = filteredPresets.filter((b) => b.auditStatus === query.status);
      }
    }

    const countRow = this.db
      .prepare(`SELECT COUNT(*) AS c FROM user_banks ub LEFT JOIN users u ON ub.user_id = u.id ${whereSql}`)
      .get(...params) as { c: number } | undefined;
    const customTotal = countRow?.c ?? 0;

    const sortKey = query.sort ?? 'updatedAt';
    const isAsc = query.order === 'asc';
    const direction = isAsc ? 'ASC' : 'DESC';
    const sortCol = sortKey === 'createdAt'
      ? 'ub.created_at'
      : sortKey === 'title'
        ? 'ub.title'
        : sortKey === 'questionCount'
          ? 'COALESCE(json_array_length(ub.questions_json), 0)'
          : 'ub.updated_at';

    const offset = Math.max(0, query.offset ?? 0);
    const limit = Math.max(1, Math.min(query.limit ?? 50, 200));
    const fetchLimit = includeCustoms ? limit + (includePresets ? filteredPresets.length : 0) : 0;
    const rows = includeCustoms
      ? (this.db
          .prepare(
            `SELECT ub.*, u.email AS user_email
             FROM user_banks ub
             LEFT JOIN users u ON ub.user_id = u.id
             ${whereSql}
             ORDER BY ${sortCol} ${direction}
             LIMIT ? OFFSET ?`
          )
          .all(...params, fetchLimit, offset) as UserBankWithUserRow[])
      : [];

    const customSummaries: AdminBankSummary[] = rows.map((r) => {
      const questions = safeJsonParse<unknown[]>(r.questions_json, []);
      return {
        id: r.id,
        userId: r.user_id,
        userEmail: r.user_email ?? null,
        title: r.title,
        subtitle: r.subtitle ?? '',
        description: r.description ?? '',
        category: (r.category === 'scenario' || r.category === 'scientific' || r.category === 'preference' ? r.category : 'direct'),
        badgeColor: r.badge_color,
        estimatedMinutes: r.estimated_minutes,
        questionCount: Array.isArray(questions) ? questions.length : 0,
        isPublished: r.is_published === 1,
        auditStatus: (r.audit_status ?? 'draft') as UserBankAuditStatus,
        isBuiltin: false,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    let combined = includePresets ? [...filteredPresets, ...customSummaries] : customSummaries;
    if (includePresets && combined.length > 1) {
      combined = combined.sort((a, b) => {
        let valA: string | number = a[sortKey] ?? '';
        let valB: string | number = b[sortKey] ?? '';
        if (typeof valA === 'string' && typeof valB === 'string') {
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return isAsc ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
      });
    }

    const items = combined.slice(0, limit);
    const total = (includePresets ? filteredPresets.length : 0) + customTotal;

    return { total, items, stats };
  }

  async getAdminBankById(id: string): Promise<AdminBankDetail | null> {
    const preset = getPresetBankById(id);
    if (preset) return preset;

    const row = this.db
      .prepare(
        `SELECT ub.*, u.email as user_email
         FROM user_banks ub
         LEFT JOIN users u ON ub.user_id = u.id
         WHERE ub.id = ?`
      )
      .get(id) as UserBankWithUserRow | undefined;
    if (!row) return null;

    const questions = safeJsonParse<unknown[]>(row.questions_json, []);
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email ?? null,
      title: row.title,
      subtitle: row.subtitle ?? '',
      description: row.description ?? '',
      category: (row.category === 'scenario' || row.category === 'scientific' || row.category === 'preference' ? row.category : 'direct'),
      badgeColor: row.badge_color,
      estimatedMinutes: row.estimated_minutes,
      questionCount: Array.isArray(questions) ? questions.length : 0,
      isPublished: row.is_published === 1,
      auditStatus: (row.audit_status ?? 'draft') as UserBankAuditStatus,
      isBuiltin: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      questions: Array.isArray(questions) ? questions : [],
    };
  }

  async createAdminBank(input: {
    title: string;
    subtitle?: string;
    description?: string;
    category?: 'scientific' | 'direct' | 'scenario' | 'preference';
    badgeColor?: string | null;
    estimatedMinutes?: number | null;
    questions?: unknown[];
    isPublished?: boolean;
    userId?: string | null;
  }): Promise<AdminBankDetail> {
    const id = `ubk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const userId = input.userId ?? 'system_admin';
    const questions = input.questions ?? [];
    const auditStatus: UserBankAuditStatus = input.isPublished ? 'approved' : 'draft';
    this.db
      .prepare(
        `INSERT INTO user_banks (id, user_id, title, subtitle, description, category, badge_color, estimated_minutes, questions_json, is_published, audit_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        userId,
        input.title,
        input.subtitle ?? '',
        input.description ?? '',
        input.category ?? 'direct',
        input.badgeColor ?? null,
        input.estimatedMinutes ?? null,
        JSON.stringify(questions),
        input.isPublished ? 1 : 0,
        auditStatus,
        now,
        now
      );
    return {
      id,
      userId,
      userEmail: 'admin@innerecho.internal',
      title: input.title,
      subtitle: input.subtitle ?? '',
      description: input.description ?? '',
      category: input.category ?? 'direct',
      badgeColor: input.badgeColor ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      questionCount: questions.length,
      isPublished: Boolean(input.isPublished),
      auditStatus,
      isBuiltin: false,
      createdAt: now,
      updatedAt: now,
      questions,
    };
  }

  async updateAdminBank(
    id: string,
    patch: {
      title?: string;
      subtitle?: string;
      description?: string;
      category?: 'scientific' | 'direct' | 'scenario' | 'preference';
      badgeColor?: string | null;
      estimatedMinutes?: number | null;
      questions?: unknown[];
      isPublished?: boolean;
    }
  ): Promise<{ status: 'ok' | 'not_found' | 'preset'; bank?: AdminBankDetail }> {
    if (getPresetBankById(id)) {
      return { status: 'preset' };
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.title !== undefined) { sets.push('title = ?'); params.push(patch.title); }
    if (patch.subtitle !== undefined) { sets.push('subtitle = ?'); params.push(patch.subtitle); }
    if (patch.description !== undefined) { sets.push('description = ?'); params.push(patch.description); }
    if (patch.category !== undefined) { sets.push('category = ?'); params.push(patch.category); }
    if (patch.badgeColor !== undefined) { sets.push('badge_color = ?'); params.push(patch.badgeColor); }
    if (patch.estimatedMinutes !== undefined) { sets.push('estimated_minutes = ?'); params.push(patch.estimatedMinutes); }
    if (patch.questions !== undefined) { sets.push('questions_json = ?'); params.push(JSON.stringify(patch.questions)); }
    if (patch.isPublished !== undefined) {
      sets.push('is_published = ?'); params.push(patch.isPublished ? 1 : 0);
      sets.push('audit_status = ?'); params.push(patch.isPublished ? 'approved' : 'draft');
    }

    if (sets.length > 0) {
      sets.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      const info = this.db.prepare(`UPDATE user_banks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      if (info.changes === 0) return { status: 'not_found' };
    } else {
      const exists = this.db.prepare('SELECT COUNT(*) as c FROM user_banks WHERE id = ?').get(id) as { c: number } | undefined;
      if (!exists || exists.c === 0) return { status: 'not_found' };
    }

    const bank = await this.getAdminBankById(id);
    return { status: 'ok', bank: bank ?? undefined };
  }

  async toggleAdminBankPublish(id: string): Promise<{ status: 'ok' | 'not_found' | 'preset'; bank?: AdminBankDetail }> {
    if (getPresetBankById(id)) {
      return { status: 'preset' };
    }
    const now = new Date().toISOString();
    const info = this.db
      .prepare(
        `UPDATE user_banks SET
           is_published = CASE WHEN is_published = 1 THEN 0 ELSE 1 END,
           audit_status = CASE WHEN is_published = 1 THEN 'draft' ELSE 'approved' END,
           updated_at = ?
         WHERE id = ?`
      )
      .run(now, id);
    if (info.changes === 0) return { status: 'not_found' };
    const bank = await this.getAdminBankById(id);
    return { status: 'ok', bank: bank ?? undefined };
  }

  async setAdminBankAuditStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<{ status: 'ok' | 'not_found' | 'preset'; bank?: AdminBankDetail }> {
    if (getPresetBankById(id)) {
      return { status: 'preset' };
    }
    const now = new Date().toISOString();
    const info = this.db
      .prepare(
        `UPDATE user_banks SET
           audit_status = ?,
           is_published = CASE WHEN ? = 'approved' THEN 1 ELSE 0 END,
           updated_at = ?
         WHERE id = ?`
      )
      .run(status, status, now, id);
    if (info.changes === 0) return { status: 'not_found' };
    const bank = await this.getAdminBankById(id);
    return { status: 'ok', bank: bank ?? undefined };
  }

  async deleteAdminBank(id: string): Promise<'ok' | 'not_found' | 'preset'> {
    if (getPresetBankById(id)) {
      return 'preset';
    }
    const info = this.db.prepare('DELETE FROM user_banks WHERE id = ?').run(id);
    return info.changes > 0 ? 'ok' : 'not_found';
  }

  async resolveBankNames(bankIds: string[]): Promise<Record<string, string>> {
    const names: Record<string, string> = {};
    const ids = Array.from(new Set(bankIds.map((s) => s.trim()).filter(Boolean)));
    if (ids.length === 0) return names;
    const placeholders = ids.map(() => '?').join(',');
    const customRows = this.db
      .prepare(`SELECT id, title FROM user_banks WHERE id IN (${placeholders})`)
      .all(...ids) as { id: string; title: string }[];
    for (const row of customRows) names[row.id] = row.title;
    for (const id of ids) {
      if (!names[id]) {
        const preset = getPresetBankById(id);
        if (preset) names[id] = preset.title;
      }
    }
    return names;
  }
}
