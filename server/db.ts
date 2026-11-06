/**
 * Database Module Bridge / Facade
 *
 * 全量领域仓储与 better-sqlite3 核心已解耦拆分至 server/db/ 目录。
 * 本文件作为向下兼容的重导出桥梁，保证现有服务端路由与测试用例 100% 平滑无损调用。
 */

export * from './db/index.js';
