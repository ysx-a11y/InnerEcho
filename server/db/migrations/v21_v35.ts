import {
  type Migration,
  exec,
  get,
  ensureColumn,
} from './types.js';

export const migrationsV21ToV35: Migration[] = [
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

