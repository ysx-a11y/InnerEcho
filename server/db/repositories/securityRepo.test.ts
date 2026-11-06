import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseFacade } from '../index.js';
import type { RecordSecurityEventInput } from './securityRepo.js';

const openDatabases: Database.Database[] = [];

function createFacade(): { raw: Database.Database; facade: DatabaseFacade } {
  const raw = new Database(':memory:');
  openDatabases.push(raw);
  return { raw, facade: new DatabaseFacade(raw) };
}

function eventInput(index: number, overrides: Partial<RecordSecurityEventInput> = {}): RecordSecurityEventInput {
  return {
    eventType: 'admin_sensitive_read',
    severity: 'info',
    requestId: `request-${index}`,
    ipAddress: '198.51.100.42',
    userAgent: 'security-repo-test',
    method: 'GET',
    route: '/users',
    statusCode: 200,
    targetType: 'users',
    metadata: { durationMs: index },
    nowMs: 1_000 + index,
    ...overrides,
  };
}

afterEach(() => {
  for (const database of openDatabases.splice(0)) {
    if (database.open) database.close();
  }
});

describe('SecurityRepo security events', () => {
  it('writes bounded metadata and lists filtered, paginated events newest first', async () => {
    const { facade } = createFacade();
    await facade.recordSecurityEvent(eventInput(1));
    const warning = await facade.recordSecurityEvent(eventInput(2, {
      eventType: 'admin_auth_failure',
      severity: 'warning',
      statusCode: 403,
      metadata: { marker: 'safe-metadata' },
    }));
    await facade.recordSecurityEvent(eventInput(3, { severity: 'critical' }));

    expect(warning.sequence).toBe(2);
    expect(JSON.parse(warning.metadata_json)).toEqual({ marker: 'safe-metadata' });

    const firstPage = await facade.listSecurityEvents({ limit: 2, offset: 0 });
    expect(firstPage.total).toBe(3);
    expect(firstPage.items.map((item) => item.sequence)).toEqual([3, 2]);
    expect(firstPage.chainValid).toBe(true);

    const filtered = await facade.listSecurityEvents({
      eventType: 'admin_auth_failure',
      severity: 'warning',
      limit: 10,
      offset: 0,
    });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].id).toBe(warning.id);
  });

  it('keeps only 90 days while preserving a valid retained-range chain', async () => {
    const { facade } = createFacade();
    const day = 24 * 60 * 60 * 1_000;
    await facade.recordSecurityEvent(eventInput(1, { nowMs: day }));
    await facade.recordSecurityEvent(eventInput(2, { nowMs: 89 * day }));
    await facade.recordSecurityEvent(eventInput(3, { nowMs: 92 * day }));

    const result = await facade.listSecurityEvents({ limit: 10, offset: 0 });
    expect(result.items.map((item) => item.request_id)).toEqual(['request-3', 'request-2']);
    expect(result.chainValid).toBe(true);
  });

  it('verifies an empty table and detects field edits, row deletion and chain-state edits', async () => {
    const { raw, facade } = createFacade();
    expect(await facade.verifySecurityEventChain()).toBe(true);

    await facade.recordSecurityEvent(eventInput(1));
    await facade.recordSecurityEvent(eventInput(2));
    expect(await facade.verifySecurityEventChain()).toBe(true);

    raw.prepare("UPDATE security_events SET route = '/tampered' WHERE sequence = 1").run();
    expect(await facade.verifySecurityEventChain()).toBe(false);
    raw.prepare("UPDATE security_events SET route = '/users' WHERE sequence = 1").run();
    expect(await facade.verifySecurityEventChain()).toBe(true);

    raw.prepare('DELETE FROM security_events WHERE sequence = 1').run();
    expect(await facade.verifySecurityEventChain()).toBe(false);

    await facade.clearSecurityEvents();
    await facade.recordSecurityEvent(eventInput(3));
    raw.prepare('UPDATE security_event_chain_state SET event_count = 999 WHERE id = 1').run();
    expect(await facade.verifySecurityEventChain()).toBe(false);
  });

  it('serializes rapid appends and reports SQLite write failures', async () => {
    const { raw, facade } = createFacade();
    await Promise.all(Array.from({ length: 25 }, (_, index) => (
      facade.recordSecurityEvent(eventInput(index, { nowMs: 10_000 + index }))
    )));
    const result = await facade.listSecurityEvents({ limit: 50, offset: 0 });
    expect(result.total).toBe(25);
    expect(new Set(result.items.map((item) => item.sequence)).size).toBe(25);
    expect(result.chainValid).toBe(true);

    raw.close();
    await expect(facade.recordSecurityEvent(eventInput(99))).rejects.toThrow();
  });
});
