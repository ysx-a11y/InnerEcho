import type Database from 'better-sqlite3';
import { genId } from '../helpers.js';

export interface WhisperMessageRow {
  id: string;
  user_id: string | null;
  device_id: string;
  nickname: string | null;
  contact_info: string | null;
  category: string;
  content: string;
  reply_content: string | null;
  replied_at: string | null;
  reply_admin_id: string | null;
  user_has_read_reply: number;
  created_at: string;
  deleted_at: string | null;
}

export interface WhisperMessage {
  id: string;
  userId: string | null;
  deviceId: string;
  nickname: string;
  contactInfo: string;
  category: string;
  content: string;
  replyContent: string | null;
  repliedAt: string | null;
  userHasReadReply: boolean;
  createdAt: string;
}

export function formatWhisperMessageRow(row: WhisperMessageRow): WhisperMessage {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    nickname: row.nickname || '匿名漫游者',
    contactInfo: row.contact_info || '',
    category: row.category || 'suggestion',
    content: row.content,
    replyContent: row.reply_content,
    repliedAt: row.replied_at,
    userHasReadReply: Boolean(row.user_has_read_reply),
    createdAt: row.created_at,
  };
}

export class WhisperMailboxRepo {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * 用户投递一条新的暗室密信
   */
  createMessage(params: {
    userId?: string | null;
    deviceId: string;
    nickname?: string | null;
    contactInfo?: string | null;
    category?: string;
    content: string;
  }): WhisperMessage {
    const id = genId('msg');
    const now = new Date().toISOString();
    const category = params.category || 'suggestion';

    const stmt = this.db.prepare(`
      INSERT INTO whisper_messages (
        id, user_id, device_id, nickname, contact_info, category, content,
        reply_content, replied_at, reply_admin_id, user_has_read_reply, created_at, deleted_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        NULL, NULL, NULL, 0, ?, NULL
      )
    `);

    stmt.run(
      id,
      params.userId || null,
      params.deviceId,
      params.nickname || null,
      params.contactInfo || null,
      category,
      params.content,
      now
    );

    return {
      id,
      userId: params.userId || null,
      deviceId: params.deviceId,
      nickname: params.nickname || '匿名漫游者',
      contactInfo: params.contactInfo || '',
      category,
      content: params.content,
      replyContent: null,
      repliedAt: null,
      userHasReadReply: false,
      createdAt: now,
    };
  }

  /**
   * 获取特定用户/设备收发的密信列表（仅本人与系统可见）
   */
  getMessagesForUser(params: { deviceId: string; userId?: string | null }): WhisperMessage[] {
    let rows: WhisperMessageRow[] = [];
    if (params.userId) {
      // 登录态只认账号归属：deviceId 仅用于匹配「未绑定账号」的匿名遗留，
      // 绝不把同一台浏览器上前一个账号（含已注销账号）的密信带给新账号。
      const stmt = this.db.prepare(`
        SELECT * FROM whisper_messages
        WHERE deleted_at IS NULL AND (user_id = ? OR (user_id IS NULL AND device_id = ?))
        ORDER BY created_at DESC
        LIMIT 50
      `);
      rows = stmt.all(params.userId, params.deviceId) as WhisperMessageRow[];
    } else {
      // 匿名访客只取未绑定账号的密信：同一台设备登出账号后，
      // 下一位访客不应读到前一位账号持有者的私信与主理人回信。
      // 口径与卷宗一致（匿名只统计 user_id IS NULL 的记录）。
      const stmt = this.db.prepare(`
        SELECT * FROM whisper_messages
        WHERE deleted_at IS NULL AND device_id = ? AND user_id IS NULL
        ORDER BY created_at DESC
        LIMIT 50
      `);
      rows = stmt.all(params.deviceId) as WhisperMessageRow[];
    }
    return rows.map(formatWhisperMessageRow);
  }

  /**
   * 检查用户是否有尚未查阅的管理员私密回信
   */
  hasUnreadReply(params: { deviceId: string; userId?: string | null }): boolean {
    const query = params.userId
      ? `SELECT 1 FROM whisper_messages WHERE deleted_at IS NULL AND (user_id = ? OR (user_id IS NULL AND device_id = ?)) AND reply_content IS NOT NULL AND user_has_read_reply = 0 LIMIT 1`
      : `SELECT 1 FROM whisper_messages WHERE deleted_at IS NULL AND device_id = ? AND user_id IS NULL AND reply_content IS NOT NULL AND user_has_read_reply = 0 LIMIT 1`;

    const stmt = this.db.prepare(query);
    const row = params.userId ? stmt.get(params.userId, params.deviceId) : stmt.get(params.deviceId);
    return Boolean(row);
  }

  /**
   * 用户打开信箱后，将所有已有的管理员回复标记为已读
   */
  markRepliesAsRead(params: { deviceId: string; userId?: string | null }): void {
    if (params.userId) {
      const stmt = this.db.prepare(`
        UPDATE whisper_messages
        SET user_has_read_reply = 1
        WHERE deleted_at IS NULL AND (user_id = ? OR (user_id IS NULL AND device_id = ?)) AND reply_content IS NOT NULL AND user_has_read_reply = 0
      `);
      stmt.run(params.userId, params.deviceId);
    } else {
      const stmt = this.db.prepare(`
        UPDATE whisper_messages
        SET user_has_read_reply = 1
        WHERE deleted_at IS NULL AND device_id = ? AND user_id IS NULL AND reply_content IS NOT NULL AND user_has_read_reply = 0
      `);
      stmt.run(params.deviceId);
    }
  }

  /**
   * 管理端：分页列表查询
   */
  listMessagesForAdmin(options: {
    page?: number;
    pageSize?: number;
    status?: 'all' | 'pending' | 'replied';
  }): { items: WhisperMessage[]; total: number; page: number; pageSize: number } {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE deleted_at IS NULL';
    if (options.status === 'pending') {
      whereClause += ' AND reply_content IS NULL';
    } else if (options.status === 'replied') {
      whereClause += ' AND reply_content IS NOT NULL';
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM whisper_messages ${whereClause}`);
    const { count } = countStmt.get() as { count: number };

    const dataStmt = this.db.prepare(`
      SELECT * FROM whisper_messages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(pageSize, offset) as WhisperMessageRow[];

    return {
      items: rows.map(formatWhisperMessageRow),
      total: count,
      page,
      pageSize,
    };
  }

  /**
   * 管理员回复特定密信
   */
  replyMessage(id: string, replyContent: string, adminId?: string): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE whisper_messages
      SET reply_content = ?, replied_at = ?, reply_admin_id = ?, user_has_read_reply = 0
      WHERE id = ? AND deleted_at IS NULL
    `);
    const res = stmt.run(replyContent, now, adminId || 'admin', id);
    return res.changes > 0;
  }

  /**
   * 物理或软删除密信
   */
  deleteMessage(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE whisper_messages
      SET deleted_at = ?
      WHERE id = ?
    `);
    const res = stmt.run(new Date().toISOString(), id);
    return res.changes > 0;
  }

  /**
   * 统计待回复的密信数量（用于管理后台角标）
   */
  countPending(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM whisper_messages
      WHERE deleted_at IS NULL AND reply_content IS NULL
    `);
    const row = stmt.get() as { count: number };
    return row?.count || 0;
  }
}
