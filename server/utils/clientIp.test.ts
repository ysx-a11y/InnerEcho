import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { getClientIp, normalizeClientIp } from './clientIp.js';

describe('clientIp', () => {
  it('normalizes IPv4, IPv6 and IPv4-mapped IPv6 addresses', () => {
    expect(normalizeClientIp('203.0.113.9')).toBe('203.0.113.9');
    expect(normalizeClientIp('::ffff:203.0.113.9')).toBe('203.0.113.9');
    expect(normalizeClientIp('[2001:db8::1]')).toBe('2001:db8::1');
    expect(normalizeClientIp('not-an-ip')).toBe('unknown-ip');
  });

  it('uses Express req.ip and ignores spoofable forwarding headers', () => {
    const req = {
      ip: '198.51.100.20',
      headers: {
        'cf-connecting-ip': '203.0.113.200',
        'x-real-ip': '203.0.113.201',
      },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    expect(getClientIp(req)).toBe('198.51.100.20');
  });
});
