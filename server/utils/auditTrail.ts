import { appendFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { SecurityEventChainSnapshot } from '../db/repositories/securityRepo.js';

/**
 * 运维级审计留痕（重新锚定安全事件链等不可逆操作）。
 *
 * 三重留痕，任何一层失败都不影响其余层：
 *  1. security_events 链内事件（数据库内可查，随链备份）；
 *  2. 本文件的 append-only JSONL（独立于数据库，可离线归档）；
 *  3. 结构化 logger（进入 pm2 / 集中式日志）。
 */

export interface SecurityReanchorAuditInput {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'verification_failed';
  durationMs: number;
  before: SecurityEventChainSnapshot;
  after: SecurityEventChainSnapshot;
  auditEventId: string | null;
  finalEventCount: number;
}

export interface SecurityReanchorAuditRecord extends SecurityReanchorAuditInput {
  action: 'security_events.reanchor';
  at: string;
}

function resolveAuditDir(): string {
  const override = process.env.SECURITY_AUDIT_LOG_DIR;
  if (override && override.trim()) return path.resolve(override.trim());
  // 测试环境写到系统临时目录，避免污染仓库内数据目录。
  if (config.nodeEnv === 'test') {
    return path.join(os.tmpdir(), 'innerecho-security-audit-test');
  }
  return path.resolve(process.cwd(), 'server/data/audit');
}

function buildRecord(input: SecurityReanchorAuditInput): SecurityReanchorAuditRecord {
  return {
    action: 'security_events.reanchor',
    at: new Date().toISOString(),
    ...input,
  };
}

/**
 * 追加一条重新锚定审计记录到 JSONL 文件。
 * 返回文件路径；写盘失败时返回 null（调用方仍需保证链内事件与 logger 已记录）。
 */
export async function appendSecurityReanchorAudit(
  input: SecurityReanchorAuditInput
): Promise<string | null> {
  const record = buildRecord(input);
  const targetDir = resolveAuditDir();
  const targetFile = path.join(targetDir, 'security-reanchor.jsonl');
  try {
    await mkdir(targetDir, { recursive: true });
    await appendFile(targetFile, `${JSON.stringify(record)}\n`, { encoding: 'utf8' });
    return targetFile;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), requestId: input.requestId, targetFile },
      'security reanchor audit file write failed'
    );
    return null;
  }
}

/** 供测试读取最近一条审计记录。 */
export async function readLastSecurityReanchorAudit(): Promise<SecurityReanchorAuditRecord | null> {
  const { readFile } = await import('node:fs/promises');
  const targetFile = path.join(resolveAuditDir(), 'security-reanchor.jsonl');
  try {
    const raw = await readFile(targetFile, 'utf8');
    const lines = raw.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]) as SecurityReanchorAuditRecord;
  } catch {
    return null;
  }
}
