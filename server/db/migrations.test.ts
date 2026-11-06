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
});
