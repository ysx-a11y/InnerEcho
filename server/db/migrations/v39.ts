import {
  type Migration,
  type BetterSqliteDatabase,
  exec,
  get,
  all,
} from './types.js';

function hasTable(database: BetterSqliteDatabase, tableName: string): boolean {
  const row = get<{ name: string }>(
    database,
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [tableName]
  );
  return Boolean(row);
}

function hasColumn(database: BetterSqliteDatabase, table: string, column: string): boolean {
  const columns = all<{ name: string }>(database, `PRAGMA table_info("${table}")`);
  return columns.some((item) => item.name === column);
}

export const migrationV39: Migration = {
  version: 39,
  up(database) {
    if (hasTable(database, 'dossiers')) {
      if (hasColumn(database, 'dossiers', 'created_at')) {
        exec(database, 'CREATE INDEX IF NOT EXISTS idx_dossiers_created_at ON dossiers(created_at DESC)');
      }
      if (hasColumn(database, 'dossiers', 'device_id') && hasColumn(database, 'dossiers', 'user_id')) {
        exec(database, 'CREATE INDEX IF NOT EXISTS idx_dossiers_device_user ON dossiers(device_id, user_id)');
      }
    }
  },
};
