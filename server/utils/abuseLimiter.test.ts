import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { DatabaseFacade } from '../db/index.js';
import { getAbuseIdentityKey } from './abuseLimiter.js';

describe('persistent abuse quota', () => {
  it('shares a quota across facade instances, blocks at the policy limit and resets by window', async () => {
    const rawDb = new Database(':memory:');
    const facade1 = new DatabaseFacade(rawDb);
    const facade2 = new DatabaseFacade(rawDb);
    const rawIp = '198.51.100.88';
    const identityKey = getAbuseIdentityKey('test-vote', { type: 'ip', value: rawIp });
    const baseInput = {
      scope: 'test-vote',
      identityType: 'ip',
      identityKey,
      windowMs: 1_000,
      maxAttempts: 2,
    };

    expect((await facade1.consumeAbuseQuota({ ...baseInput, nowMs: 10_000 })).remaining).toBe(1);
    expect((await facade2.consumeAbuseQuota({ ...baseInput, nowMs: 10_100 })).remaining).toBe(0);
    expect((await facade1.consumeAbuseQuota({ ...baseInput, nowMs: 10_200 })).allowed).toBe(false);

    const reset = await facade2.consumeAbuseQuota({ ...baseInput, nowMs: 11_000 });
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(1);

    const persisted = rawDb.prepare(`
      SELECT identity_key, request_count
      FROM abuse_rate_limits
      WHERE scope = 'test-vote'
    `).get() as { identity_key: string; request_count: number };
    expect(persisted.identity_key).not.toContain(rawIp);
    expect(persisted.identity_key).toHaveLength(64);
    expect(persisted.request_count).toBe(1);
    rawDb.close();
  });

  it('allows the 20th vote, rejects the 21st and restores quota after 24 hours', async () => {
    const rawDb = new Database(':memory:');
    const facade = new DatabaseFacade(rawDb);
    const identityKey = getAbuseIdentityKey('special-price-vote', {
      type: 'ip',
      value: '198.51.100.141',
    });
    const policy = {
      scope: 'special-price-vote',
      identityType: 'ip',
      identityKey,
      windowMs: 24 * 60 * 60 * 1_000,
      maxAttempts: 20,
    };
    const start = 1_000_000;
    let twentieth;
    for (let index = 0; index < 20; index += 1) {
      twentieth = await facade.consumeAbuseQuota({ ...policy, nowMs: start + index });
    }
    expect(twentieth).toMatchObject({ allowed: true, remaining: 0 });
    expect(await facade.consumeAbuseQuota({ ...policy, nowMs: start + 20 })).toMatchObject({
      allowed: false,
      remaining: 0,
    });
    expect(await facade.consumeAbuseQuota({ ...policy, nowMs: start + policy.windowMs })).toMatchObject({
      allowed: true,
      remaining: 19,
    });
    rawDb.close();
  });
});
