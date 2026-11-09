import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import { config } from './config.js';
import { logError } from './logger.js';
import { initSentry, captureError } from './sentry.js';
import { extractDeviceId } from './auth.js';
import { getClientIp } from './utils/clientIp.js';
import { honeypotMiddleware } from './utils/honeypot.js';
import { createAbuseLimitMiddleware } from './utils/abuseLimiter.js';
import { authRouter } from './routes/auth.js';
import { analyzeRouter } from './routes/analyze.js';
import { adminRouter } from './routes/admin.js';
import { banksRouter } from './routes/banks.js';
import { dossiersRouter } from './routes/dossiers.js';
import { visitsRouter } from './routes/visits.js';
import { eventsRouter } from './routes/events.js';
import { tasksRouter } from './routes/tasks.js';
import { statsRouter } from './routes/stats.js';
import { echoesRouter } from './routes/echoes.js';
import { basicInfoRouter } from './routes/basicInfo.js';
import { clientErrorsRouter } from './routes/clientErrors.js';
import { mailboxRouter } from './routes/mailbox.js';
import { interrogationRouter } from './routes/interrogation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 组合模式（开发/测试）下的旧版单一构建目录。 */
const DIST_PATH = path.join(__dirname, '..', 'dist');
/** 用户端独立构建目录（不含 admin.html / 管理端资源）。 */
const DIST_USER_PATH = path.join(__dirname, '..', 'dist-user');
/** 管理端独立构建目录（不含用户端 SPA / 文章页）。 */
const DIST_ADMIN_PATH = path.join(__dirname, '..', 'dist-admin');

const NORMAL_BODY_LIMIT = '2mb';
const MEDIA_JSON_BODY_LIMIT = '60mb';
const normalJsonParser = express.json({ limit: NORMAL_BODY_LIMIT });
const mediaJsonParser = express.json({ limit: MEDIA_JSON_BODY_LIMIT });
const normalFormParser = express.urlencoded({ limit: NORMAL_BODY_LIMIT, extended: true });

/** 只有确实携带 Base64 媒体的 JSON 接口使用大请求体额度。 */
function isMediaJsonRequest(req: express.Request): boolean {
  if (req.method !== 'POST') return false;
  if (req.path === '/api/analyze-dossier') return true;
  return /^\/api\/tasks\/[^/]+\/complete$/.test(req.path);
}

/** 大载荷/LLM 接口使用宽松的持久化额度，不增加验证码或额外网络往返。 */
const expensiveRequestLimiter = createAbuseLimitMiddleware({
  scope: 'expensive-request',
  windowMs: 60 * 60 * 1000,
  maxAttempts: config.nodeEnv === 'test' ? 1000 : 30,
  resolveIdentity: (req) => ({ type: 'ip', value: getClientIp(req) }),
  message: '该网络的大型提交次数较多，请稍后再试。',
});

/**
 * LLM 生成按设备维度再加一道日额度。
 * IP 维度已有 30 次/小时的 expensiveRequestLimiter，但校园/公司 NAT 会误伤，
 * 而换 IP 的成本又很低；设备维度（X-Device-Id）可以把单浏览器的消耗按住，
 * 两者叠加取最严，不再新增验证码或网络往返。
 */
const llmDailyLimiter = createAbuseLimitMiddleware({
  scope: 'llm-analysis-daily',
  windowMs: 24 * 60 * 60 * 1000,
  maxAttempts: config.nodeEnv === 'test' ? 1000 : 40,
  resolveIdentity: (req) => {
    const deviceId = extractDeviceId(req);
    if (deviceId) return { type: 'device', value: deviceId };
    return { type: 'ip', value: getClientIp(req) };
  },
  message: '今天的生成次数已达上限，请明天再试。',
});

