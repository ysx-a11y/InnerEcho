import { describe, it, expect } from 'vitest';
import { isTokenStillValid, type JwtPayload } from './auth.js';

describe('isTokenStillValid', () => {
  it('returns true when invalidatedAt is null (user never changed password)', () => {
    const decoded: JwtPayload = { userId: 'u1', email: 'a@b.c', iat: 1000 };
    expect(isTokenStillValid(decoded, null)).toBe(true);
    expect(isTokenStillValid(decoded, undefined)).toBe(true);
  });

  it('returns false when token has no iat but invalidatedAt is set', () => {
    const decoded: JwtPayload = { userId: 'u1', email: 'a@b.c' };
    expect(isTokenStillValid(decoded, '2025-01-01T00:00:00Z')).toBe(false);
  });

  it('returns true when token was issued after invalidation (current device after password change)', () => {
    // iat = 1700000000 (2023-11-14 22:13:20 UTC)
    // invalidatedAt = 2023-11-14 22:13:18 UTC (2 seconds BEFORE token issued)
    const decoded: JwtPayload = { userId: 'u1', email: 'a@b.c', iat: 1700000000 };
    const invalidatedAt = '2023-11-14T22:13:18.000Z';
    expect(isTokenStillValid(decoded, invalidatedAt)).toBe(true);
  });

  it('returns false when token was issued before invalidation (other devices after password change)', () => {
    // iat = 1700000000 (2023-11-14 22:13:20 UTC)
    // invalidatedAt = 2023-11-14 22:14:00 UTC (40 seconds AFTER token issued)
    const decoded: JwtPayload = { userId: 'u1', email: 'a@b.c', iat: 1700000000 };
    const invalidatedAt = '2023-11-14T22:14:00.000Z';
    expect(isTokenStillValid(decoded, invalidatedAt)).toBe(false);
  });

  it('returns false when token predates invalidation by three seconds', () => {
    const decoded: JwtPayload = { userId: 'u1', email: 'a@b.c', iat: 1700000000 };
    const invalidatedAt = new Date(1700000003 * 1000).toISOString();
    expect(isTokenStillValid(decoded, invalidatedAt)).toBe(false);
  });

  it('returns true when token and invalidation share the same JWT second', () => {
    const decoded: JwtPayload = { userId: 'u1', email: 'a@b.c', iat: 1700000000 };
    const invalidatedAt = new Date(1700000000 * 1000 + 999).toISOString();
    expect(isTokenStillValid(decoded, invalidatedAt)).toBe(true);
  });
});
