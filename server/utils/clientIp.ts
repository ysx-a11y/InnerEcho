import net from 'node:net';
import type { Request } from 'express';

/**
 * 获取真实客户端 IP（C6）。
 * 生产链路为 Cloudflare → nginx → Express。Express 只信任本机 nginx，
 * nginx 负责校验 Cloudflare 来源并覆盖 X-Forwarded-For；应用不得直接信任
 * 客户端可自行提交的 CF-Connecting-IP / X-Real-IP。
 */
export function getClientIp(req: Request): string {
  return normalizeClientIp(req.ip || req.socket.remoteAddress || '');
}

export function normalizeClientIp(value: string): string {
  let candidate = value.trim();
  if (!candidate) return 'unknown-ip';

  // Express 在部分 Windows/Node 环境下返回 IPv4-mapped IPv6。
  if (candidate.toLowerCase().startsWith('::ffff:')) {
    candidate = candidate.slice(7);
  }
  // 兼容极少数代理输出的 [IPv6] 形式；req.ip 正常不会包含端口。
  if (candidate.startsWith('[') && candidate.endsWith(']')) {
    candidate = candidate.slice(1, -1);
  }

  return net.isIP(candidate) ? candidate.toLowerCase() : 'unknown-ip';
}
