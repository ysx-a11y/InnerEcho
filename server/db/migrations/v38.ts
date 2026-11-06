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

    // 2. 兼容历史状态与字典扩展
    if (hasTable(database, 'sys_dict_items')) {
      const insertItemStmt = database.prepare(`
        INSERT OR IGNORE INTO sys_dict_items (
          id, type_code, value, label, badge_color, badge_variant, sort_order, is_default, is_active, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);

      const additionalItems = [
        // echo_audit_status flagged 兼容
        { tc: 'echo_audit_status', val: 'flagged', lbl: '已下架', col: 'gray', var: 'outline', ord: 50, def: 0, rem: '历史下架/违规封存状态兼容' },

        // dossier_audit_status 真实线上全量状态兼容 (线上全量 342 份卷宗处于 pending 待核准状态)
        { tc: 'dossier_audit_status', val: 'pending', lbl: '待核准', col: 'yellow', var: 'light', ord: 15, def: 1, rem: '新建卷宗等待管理员核准' },
        { tc: 'dossier_audit_status', val: 'approved', lbl: '已核准', col: 'teal', var: 'light', ord: 25, def: 0, rem: '卷宗已核准归档' },
        { tc: 'dossier_audit_status', val: 'rejected', lbl: '已驳回', col: 'red', var: 'light', ord: 35, def: 0, rem: '卷宗内容有误或恶意作答驳回' },

        // task_progress_status 真实线上存量任务状态兼容 (线上存量 completed 与 abandoned 状态)
        { tc: 'task_progress_status', val: 'completed', lbl: '已达成', col: 'teal', var: 'light', ord: 45, def: 0, rem: '存量用户修行达标完成' },
        { tc: 'task_progress_status', val: 'abandoned', lbl: '已放弃', col: 'gray', var: 'outline', ord: 55, def: 0, rem: '存量用户中途放弃修行' },

        // bank_audit_status 真实线上题库状态兼容 (线上存量 approved 状态)
        { tc: 'bank_audit_status', val: 'pending', lbl: '待审核', col: 'yellow', var: 'light', ord: 15, def: 0, rem: '新建题库等待审核' },
        { tc: 'bank_audit_status', val: 'approved', lbl: '已核准', col: 'teal', var: 'light', ord: 25, def: 0, rem: '官方审核核准上线' },
        { tc: 'bank_audit_status', val: 'rejected', lbl: '已驳回', col: 'red', var: 'light', ord: 35, def: 0, rem: '题库内容不合规驳回' },
      ];

      for (const item of additionalItems) {
        insertItemStmt.run(
          `ditem_${item.tc}_${item.val}`,
          item.tc,
          item.val,
          item.lbl,
          item.col,
          item.var,
          item.ord,
          item.def,
          item.rem,
          now,
          now
        );
      }
    }

    // 3. 补充流转规则
    if (hasTable(database, 'sys_state_transitions')) {
      const insertTransitionStmt = database.prepare(`
        INSERT OR IGNORE INTO sys_state_transitions (
          id, type_code, from_value, to_value, action_name, required_role, is_allowed, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);

      const additionalTransitions = [
        { tc: 'echo_audit_status', from: 'approved', to: 'flagged', act: '违规下架', role: 'admin', rem: '审核通过后发现违规实施强制下架' },
        { tc: 'echo_audit_status', from: 'flagged', to: 'approved', act: '申诉解封', role: 'admin', rem: '下架后经人工复核合规重新展示' },
        { tc: 'dossier_audit_status', from: 'pending', to: 'approved', act: '核准卷宗', role: 'admin', rem: '管理员核准用户诊断结果' },
        { tc: 'dossier_audit_status', from: 'pending', to: 'rejected', act: '驳回卷宗', role: 'admin', rem: '诊断涉嫌恶意乱填或异常数据驳回' },
        { tc: 'dossier_audit_status', from: 'rejected', to: 'pending', act: '重新核验', role: 'admin', rem: '驳回后经复核重新送入待核准' },
        { tc: 'bank_audit_status', from: 'pending', to: 'approved', act: '审核通过', role: 'admin', rem: '题库人工审核通过' },
        { tc: 'bank_audit_status', from: 'pending', to: 'rejected', act: '审核驳回', role: 'admin', rem: '题库人工审核驳回' },
        { tc: 'bank_audit_status', from: 'approved', to: 'draft', act: '下架草稿', role: 'admin', rem: '下架为草稿待修改' },
      ];

      for (const t of additionalTransitions) {
        insertTransitionStmt.run(
          `stran_${t.tc}_${t.from}_${t.to}`,
          t.tc,
          t.from,
          t.to,
          t.act,
          t.role,
          t.rem,
          now,
          now
        );
      }
    }
  },
};
