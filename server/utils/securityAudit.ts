import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { db } from '../db.js';
import { logger } from '../logger.js';
import type { SecurityEventSeverity } from '../db/repositories/securityRepo.js';
import { getClientIp } from './clientIp.js';

interface AuditClassification {
  eventType: string;
  severity: SecurityEventSeverity;
  targetType: string | null;
  targetId: string | null;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const alertCooldowns = new Map<string, number>();

export function classifyAdminSecurityRequest(
  method: string,
  route: string,
  statusCode: number
): AuditClassification | null {
  const parts = route.split('/').filter(Boolean);
  const targetType = parts[0] ?? null;
  const targetId = parts.length >= 2 ? parts[1] : null;

  if (route === '/verify') {
    return {
      eventType: statusCode >= 200 && statusCode < 300 ? 'admin_auth_success' : 'admin_auth_failure',
      severity: statusCode >= 200 && statusCode < 300 ? 'info' : 'warning',
      targetType: 'admin_auth',
      targetId: null,
    };
  }
  if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
    return {
      eventType: 'admin_access_denied',
      severity: statusCode === 429 ? 'critical' : 'warning',
      targetType,
      targetId,
    };
  }
  if (statusCode === 404) {
    return { eventType: 'admin_probe', severity: 'warning', targetType, targetId };
  }
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    return {
      eventType: 'admin_mutation',
      severity: method === 'DELETE' ? 'critical' : 'warning',
      targetType,
      targetId,
    };
  }

  const sensitiveRoots = new Set([
    'users', 'dossiers', 'tasks', 'banks', 'echoes', 'error-logs', 'prompt-templates', 'security-events',
  ]);
  if (method === 'GET' && targetType && sensitiveRoots.has(targetType)) {
    return {
      eventType: targetType === 'security-events' ? 'admin_audit_read' : 'admin_sensitive_read',
      severity: 'info',
      targetType,
      targetId,
    };
  }
  return null;
}

function allowAlert(key: string, nowMs: number): boolean {
  const blockedUntil = alertCooldowns.get(key) ?? 0;
  if (blockedUntil > nowMs) return false;
  alertCooldowns.set(key, nowMs + ALERT_COOLDOWN_MS);
  if (alertCooldowns.size > 1_000) {
    for (const [entryKey, expiry] of alertCooldowns) {
      if (expiry <= nowMs) alertCooldowns.delete(entryKey);
    }
  }
  return true;
}

export async function detectAdminSecurityAnomaly(input: {
  eventType: string;
  requestId: string;
  ipAddress: string;
  userAgent: string;
  route: string;
  nowMs: number;
}): Promise<void> {
  let anomalyType: string | null = null;
  let count = 0;
  let windowMs = TEN_MINUTES_MS;

  if (input.eventType === 'admin_auth_success') {
    windowMs = NINETY_DAYS_MS;
    count = await db.countRecentSecurityEvents(
      input.eventType,
      input.ipAddress,
      input.nowMs - windowMs,
      input.userAgent
    );
    if (count === 1) anomalyType = 'admin_new_source';
  } else if (input.eventType === 'admin_auth_failure') {
    count = await db.countRecentSecurityEvents(input.eventType, input.ipAddress, input.nowMs - windowMs);
    if (count >= 3) anomalyType = 'admin_auth_failure_burst';
  } else if (input.eventType === 'admin_sensitive_read') {
    count = await db.countRecentSecurityEvents(input.eventType, input.ipAddress, input.nowMs - windowMs);
    if (count >= 20) anomalyType = 'admin_read_burst';
  }

  if (!anomalyType || !allowAlert(`${anomalyType}:${input.ipAddress}`, input.nowMs)) return;

  await db.recordSecurityEvent({
    eventType: anomalyType,
    severity: anomalyType === 'admin_new_source' ? 'warning' : 'critical',
    requestId: input.requestId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    method: 'SYSTEM',
    route: input.route,
    statusCode: 0,
    targetType: 'admin',
    metadata: { count, windowSeconds: Math.round(windowMs / 1_000) },
    nowMs: input.nowMs,
  });
  logger.warn(
    { anomalyType, ipAddress: input.ipAddress, requestId: input.requestId, count },
    'admin security anomaly detected'
  );
}

/** 仅供测试隔离异常告警冷却状态。 */
export function resetAdminSecurityAuditStateForTests(): void {
  if (config.nodeEnv === 'test') alertCooldowns.clear();
}

/**
 * 管理端安全审计。只记录元数据，不读取令牌、请求体、搜索词或业务响应正文。
 * 写入发生在响应结束后；审计失败不得影响管理请求本身。
 */
export function adminSecurityAuditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const startedAtMs = Date.now();
  res.setHeader('X-Request-Id', requestId);

  res.once('finish', () => {
    const route = req.path.slice(0, 500) || '/';
    const classification = classifyAdminSecurityRequest(req.method, route, res.statusCode);
    if (!classification) return;

    const ipAddress = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 300);
    const contentLength = Number(res.getHeader('content-length'));
    const responseBytes = Number.isSafeInteger(contentLength) && contentLength >= 0 ? contentLength : null;

    void db.recordSecurityEvent({
      eventType: classification.eventType,
      severity: classification.severity,
      requestId,
      ipAddress,
      userAgent,
      method: req.method,
      route,
      statusCode: res.statusCode,
      targetType: classification.targetType,
      targetId: classification.targetId,
      responseBytes,
      metadata: { durationMs: Math.max(0, Date.now() - startedAtMs) },
    }).then(() => detectAdminSecurityAnomaly({
      eventType: classification.eventType,
      requestId,
      ipAddress,
      userAgent,
      route,
      nowMs: Date.now(),
    })).catch((error: unknown) => {
      logger.error(
        { err: error instanceof Error ? error.message : String(error), requestId },
        'admin security audit write failed'
      );
    });
  });

  next();
}
