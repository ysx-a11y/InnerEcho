import {
  type Migration,
  exec,
  ensureColumn,
} from './types.js';

export const migrationsV1ToV20: Migration[] = [
  {
    version: 1,
    up(database) {
      exec(database, `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          token_invalidated_at TEXT,
          deleted_at TEXT
        );
        CREATE TABLE IF NOT EXISTS dossiers (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          email TEXT,
          nickname TEXT,
          avatar_urls TEXT,
          occupation TEXT,
          persona_trait TEXT,
          age TEXT,
          marital_status TEXT,
          has_boyfriend TEXT,
          surface_trait TEXT,
          inner_desire TEXT,
          boundary_text TEXT,
          fantasy_text TEXT,
          relation_preference TEXT,
          awakening_moment TEXT,
          depth_rating TEXT,
          selected_shadow_tags TEXT,
          secret_words TEXT,
          secret_rule TEXT,
          telemetry_json TEXT,
          diagnostic_result_json TEXT,
          quiz_payload_json TEXT,
          bank_ids TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS user_devices (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          last_login_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          CONSTRAINT uq_user_device UNIQUE (user_id, device_id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS api_error_logs (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          error_message TEXT,
          stack_trace TEXT,
          payload_json TEXT,
          device_id TEXT,
          user_id TEXT,
          ip_address TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_banks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          subtitle TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'direct',
          badge_color TEXT,
          estimated_minutes INTEGER,
          questions_json TEXT NOT NULL,
          is_published INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Upgrade databases created before explicit migrations were introduced.
      ensureColumn(database, 'users', 'token_invalidated_at', 'TEXT');
      ensureColumn(database, 'users', 'deleted_at', 'TEXT');
      ensureColumn(database, 'dossiers', 'nickname', 'TEXT');
      ensureColumn(database, 'dossiers', 'avatar_urls', 'TEXT');
      ensureColumn(database, 'dossiers', 'quiz_payload_json', 'TEXT');
      ensureColumn(database, 'dossiers', 'bank_ids', 'TEXT');
    },
  },
  {
    version: 2,
    up(database) {
      // 匿名访客卷宗使用 device_id（UUID）标识，登录用户仍以 user_id 关联
      ensureColumn(database, 'dossiers', 'device_id', 'TEXT');
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_dossiers_device_id ON dossiers(device_id)');
    },
  },
  {
    version: 3,
    up(database) {
      // 轻量访问统计：每次页面访问落一行（带 device_id 可去重 UV）
      exec(database, `
        CREATE TABLE IF NOT EXISTS page_visits (
          id TEXT PRIMARY KEY,
          device_id TEXT,
          path TEXT,
          created_at TEXT NOT NULL
        );
      `);
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at)');
    },
  },
  {
    version: 4,
    up(database) {
      exec(database, `
        CREATE TABLE IF NOT EXISTS user_tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          task_id TEXT NOT NULL,
          status TEXT NOT NULL,
          text_content TEXT,
          attachments_json TEXT,
          accepted_at TEXT NOT NULL,
          completed_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id)');
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id)');
    },
  },
  {
    version: 5,
    up(database) {
      exec(database, `
        CREATE TABLE IF NOT EXISTS custom_task_definitions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_custom_task_definitions_user_id ON custom_task_definitions(user_id)');
    },
  },
  {
    version: 6,
    up(database) {
      // 账号层重构：email 仅对活跃账号唯一（注销后同邮箱可重新注册为新账号），
      // 并记录同邮箱的注册代次 generation（从 1 开始递增）。
      exec(database, `
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          token_invalidated_at TEXT,
          deleted_at TEXT,
          generation INTEGER NOT NULL DEFAULT 1
        );
        INSERT INTO users_new (id, email, password_hash, created_at, token_invalidated_at, deleted_at, generation)
          SELECT id, email, password_hash, created_at, token_invalidated_at, deleted_at, 1 FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
        CREATE UNIQUE INDEX uq_users_email_active ON users(email) WHERE deleted_at IS NULL;
      `);
      // 存量数据按注册时间回填代次（同邮箱第几次注册）
      exec(database, `
        UPDATE users SET generation = (
          SELECT COUNT(*) FROM users AS u2
          WHERE LOWER(u2.email) = LOWER(users.email)
            AND u2.created_at <= users.created_at
        )
      `);
    },
  },
  {
    version: 7,
    up(database) {
      // 管理后台：卷宗审核状态与管理员备注（2026-08-12 接库）
      ensureColumn(database, 'dossiers', 'audit_status', "TEXT NOT NULL DEFAULT 'pending'");
      ensureColumn(database, 'dossiers', 'admin_notes', "TEXT NOT NULL DEFAULT ''");
    },
  },
  {
    version: 8,
    up(database) {
      // SQLite triggers make the two acceptance invariants atomic even when
      // multiple HTTP requests race between the route's friendly pre-checks.
      exec(database, `
        CREATE TRIGGER IF NOT EXISTS trg_user_tasks_accept_insert
        BEFORE INSERT ON user_tasks
        WHEN NEW.status = 'accepted'
        BEGIN
          SELECT RAISE(ABORT, 'TASK_ALREADY_ACTIVE')
          WHERE EXISTS (
            SELECT 1 FROM user_tasks
            WHERE user_id = NEW.user_id AND task_id = NEW.task_id AND status = 'accepted'
          );
          SELECT RAISE(ABORT, 'TASK_ACTIVE_LIMIT')
          WHERE (SELECT COUNT(*) FROM user_tasks WHERE user_id = NEW.user_id AND status = 'accepted') >= 2;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_user_tasks_accept_update
        BEFORE UPDATE OF status ON user_tasks
        WHEN NEW.status = 'accepted' AND OLD.status != 'accepted'
        BEGIN
          SELECT RAISE(ABORT, 'TASK_ALREADY_ACTIVE')
          WHERE EXISTS (
            SELECT 1 FROM user_tasks
            WHERE user_id = NEW.user_id AND task_id = NEW.task_id AND status = 'accepted' AND id != NEW.id
          );
          SELECT RAISE(ABORT, 'TASK_ACTIVE_LIMIT')
          WHERE (SELECT COUNT(*) FROM user_tasks WHERE user_id = NEW.user_id AND status = 'accepted' AND id != NEW.id) >= 2;
        END;
      `);
    },
  },
  {
    version: 9,
    up(database) {
      exec(database, `
        CREATE TABLE IF NOT EXISTS prompt_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 0,
          is_builtin INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_prompt_templates_active
          ON prompt_templates(is_active) WHERE is_active = 1;
        CREATE INDEX IF NOT EXISTS idx_prompt_templates_updated_at
          ON prompt_templates(updated_at DESC);
      `);
    },
  },
  {
    version: 10,
    up(database) {
      // 轻量 key-value 元数据表，用于记录一次性运维动作是否已完成
      //（例如敏感字段加密迁移的完成标记）。
      exec(database, `
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 11,
    up(database) {
      // 访问来源：仅存来源主机名，不存完整 URL，避免把搜索词一起落库。
      ensureColumn(database, 'page_visits', 'referrer', 'TEXT');
    },
  },
  {
    version: 12,
    up(database) {
      // 属地判断：仅存 6 位市级行政区划代码，不存 IP 与明文城市名。
      ensureColumn(database, 'page_visits', 'region_code', 'TEXT');
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_page_visits_region_code ON page_visits(region_code)');
    },
  },
  {
    version: 13,
    up(database) {
      // 基础信息扩展：增加性别字段 (gender)
      ensureColumn(database, 'dossiers', 'gender', 'TEXT');
    },
  },
  {
    version: 14,
    up(database) {
      // 用户自建题库审核流：draft=草稿 / pending=待审核 / approved=已通过 / rejected=未通过。
      // 存量已发布题库视为已审核通过，存量草稿保持草稿态。
      ensureColumn(database, 'user_banks', 'audit_status', "TEXT NOT NULL DEFAULT 'draft'");
      exec(database, `
        UPDATE user_banks
        SET audit_status = CASE WHEN is_published = 1 THEN 'approved' ELSE 'draft' END
      `);
    },
  },
  {
    version: 15,
    up(database) {
      // 深夜回响池：匿名表里自白与共鸣记录
      exec(database, `
        CREATE TABLE IF NOT EXISTS echo_whispers (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          device_id TEXT NOT NULL,
          surface_role TEXT NOT NULL,
          shadow_desire TEXT NOT NULL,
          shadow_tag TEXT NOT NULL,
          echo_count INTEGER NOT NULL DEFAULT 1,
          audit_status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_echo_whispers_created_at ON echo_whispers(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_echo_whispers_shadow_tag ON echo_whispers(shadow_tag);
        CREATE INDEX IF NOT EXISTS idx_echo_whispers_audit_status ON echo_whispers(audit_status);

        CREATE TABLE IF NOT EXISTS echo_resonances (
          id TEXT PRIMARY KEY,
          echo_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          user_id TEXT,
          created_at TEXT NOT NULL,
          CONSTRAINT uq_echo_device UNIQUE (echo_id, device_id),
          FOREIGN KEY (echo_id) REFERENCES echo_whispers(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_echo_resonances_echo_id ON echo_resonances(echo_id);
        CREATE INDEX IF NOT EXISTS idx_echo_resonances_device_id ON echo_resonances(device_id);
      `);

      // 预置精选种子回响（初始状态为 approved，确保初次打开回响池生动充实）
      const seeds = [
        {
          id: 'seed_echo_01',
          role: '法务合规总监',
          desire: '白天我严谨审核每一条协议漏洞，夜晚我只想放下全部戒备，被蒙上双眼后失去所有主控权，体验一次彻底的失序。',
          tag: '绝对臣服',
          count: 142,
          time: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        },
        {
          id: 'seed_echo_02',
          role: '重点高中语文教师',
          desire: '在讲台上我永远温和、有耐心。只有在私密场域，我渴望戴上冰冷的面具，以绝对的威严制定不可违抗的惩戒规则。',
          tag: '支配渴求',
          count: 98,
          time: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
        },
        {
          id: 'seed_echo_03',
          role: '三甲医院外科主治医师',
          desire: '每天面对高压的手术与生命抉择，独处时极度迷恋被紧密束缚的空间包裹感，只有无法动弹时大脑才算真正休眠。',
          tag: '安全束缚',
          count: 165,
          time: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        },
        {
          id: 'seed_echo_04',
          role: '互联网大厂高级前端工程师',
          desire: '厌倦了非黑即白的逻辑代码与严密架构。渴望在一个完全信任的契约场域里，被命令、被要求、被当成听话的人偶。',
          tag: '角色互换',
          count: 87,
          time: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
        },
        {
          id: 'seed_echo_05',
          role: '独立珠宝设计师',
          desire: '人前追求极简与清冷高雅，内心深处却渴望在剧烈的情绪起伏、羞耻与反差张力中，确认自己灵魂的温度。',
          tag: '反差情绪',
          count: 112,
          time: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        },
        {
          id: 'seed_echo_06',
          role: '投行风控经理',
          desire: '习惯了对一切不确定性保持绝对克制。但真正的隐秘愿望，是遇到一个能彻底击碎我心理防线、让我无条件臣服的主人。',
          tag: '绝对臣服',
          count: 130,
          time: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
        },
      ];

      for (const seed of seeds) {
        exec(database, `
          INSERT OR IGNORE INTO echo_whispers (id, user_id, device_id, surface_role, shadow_desire, shadow_tag, echo_count, audit_status, created_at)
          VALUES ('${seed.id}', NULL, 'system_seed', '${seed.role}', '${seed.desire}', '${seed.tag}', ${seed.count}, 'approved', '${seed.time}')
        `);
      }
    },
  },
  {
    version: 16,
    up(database) {
      // 移除预置种子回响（用户认为过于虚假，不应作为公开内容）。
      // v15 的历史种子逻辑保持不变；新库会先插入再删除，最终不产生种子数据。
      exec(database, `
        DELETE FROM echo_resonances
        WHERE echo_id IN (SELECT id FROM echo_whispers WHERE id LIKE 'seed_echo_%');
        DELETE FROM echo_whispers WHERE id LIKE 'seed_echo_%';
      `);
    },
  },
  {
    version: 17,
    up(database) {
      // 用户基础信息档案：第一章填写后持久化，用于“填写基础信息后才可接取任务/查看数据”的权限判断。
      exec(database, `
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id TEXT PRIMARY KEY,
          nickname TEXT NOT NULL,
          occupation TEXT NOT NULL DEFAULT '',
          persona_trait TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
    },
  },
  {
    version: 18,
    up(database) {
      // 档案补存完整第一章基础信息（加密 JSON，含性别/年龄/感情状态/人前特质/暗面渴望等），
      // 供登录用户跨设备回传与匿名设备恢复；昵称/职业/人前特质三列保留用于门禁快速判断。
      exec(database, `
        ALTER TABLE user_profiles ADD COLUMN chapter1_enc TEXT NOT NULL DEFAULT '';
      `);
    },
  },
  {
    version: 19,
    up(database) {
      // 特殊自评任务表（如身价定价任务）：记录用户/设备的自评价格、文字理由及时间戳
      exec(database, `
        CREATE TABLE IF NOT EXISTS special_evaluations (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          device_id TEXT NOT NULL,
          task_type TEXT NOT NULL DEFAULT 'price_tag',
          price REAL NOT NULL,
          self_evaluation TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_special_eval_lookup ON special_evaluations (task_type, device_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_special_eval_price ON special_evaluations (task_type, price);
      `);
    },
  },
  {
    version: 20,
    up(database) {
      // 镜像共鸣印记（用户侧自白真实度反馈）：记录用户对测评报告的认同共振程度、手写自白文本及时间
      ensureColumn(database, 'dossiers', 'resonance_level', 'TEXT');
      ensureColumn(database, 'dossiers', 'resonance_text', 'TEXT');
      ensureColumn(database, 'dossiers', 'resonance_at', 'TEXT');
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_dossiers_resonance ON dossiers(resonance_level)');
    },
  },
];

