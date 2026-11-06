import dotenv from 'dotenv';
import { envSchema } from './schemas.js';

dotenv.config();

/**
 * Parse and validate environment variables at startup.
 * Throws (and crashes the process) if required vars are missing or invalid —
 * fail-fast is better than runtime 500s later.
 */
const parsed = envSchema.parse(process.env);

function parseExpiresInSeconds(s: string): number {
  const fallback = 7 * 24 * 60 * 60;
  if (!s) return fallback;
  const m = s.match(/^(\d+)\s*([smhdw])$/i);
  if (!m) return fallback;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : u === 'd' ? 86400 : 604800;
  return n * mult;
}

export const config = {
  port: parsed.PORT,
  /** 'user' = 仅用户端；'admin' = 仅管理端；'all' = 开发/测试用的组合应用。 */
  appMode: parsed.APP_MODE,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresInSeconds: parseExpiresInSeconds(parsed.JWT_EXPIRES_IN),
  llmApiKey: parsed.LLM_API_KEY,
  llmBaseUrl: parsed.LLM_BASE_URL.replace(/\/+$/, ''),
  llmModel: parsed.LLM_MODEL,
  /** Allowed LLM provider hostnames (anti-SSRF whitelist). */
  llmAllowedHosts: new Set<string>(
    (parsed.LLM_ALLOWED_HOSTS ?? 'api.deepseek.com,api.openai.com,api.siliconflow.cn,dashscope.aliyuncs.com')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  ),
  /** Admin token required for /api/admin/* endpoints. */
  adminToken: parsed.ADMIN_TOKEN,
  /** Comma-separated list of allowed CORS origins. '*' disables credentials. */
  corsOrigins: (parsed.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  databaseFile: parsed.DATABASE_FILE,
  nodeEnv: parsed.NODE_ENV,
  isProd: parsed.NODE_ENV === 'production',
  /** Sentry DSN — undefined skips Sentry initialization. */
  sentryDsn: parsed.SENTRY_DSN,
} as const;
