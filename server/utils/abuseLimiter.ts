import { createHmac } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { config } from '../config.js';
import { db, type AbuseQuotaResult, type ConsumeAbuseQuotaInput } from '../db.js';
import { logger } from '../logger.js';

export type AbuseIdentityType = 'ip' | 'device' | 'user' | 'custom';

export interface AbuseIdentity {
  type: AbuseIdentityType;
  value: string;
}

export interface AbuseLimitPolicy {
  /** 稳定且唯一的业务策略名，例如 special-price-vote。 */
  scope: string;
  windowMs: number;
  maxAttempts: number;
  resolveIdentity: (req: Request) => AbuseIdentity | null;
  message: string;
}

export interface AbuseQuotaStore {
  consume(input: ConsumeAbuseQuotaInput): Promise<AbuseQuotaResult>;
}

const databaseQuotaStore: AbuseQuotaStore = {
  consume: (input) => db.consumeAbuseQuota(input),
};

/** 身份原值不进入配额表；策略名参与摘要，避免不同业务之间发生键碰撞。 */
export function getAbuseIdentityKey(scope: string, identity: AbuseIdentity): string {
  return createHmac('sha256', config.jwtSecret)
    .update(`${scope}:${identity.type}:${identity.value}`)
    .digest('hex');
}

function setRateLimitHeaders(res: Response, result: AbuseQuotaResult): void {
  res.setHeader('RateLimit-Limit', String(result.limit));
  res.setHeader('RateLimit-Remaining', String(result.remaining));
  res.setHeader('RateLimit-Reset', String(Math.max(0, Math.ceil((result.resetAtMs - Date.now()) / 1000))));
}

/**
 * 可复用的持久化反滥用中间件。当前策略可以只解析 IP；后续可在具体路由
 * 切换为账号、设备或组合风险主体，而无需重写计数、并发和响应逻辑。
 */
export function createAbuseLimitMiddleware(
  policy: AbuseLimitPolicy,
  store: AbuseQuotaStore = databaseQuotaStore
): RequestHandler {
  if (policy.maxAttempts < 1 || policy.windowMs < 1) {
    throw new Error(`Invalid abuse limit policy: ${policy.scope}`);
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identity = policy.resolveIdentity(req);
    if (!identity?.value) {
      next();
      return;
    }

    try {
      const result = await store.consume({
        scope: policy.scope,
        identityType: identity.type,
        identityKey: getAbuseIdentityKey(policy.scope, identity),
        nowMs: Date.now(),
        windowMs: policy.windowMs,
        maxAttempts: policy.maxAttempts,
      });
      setRateLimitHeaders(res, result);

      if (!result.allowed) {
        res.status(429).json({ success: false, message: policy.message });
        return;
      }
      next();
    } catch (error) {
      // 当前是轻量风控：安全计数存储异常时优先保持主业务可用，同时留下告警。
      logger.error({
        err: error instanceof Error ? error.message : String(error),
        scope: policy.scope,
        identityType: identity.type,
      }, 'abuse quota check failed');
      next();
    }
  };
}
