import type Database from 'better-sqlite3';
import {
  type Migration,
  type BetterSqliteDatabase,
  exec,
  get,
} from './migrations/types.js';
import { migrationsV1ToV20 } from './migrations/v1_v20.js';
import { migrationsV21ToV35 } from './migrations/v21_v35.js';
import { migrationV36 } from './migrations/v36.js';
import { migrationV37 } from './migrations/v37.js';
import { migrationV38 } from './migrations/v38.js';
import { migrationV39 } from './migrations/v39.js';
import { migrationV40 } from './migrations/v40.js';

export type { Migration, BetterSqliteDatabase };

export const migrations: Migration[] = [
  ...migrationsV1ToV20,
  ...migrationsV21ToV35,
  migrationV36,
  migrationV37,
  migrationV38,
  migrationV39,
  migrationV40,
];

export const LATEST_DATABASE_VERSION = migrations.at(-1)?.version ?? 0;

export function migrateDatabase(database: Database.Database): void {
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
