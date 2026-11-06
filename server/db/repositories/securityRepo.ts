import { createHmac, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { config } from '../../config.js';

export interface HoneypotBanRow {
  ip_key: string;
  ip_address: string;
  banned_until: number | null;
  banned_at: string;
  reason: string;
  trigger_path: string;
  user_agent: string;
  trigger_count: number;
  permanent: number;
  updated_at: string;
}

export interface RegisterHoneypotTriggerInput {
  ipKey: string;
  ipAddress: string;
  triggerPath: string;
  userAgent: string;
  reason: string;
  nowMs: number;
  banDurationMs: number;
  permanentThreshold: number;
}

export type SecurityEventSeverity = 'info' | 'warning' | 'critical';

export interface SecurityEventRow {
  sequence: number;
  id: string;
  event_type: string;
  severity: SecurityEventSeverity;
  request_id: string;
  ip_address: string;
  user_agent: string;
  method: string;
  route: string;
  status_code: number;
  target_type: string | null;
  target_id: string | null;
  response_bytes: number | null;
  metadata_json: string;
  previous_event_hash: string;
  event_hash: string;
  created_at: string;
  created_at_ms: number;
}

export interface RecordSecurityEventInput {
  eventType: string;
  severity: SecurityEventSeverity;
  requestId: string;
  ipAddress: string;
  userAgent?: string;
  method: string;
  route: string;
  statusCode: number;
  targetType?: string | null;
  targetId?: string | null;
  responseBytes?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
  nowMs?: number;
}

export interface SecurityEventListParams {
  eventType?: string;
  severity?: SecurityEventSeverity;
  limit: number;
  offset: number;
}

export interface SecurityEventListResult {
  items: SecurityEventRow[];
  total: number;
  chainValid: boolean;
}

interface SecurityEventChainState {
  id: 1;
  first_sequence: number | null;
  first_previous_hash: string;
  last_sequence: number | null;
  last_event_hash: string;
  event_count: number;
  state_hash: string;
}

type SecurityEventChainBoundary = Omit<SecurityEventChainState, 'id' | 'state_hash'>;

const SECURITY_EVENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const SECURITY_EVENT_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function securityEventHash(previousHash: string, row: Omit<SecurityEventRow, 'sequence' | 'event_hash'>): string {
  return createHmac('sha256', config.jwtSecret)
    .update(JSON.stringify({
      previousHash,
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      requestId: row.request_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      method: row.method,
      route: row.route,
      statusCode: row.status_code,
      targetType: row.target_type,
      targetId: row.target_id,
      responseBytes: row.response_bytes,
      metadataJson: row.metadata_json,
      createdAt: row.created_at,
      createdAtMs: row.created_at_ms,
    }))
    .digest('hex');
}

function securityEventStateHash(state: SecurityEventChainBoundary): string {
  return createHmac('sha256', config.jwtSecret)
    .update(JSON.stringify({
      firstSequence: state.first_sequence,
      firstPreviousHash: state.first_previous_hash,
      lastSequence: state.last_sequence,
      lastEventHash: state.last_event_hash,
      eventCount: state.event_count,
    }))
    .digest('hex');
}

/** 持久化蜜罐与管理端安全审计状态。 */
export class SecurityRepo {
  private lastSecurityEventPruneAtMs = 0;

  constructor(private db: Database.Database) {}

  getHoneypotBan(ipKey: string): HoneypotBanRow | null {
    return (this.db
      .prepare('SELECT * FROM honeypot_bans WHERE ip_key = ?')
      .get(ipKey) as HoneypotBanRow | undefined) ?? null;
  }

  registerHoneypotTrigger(input: RegisterHoneypotTriggerInput): HoneypotBanRow {
    const transaction = this.db.transaction(() => {
      const existing = this.getHoneypotBan(input.ipKey);
      const triggerCount = (existing?.trigger_count ?? 0) + 1;
      const permanent = triggerCount >= input.permanentThreshold;
      const nowIso = new Date(input.nowMs).toISOString();
      const bannedUntil = permanent ? null : input.nowMs + input.banDurationMs;

      this.db.prepare(`
        INSERT INTO honeypot_bans (
          ip_key, ip_address, banned_until, banned_at, reason, trigger_path,
          user_agent, trigger_count, permanent, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ip_key) DO UPDATE SET
          ip_address = excluded.ip_address,
          banned_until = excluded.banned_until,
          banned_at = excluded.banned_at,
          reason = excluded.reason,
          trigger_path = excluded.trigger_path,
          user_agent = excluded.user_agent,
          trigger_count = excluded.trigger_count,
          permanent = excluded.permanent,
          updated_at = excluded.updated_at
      `).run(
        input.ipKey,
        input.ipAddress,
        bannedUntil,
        nowIso,
        input.reason,
        input.triggerPath.slice(0, 500),
        input.userAgent.slice(0, 300),
        triggerCount,
        permanent ? 1 : 0,
        nowIso
      );

      return this.getHoneypotBan(input.ipKey)!;
    });

    return transaction();
  }

  deleteHoneypotBan(ipKey: string): boolean {
    return this.db.prepare('DELETE FROM honeypot_bans WHERE ip_key = ?').run(ipKey).changes > 0;
  }

  countActiveHoneypotBans(nowMs: number): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM honeypot_bans
      WHERE permanent = 1 OR banned_until >= ?
    `).get(nowMs) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  clearHoneypotBans(): void {
    this.db.prepare('DELETE FROM honeypot_bans').run();
  }

  recordSecurityEvent(input: RecordSecurityEventInput): SecurityEventRow {
    const nowMs = input.nowMs ?? Date.now();
    const transaction = this.db.transaction(() => {
      let chain = this.getSecurityEventChainBoundaryForAppend();
      if (nowMs - this.lastSecurityEventPruneAtMs >= SECURITY_EVENT_PRUNE_INTERVAL_MS) {
        const deleted = this.db.prepare('DELETE FROM security_events WHERE created_at_ms < ?')
          .run(nowMs - SECURITY_EVENT_RETENTION_MS);
        if (deleted.changes > 0) {
          const remainingCount = chain.event_count - deleted.changes;
          if (remainingCount < 0) {
            throw new Error('Security event chain count mismatch during retention cleanup');
          }
          const firstRemaining = this.db.prepare(`
            SELECT sequence, previous_event_hash
            FROM security_events ORDER BY sequence ASC LIMIT 1
          `).get() as { sequence: number; previous_event_hash: string } | undefined;
          chain = remainingCount === 0
            ? this.emptySecurityEventChainBoundary()
            : {
                ...chain,
                first_sequence: firstRemaining?.sequence ?? null,
                first_previous_hash: firstRemaining?.previous_event_hash ?? '',
                event_count: remainingCount,
              };
          if (remainingCount > 0 && !firstRemaining) {
            throw new Error('Security event chain head missing during retention cleanup');
          }
          this.writeSecurityEventChainBoundary(chain);
        }
        this.lastSecurityEventPruneAtMs = nowMs;
      }

      const previous = this.db.prepare(`
        SELECT event_hash FROM security_events ORDER BY sequence DESC LIMIT 1
      `).get() as { event_hash: string } | undefined;
      const previousHash = previous?.event_hash ?? '';
      const rawMetadataJson = JSON.stringify(input.metadata ?? {});
      const metadataJson = rawMetadataJson.length <= 2_000
        ? rawMetadataJson
        : JSON.stringify({ truncated: true, originalBytes: Buffer.byteLength(rawMetadataJson) });
      const rowWithoutSequence: Omit<SecurityEventRow, 'sequence' | 'event_hash'> = {
        id: randomUUID(),
        event_type: input.eventType.slice(0, 100),
        severity: input.severity,
        request_id: input.requestId.slice(0, 100),
        ip_address: input.ipAddress.slice(0, 100),
        user_agent: (input.userAgent ?? '').slice(0, 300),
        method: input.method.slice(0, 12),
        route: input.route.slice(0, 500),
        status_code: input.statusCode,
        target_type: input.targetType?.slice(0, 100) ?? null,
        target_id: input.targetId?.slice(0, 200) ?? null,
        response_bytes: input.responseBytes ?? null,
        metadata_json: metadataJson,
        previous_event_hash: previousHash,
        created_at: new Date(nowMs).toISOString(),
        created_at_ms: nowMs,
      };
      const eventHash = securityEventHash(previousHash, rowWithoutSequence);

      const inserted = this.db.prepare(`
        INSERT INTO security_events (
          id, event_type, severity, request_id, ip_address, user_agent,
          method, route, status_code, target_type, target_id, response_bytes,
          metadata_json, previous_event_hash, event_hash, created_at, created_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rowWithoutSequence.id,
        rowWithoutSequence.event_type,
        rowWithoutSequence.severity,
        rowWithoutSequence.request_id,
        rowWithoutSequence.ip_address,
        rowWithoutSequence.user_agent,
        rowWithoutSequence.method,
        rowWithoutSequence.route,
        rowWithoutSequence.status_code,
        rowWithoutSequence.target_type,
        rowWithoutSequence.target_id,
        rowWithoutSequence.response_bytes,
        rowWithoutSequence.metadata_json,
        rowWithoutSequence.previous_event_hash,
        eventHash,
        rowWithoutSequence.created_at,
        rowWithoutSequence.created_at_ms
      );

      const sequence = Number(inserted.lastInsertRowid);
      const nextChain: SecurityEventChainBoundary = {
        first_sequence: chain.event_count === 0 ? sequence : chain.first_sequence,
        first_previous_hash: chain.event_count === 0 ? previousHash : chain.first_previous_hash,
        last_sequence: sequence,
        last_event_hash: eventHash,
        event_count: chain.event_count + 1,
      };
      this.writeSecurityEventChainBoundary(nextChain);

      return this.db.prepare('SELECT * FROM security_events WHERE id = ?')
        .get(rowWithoutSequence.id) as SecurityEventRow;
    });
    // IMMEDIATE 在读取链尾前先取得写锁，避免多连接同时读取同一链尾后产生分叉。
    return transaction.immediate();
  }

  listSecurityEvents(params: SecurityEventListParams): SecurityEventListResult {
    const where: string[] = [];
    const values: unknown[] = [];
    if (params.eventType) {
      where.push('event_type = ?');
      values.push(params.eventType);
    }
    if (params.severity) {
      where.push('severity = ?');
      values.push(params.severity);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const items = this.db.prepare(`
      SELECT * FROM security_events
      ${whereSql}
      ORDER BY sequence DESC
      LIMIT ? OFFSET ?
    `).all(...values, params.limit, params.offset) as SecurityEventRow[];
    const totalRow = this.db.prepare(`
      SELECT COUNT(*) AS count FROM security_events ${whereSql}
    `).get(...values) as { count: number };
    return { items, total: totalRow.count, chainValid: this.verifySecurityEventChain() };
  }

  countRecentSecurityEvents(eventType: string, ipAddress: string, sinceMs: number, userAgent?: string): number {
    const userAgentClause = userAgent === undefined ? '' : ' AND user_agent = ?';
    const params = userAgent === undefined
      ? [eventType, ipAddress, sinceMs]
      : [eventType, ipAddress, sinceMs, userAgent];
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM security_events
      WHERE event_type = ? AND ip_address = ? AND created_at_ms >= ?${userAgentClause}
    `).get(...params) as { count: number };
    return row.count;
  }

  verifySecurityEventChain(): boolean {
    const rows = this.db.prepare('SELECT * FROM security_events ORDER BY sequence ASC')
      .all() as SecurityEventRow[];
    const state = this.db.prepare('SELECT * FROM security_event_chain_state WHERE id = 1')
      .get() as SecurityEventChainState | undefined;
    if (rows.length === 0) {
      if (!state) return true;
      return state.event_count === 0
        && state.first_sequence === null
        && state.last_sequence === null
        && state.first_previous_hash === ''
        && state.last_event_hash === ''
        && securityEventStateHash(state) === state.state_hash;
    }
    let previousHash = rows[0].previous_event_hash;
    for (const row of rows) {
      if (row.previous_event_hash !== previousHash) return false;
      const { sequence: _sequence, event_hash: eventHash, ...hashable } = row;
      if (securityEventHash(previousHash, hashable) !== eventHash) return false;
      previousHash = eventHash;
    }
    // 兼容极短暂的 v29 -> v30 升级窗口：旧事件没有边界状态时仍可校验事件链；
    // 下一次写入会原子生成带签名的边界状态。
    if (!state) return true;
    if (securityEventStateHash(state) !== state.state_hash) return false;
    return state.first_sequence === rows[0].sequence
      && state.first_previous_hash === rows[0].previous_event_hash
      && state.last_sequence === rows[rows.length - 1].sequence
      && state.last_event_hash === rows[rows.length - 1].event_hash
      && state.event_count === rows.length;
  }

  clearSecurityEvents(): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM security_events').run();
      this.db.prepare('DELETE FROM security_event_chain_state').run();
    });
    transaction.immediate();
    this.lastSecurityEventPruneAtMs = 0;
  }

  private emptySecurityEventChainBoundary(): SecurityEventChainBoundary {
    return {
      first_sequence: null,
      first_previous_hash: '',
      last_sequence: null,
      last_event_hash: '',
      event_count: 0,
    };
  }

  /**
   * 写入热路径只做带签名边界与链首/链尾的常数级检查；完整逐条 HMAC 校验
   * 留给管理端读取。这样篡改不会被新写入“洗白”，也不会每次写入扫描 90 天数据。
   */
  private getSecurityEventChainBoundaryForAppend(): SecurityEventChainBoundary {
    const state = this.db.prepare('SELECT * FROM security_event_chain_state WHERE id = 1')
      .get() as SecurityEventChainState | undefined;
    if (!state) {
      // v29 -> v30 的一次性兼容路径：先验证旧链，再生成带签名边界。
      if (!this.verifySecurityEventChain()) {
        throw new Error('Security event chain verification failed before state bootstrap');
      }
      const boundary = this.summarizeSecurityEventChainBoundary();
      if (boundary.event_count > 0) this.writeSecurityEventChainBoundary(boundary);
      return boundary;
    }
    if (securityEventStateHash(state) !== state.state_hash || state.event_count < 0) {
      throw new Error('Security event chain boundary signature is invalid');
    }
    const first = this.db.prepare(`
      SELECT sequence, previous_event_hash
      FROM security_events ORDER BY sequence ASC LIMIT 1
    `).get() as { sequence: number; previous_event_hash: string } | undefined;
    const last = this.db.prepare(`
      SELECT sequence, event_hash
      FROM security_events ORDER BY sequence DESC LIMIT 1
    `).get() as { sequence: number; event_hash: string } | undefined;
    if (state.event_count === 0) {
      if (first || last || state.first_sequence !== null || state.last_sequence !== null
        || state.first_previous_hash !== '' || state.last_event_hash !== '') {
        throw new Error('Security event chain empty boundary is inconsistent');
      }
    } else if (!first || !last
      || first.sequence !== state.first_sequence
      || first.previous_event_hash !== state.first_previous_hash
      || last.sequence !== state.last_sequence
      || last.event_hash !== state.last_event_hash) {
      throw new Error('Security event chain boundary does not match stored events');
    }
    return {
      first_sequence: state.first_sequence,
      first_previous_hash: state.first_previous_hash,
      last_sequence: state.last_sequence,
      last_event_hash: state.last_event_hash,
      event_count: state.event_count,
    };
  }

  private summarizeSecurityEventChainBoundary(): SecurityEventChainBoundary {
    const summary = this.db.prepare(`
      SELECT
        COUNT(*) AS event_count,
        MIN(sequence) AS first_sequence,
        MAX(sequence) AS last_sequence
      FROM security_events
    `).get() as {
      event_count: number;
      first_sequence: number | null;
      last_sequence: number | null;
    };
    const first = summary.first_sequence === null
      ? undefined
      : this.db.prepare('SELECT previous_event_hash FROM security_events WHERE sequence = ?')
        .get(summary.first_sequence) as { previous_event_hash: string } | undefined;
    const last = summary.last_sequence === null
      ? undefined
      : this.db.prepare('SELECT event_hash FROM security_events WHERE sequence = ?')
        .get(summary.last_sequence) as { event_hash: string } | undefined;
    return {
      first_sequence: summary.first_sequence,
      first_previous_hash: first?.previous_event_hash ?? '',
      last_sequence: summary.last_sequence,
      last_event_hash: last?.event_hash ?? '',
      event_count: summary.event_count,
    };
  }

  private writeSecurityEventChainBoundary(unsigned: SecurityEventChainBoundary): void {
    this.db.prepare(`
      INSERT INTO security_event_chain_state (
        id, first_sequence, first_previous_hash, last_sequence,
        last_event_hash, event_count, state_hash
      ) VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        first_sequence = excluded.first_sequence,
        first_previous_hash = excluded.first_previous_hash,
        last_sequence = excluded.last_sequence,
        last_event_hash = excluded.last_event_hash,
        event_count = excluded.event_count,
        state_hash = excluded.state_hash
    `).run(
      unsigned.first_sequence,
      unsigned.first_previous_hash,
      unsigned.last_sequence,
      unsigned.last_event_hash,
      unsigned.event_count,
      securityEventStateHash(unsigned)
    );
  }
}
