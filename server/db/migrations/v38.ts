import {
  type Migration,
  type BetterSqliteDatabase,
  ensureColumn,
  get,
} from './types.js';

function hasTable(database: BetterSqliteDatabase, tableName: string): boolean {
  const row = get<{ name: string }>(
    database,
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [tableName]
  );
  return Boolean(row);
}

export const migrationV38: Migration = {
  version: 38,
  up(database) {
    const now = new Date().toISOString();

    // 1. 为核心业务实体表补齐统一备注 (remark) 与管理员私密批注 (admin_notes) 字段（兼容测试隔离库）
    if (hasTable(database, 'echo_whispers')) {
      ensureColumn(database, 'echo_whispers', 'admin_notes', 'TEXT');
      ensureColumn(database, 'echo_whispers', 'remark', 'TEXT');
    }

    if (hasTable(database, 'user_banks')) {
      ensureColumn(database, 'user_banks', 'admin_notes', 'TEXT');
      ensureColumn(database, 'user_banks', 'remark', 'TEXT');
    }

    if (hasTable(database, 'user_tasks')) {
      ensureColumn(database, 'user_tasks', 'admin_notes', 'TEXT');
      ensureColumn(database, 'user_tasks', 'remark', 'TEXT');
    }

    // 2. 兼容历史状态与字典扩展 (echo_audit_status 中历史存在的 'flagged' 映射为已下架)
    if (hasTable(database, 'sys_dict_items')) {
      const insertItemStmt = database.prepare(`
        INSERT OR IGNORE INTO sys_dict_items (
          id, type_code, value, label, badge_color, badge_variant, sort_order, is_default, is_active, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);

      insertItemStmt.run(
        'ditem_echo_audit_status_flagged',
        'echo_audit_status',
        'flagged',
        '已下架',
        'gray',
        'outline',
        50,
        0,
        '历史下架/违规封存状态兼容',
        now,
        now
      );
    }

    // 3. 补充流转规则
    if (hasTable(database, 'sys_state_transitions')) {
      const insertTransitionStmt = database.prepare(`
        INSERT OR IGNORE INTO sys_state_transitions (
          id, type_code, from_value, to_value, action_name, required_role, is_allowed, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);

      insertTransitionStmt.run(
        'stran_echo_audit_status_approved_flagged',
        'echo_audit_status',
        'approved',
        'flagged',
        '违规下架',
        'admin',
        '审核通过后发现违规实施强制下架',
        now,
        now
      );
      insertTransitionStmt.run(
        'stran_echo_audit_status_flagged_approved',
        'echo_audit_status',
        'flagged',
        'approved',
        '申诉解封',
        'admin',
        '下架后经人工复核合规重新展示',
        now,
        now
      );
    }
  },
};
