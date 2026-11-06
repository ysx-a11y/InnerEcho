import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { DatabaseFacade, db } from '../db/index.js';
import {
  HoneypotManager,
  honeypotManager,
  honeypotMiddleware,
  type HoneypotBanStore,
} from './honeypot.js';

function databaseStore(facade: DatabaseFacade): HoneypotBanStore {
  return {
    get: (ipKey) => facade.getHoneypotBan(ipKey),
    register: (input) => facade.registerHoneypotTrigger(input),
    delete: (ipKey) => facade.deleteHoneypotBan(ipKey),
    countActive: (nowMs) => facade.countActiveHoneypotBans(nowMs),
    clear: () => facade.clearHoneypotBans(),
  };
}

describe('HoneypotManager', () => {
  let manager: HoneypotManager;

  beforeEach(() => {
    manager = new HoneypotManager(20);
  });

  it('identifies probes without matching valid application routes', () => {
    for (const path of [
      '/.env', '/.env.production', '/.git/config', '/.aws/credentials',
      '/config.yaml', '/dump.tar.gz', '/phpmyadmin/index.php', '/wp-login.php',
      '/actuator/health', '/eval-stdin', '/shell.php', '/api/internal/debug',
      '/api/admin/raw-sql', '/api/v1/system-dump',
    ]) {
      expect(manager.isHoneypotPath(path)).toBe(true);
    }
    for (const path of [
      '/', '/api/banks', '/api/tasks', '/api/auth/login',
      '/api/analyze-dossier', '/articles/contrast-confession.html', '/sitemap.xml',
    ]) {
      expect(manager.isHoneypotPath(path)).toBe(false);
    }
  });

  it('temporarily bans once, permanently bans after the third trigger, and supports unban', async () => {
    const badIp = '203.0.113.195';
    expect(await manager.isIpBlocked(badIp)).toBe(false);

    await manager.banIp(badIp, '/.env', 'scanner/1');
    expect((await manager.getBanDetails(badIp))?.triggerCount).toBe(1);
    expect((await manager.getBanDetails(badIp))?.permanent).toBe(false);

    await manager.banIp(badIp, '/.git/config', 'scanner/1');
    await manager.banIp(badIp, '/wp-login.php', 'scanner/1');
    const permanent = await manager.getBanDetails(badIp);
    expect(permanent?.triggerCount).toBe(3);
    expect(permanent?.permanent).toBe(true);
    expect(permanent?.bannedUntil).toBeNull();

    await manager.banIp(badIp, '/.env.production', 'scanner/2');
    const subsequent = await manager.getBanDetails(badIp);
    expect(subsequent?.triggerCount).toBe(4);
    expect(subsequent?.permanent).toBe(true);

    expect(await manager.unbanIp(badIp)).toBe(true);
    expect(await manager.isIpBlocked(badIp)).toBe(false);
  });

  it('expires a temporary ban and never bans local loopback addresses', async () => {
    const expiringManager = new HoneypotManager(5);
    await expiringManager.banIp('198.51.100.10', '/.env');
    expect(await expiringManager.isIpBlocked('198.51.100.10')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await expiringManager.isIpBlocked('198.51.100.10')).toBe(false);

    for (const ip of ['127.0.0.1', '::1', 'localhost', 'unknown-ip']) {
      expect(await expiringManager.banIp(ip, '/.env')).toBeNull();
      expect(await expiringManager.isIpBlocked(ip)).toBe(false);
    }
  });

  it('shares persisted bans across manager instances and retains the attack IP for auditing', async () => {
    const rawDb = new Database(':memory:');
    const facade1 = new DatabaseFacade(rawDb);
    const facade2 = new DatabaseFacade(rawDb);
    const manager1 = new HoneypotManager(60_000, databaseStore(facade1));
    const manager2 = new HoneypotManager(60_000, databaseStore(facade2));
    const badIp = '198.51.100.77';

    await manager1.banIp(badIp, '/.env');
    expect(await manager2.isIpBlocked(badIp)).toBe(true);

    const persisted = rawDb.prepare('SELECT ip_key, ip_address FROM honeypot_bans').get() as {
      ip_key: string;
      ip_address: string;
    };
    expect(persisted.ip_key).not.toContain(badIp);
    expect(persisted.ip_key).toHaveLength(64);
    expect(persisted.ip_address).toBe(badIp);
    rawDb.close();
  });
});

describe('honeypotMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(async () => {
    await honeypotManager.clear();
    await db.clearSecurityEvents();
    next = vi.fn() as unknown as NextFunction;
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('passes normal requests and blocks a trapped source on subsequent routes', async () => {
    const normalReq = {
      ip: '198.51.100.1',
      path: '/api/tasks',
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: {},
    } as unknown as Request;
    await honeypotMiddleware(normalReq, res as Response, next);
    expect(next).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    const attackerIp = '198.51.100.99';
    const probeReq = {
      ip: attackerIp,
      path: '/.env',
      method: 'GET',
      headers: { 'user-agent': 'curl/7.68.0' },
      socket: {},
    } as unknown as Request;
    await honeypotMiddleware(probeReq, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(404);

    vi.clearAllMocks();
    const blockedReq = {
      ip: attackerIp,
      path: '/api/tasks',
      method: 'GET',
      headers: { 'user-agent': 'Mozilla/5.0' },
      socket: {},
    } as unknown as Request;
    await honeypotMiddleware(blockedReq, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('records a filterable critical event from the third and later permanent triggers', async () => {
    const attackerIp = '198.51.100.111';
    for (const path of ['/.env', '/.git/config', '/wp-login.php', '/api/debug/status']) {
      const req = {
        ip: attackerIp,
        path,
        method: 'GET',
        headers: { 'user-agent': 'persistent-scanner' },
        socket: {},
      } as unknown as Request;
      await honeypotMiddleware(req, res as Response, next);
    }

    await vi.waitFor(async () => {
      const events = await db.listSecurityEvents({
        eventType: 'honeypot_permanent_ban',
        limit: 10,
        offset: 0,
      });
      expect(events.total).toBe(2);
      expect(events.items[0].severity).toBe('critical');
      expect(JSON.parse(events.items[0].metadata_json).triggerCount).toBe(4);
    });
  });
});
