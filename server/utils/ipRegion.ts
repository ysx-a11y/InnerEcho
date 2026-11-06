import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IPv4, IPv6, loadContentFromFile, newWithBuffer, type Searcher } from 'ip2region.js';
import { CITY_NAME_TO_CODE } from './regionCodes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEO_DATA_DIR = path.join(__dirname, '..', 'data', 'geo');

let v4Searcher: Searcher | null = null;
let v6Searcher: Searcher | null = null;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) || // CGNAT 100.64.0.0/10
    (parts[0] === 169 && parts[1] === 254) || // link-local 169.254.0.0/16
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

/**
 * 内网/回环/链路本地地址不做归属地查询，避免把开发与代理流量误判成城市。
 */
function isNonPublicIp(ip: string): boolean {
  if (ip.startsWith('::ffff:')) {
    return isPrivateIPv4(ip.slice('::ffff:'.length));
  }
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd');
  }
  return true;
}

function getSearcher(ip: string): Searcher {
  const isIpv6 = ip.includes(':');
  if (isIpv6 && !v6Searcher) {
    const content = loadContentFromFile(path.join(GEO_DATA_DIR, 'ip2region_v6.xdb'));
    v6Searcher = newWithBuffer(IPv6, content);
  }
  if (!isIpv6 && !v4Searcher) {
    const content = loadContentFromFile(path.join(GEO_DATA_DIR, 'ip2region_v4.xdb'));
    v4Searcher = newWithBuffer(IPv4, content);
  }
  return isIpv6 ? v6Searcher! : v4Searcher!;
}

function cityToRegionCode(city: string): string {
  const clean = (city ?? '').trim();
  if (!clean) return '';
  if (CITY_NAME_TO_CODE[clean]) return CITY_NAME_TO_CODE[clean];
  return CITY_NAME_TO_CODE[clean.replace(/市$/, '')] ?? '';
}

/**
 * 从 ip2region 查询结果中提取城市名。
 * 当前 xdb 返回格式为 `国家|省|市|运营商|CN`（例如 `中国|四川省|泸州市|移动|CN`），
 * 城市在索引 2；部分记录省/市缺失时为 `中国|0|0|移动|CN`。
 * 兼容旧 v1 格式 `国家|区域|省|市|运营商`（城市在索引 3）。
 * 只接受以“市”结尾的候选，避免把运营商（移动/电信）误判为城市。
 */
export function extractCityFromRegion(region: string): string {
  const parts = (region ?? '').split('|');
  for (const candidate of [parts[2], parts[3]]) {
    if (candidate && candidate !== '0' && candidate.endsWith('市')) return candidate;
  }
  return '';
}

/**
 * 公开但无法归到中国大陆城市的 IP（海外、代理出口）统一记这个哨兵值。
 *
 * 为什么需要：管理端「访客来源地区分布」按 region_code 分组，若这类访问写成空串，
 * 它们会在统计里凭空消失——今天 99 次访问只有 12 次有地区，就是这个原因
 * （实测当天 48 次埋点里 41 次的访客 IP 在海外，且都是真实浏览器会话）。
 * 单独记一个哨兵值，卡片才能把「海外/代理」和「未识别」显式列出来，总数与访问量对齐。
 */
export const OVERSEAS_REGION_CODE = 'OVERSEAS';

export interface ClientRegion {
  /** 6 位行政区划代码；海外为 OVERSEAS_REGION_CODE；无法判定为空字符串。 */
  code: string;
  kind: 'cn-city' | 'overseas' | 'unknown';
}

/**
 * 把客户端 IP 归类为「中国城市 / 海外 / 未知」。
 * 只返回分类结果，不落库 IP，保持现有的隐私约定。
 */
export async function classifyClientRegion(ip: string | null | undefined): Promise<ClientRegion> {
  const clean = (ip ?? '').trim();
  if (!clean || isNonPublicIp(clean)) return { code: '', kind: 'unknown' };

  try {
    const region = await getSearcher(clean).search(clean);
    if (!region) return { code: '', kind: 'unknown' };
    if (!region.startsWith('中国')) return { code: OVERSEAS_REGION_CODE, kind: 'overseas' };
    const city = extractCityFromRegion(region);
    const code = cityToRegionCode(city);
    return code ? { code, kind: 'cn-city' } : { code: '', kind: 'unknown' };
  } catch {
    return { code: '', kind: 'unknown' };
  }
}

/**
 * 只关心「能不能定位到中国城市」的调用方沿用这个薄封装。
 * 需要区分海外与未知时请直接用 classifyClientRegion。
 */
export async function resolveRegionCode(ip: string | null | undefined): Promise<string> {
  const { code, kind } = await classifyClientRegion(ip);
  return kind === 'cn-city' ? code : '';
}
