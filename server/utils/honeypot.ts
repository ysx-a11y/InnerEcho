import { createHmac, randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { db, type HoneypotBanRow, type RegisterHoneypotTriggerInput } from '../db.js';
import { logger } from '../logger.js';
import { getClientIp } from './clientIp.js';

export interface BannedIpRecord {
  ipKey: string;
  ipAddress: string;
  bannedUntil: number | null;
  bannedAt: string;
  reason: string;
  triggerPath: string;
  userAgent: string;
  triggerCount: number;
  permanent: boolean;
}

export interface HoneypotBanStore {
  get(ipKey: string): Promise<HoneypotBanRow | null>;
  register(input: RegisterHoneypotTriggerInput): Promise<HoneypotBanRow>;
  delete(ipKey: string): Promise<boolean>;
  countActive(nowMs: number): Promise<number>;
  clear(): Promise<void>;
}

/** 默认封禁 24 小时；累计三次命中蜜罐后永久封禁。 */
const DEFAULT_BAN_DURATION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PERMANENT_THRESHOLD = 3;
const NEGATIVE_CACHE_TTL_MS = 5_000;

/** 本地回环白名单，避免开发、测试和 nginx 健康检查误封。 */
const WHITELISTED_IPS = new Set(['127.0.0.1', '::1', 'localhost', 'unknown-ip']);

/** 蜜罐路径：正常用户和正规爬虫没有访问理由的敏感探针。 */
const HONEYPOT_PATH_PATTERNS: RegExp[] = [
  /^\/\.env(\..+)?$/i,
  /^\/\.git(\/.*)?$/i,
  /^\/\.svn(\/.*)?$/i,
  /^\/\.aws(\/.*)?$/i,
  /^\/\.ds_store$/i,
  /^\/config\.(json|yml|yaml|ini|bak)$/i,
  /^\/web\.config$/i,
  /^\/(database|db|backup|dump)\.(sql|tar|gz|zip|bak|7z|tar\.gz|tgz)$/i,
  /^\/(phpmyadmin|pma|myadmin)(\/.*)?$/i,
  /^\/(wp-admin|wp-login\.php|xmlrpc\.php)(\/.*)?$/i,
  /^\/actuator(\/.*)?$/i,
  /^\/telescope(\/.*)?$/i,
  /^\/solr(\/.*)?$/i,
  /^\/(console|_ignition|vendor\/phpunit)(\/.*)?$/i,
  /^\/(shell|eval-stdin|cmd|execute)(\.php|\.jsp|\.asp|\.sh)?$/i,
  /^\/\.remote(\/.*)?$/i,
  /^\/api\/internal(\/.*)?$/i,
  /^\/api\/admin\/(dump-db|raw-sql|backup-all|export-keys|eval)$/i,
  /^\/api\/debug(\/.*)?$/i,
  /^\/api\/v1\/(system-dump|secret-tokens|database-download)$/i,
];

function rowToRecord(row: HoneypotBanRow): BannedIpRecord {
  return {
    ipKey: row.ip_key,
    ipAddress: row.ip_address,
    bannedUntil: row.banned_until,
    bannedAt: row.banned_at,
    reason: row.reason,
    triggerPath: row.trigger_path,
    userAgent: row.user_agent,
    triggerCount: row.trigger_count,
    permanent: row.permanent === 1,
  };
}

class MemoryHoneypotBanStore implements HoneypotBanStore {
  private rows = new Map<string, HoneypotBanRow>();

  async get(ipKey: string): Promise<HoneypotBanRow | null> {
    return this.rows.get(ipKey) ?? null;
  }

  async register(input: RegisterHoneypotTriggerInput): Promise<HoneypotBanRow> {
    const existing = this.rows.get(input.ipKey);
    const triggerCount = (existing?.trigger_count ?? 0) + 1;
    const permanent = triggerCount >= input.permanentThreshold;
    const nowIso = new Date(input.nowMs).toISOString();
    const row: HoneypotBanRow = {
      ip_key: input.ipKey,
      ip_address: input.ipAddress,
      banned_until: permanent ? null : input.nowMs + input.banDurationMs,
      banned_at: nowIso,
      reason: input.reason,
      trigger_path: input.triggerPath,
      user_agent: input.userAgent,
      trigger_count: triggerCount,
      permanent: permanent ? 1 : 0,
      updated_at: nowIso,
    };
    this.rows.set(input.ipKey, row);
    return row;
  }

  async delete(ipKey: string): Promise<boolean> {
    return this.rows.delete(ipKey);
  }

  async countActive(nowMs: number): Promise<number> {
    return Array.from(this.rows.values()).filter(
      (row) => row.permanent === 1 || (row.banned_until ?? 0) >= nowMs
    ).length;
  }

  async clear(): Promise<void> {
    this.rows.clear();
  }
}

const databaseStore: HoneypotBanStore = {
  get: (ipKey) => db.getHoneypotBan(ipKey),
  register: (input) => db.registerHoneypotTrigger(input),
  delete: (ipKey) => db.deleteHoneypotBan(ipKey),
  countActive: (nowMs) => db.countActiveHoneypotBans(nowMs),
  clear: () => db.clearHoneypotBans(),
};

export class HoneypotManager {
  private blockedCache = new Map<string, BannedIpRecord>();
  private negativeCache = new Map<string, number>();

  constructor(
    private banDurationMs = DEFAULT_BAN_DURATION_MS,
    private store: HoneypotBanStore = new MemoryHoneypotBanStore(),
    private permanentThreshold = DEFAULT_PERMANENT_THRESHOLD
  ) {}

  public isHoneypotPath(pathname: string): boolean {
    if (!pathname) return false;
    const cleanPath = pathname.split('?')[0].split('#')[0];
    return HONEYPOT_PATH_PATTERNS.some((pattern) => pattern.test(cleanPath));
  }

  public getIpKey(ip: string): string {
    return createHmac('sha256', config.jwtSecret).update(ip).digest('hex');
  }

  public async isIpBlocked(ip: string): Promise<boolean> {
    if (!ip || WHITELISTED_IPS.has(ip)) return false;
    const ipKey = this.getIpKey(ip);
    const now = Date.now();
    const cached = this.blockedCache.get(ipKey);
    if (cached?.permanent || (cached?.bannedUntil ?? 0) >= now) return true;
    if (cached) this.blockedCache.delete(ipKey);

    const lastNegativeCheck = this.negativeCache.get(ipKey) ?? 0;
    if (now - lastNegativeCheck < NEGATIVE_CACHE_TTL_MS) return false;

    const row = await this.store.get(ipKey);
    if (row && (row.permanent === 1 || (row.banned_until ?? 0) >= now)) {
      this.blockedCache.set(ipKey, rowToRecord(row));
      this.negativeCache.delete(ipKey);
      return true;
    }
    this.negativeCache.set(ipKey, now);
    return false;
  }

  public async banIp(
    ip: string,
    triggerPath: string,
    userAgent = '',
    reason = 'Honeypot trap triggered'
  ): Promise<BannedIpRecord | null> {
    if (!ip || WHITELISTED_IPS.has(ip)) return null;
    const ipKey = this.getIpKey(ip);
    const row = await this.store.register({
      ipKey,
      ipAddress: ip,
      triggerPath,
      userAgent,
      reason,
      nowMs: Date.now(),
      banDurationMs: this.banDurationMs,
      permanentThreshold: this.permanentThreshold,
    });
    const record = rowToRecord(row);
    this.blockedCache.set(ipKey, record);
    this.negativeCache.delete(ipKey);
    return record;
  }

  public async unbanIp(ip: string): Promise<boolean> {
    const ipKey = this.getIpKey(ip);
    this.blockedCache.delete(ipKey);
    this.negativeCache.delete(ipKey);
    return this.store.delete(ipKey);
  }

  public async getBanDetails(ip: string): Promise<BannedIpRecord | null> {
    if (!await this.isIpBlocked(ip)) return null;
    const ipKey = this.getIpKey(ip);
    return this.blockedCache.get(ipKey) ?? null;
  }

  public getBlockedCount(): Promise<number> {
    return this.store.countActive(Date.now());
  }

  public async clear(): Promise<void> {
    this.blockedCache.clear();
    this.negativeCache.clear();
    await this.store.clear();
  }
}

/** 全局实例使用共享 SQLite；用户端与管理端进程可读取同一封禁状态。 */
export const honeypotManager = new HoneypotManager(
  DEFAULT_BAN_DURATION_MS,
  databaseStore,
  DEFAULT_PERMANENT_THRESHOLD
);

export async function honeypotMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = getClientIp(req);
  const path = req.path || req.url;

  try {
    // 蜜罐路径优先计次：攻击者在临时封禁期间继续扫描，第三次会直接升级为永久封禁。
    if (honeypotManager.isHoneypotPath(path)) {
      const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
      const record = await honeypotManager.banIp(ip, path, userAgent);
      logger.warn({
        ip,
        ipKey: record?.ipKey.slice(0, 12),
        method: req.method,
        path,
        userAgent: userAgent.slice(0, 300),
        action: record?.permanent ? 'honeypot_ip_permanently_banned' : 'honeypot_ip_temporarily_banned',
        triggerCount: record?.triggerCount,
        permanent: record?.permanent ?? false,
      }, 'Honeypot probe detected and blocked');
      if (record?.permanent) {
        // 只在真正升级/保持永久封禁时写安全事件；失败不得改变隐藏式 404 响应。
        void db.recordSecurityEvent({
          eventType: 'honeypot_permanent_ban',
          severity: 'critical',
          requestId: randomUUID(),
          ipAddress: ip,
          userAgent,
          method: req.method,
          route: path,
          statusCode: 404,
          targetType: 'honeypot',
          targetId: record.ipKey.slice(0, 12),
          metadata: { triggerCount: record.triggerCount, permanent: true },
        }).catch((error: unknown) => {
          logger.error({
            err: error instanceof Error ? error.message : String(error),
            ipKey: record.ipKey.slice(0, 12),
          }, 'honeypot security event write failed');
        });
      }
      res.status(404).json({ success: false, message: 'Not Found' });
      return;
    }

    if (await honeypotManager.isIpBlocked(ip)) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }
  } catch (error) {
    // 安全存储异常时仍隐藏蜜罐路径；正常请求则交给后续中间件，避免数据库故障拖垮全站。
    logger.error({ err: error instanceof Error ? error.message : String(error) }, 'honeypot state check failed');
    if (honeypotManager.isHoneypotPath(path)) {
      res.status(404).json({ success: false, message: 'Not Found' });
      return;
    }
  }

  next();
}