function applyBaseMiddleware(app: express.Express): boolean {
  const sentryEnabled = initSentry();
  // 仅信任与 Node 同机的 nginx。生产 nginx 在 server 块里用
  // `proxy_set_header X-Forwarded-For $http_cf_connecting_ip;` 覆盖该头，
  // 且源站由 cf-access.conf 限定只接受 Cloudflare 回源，因此这里的
  // req.ip 即访客真实 IP（改前误为 CF 边缘 IP，导致地区统计与蜜罐封禁失真）。
  app.set('trust proxy', 'loopback');
  // 蜜罐诱捕与 IP 熔断拦截门禁：挂载在最外层，先于解析、限流与路由处理
  app.use(honeypotMiddleware);
  app.use(helmet({
    contentSecurityPolicy: config.isProd
      ? {
          useDefaults: true,
          directives: {
            // 默认 CSP 缺 media-src，data:/blob: 音视频会被 default-src 'self' 拦截，
            // 导致管理端/用户端上传的音频、视频无法预览或播放。
            mediaSrc: ["'self'", 'data:', 'blob:'],
            // 允许 Cloudflare Web Analytics / Browser Insights 探针加载与上报
            scriptSrc: ["'self'", 'https://static.cloudflareinsights.com'],
            connectSrc: ["'self'", 'https://cloudflareinsights.com'],
          },
        }
      : false,
    // 下面三个头统一由 nginx 在 server 块下发（根域/tavern/静态回退页也要覆盖，
    // 只有 Express 管不到），应用层再发一遍会在响应里出现重复头：
    //   实测 secret 曾返回两条 HSTS（helmet 31536000 + nginx 63072000）、
    //   两条 X-Frame-Options、两条 X-Content-Type-Options。重复头会被安全扫描器
    //   判为配置冲突，且两处 max-age 不一致。CSP 里的 frame-ancestors 'self'
    //   仍然覆盖点击劫持防护。
    strictTransportSecurity: false,
    xFrameOptions: false,
    xContentTypeOptions: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }));
  // 在读取和解析请求体之前限流，避免被拒绝的超大请求先占用 Node 内存与 CPU。
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    message: { success: false, message: '请求过于频繁，请稍后再试。' },
  }));
  app.post('/api/analyze-dossier', expensiveRequestLimiter, llmDailyLimiter);
  app.post('/api/download-poster', expensiveRequestLimiter);
  app.post(/^\/api\/tasks\/[^/]+\/complete$/, expensiveRequestLimiter);

  app.use(compression());
  app.use((req, res, next) => {
    const parser = isMediaJsonRequest(req) ? mediaJsonParser : normalJsonParser;
    parser(req, res, next);
  });
  // 海报接口保留自己的 16MB、4 参数解析器；其他表单统一使用普通 2MB 上限。
  app.use((req, res, next) => {
    if (req.path === '/api/download-poster') return next();
    return normalFormParser(req, res, next);
  });
  app.use(cookieParser());

  // API 数据一律声明 noindex：即使爬虫无视 robots.txt，响应头也明确不可索引。
  // 同时禁用浏览器缓存：账号注销/切换后，旧身份私有数据（密信、卷宗、状态）
  // 绝不能因为 304 复用而残留在本地缓存里。
  app.use('/api', (_req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.set('Cache-Control', 'no-store');
    next();
  });
  return sentryEnabled;
}

function notFoundApi(_req: express.Request, res: express.Response): void {
  res.status(404).json({ success: false, message: '接口不存在' });
}

function staticSetHeaders(response: express.Response, filePath: string): void {
  if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
    response.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.endsWith('.xml')) {
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.endsWith('.txt')) {
    response.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.endsWith('.json') || filePath.endsWith('.webmanifest')) {
    // 发现类 JSON（/.well-known/ai-catalog.json、ard.json、site.webmanifest 等）需要及时更新，
    // 不能沿用静态资源的一年强缓存。
    response.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}

function mountUserStatic(app: express.Express, distPath: string): void {
  // 消除重复首页 URL：/index.html 与 / 内容相同，统一 301 到根路径。
  // 必须在 express.static 之前注册，否则静态中间件会直接命中 index.html 文件。
  app.get('/index.html', (_req, res) => res.redirect(301, '/'));
  app.get('/index.htm', (_req, res) => res.redirect(301, '/'));

  app.use(express.static(distPath, {
    // Entry documents are selected explicitly in the fallback below.
    index: false,
    maxAge: '1y',
    setHeaders: staticSetHeaders,
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();

    // 管理端入口在用户域直接 404（nginx 层拒绝之外的最后一层应用兜底）
    if (req.path === '/admin' || req.path === '/admin.html' || req.path.startsWith('/admin/')) {
      return res.status(404).type('text/plain').send('Not Found');
    }

    // 文章与题库静态目录页：无尾斜杠统一 301 到带尾斜杠目录；目录请求提供汇总页；
    // 已删除/不存在的静态页返回真 404，避免 SPA fallback 把软 404 变成可索引的 200 页面。
    if (req.path === '/articles' || req.path === '/banks') {
      return res.redirect(301, `${req.path}/`);
    }
    if (req.path.startsWith('/articles/') || req.path.startsWith('/banks/')) {
      const indexFile = path.join(distPath, req.path, 'index.html');
      if (req.path.endsWith('/') && fs.existsSync(indexFile)) {
        return res.sendFile(indexFile, { headers: { 'Cache-Control': 'no-cache' } });
      }
      return res.status(404).type('text/plain').send('Not Found');
    }

    // SPA 采用 hash 路由（#/...），服务端放行根路径与专属推广/扫码别名路径（/tg, /ewm）
    if (req.path === '/' || req.path === '/tg' || req.path === '/tg/' || req.path === '/ewm' || req.path === '/ewm/') {
      return res.sendFile(path.join(distPath, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } });
    }
    return res.status(404).type('text/plain').send('Not Found');
  });
}

