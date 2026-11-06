/**
 * 爬虫/机器人识别（用于访问统计过滤与 API 防抓取辅助）。
 *
 * 注意：UA 可被伪造，本模块只用于统计清洗和降低爬虫噪音，
 * 不是安全边界；真正的数据保护靠鉴权与服务端存储。
 */

const BOT_UA_PATTERNS: RegExp[] = [
  // 主流搜索引擎爬虫
  /\bbingbot\b/i,
  /\bgooglebot\b/i,
  /\bgoogle-inspectiontool\b/i,
  /\bapplebot\b/i,
  /\bduckduckbot\b/i,
  /\bbaiduspider\b/i,
  /\byandexbot\b/i,
  /\byandex\b/i,
  /\bsogou\b/i,
  /\b360spider\b/i,
  /\bpetalbot\b/i,
  /\bfacebookexternalhit\b/i,
  /\btwitterbot\b/i,
  /\blinkedinbot\b/i,
  /\bslurp\b/i,
  // AI 训练/抓取爬虫
  /\bbytespider\b/i,
  /\bgptbot\b/i,
  /\bchatgpt-user\b/i,
  /\bopenai\b/i,
  /\bclaudebot\b/i,
  /\banthropic-ai\b/i,
  /\bccbot\b/i,
  /\bcommoncrawl\b/i,
  /\bamazonbot\b/i,
  /\bapplebot-extended\b/i,
  /\bmeta-externalagent\b/i,
  /\bgoogle-extended\b/i,
  // SEO/监控爬虫
  /\bsemrushbot\b/i,
  /\bahrefsbot\b/i,
  /\bmj12bot\b/i,
  /\bexabot\b/i,
  /\bdotbot\b/i,
  /\brogerbot\b/i,
  // 命令行/脚本/无头浏览器（非人类）
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bpython-requests\b/i,
  /\bpostmanruntime\b/i,
  /\bheadlesschrome\b/i,
  /\bphantomjs\b/i,
  /\bzgrab\b/i,
  // 兜底泛匹配（放在最后）
  /\b(crawler|spider|scraper)\b/i,
  /\bbot\b/i,
];

/** 判断 User-Agent 是否来自爬虫/机器人。空 UA 视为未知而非机器人，避免误伤隐私用户。 */
export function isBotUserAgent(userAgent: string | undefined | null): boolean {
  if (!userAgent || userAgent.trim().length === 0) return false;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
