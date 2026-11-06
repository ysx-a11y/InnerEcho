import type Database from 'better-sqlite3';

export interface ConsumeAbuseQuotaInput {
  scope: string;
  identityType: string;
  identityKey: string;
  nowMs: number;
  windowMs: number;
  maxAttempts: number;
}

export interface AbuseQuotaResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
}

interface AbuseRateLimitRow {
  request_count: number;
  window_ends_at: number;
}

/**
 * 通用、持久化的反滥用配额仓储。
 * scope 区分业务策略，identity_type/key 允许后续接入账号、设备或风险主体。
 */
export class AbuseRepo {
  constructor(private db: Database.Database) {}

  consumeQuota(input: ConsumeAbuseQuotaInput): AbuseQuotaResult {
    const transaction = this.db.transaction(() => {
      // 配额只服务当前窗口；借助 expiry 索引顺手清理旧主体，避免表无限增长。
      this.db.prepare('DELETE FROM abuse_rate_limits WHERE window_ends_at <= ?').run(input.nowMs);

      const existing = this.db.prepare(`
        SELECT request_count, window_ends_at
        FROM abuse_rate_limits
        WHERE scope = ? AND identity_type = ? AND identity_key = ?
      `).get(input.scope, input.identityType, input.identityKey) as AbuseRateLimitRow | undefined;

      if (!existing || existing.window_ends_at <= input.nowMs) {
        const resetAtMs = input.nowMs + input.windowMs;
        this.db.prepare(`
          INSERT INTO abuse_rate_limits (
            scope, identity_type, identity_key, request_count,
            window_started_at, window_ends_at, updated_at
          ) VALUES (?, ?, ?, 1, ?, ?, ?)
          ON CONFLICT(scope, identity_type, identity_key) DO UPDATE SET
            request_count = 1,
            window_started_at = excluded.window_started_at,
            window_ends_at = excluded.window_ends_at,
            updated_at = excluded.updated_at
        `).run(
          input.scope,
          input.identityType,
          input.identityKey,
          input.nowMs,
          resetAtMs,
          new Date(input.nowMs).toISOString()
        );
        return {
          allowed: true,
          limit: input.maxAttempts,
          remaining: Math.max(0, input.maxAttempts - 1),
          resetAtMs,
        };
      }

      if (existing.request_count >= input.maxAttempts) {
        return {
          allowed: false,
          limit: input.maxAttempts,
          remaining: 0,
          resetAtMs: existing.window_ends_at,
        };
      }

      const requestCount = existing.request_count + 1;
      this.db.prepare(`
        UPDATE abuse_rate_limits
        SET request_count = ?, updated_at = ?
        WHERE scope = ? AND identity_type = ? AND identity_key = ?
      `).run(
        requestCount,
        new Date(input.nowMs).toISOString(),
        input.scope,
        input.identityType,
        input.identityKey
      );
      return {
        allowed: true,
        limit: input.maxAttempts,
        remaining: Math.max(0, input.maxAttempts - requestCount),
        resetAtMs: existing.window_ends_at,
      };
    });

    return transaction();
  }

  clearQuotas(): void {
    this.db.prepare('DELETE FROM abuse_rate_limits').run();
  }
}