function mountAdminStatic(app: express.Express, distPath: string): void {
  app.use(express.static(distPath, {
    index: false,
    maxAge: '1y',
    setHeaders: staticSetHeaders,
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.set('X-Robots-Tag', 'noindex, nofollow');
    return res.sendFile(path.join(distPath, 'admin.html'));
  });
}

function installErrorHandler(app: express.Express, sentryEnabled: boolean): void {
  if (sentryEnabled) Sentry.setupExpressErrorHandler(app);
  app.use((
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? '入参校验失败';
      return res.status(400).json({ success: false, message, zodErrors: error.issues });
    }
    // body-parser 等中间件错误（如 413 请求体超限）按其状态码返回
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      const status = Number((error as { statusCode?: unknown }).statusCode);
      if (Number.isInteger(status) && status >= 400 && status < 500) {
        return res.status(status).json({ success: false, message: '请求体过大或格式错误' });
      }
    }
    captureError(error);
    logError(error, {}, 'unhandled express error');
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  });
}

/**
 * 用户端应用：只挂载用户接口，绝不挂载 /api/admin。
 * 生产环境由 APP_MODE=user 的独立进程启动，用户域下不存在任何管理接口。
 */
export function createUserApp(): express.Express {
  const app = express();
  const sentryEnabled = applyBaseMiddleware(app);

  app.use('/api/auth', authRouter);
  app.use('/api', analyzeRouter);
  app.use('/api/banks', banksRouter);
  app.use('/api', dossiersRouter);
  app.use('/api', visitsRouter);
  app.use('/api', eventsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/echoes', echoesRouter);
  app.use('/api', basicInfoRouter);
  app.use('/api', clientErrorsRouter);
  app.use('/api/mailbox', mailboxRouter);
  app.use('/api/interrogation', interrogationRouter);
  // 未知 /api 路径（含 /api/admin/*）返回 JSON 404，而不是落到 SPA HTML fallback
  app.use('/api', notFoundApi);

  if (fs.existsSync(DIST_USER_PATH)) {
    mountUserStatic(app, DIST_USER_PATH);
  }
  installErrorHandler(app, sentryEnabled);
  return app;
}

/**
 * 管理端应用：只挂载 /api/admin，不挂载任何用户接口。
 * 生产环境由 APP_MODE=admin 的独立进程启动，域名 innerecho-console.neural-node.xyz。
 */
export function createAdminApp(): express.Express {
  const app = express();
  const sentryEnabled = applyBaseMiddleware(app);

  app.use('/api/admin', adminRouter);
  // 未知 /api 路径（含所有用户接口）返回 JSON 404
  app.use('/api', notFoundApi);

  if (fs.existsSync(DIST_ADMIN_PATH)) {
    mountAdminStatic(app, DIST_ADMIN_PATH);
  }
  installErrorHandler(app, sentryEnabled);
  return app;
}

/**
 * 组合应用（APP_MODE=all）：开发/测试用，同时挂载用户与管理接口。
 * 严禁在生产环境使用 —— 生产必须拆分独立进程。
 */
export function createApp(): express.Express {
  const app = express();
  const sentryEnabled = applyBaseMiddleware(app);

  app.use('/api/auth', authRouter);
  app.use('/api', analyzeRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/banks', banksRouter);
  app.use('/api', dossiersRouter);
  app.use('/api', visitsRouter);
  app.use('/api', eventsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/echoes', echoesRouter);
  app.use('/api', basicInfoRouter);
  app.use('/api', clientErrorsRouter);
  app.use('/api/mailbox', mailboxRouter);
  app.use('/api/interrogation', interrogationRouter);
  app.use('/api', notFoundApi);

  // 本地预览优先使用新构建（dist-user / dist-admin），旧版单一构建目录仅作回退
  if (fs.existsSync(DIST_USER_PATH)) {
    mountUserStatic(app, DIST_USER_PATH);
  } else if (fs.existsSync(DIST_PATH)) {
    mountUserStatic(app, DIST_PATH);
  }
  installErrorHandler(app, sentryEnabled);
  return app;
}
