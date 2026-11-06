import {
  type Migration,
  exec,
  all,
  ensureColumn,
} from './types.js';

interface UserEmailGroupRow {
  email: string;
  total_generations: number;
  first_registered_at: string;
  last_active_at: string;
  current_user_id: string | null;
}

export const migrationV36: Migration = {
  version: 36,
  up(database) {
    const now = new Date().toISOString();

    // 1. 根血缘实体表：记录用户账号跨世代血缘关系与全生命周期风控
    exec(database, `
      CREATE TABLE IF NOT EXISTS account_lineages (
        id TEXT PRIMARY KEY,
        root_key TEXT UNIQUE NOT NULL,
        first_registered_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        total_generations INTEGER NOT NULL DEFAULT 1,
        current_user_id TEXT,
        risk_level TEXT NOT NULL DEFAULT 'normal',
        is_blocked INTEGER NOT NULL DEFAULT 0,
        admin_notes TEXT,
        remark TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_account_lineages_root_key ON account_lineages(root_key);
      CREATE INDEX IF NOT EXISTS idx_account_lineages_risk ON account_lineages(risk_level, is_blocked);
    `);

    // 2. 扩充 users 表字段：关联血缘，赋予状态机状态与显式备注字段（兼容仅含部分表的历史/测试库）
    exec(database, `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        token_invalidated_at TEXT,
        deleted_at TEXT,
        generation INTEGER NOT NULL DEFAULT 1
      );
    `);
    ensureColumn(database, 'users', 'lineage_id', 'TEXT REFERENCES account_lineages(id)');
    ensureColumn(database, 'users', 'account_status', "TEXT NOT NULL DEFAULT 'active'");
    ensureColumn(database, 'users', 'admin_notes', 'TEXT');
    ensureColumn(database, 'users', 'remark', 'TEXT');
    exec(database, 'CREATE INDEX IF NOT EXISTS idx_users_lineage_id ON users(lineage_id)');
    exec(database, 'CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)');

    // 3. 动态数据字典架构表
    exec(database, `
      CREATE TABLE IF NOT EXISTS sys_dict_types (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        remark TEXT,
        is_system INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sys_dict_items (
        id TEXT PRIMARY KEY,
        type_code TEXT NOT NULL,
        value TEXT NOT NULL,
        label TEXT NOT NULL,
        badge_color TEXT NOT NULL DEFAULT 'gray',
        badge_variant TEXT NOT NULL DEFAULT 'light',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        remark TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(type_code, value),
        FOREIGN KEY (type_code) REFERENCES sys_dict_types(code) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dict_items_type ON sys_dict_items(type_code, sort_order ASC);

      CREATE TABLE IF NOT EXISTS sys_state_transitions (
        id TEXT PRIMARY KEY,
        type_code TEXT NOT NULL,
        from_value TEXT NOT NULL,
        to_value TEXT NOT NULL,
        action_name TEXT NOT NULL,
        required_role TEXT NOT NULL DEFAULT 'admin',
        is_allowed INTEGER NOT NULL DEFAULT 1,
        remark TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(type_code, from_value, to_value, action_name),
        FOREIGN KEY (type_code) REFERENCES sys_dict_types(code) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_state_transitions_lookup 
        ON sys_state_transitions(type_code, from_value, is_allowed);
    `);

    // 4. 存量用户平滑回填：聚合现有用户建立根血缘，并反向更新 users
    const groups = all<UserEmailGroupRow>(database, `
      SELECT
        LOWER(email) AS email,
        MAX(generation) AS total_generations,
        MIN(created_at) AS first_registered_at,
        MAX(created_at) AS last_active_at,
        (
          SELECT id FROM users AS u2
          WHERE LOWER(u2.email) = LOWER(users.email) AND u2.deleted_at IS NULL
          ORDER BY u2.generation DESC
          LIMIT 1
        ) AS current_user_id
      FROM users
      GROUP BY LOWER(email)
    `);

    for (const group of groups) {
      const lineageId = `lin_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      database
        .prepare(
          `INSERT OR IGNORE INTO account_lineages (
            id, root_key, first_registered_at, last_active_at, total_generations,
            current_user_id, risk_level, is_blocked, admin_notes, remark, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'normal', 0, NULL, '系统升级自动初始化血缘', ?, ?)`
        )
        .run(
          lineageId,
          group.email,
          group.first_registered_at || now,
          group.last_active_at || now,
          group.total_generations || 1,
          group.current_user_id,
          group.first_registered_at || now,
          now
        );

      // 查询真实存入或已有的 lineage_id
      const actualLineage = database
        .prepare('SELECT id FROM account_lineages WHERE root_key = ?')
        .get(group.email) as { id: string } | undefined;

      if (actualLineage?.id) {
        database
          .prepare(
            `UPDATE users
             SET lineage_id = ?,
                 account_status = CASE WHEN deleted_at IS NOT NULL THEN 'deleted' ELSE 'active' END,
                 remark = COALESCE(remark, '系统升级自动绑定血缘')
             WHERE LOWER(email) = ? AND (lineage_id IS NULL OR lineage_id = '')`
          )
          .run(actualLineage.id, group.email);
      }
    }

    // 5. 预置系统内置 6 大核心业务字典
    const dictTypes = [
      {
        code: 'user_account_status',
        name: '用户账号状态',
        description: '控制用户登录与生命周期状态',
        remark: '系统核心字典：active/muted/suspended/deleted',
      },
      {
        code: 'echo_audit_status',
        name: '深夜回响审核状态',
        description: '控制深夜回响广场公开展示状态',
        remark: '系统核心字典：pending/approved/rejected/hidden',
      },
      {
        code: 'bank_audit_status',
        name: '题库审核状态',
        description: '创作者与官方题库生命周期审核状态',
        remark: '系统核心字典：draft/pending_review/active/archived/disabled',
      },
      {
        code: 'dossier_audit_status',
        name: '心理卷宗封存状态',
        description: '用户50题卷宗绝密封存与归档状态',
        remark: '系统核心字典：draft/sealed/archived',
      },
      {
        code: 'task_progress_status',
        name: '修行任务接取状态',
        description: '觉察修行任务接取与达标流转状态',
        remark: '系统核心字典：available/accepted/submitted/verified/rejected/expired',
      },
      {
        code: 'interrogation_status',
        name: '审讯室会话状态',
        description: '审讯室交锋与风控熔断会话状态',
        remark: '系统核心字典：active/completed/terminated',
      },
    ];

    const insertTypeStmt = database.prepare(`
      INSERT OR IGNORE INTO sys_dict_types (code, name, description, remark, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `);
    for (const dt of dictTypes) {
      insertTypeStmt.run(dt.code, dt.name, dt.description, dt.remark, now, now);
    }

    // 6. 预置字典子项
    const dictItems = [
      // user_account_status
      { tc: 'user_account_status', val: 'active', lbl: '正常活跃', col: 'teal', var: 'light', ord: 10, def: 1, rem: '账号正常，可正常使用全站功能' },
      { tc: 'user_account_status', val: 'muted', lbl: '禁言受限', col: 'yellow', var: 'light', ord: 20, def: 0, rem: '发信或交友功能受限，只读可用' },
      { tc: 'user_account_status', val: 'suspended', lbl: '账号封禁', col: 'red', var: 'filled', ord: 30, def: 0, rem: '触发高危风控，禁止登录与操作' },
      { tc: 'user_account_status', val: 'deleted', lbl: '已注销', col: 'gray', var: 'outline', ord: 40, def: 0, rem: '用户自愿注销该世代' },

      // echo_audit_status
      { tc: 'echo_audit_status', val: 'pending', lbl: '待审核', col: 'yellow', var: 'light', ord: 10, def: 1, rem: '新建回响等待管理员审核' },
      { tc: 'echo_audit_status', val: 'approved', lbl: '公开展示', col: 'teal', var: 'light', ord: 20, def: 0, rem: '审核通过，在深夜回响池展示' },
      { tc: 'echo_audit_status', val: 'rejected', lbl: '违规驳回', col: 'red', var: 'light', ord: 30, def: 0, rem: '内容违规或不合规驳回' },
      { tc: 'echo_audit_status', val: 'hidden', lbl: '隐退下架', col: 'gray', var: 'outline', ord: 40, def: 0, rem: '举报或合规要求人工下架' },

      // bank_audit_status
      { tc: 'bank_audit_status', val: 'draft', lbl: '草稿编写', col: 'gray', var: 'light', ord: 10, def: 1, rem: '题库草稿阶段，仅创建者可见' },
      { tc: 'bank_audit_status', val: 'pending_review', lbl: '提交审核', col: 'blue', var: 'light', ord: 20, def: 0, rem: '已提交审核，等待平台处理' },
      { tc: 'bank_audit_status', val: 'active', lbl: '正式上线', col: 'teal', var: 'light', ord: 30, def: 0, rem: '审核通过，所有用户可测' },
      { tc: 'bank_audit_status', val: 'archived', lbl: '下线归档', col: 'violet', var: 'light', ord: 40, def: 0, rem: '题库下线封存' },
      { tc: 'bank_audit_status', val: 'disabled', lbl: '强制停用', col: 'red', var: 'filled', ord: 50, def: 0, rem: '违规强制停用不可测' },

      // dossier_audit_status
      { tc: 'dossier_audit_status', val: 'draft', lbl: '测评中', col: 'gray', var: 'light', ord: 10, def: 1, rem: '问卷测评未完成' },
      { tc: 'dossier_audit_status', val: 'sealed', lbl: '绝密封存', col: 'teal', var: 'light', ord: 20, def: 0, rem: '已生成海报报告并绝密封存' },
      { tc: 'dossier_audit_status', val: 'archived', lbl: '历史归档', col: 'violet', var: 'light', ord: 30, def: 0, rem: '历史旧卷宗封存归档' },

      // task_progress_status
      { tc: 'task_progress_status', val: 'available', lbl: '待接取', col: 'blue', var: 'light', ord: 10, def: 1, rem: '开放于任务大厅' },
      { tc: 'task_progress_status', val: 'accepted', lbl: '修行中', col: 'yellow', var: 'light', ord: 20, def: 0, rem: '用户正在修行履约中' },
      { tc: 'task_progress_status', val: 'submitted', lbl: '已提交待验', col: 'indigo', var: 'light', ord: 30, def: 0, rem: '已提交反思感悟待核验' },
      { tc: 'task_progress_status', val: 'verified', lbl: '达成通过', col: 'teal', var: 'light', ord: 40, def: 0, rem: '核验通过，获得成就' },
      { tc: 'task_progress_status', val: 'rejected', lbl: '未达标驳回', col: 'red', var: 'light', ord: 50, def: 0, rem: '反思不达标打回' },
      { tc: 'task_progress_status', val: 'expired', lbl: '已逾期失效', col: 'gray', var: 'outline', ord: 60, def: 0, rem: '超过修行时限自动失效' },

      // interrogation_status
      { tc: 'interrogation_status', val: 'active', lbl: '审讯交锋中', col: 'teal', var: 'light', ord: 10, def: 1, rem: '会话活跃进行中' },
      { tc: 'interrogation_status', val: 'completed', lbl: '圆满达成', col: 'blue', var: 'light', ord: 20, def: 0, rem: '会话达成生成结论' },
      { tc: 'interrogation_status', val: 'terminated', lbl: '异常熔断', col: 'red', var: 'filled', ord: 30, def: 0, rem: '触犯防御底线提前终止' },
    ];

    const insertItemStmt = database.prepare(`
      INSERT OR IGNORE INTO sys_dict_items (
        id, type_code, value, label, badge_color, badge_variant, sort_order, is_default, is_active, remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    for (const item of dictItems) {
      const itemId = `ditem_${item.tc}_${item.val}`;
      insertItemStmt.run(itemId, item.tc, item.val, item.lbl, item.col, item.var, item.ord, item.def, item.rem, now, now);
    }

    // 7. 预置状态流转规则 (sys_state_transitions)
    const transitions = [
      // echo_audit_status
      { tc: 'echo_audit_status', from: 'pending', to: 'approved', act: '审核通过', role: 'admin', rem: '回响内容健康合规通过' },
      { tc: 'echo_audit_status', from: 'pending', to: 'rejected', act: '审核驳回', role: 'admin', rem: '回响内容涉违规驳回' },
      { tc: 'echo_audit_status', from: 'approved', to: 'hidden', act: '隐退下架', role: 'admin', rem: '回响被举报或人工隐藏' },
      { tc: 'echo_audit_status', from: 'hidden', to: 'approved', act: '重新公开', role: 'admin', rem: '申诉核实合规重新公开' },
      { tc: 'echo_audit_status', from: 'rejected', to: 'pending', act: '申诉重审', role: 'admin', rem: '作者申诉后重新进入待审' },

      // bank_audit_status
      { tc: 'bank_audit_status', from: 'draft', to: 'pending_review', act: '提交审核', role: 'user', rem: '创作者提交平台审核' },
      { tc: 'bank_audit_status', from: 'pending_review', to: 'draft', act: '撤回修改', role: 'user', rem: '创作者主动撤回' },
      { tc: 'bank_audit_status', from: 'pending_review', to: 'active', act: '审核通过', role: 'admin', rem: '官方审核通过发布' },
      { tc: 'bank_audit_status', from: 'pending_review', to: 'draft', act: '退回修改', role: 'admin', rem: '官方驳回并退回草稿' },
      { tc: 'bank_audit_status', from: 'active', to: 'archived', act: '下线归档', role: 'user', rem: '创作者主动归档' },
      { tc: 'bank_audit_status', from: 'active', to: 'disabled', act: '违规停用', role: 'admin', rem: '官方强制封禁下架' },
      { tc: 'bank_audit_status', from: 'archived', to: 'pending_review', act: '重新提交', role: 'user', rem: '归档题库重新申请上线' },
      { tc: 'bank_audit_status', from: 'disabled', to: 'archived', act: '解封归档', role: 'admin', rem: '整改后解除封禁并归档' },

      // task_progress_status
      { tc: 'task_progress_status', from: 'available', to: 'accepted', act: '接取修行', role: 'user', rem: '满足并发门禁接取任务' },
      { tc: 'task_progress_status', from: 'accepted', to: 'submitted', act: '提交感悟', role: 'user', rem: '提交自白证明' },
      { tc: 'task_progress_status', from: 'accepted', to: 'expired', act: '超时失效', role: 'system', rem: '超时系统自动置为失效' },
      { tc: 'task_progress_status', from: 'submitted', to: 'verified', act: '核验达成', role: 'admin', rem: '管理员审核合格' },
      { tc: 'task_progress_status', from: 'submitted', to: 'rejected', act: '驳回重修', role: 'admin', rem: '管理员核验不达标驳回' },
      { tc: 'task_progress_status', from: 'rejected', to: 'accepted', act: '重写感悟', role: 'user', rem: '用户重新修正自白' },

      // interrogation_status
      { tc: 'interrogation_status', from: 'active', to: 'completed', act: '达成结论', role: 'system', rem: '达到轮次要求正常结案' },
      { tc: 'interrogation_status', from: 'active', to: 'terminated', act: '安全熔断', role: 'system', rem: '违规注入或越界熔断' },

      // user_account_status
      { tc: 'user_account_status', from: 'active', to: 'muted', act: '限制发言', role: 'admin', rem: '因恶意刷屏临时禁言' },
      { tc: 'user_account_status', from: 'muted', to: 'active', act: '解除禁言', role: 'admin', rem: '禁言期满解除' },
      { tc: 'user_account_status', from: 'active', to: 'suspended', act: '账号封禁', role: 'admin', rem: '严重违规封禁账号' },
      { tc: 'user_account_status', from: 'suspended', to: 'active', act: '解封账号', role: 'admin', rem: '申诉通过解除封禁' },
      { tc: 'user_account_status', from: 'active', to: 'deleted', act: '自愿注销', role: 'user', rem: '用户主动注销该世代' },
    ];

    const insertTransitionStmt = database.prepare(`
      INSERT OR IGNORE INTO sys_state_transitions (
        id, type_code, from_value, to_value, action_name, required_role, is_allowed, remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    for (const tr of transitions) {
      const tranId = `stran_${tr.tc}_${tr.from}_${tr.to}`;
      insertTransitionStmt.run(tranId, tr.tc, tr.from, tr.to, tr.act, tr.role, tr.rem, now, now);
    }
  },
};
