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

export const migrationV40: Migration = {
  version: 40,
  up(database) {
    if (hasTable(database, 'whisper_messages')) {
      if (!hasColumn(database, 'whisper_messages', 'admin_has_read')) {
        exec(
          database,
          'ALTER TABLE whisper_messages ADD COLUMN admin_has_read INTEGER NOT NULL DEFAULT 0'
        );
      }
      if (!hasColumn(database, 'whisper_messages', 'admin_read_at')) {
        exec(
          database,
          'ALTER TABLE whisper_messages ADD COLUMN admin_read_at TEXT'
        );
      }
      exec(
        database,
        `UPDATE whisper_messages
         SET admin_has_read = 1,
             admin_read_at = COALESCE(replied_at, created_at)
         WHERE reply_content IS NOT NULL AND admin_has_read = 0`
      );
      exec(
        database,
        'CREATE INDEX IF NOT EXISTS idx_whisper_messages_admin_read ON whisper_messages(admin_has_read, deleted_at)'
      );
    }
  },
};

