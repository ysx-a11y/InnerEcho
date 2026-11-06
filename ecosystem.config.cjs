/*
 * InnerEcho 生产进程编排（pm2）：
 * - innerecho-user  用户端：secret.neural-node.xyz -> 127.0.0.1:3001，不挂载 /api/admin
 * - innerecho-admin 管理端：innerecho-console.neural-node.xyz -> 127.0.0.1:3003，只挂载 /api/admin
 *   （3002 已被服务器 nginx 导出仪表盘占用，管理端固定用 3003）
 * - innerecho-tgchannel Telegram 单向引流频道发布器：只发内容、不交互
 *
 * .env 保存用户端/共享配置；.env.admin 由部署脚本生成，
 * 仅覆盖 PORT / APP_MODE / CORS_ORIGINS，其余密钥与用户端共享。
 */
const path = require('node:path');
const dotenv = require('dotenv');

const rootDir = __dirname;
const sharedEnv = { ...dotenv.config({ path: path.join(rootDir, '.env') }).parsed };
const adminEnv = { ...dotenv.config({ path: path.join(rootDir, '.env.admin') }).parsed };

module.exports = {
  apps: [
    {
      name: 'innerecho-user',
      script: 'dist-server/server/index.js',
      cwd: rootDir,
      max_memory_restart: '400M',
      env: {
        ...sharedEnv,
        APP_MODE: 'user',
        PORT: '3001',
        CORS_ORIGINS: sharedEnv.CORS_ORIGINS || 'https://secret.neural-node.xyz',
      },
    },
    {
      name: 'innerecho-admin',
      script: 'dist-server/server/index.js',
      cwd: rootDir,
      max_memory_restart: '400M',
      env: {
        ...adminEnv,
        APP_MODE: 'admin',
        PORT: '3003',
        CORS_ORIGINS: adminEnv.CORS_ORIGINS || 'https://innerecho-console.neural-node.xyz',
      },
    },
    {
      name: 'innerecho-tgchannel',
      script: 'dist-server/server/telegramPublisher.js',
      cwd: rootDir,
      max_memory_restart: '120M',
      env: { ...sharedEnv },
    },
  ],
};
