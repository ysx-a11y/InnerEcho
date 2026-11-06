import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { LATEST_DATABASE_VERSION, migrateDatabase } from './migrations.js';

const openDatabases: Database.Database[] = [];

function createMemoryDatabase(): Database.Database {
  const database = new Database(':memory:');
  openDatabases.push(database);
  return database;
}

afterEach(() => {
  for (const database of openDatabases.splice(0)) {
    try {
      database.close();
    } catch {
      // ignore
    }
  }
});

describe('migrateDatabase', () => {
  it('creates the current schema and records its version', () => {
    const database = createMemoryDatabase();
    migrateDatabase(database);

    const version = database.prepare('PRAGMA user_version').get() as { user_version: number };
    const table = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_banks'")
      .get() as { name: string } | undefined;
    const promptTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prompt_templates'")
      .get() as { name: string } | undefined;
    const metaTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_meta'")
      .get() as { name: string } | undefined;
    const auditColumn = database
      .prepare("SELECT name FROM pragma_table_info('user_banks') WHERE name='audit_status'")
      .get() as { name: string } | undefined;
    const profileColumn = database
      .prepare("SELECT name FROM pragma_table_info('user_profiles') WHERE name='chapter1_enc'")
      .get() as { name: string } | undefined;
    const echoTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='echo_whispers'")
      .get() as { name: string } | undefined;
    const eventsTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_events'")
      .get() as { name: string } | undefined;
    const honeypotTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='honeypot_bans'")
      .get() as { name: string } | undefined;
    const honeypotIpColumn = database
      .prepare("SELECT name FROM pragma_table_info('honeypot_bans') WHERE name='ip_address'")
      .get() as { name: string } | undefined;
    const abuseLimitTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='abuse_rate_limits'")
      .get() as { name: string } | undefined;
    const securityEventsTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='security_events'")
      .get() as { name: string } | undefined;
    const securityChainStateTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='security_event_chain_state'")
      .get() as { name: string } | undefined;

    expect(version.user_version).toBe(LATEST_DATABASE_VERSION);
    expect(table?.name).toBe('user_banks');
    expect(promptTable?.name).toBe('prompt_templates');
    expect(metaTable?.name).toBe('app_meta');
    expect(auditColumn?.name).toBe('audit_status');
    expect(profileColumn?.name).toBe('chapter1_enc');
    expect(echoTable?.name).toBe('echo_whispers');
    expect(eventsTable?.name).toBe('user_events');
    expect(honeypotTable?.name).toBe('honeypot_bans');
    expect(honeypotIpColumn?.name).toBe('ip_address');
    expect(abuseLimitTable?.name).toBe('abuse_rate_limits');
    expect(securityEventsTable?.name).toBe('security_events');
    expect(securityChainStateTable?.name).toBe('security_event_chain_state');
  });

  it('upgrades a legacy unversioned database and is idempotent', () => {
    const database = createMemoryDatabase();
    database.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE dossiers (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );
    `);

    migrateDatabase(database);
    migrateDatabase(database);

    const userColumn = database
      .prepare("SELECT name FROM pragma_table_info('users') WHERE name='token_invalidated_at'")
      .get() as { name: string } | undefined;
    const dossierColumn = database
      .prepare("SELECT name FROM pragma_table_info('dossiers') WHERE name='quiz_payload_json'")
      .get() as { name: string } | undefined;
    const genderColumn = database
      .prepare("SELECT name FROM pragma_table_info('dossiers') WHERE name='gender'")
      .get() as { name: string } | undefined;
    const referrerColumn = database
      .prepare("SELECT name FROM pragma_table_info('page_visits') WHERE name='referrer'")
      .get() as { name: string } | undefined;
    const regionColumn = database
      .prepare("SELECT name FROM pragma_table_info('page_visits') WHERE name='region_code'")
      .get() as { name: string } | undefined;
    const userAgentColumn = database
      .prepare("SELECT name FROM pragma_table_info('page_visits') WHERE name='user_agent'")
      .get() as { name: string } | undefined;
    const auditColumn = database
      .prepare("SELECT name FROM pragma_table_info('user_banks') WHERE name='audit_status'")
      .get() as { name: string } | undefined;
    const securityChainStateTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='security_event_chain_state'")
      .get() as { name: string } | undefined;

    expect(userColumn?.name).toBe('token_invalidated_at');
    expect(dossierColumn?.name).toBe('quiz_payload_json');
    expect(genderColumn?.name).toBe('gender');
    expect(referrerColumn?.name).toBe('referrer');
    expect(regionColumn?.name).toBe('region_code');
    expect(userAgentColumn?.name).toBe('user_agent');
    expect(auditColumn?.name).toBe('audit_status');
    expect(securityChainStateTable?.name).toBe('security_event_chain_state');
  });

  it('upgrades the security-events-only v29 schema without rebuilding event data', () => {
    const database = createMemoryDatabase();
    database.exec(`
      CREATE TABLE security_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
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
      PRAGMA user_version = 29;
    `);

    migrateDatabase(database);

    const version = database.prepare('PRAGMA user_version').get() as { user_version: number };
    const eventTable = database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='security_events'"
    ).get() as { name: string } | undefined;
    const stateTable = database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='security_event_chain_state'"
    ).get() as { name: string } | undefined;
    expect(version.user_version).toBe(LATEST_DATABASE_VERSION);
    expect(eventTable?.name).toBe('security_events');
    expect(stateTable?.name).toBe('security_event_chain_state');
  });

  it('v36 creates account_lineages, data dictionary, and state transition tables with remarks', () => {
    const database = createMemoryDatabase();
    migrateDatabase(database);

    const lineageTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='account_lineages'")
      .get() as { name: string } | undefined;
    const dictTypesTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sys_dict_types'")
      .get() as { name: string } | undefined;
    const dictItemsTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sys_dict_items'")
      .get() as { name: string } | undefined;
    const transitionsTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sys_state_transitions'")
      .get() as { name: string } | undefined;

    expect(lineageTable?.name).toBe('account_lineages');
    expect(dictTypesTable?.name).toBe('sys_dict_types');
    expect(dictItemsTable?.name).toBe('sys_dict_items');
    expect(transitionsTable?.name).toBe('sys_state_transitions');

    // 验证备注字段存在
    const lineageRemark = database
      .prepare("SELECT name FROM pragma_table_info('account_lineages') WHERE name='remark'")
      .get() as { name: string } | undefined;
    const lineageAdminNotes = database
      .prepare("SELECT name FROM pragma_table_info('account_lineages') WHERE name='admin_notes'")
      .get() as { name: string } | undefined;
    const userRemark = database
      .prepare("SELECT name FROM pragma_table_info('users') WHERE name='remark'")
      .get() as { name: string } | undefined;
    const userAdminNotes = database
      .prepare("SELECT name FROM pragma_table_info('users') WHERE name='admin_notes'")
      .get() as { name: string } | undefined;
    const dictItemRemark = database
      .prepare("SELECT name FROM pragma_table_info('sys_dict_items') WHERE name='remark'")
      .get() as { name: string } | undefined;
    const transitionRemark = database
      .prepare("SELECT name FROM pragma_table_info('sys_state_transitions') WHERE name='remark'")
      .get() as { name: string } | undefined;

    expect(lineageRemark?.name).toBe('remark');
    expect(lineageAdminNotes?.name).toBe('admin_notes');
    expect(userRemark?.name).toBe('remark');
    expect(userAdminNotes?.name).toBe('admin_notes');
    expect(dictItemRemark?.name).toBe('remark');
    expect(transitionRemark?.name).toBe('remark');

    // 验证内置字典及子项注入成功 (v36 包含 6 大字典，v37 新增 2 大字典)
    const dictCount = database
      .prepare("SELECT COUNT(*) as c FROM sys_dict_types")
      .get() as { c: number };
    expect(dictCount.c).toBeGreaterThanOrEqual(6);

    const activeUserStatus = database
      .prepare("SELECT * FROM sys_dict_items WHERE type_code = 'user_account_status' AND value = 'active'")
      .get() as { label: string; badge_color: string; remark: string } | undefined;
    expect(activeUserStatus?.label).toBe('正常活跃');
    expect(activeUserStatus?.badge_color).toBe('teal');
    expect(activeUserStatus?.remark).toBeTruthy();

    const transition = database
      .prepare("SELECT * FROM sys_state_transitions WHERE type_code = 'echo_audit_status' AND from_value = 'pending' AND to_value = 'approved'")
      .get() as { action_name: string; remark: string } | undefined;
    expect(transition?.action_name).toBe('审核通过');
    expect(transition?.remark).toBeTruthy();
  });

  it('v36 backfills account_lineages and links existing multi-generation users', () => {
    const database = createMemoryDatabase();
    // 模拟 v35 状态：存在注销后重生的两代用户
    database.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        token_invalidated_at TEXT,
        deleted_at TEXT,
        generation INTEGER NOT NULL DEFAULT 1
      );
      PRAGMA user_version = 35;

      INSERT INTO users (id, email, password_hash, created_at, deleted_at, generation)
      VALUES 
        ('usr_gen1', 'test@domain.com', 'hash1', '2026-01-01T00:00:00.000Z', '2026-01-10T00:00:00.000Z', 1),
        ('usr_gen2', 'test@domain.com', 'hash2', '2026-02-01T00:00:00.000Z', NULL, 2),
        ('usr_other', 'other@domain.com', 'hash3', '2026-03-01T00:00:00.000Z', NULL, 1);
    `);

    migrateDatabase(database);

    // 检查是否回填了两个血缘
    const lineages = database
      .prepare("SELECT * FROM account_lineages ORDER BY root_key ASC")
      .all() as { id: string; root_key: string; total_generations: number; current_user_id: string; remark: string }[];
    expect(lineages).toHaveLength(2);

    const testLineage = lineages.find((l) => l.root_key === 'test@domain.com');
    expect(testLineage).toBeDefined();
    expect(testLineage?.total_generations).toBe(2);
    expect(testLineage?.current_user_id).toBe('usr_gen2');
    expect(testLineage?.remark).toBeTruthy();

    // 检查 users 表上的关联与状态回填
    const users = database
      .prepare("SELECT id, lineage_id, account_status, remark FROM users WHERE email = 'test@domain.com' ORDER BY generation ASC")
      .all() as { id: string; lineage_id: string; account_status: string; remark: string }[];
    expect(users).toHaveLength(2);
    expect(users[0].lineage_id).toBe(testLineage?.id);
    expect(users[0].account_status).toBe('deleted');
    expect(users[1].lineage_id).toBe(testLineage?.id);
    expect(users[1].account_status).toBe('active');
  });

  it('v37 creates ai_agents, prompt_versions, sys_prompt_variables, and links prompt_templates active_version_id', () => {
    const database = createMemoryDatabase();
    migrateDatabase(database);

    // 1. 验证 ai_agents 表及 3 大内置智能体
    const agents = database
      .prepare('SELECT id, agent_key, name, interaction_mode, default_model, temperature, remark, admin_notes FROM ai_agents ORDER BY id ASC')
      .all() as { id: string; agent_key: string; name: string; interaction_mode: string; default_model: string; temperature: number; remark: string; admin_notes: string }[];
    expect(agents.length).toBe(3);

    const analyst = agents.find((a) => a.agent_key === 'dossier_analyst');
    expect(analyst?.name).toBe('深层卷宗解构导师');
    expect(analyst?.interaction_mode).toBe('analysis');
    expect(analyst?.default_model).toBe('gemini-1.5-pro');
    expect(analyst?.temperature).toBe(0.85);
    expect(analyst?.remark).toBeTruthy();

    const interrogator = agents.find((a) => a.agent_key === 'interrogator');
    expect(interrogator?.name).toBe('审讯室冷峻主审官');
    expect(interrogator?.interaction_mode).toBe('chat');
    expect(interrogator?.temperature).toBe(0.55);

    // 2. 验证 prompt_templates 字段与生效版本链接
    const templates = database
      .prepare('SELECT id, name, agent_id, active_version_id, remark FROM prompt_templates')
      .all() as { id: string; name: string; agent_id: string; active_version_id: string; remark: string }[];
    expect(templates.length).toBeGreaterThanOrEqual(2);

    for (const t of templates) {
      expect(t.agent_id).toBeTruthy();
      expect(t.active_version_id).toBeTruthy();
    }

    // 3. 验证 prompt_versions 快照记录
    const versions = database
      .prepare('SELECT id, template_id, version_num, system_prompt, change_summary, remark, admin_notes FROM prompt_versions')
      .all() as { id: string; template_id: string; version_num: number; system_prompt: string; change_summary: string; remark: string; admin_notes: string }[];
    expect(versions.length).toBeGreaterThanOrEqual(templates.length);
    for (const v of versions) {
      expect(v.version_num).toBe(1);
      expect(v.system_prompt).toBeTruthy();
      expect(v.change_summary).toBeTruthy();
      expect(v.remark).toBeTruthy();
    }

    // 4. 验证 sys_prompt_variables
    const promptVars = database
      .prepare('SELECT variable_key, namespace, label, mock_value FROM sys_prompt_variables')
      .all() as { variable_key: string; namespace: string; label: string; mock_value: string }[];
    expect(promptVars.length).toBeGreaterThanOrEqual(10);
    const occVar = promptVars.find((v) => v.variable_key === 'user.occupation');
    expect(occVar?.label).toBe('真实社会职业');
    expect(occVar?.mock_value).toBe('外企合规法务');

    // 5. 验证新增的字典类型
    const agentTypeDict = database
      .prepare("SELECT * FROM sys_dict_types WHERE code = 'ai_agent_type'")
      .get() as { name: string; is_system: number } | undefined;
    expect(agentTypeDict?.name).toBe('AI 智能体类型');

    const agentItems = database
      .prepare("SELECT value, label, badge_color FROM sys_dict_items WHERE type_code = 'ai_agent_type'")
      .all() as { value: string; label: string; badge_color: string }[];
    expect(agentItems.map((i) => i.value)).toContain('dossier_analyst');
    expect(agentItems.map((i) => i.value)).toContain('interrogator');
  });
});
