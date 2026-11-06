import type Database from 'better-sqlite3';

type BetterSqliteDatabase = Database.Database;

interface Migration {
  version: number;
  up: (database: BetterSqliteDatabase) => void;
}

function exec(database: BetterSqliteDatabase, sql: string): void {
  database.exec(sql);
}

function get<T>(database: BetterSqliteDatabase, sql: string, params: unknown[] = []): T | undefined {
  return database.prepare(sql).get(...params) as T | undefined;
}

function all<T>(database: BetterSqliteDatabase, sql: string, params: unknown[] = []): T[] {
  return database.prepare(sql).all(...params) as T[];
}

function ensureColumn(
  database: BetterSqliteDatabase,
  table: string,
  column: string,
  definition: string
): void {
  const columns = all<{ name: string }>(database, `PRAGMA table_info("${table}")`);
  if (!columns.some((item) => item.name === column)) {
    exec(database, `ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
  }
}

const migrations: Migration[] = [
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
  {
    version: 21,
    up(database) {
      // 预置 10 条高真实度心声：彻底去修辞化、短促直接、深夜手机随手碎碎念
      const presets = [
        {
          id: 'echo_preset_01',
          role: '程序员',
          desire: '能不能有个人直接命令我每天干嘛啊，不听话就打，我脑子真转不动了',
          tag: '绝对臣服',
          count: 24,
          hoursAgo: 3,
        },
        {
          id: 'echo_preset_02',
          role: '护士',
          desire: '想被用麻绳绑得死死的扔床上，动都动不了那种，累死了',
          tag: '安全束缚',
          count: 28,
          hoursAgo: 5,
        },
        {
          id: 'echo_preset_03',
          role: '老师',
          desire: '天天装温柔，其实好想把他按在桌上拿戒尺狠狠打屁股，听他哭着认错',
          tag: '支配渴求',
          count: 26,
          hoursAgo: 8,
        },
        {
          id: 'echo_preset_04',
          role: '文员',
          desire: '瞒着男朋友偷偷买了个项圈，自己锁在厕所里戴着，不敢让他知道',
          tag: '绝对臣服',
          count: 29,
          hoursAgo: 14,
        },
        {
          id: 'echo_preset_05',
          role: '销售',
          desire: '被领导指着鼻子骂废物的时候下面居然湿了……服了我自己，我是不是有病',
          tag: '反差情绪',
          count: 27,
          hoursAgo: 19,
        },
        {
          id: 'echo_preset_06',
          role: '会计',
          desire: '好想当个不会说话的狗，天天被人牵着走不用带脑子',
          tag: '角色互换',
          count: 22,
          hoursAgo: 26,
        },
        {
          id: 'echo_preset_07',
          role: '全职妈妈',
          desire: '好想被当小孩管着啊，做错事了挨顿揍然后被抱着哄，太缺爱了',
          tag: '心理补偿',
          count: 25,
          hoursAgo: 35,
        },
        {
          id: 'echo_preset_08',
          role: '研究生',
          desire: '在图书馆厕所偷偷掀开裙子拍了照发给网调的主人，心跳快死了',
          tag: '反差情绪',
          count: 30,
          hoursAgo: 48,
        },
        {
          id: 'echo_preset_09',
          role: 'HR',
          desire: '想找个平时特别拽的男人锁在椅子上，抽他耳光让他跪着求我',
          tag: '支配渴求',
          count: 23,
          hoursAgo: 62,
        },
        {
          id: 'echo_preset_10',
          role: '设计',
          desire: '方案改吐了，想被吊起来捆一晚上，疼一点反而脑子能清醒点',
          tag: '安全束缚',
          count: 28,
          hoursAgo: 79,
        },
      ];

      for (const p of presets) {
        const time = new Date(Date.now() - p.hoursAgo * 3600 * 1000).toISOString();
        database.prepare(`
          INSERT OR REPLACE INTO echo_whispers (id, user_id, device_id, surface_role, shadow_desire, shadow_tag, echo_count, audit_status, created_at)
          VALUES (?, NULL, 'system_preset', ?, ?, ?, ?, 'approved', ?)
        `).run(p.id, p.role, p.desire, p.tag, p.count, time);
      }
    },
  },
  {
    version: 22,
    up(database) {
      // 调整全量回响（含预置与真实用户投稿）点赞数为 20~30 之间
      const presetMap: Record<string, number> = {
        echo_preset_01: 24,
        echo_preset_02: 28,
        echo_preset_03: 26,
        echo_preset_04: 29,
        echo_preset_05: 27,
        echo_preset_06: 22,
        echo_preset_07: 25,
        echo_preset_08: 30,
        echo_preset_09: 23,
        echo_preset_10: 28,
      };

      for (const [id, count] of Object.entries(presetMap)) {
        database.prepare('UPDATE echo_whispers SET echo_count = ? WHERE id = ?').run(count, id);
      }

      // 对所有非预置（真实用户/其它）的回响，将其点赞数归一至 20~30 之间
      const rows = database.prepare('SELECT id, echo_count FROM echo_whispers WHERE id NOT LIKE ?').all('echo_preset_%') as { id: string; echo_count: number }[];
      for (const r of rows) {
        if (r.echo_count < 20 || r.echo_count > 30) {
          // 根据 id hash 稳定映射到 20..30 范围
          let hash = 0;
          for (let i = 0; i < r.id.length; i++) {
            hash = (hash * 31 + r.id.charCodeAt(i)) & 0xffffffff;
          }
          const normalizedCount = 20 + (Math.abs(hash) % 11);
          database.prepare('UPDATE echo_whispers SET echo_count = ? WHERE id = ?').run(normalizedCount, r.id);
        }
      }
    },
  },
  {
    version: 23,
    up(database) {
      // 访问埋点补充 UA：仅存用户代理字符串，用于人工/爬虫/自动化工具识别。
      // 不存 IP（保持隐私约定：IP 只做属地查询，不落库）。
      ensureColumn(database, 'page_visits', 'user_agent', 'TEXT');
    },
  },
  {
    version: 24,
    up(database) {
      // 轻量用户事件表：记录「导出角色卡」等关键行为。
      // 只存事件类型 + 设备标识 + 可选关联卷宗，不存任何内容正文，保持现有隐私边界。
      exec(database, `
        CREATE TABLE IF NOT EXISTS user_events (
          id TEXT PRIMARY KEY,
          device_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          dossier_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_user_events_event_time ON user_events(event_type, created_at);
        CREATE INDEX IF NOT EXISTS idx_user_events_device_event ON user_events(device_id, event_type);
      `);
    },
  },
  {
    version: 25,
    up(database) {
      // 特殊身价评定投票表（点赞/点踩）：用于统计 7 天内净获赞排行榜
      exec(database, `
        CREATE TABLE IF NOT EXISTS special_evaluation_votes (
          id TEXT PRIMARY KEY,
          evaluation_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          user_id TEXT,
          vote_type TEXT NOT NULL,
          created_at TEXT NOT NULL,
          CONSTRAINT uq_spe_vote UNIQUE (evaluation_id, device_id)
        );
        CREATE INDEX IF NOT EXISTS idx_spe_votes_eval_time ON special_evaluation_votes(evaluation_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_spe_votes_device ON special_evaluation_votes(device_id);
      `);
    },
  },
  {
    version: 26,
    up(database) {
      // 蜜罐封禁状态跨进程、跨重启共享。ip_key 为服务端 HMAC，不保存明文 IP。
      exec(database, `
        CREATE TABLE IF NOT EXISTS honeypot_bans (
          ip_key TEXT PRIMARY KEY,
          banned_until INTEGER,
          banned_at TEXT NOT NULL,
          reason TEXT NOT NULL,
          trigger_path TEXT NOT NULL,
          user_agent TEXT NOT NULL DEFAULT '',
          trigger_count INTEGER NOT NULL DEFAULT 1,
          permanent INTEGER NOT NULL DEFAULT 0 CHECK (permanent IN (0, 1)),
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_honeypot_bans_expiry
          ON honeypot_bans(permanent, banned_until);
      `);
    },
  },
  {
    version: 27,
    up(database) {
      // 仅明确命中蜜罐的攻击来源保留原始 IP，供安全审计和手工处置。
      exec(database, `
        ALTER TABLE honeypot_bans ADD COLUMN ip_address TEXT NOT NULL DEFAULT '';
      `);
    },
  },
  {
    version: 28,
    up(database) {
      // 通用反滥用配额：策略和身份维度可扩展，当前用于身价投票的 IP 日限额。
      exec(database, `
        CREATE TABLE IF NOT EXISTS abuse_rate_limits (
          scope TEXT NOT NULL,
          identity_type TEXT NOT NULL,
          identity_key TEXT NOT NULL,
          request_count INTEGER NOT NULL DEFAULT 0,
          window_started_at INTEGER NOT NULL,
          window_ends_at INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (scope, identity_type, identity_key)
        );
        CREATE INDEX IF NOT EXISTS idx_abuse_rate_limits_expiry
          ON abuse_rate_limits(window_ends_at);
      `);
    },
  },
  {
    version: 29,
    up(database) {
      // 管理端安全审计：仅记录访问元数据，不保存令牌、请求体或敏感正文。
      exec(database, `
        CREATE TABLE IF NOT EXISTS security_events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL UNIQUE,
          event_type TEXT NOT NULL,
          severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
          request_id TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          user_agent TEXT NOT NULL DEFAULT '',
          method TEXT NOT NULL,
          route TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          target_type TEXT,
          target_id TEXT,
          response_bytes INTEGER,
          metadata_json TEXT NOT NULL DEFAULT '{}',
          previous_event_hash TEXT NOT NULL DEFAULT '',
          event_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_security_events_created
          ON security_events(created_at_ms DESC);
        CREATE INDEX IF NOT EXISTS idx_security_events_type_created
          ON security_events(event_type, created_at_ms DESC);
        CREATE INDEX IF NOT EXISTS idx_security_events_ip_created
          ON security_events(ip_address, created_at_ms DESC);
        CREATE INDEX IF NOT EXISTS idx_security_events_severity_created
          ON security_events(severity, created_at_ms DESC);
      `);
    },
  },
  {
    version: 30,
    up(database) {
      // 独立保存带签名的链边界，才能发现整段前缀/后缀或单条事件被删除。
      // 状态本身同样由应用密钥签名，不能通过同步修改事件与边界来伪造“完整”。
      exec(database, `
        CREATE TABLE IF NOT EXISTS security_event_chain_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          first_sequence INTEGER,
          first_previous_hash TEXT NOT NULL DEFAULT '',
          last_sequence INTEGER,
          last_event_hash TEXT NOT NULL DEFAULT '',
          event_count INTEGER NOT NULL DEFAULT 0,
          state_hash TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 31,
    up(database) {
      // 访问埋点补充 Sec-Fetch-Site（浏览器自动发送的 Fetch Metadata 请求头）：
      // none = 地址栏直输/收藏夹，cross-site = 外部链接，same-origin = 站内跳转。
      // 仅存枚举值，不存 IP，保持现有隐私约定。
      // 兜底重建：旧库（如仅含 security_events 的 v29 测试库）可能没有 page_visits 表，
      // 或缺少早期迁移补的列；逐列 ensureColumn 保证 INSERT 字段齐全。
      exec(database, `
        CREATE TABLE IF NOT EXISTS page_visits (
          id TEXT PRIMARY KEY,
          device_id TEXT,
          path TEXT,
          created_at TEXT NOT NULL
        );
      `);
      exec(database, 'CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at)');
      ensureColumn(database, 'page_visits', 'referrer', 'TEXT');
      ensureColumn(database, 'page_visits', 'region_code', 'TEXT');
      ensureColumn(database, 'page_visits', 'user_agent', 'TEXT');
      ensureColumn(database, 'page_visits', 'sec_fetch_site', 'TEXT');
    },
  },
  {
    version: 32,
    up(database) {
      // 允许按分类独立绑定并启用提示词模板（多选分类映射）
      exec(database, `
        CREATE TABLE IF NOT EXISTS prompt_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          categories TEXT NOT NULL DEFAULT '["all"]',
          is_active INTEGER NOT NULL DEFAULT 0,
          is_builtin INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        DROP INDEX IF EXISTS uq_prompt_templates_active;
        CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);
        CREATE INDEX IF NOT EXISTS idx_prompt_templates_updated_at ON prompt_templates(updated_at DESC);
      `);
      ensureColumn(database, 'prompt_templates', 'categories', "TEXT NOT NULL DEFAULT '[\"all\"]'");
    },
  },
  {
    version: 33,
    up(database) {
      // 暗室信箱：用户与主理人 1v1 私密投递与专属回响
      exec(database, `
        CREATE TABLE IF NOT EXISTS whisper_messages (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          device_id TEXT NOT NULL,
          nickname TEXT,
          contact_info TEXT,
          category TEXT NOT NULL DEFAULT 'suggestion',
          content TEXT NOT NULL,
          reply_content TEXT,
          replied_at TEXT,
          reply_admin_id TEXT,
          user_has_read_reply INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_whisper_messages_device ON whisper_messages(device_id);
        CREATE INDEX IF NOT EXISTS idx_whisper_messages_user ON whisper_messages(user_id);
        CREATE INDEX IF NOT EXISTS idx_whisper_messages_created ON whisper_messages(created_at DESC);
      `);
    },
  },
  {
    version: 34,
    up(database) {
      // 共鸣与投票的「唯一身份」从设备改为账号：登录态按 (目标, user_id) 去重，
      // 只有未绑定账号的匿名记录才按 (目标, device_id) 去重。
      // SQLite 无法修改既有表内 UNIQUE 约束，只能重建表并改用部分唯一索引。
      // 少数历史库/测试夹具可能还没有这两张表，缺表时直接按新结构创建。
      const tableExists = (name: string): boolean => !!get<{ name: string }>(
        database,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        [name]
      );

      const rebuild = (input: {
        table: string;
        columns: string;
        dedupeBy: string;
        createSql: string;
        indexesSql: string;
      }): void => {
        if (tableExists(input.table)) {
          const tempTable = `${input.table}_v33`;
          exec(database, `ALTER TABLE ${input.table} RENAME TO ${tempTable};`);
          exec(database, input.createSql);
          // 同一身份键可能有多行历史数据（如换设备后重复共鸣/投票）：
          // 优先保留已绑定账号的行，其次保留最早的一行，保证账号自己的状态不丢。
          exec(
            database,
            `INSERT OR IGNORE INTO ${input.table} (${input.columns})
             SELECT ${input.columns} FROM (
               SELECT ${input.columns},
                      ROW_NUMBER() OVER (
                        PARTITION BY ${input.dedupeBy}
                        ORDER BY (user_id IS NULL) ASC, created_at ASC
                      ) AS rn
               FROM ${tempTable}
             ) WHERE rn = 1;`
          );
          exec(database, `DROP TABLE ${tempTable};`);
        } else {
          exec(database, input.createSql);
        }
        exec(database, input.indexesSql);
      };

      rebuild({
        table: 'echo_resonances',
        columns: 'id, echo_id, device_id, user_id, created_at',
        dedupeBy: 'echo_id, COALESCE(user_id, device_id)',
        createSql: `
          CREATE TABLE echo_resonances (
            id TEXT PRIMARY KEY,
            echo_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            user_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (echo_id) REFERENCES echo_whispers(id) ON DELETE CASCADE
          );`,
        indexesSql: `
          CREATE INDEX IF NOT EXISTS idx_echo_resonances_echo_id ON echo_resonances(echo_id);
          CREATE INDEX IF NOT EXISTS idx_echo_resonances_device_id ON echo_resonances(device_id);
          CREATE UNIQUE INDEX IF NOT EXISTS uq_echo_resonances_user
            ON echo_resonances(echo_id, user_id) WHERE user_id IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS uq_echo_resonances_device
            ON echo_resonances(echo_id, device_id) WHERE user_id IS NULL;`,
      });

      rebuild({
        table: 'special_evaluation_votes',
        columns: 'id, evaluation_id, device_id, user_id, vote_type, created_at',
        dedupeBy: 'evaluation_id, COALESCE(user_id, device_id)',
        createSql: `
          CREATE TABLE special_evaluation_votes (
            id TEXT PRIMARY KEY,
            evaluation_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            user_id TEXT,
            vote_type TEXT NOT NULL,
            created_at TEXT NOT NULL
          );`,
        indexesSql: `
          CREATE INDEX IF NOT EXISTS idx_spe_votes_eval_time ON special_evaluation_votes(evaluation_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_spe_votes_device ON special_evaluation_votes(device_id);
          CREATE UNIQUE INDEX IF NOT EXISTS uq_spe_votes_user
            ON special_evaluation_votes(evaluation_id, user_id) WHERE user_id IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS uq_spe_votes_device
            ON special_evaluation_votes(evaluation_id, device_id) WHERE user_id IS NULL;`,
      });
    },
  },
  {
    version: 35,
    up(database) {
      // 审讯室（测试功能）：只对已登录账号开放，会话与消息全部按 user_id 归属。
      // 额度配置放 app_settings，管理端可在线调整（轮数 / 输入 token / 输出 token）。
      exec(database, `
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS interrogation_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          turn_count INTEGER NOT NULL DEFAULT 0,
          summary TEXT,
          summary_generated_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_interrogation_sessions_user
          ON interrogation_sessions(user_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS interrogation_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES interrogation_sessions(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_interrogation_messages_session
          ON interrogation_messages(session_id, created_at);
      `);
    },
  },
];

export const LATEST_DATABASE_VERSION = migrations.at(-1)?.version ?? 0;

export function migrateDatabase(database: BetterSqliteDatabase): void {
  const row = get<{ user_version: number }>(database, 'PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    exec(database, 'BEGIN IMMEDIATE');
    try {
      migration.up(database);
      exec(database, `PRAGMA user_version = ${migration.version}`);
      exec(database, 'COMMIT');
      currentVersion = migration.version;
    } catch (error) {
      try {
        exec(database, 'ROLLBACK');
      } catch {
        // ignore rollback error
      }
      throw error;
    }
  }
}
