import type Database from 'better-sqlite3';

export type BetterSqliteDatabase = Database.Database;

export interface Migration {
  version: number;
  up: (database: BetterSqliteDatabase) => void;
}

export function exec(database: BetterSqliteDatabase, sql: string): void {
  database.exec(sql);
}

export function get<T>(database: BetterSqliteDatabase, sql: string, params: unknown[] = []): T | undefined {
  return database.prepare(sql).get(...params) as T | undefined;
}

export function all<T>(database: BetterSqliteDatabase, sql: string, params: unknown[] = []): T[] {
  return database.prepare(sql).all(...params) as T[];
}

export function ensureColumn(
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

