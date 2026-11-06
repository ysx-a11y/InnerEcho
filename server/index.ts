import { createApp, createUserApp, createAdminApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';

// 生产按 APP_MODE 启动独立进程：
// - user  -> 用户端（secret.neural-node.xyz，不挂载 /api/admin）
// - admin -> 管理端（innerecho-console.neural-node.xyz，只挂载 /api/admin）
// - all   -> 仅开发/测试使用
const app = config.appMode === 'user'
  ? createUserApp()
  : config.appMode === 'admin'
    ? createAdminApp()
    : createApp();

// 仅监听回环地址：nginx 反代 + ufw 之外再加一层保险，避免 3001 端口对外裸奔。
app.listen(config.port, '127.0.0.1', () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'InnerEcho server listening');
});
