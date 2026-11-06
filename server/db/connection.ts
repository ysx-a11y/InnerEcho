import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { migrateDatabase } from './migrations.js';
import { upgradeSensitiveStorageEncryption } from './crypto.js';
import { seedBuiltinPromptTemplate } from './repositories/promptRepo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = config.databaseFile === ':memory:'
  ? ':memory:'
  : path.resolve(config.databaseFile ?? path.join(DATA_DIR, 'database.sqlite'));

if (DB_FILE !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

let dbInstance: Database.Database | null = null;
// 以“连接实例”而非全局标志记录初始化状态：
// 未来若通过 rawDb 注入独立数据库（如测试隔离库），各自都能完整跑一次迁移/加密升级/种子，
// 不会因为共享标志被意外跳过。
const initializedDatabases = new WeakSet<Database.Database>();

export function getRawDatabase(): Database.Database {
  if (!dbInstance) {
    try {
      dbInstance = new Database(DB_FILE, { timeout: 5000 });
      if (DB_FILE !== ':memory:') {
        dbInstance.pragma('journal_mode = WAL');
      }
      dbInstance.pragma('busy_timeout = 5000');
      dbInstance.pragma('foreign_keys = OFF');
      logger.info({ dbFile: DB_FILE }, 'better-sqlite3 connected');
    } catch (err: any) {
      logger.error({ err: err.message, dbFile: DB_FILE }, 'better-sqlite3 connect failed');
      throw err;
    }
  }
  return dbInstance;
}

export function initDatabaseSync(rawDb?: Database.Database): Database.Database {
  const db = rawDb || getRawDatabase();
  if (!initializedDatabases.has(db)) {
    migrateDatabase(db);
    upgradeSensitiveStorageEncryption(db);
    seedBuiltinPromptTemplate(db);
    initializedDatabases.add(db);
  }
  return db;
}

export const databaseReady = Promise.resolve().then(() => {
  return initDatabaseSync();
});
