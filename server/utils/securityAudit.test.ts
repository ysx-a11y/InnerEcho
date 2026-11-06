import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db.js';
import {
  adminSecurityAuditMiddleware,
  classifyAdminSecurityRequest,
  detectAdminSecurityAnomaly,
  resetAdminSecurityAuditStateForTests,
} from './securityAudit.js';

class FakeResponse extends EventEmitter {
  statusCode = 200;
  private headers = new Map<string, string | number>();

  setHeader(name: string, value: string | number): void {
    this.headers.set(name.toLowerCase(), value);
  }

  getHeader(name: string): string | number | undefined {
    return this.headers.get(name.toLowerCase());
  }
}

beforeEach(() => {
  resetAdminSecurityAuditStateForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin security audit classification', () => {
  it.each([
    ['POST', '/verify', 200, 'admin_auth_success', 'info'],
    ['POST', '/verify', 401, 'admin_auth_failure', 'warning'],
    ['POST', '/verify', 403, 'admin_auth_failure', 'warning'],
    ['GET', '/users', 401, 'admin_access_denied', 'warning'],
    ['GET', '/dossiers', 403, 'admin_access_denied', 'warning'],
    ['GET', '/banks', 429, 'admin_access_denied', 'critical'],
    ['GET', '/unknown-admin-tool', 404, 'admin_probe', 'warning'],
    ['GET', '/users', 200, 'admin_sensitive_read', 'info'],
    ['GET', '/security-events', 200, 'admin_audit_read', 'info'],
    ['DELETE', '/dossiers/dossier-1', 200, 'admin_mutation', 'critical'],
    ['PATCH', '/users/user-1', 200, 'admin_mutation', 'warning'],
  ] as const)('classifies %s %s %i', (method, route, status, eventType, severity) => {
    expect(classifyAdminSecurityRequest(method, route, status)).toMatchObject({ eventType, severity });
  });

  it('does not audit ordinary successful static or overview reads', () => {
    expect(classifyAdminSecurityRequest('GET', '/', 200)).toBeNull();
    expect(classifyAdminSecurityRequest('GET', '/assets/admin.js', 200)).toBeNull();
    expect(classifyAdminSecurityRequest('GET', '/overview', 200)).toBeNull();
  });
});

describe('adminSecurityAuditMiddleware', () => {
  it('writes only bounded response metadata after finish and never captures token, query or body', async () => {
    const record = vi.spyOn(db, 'recordSecurityEvent').mockResolvedValue({} as never);
    vi.spyOn(db, 'countRecentSecurityEvents').mockResolvedValue(0);
    const req = {
      method: 'DELETE',
      path: '/dossiers/dossier-1',
      originalUrl: '/api/admin/dossiers/dossier-1?search=private-term',
      headers: {
        'user-agent': 'audit-test-agent',
        'x-admin-token': 'must-never-be-recorded',
      },
      body: { secret: 'must-never-be-recorded' },
      ip: '198.51.100.90',
      socket: {},
    } as unknown as Request;
    const res = new FakeResponse();
    res.statusCode = 200;
    res.setHeader('content-length', 42);
    const next = vi.fn();

    adminSecurityAuditMiddleware(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.getHeader('x-request-id')).toEqual(expect.any(String));
    res.emit('finish');

    await vi.waitFor(() => expect(record).toHaveBeenCalledOnce());
    const input = record.mock.calls[0][0];
    expect(input).toMatchObject({
      eventType: 'admin_mutation',
      method: 'DELETE',
      route: '/dossiers/dossier-1',
      statusCode: 200,
      responseBytes: 42,
      targetType: 'dossiers',
      targetId: 'dossier-1',
    });
    const serialized = JSON.stringify(input);
    expect(serialized).not.toContain('must-never-be-recorded');
    expect(serialized).not.toContain('private-term');
  });

  it('does not block the response path when the asynchronous audit write fails', async () => {
    vi.spyOn(db, 'recordSecurityEvent').mockRejectedValue(new Error('database locked'));
    const req = {
      method: 'GET',
      path: '/users',
      headers: {},
      ip: '198.51.100.91',
      socket: {},
    } as unknown as Request;
    const res = new FakeResponse();
    const next = vi.fn();
    adminSecurityAuditMiddleware(req, res as unknown as Response, next);
    res.emit('finish');
    expect(next).toHaveBeenCalledOnce();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('admin anomaly detection', () => {
  it.each([
    ['admin_auth_success', 1, 'admin_new_source', 'warning'],
    ['admin_auth_failure', 3, 'admin_auth_failure_burst', 'critical'],
    ['admin_sensitive_read', 20, 'admin_read_burst', 'critical'],
  ] as const)('records %s anomaly at its threshold', async (eventType, count, anomalyType, severity) => {
    vi.spyOn(db, 'countRecentSecurityEvents').mockResolvedValue(count);
    const record = vi.spyOn(db, 'recordSecurityEvent').mockResolvedValue({} as never);
    await detectAdminSecurityAnomaly({
      eventType,
      requestId: 'anomaly-request',
      ipAddress: '203.0.113.8',
      userAgent: 'anomaly-agent',
      route: '/users',
      nowMs: Date.now(),
    });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      eventType: anomalyType,
      severity,
      metadata: expect.objectContaining({ count }),
    }));
  });
});
