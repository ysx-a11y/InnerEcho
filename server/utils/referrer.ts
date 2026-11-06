/**
 * Referrer 来源规范化与分类工具。
 *
 * 隐私约定：只保留来源主机名（hostname）或推广渠道代号，不保留完整 URL 的路径与查询串，
 * 避免把搜索引擎里的用户搜索词一起落库。
 */

const MAX_REFERRER_HOST_LENGTH = 200;

/**
 * 把前端上报的 referrer 字符串安全地归一化为小写主机名或渠道标识。
 * 兼容完整 URL、`//host/path`、以及裸 hostname / 渠道别名。
 */
export function normalizeReferrerHost(input: string | null | undefined): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';

  let host = raw;
  try {
    if (raw.includes('://')) {
      host = new URL(raw).hostname;
    } else if (raw.startsWith('//')) {
      host = new URL(`https:${raw}`).hostname;
    } else if (raw.includes('/')) {
      host = raw.split('/')[0];
    } else if (raw.includes(':')) {
      host = raw.split(':')[0];
    }
  } catch {
    host = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0];
  }

  host = host.toLowerCase().replace(/^www\./, '').trim();
  return host.slice(0, MAX_REFERRER_HOST_LENGTH);
}

/**
 * 把归一化后的主机名或渠道标识归类为可读来源标签。
 */
export function classifyReferrer(host: string | null | undefined): string {
  const h = normalizeReferrerHost(host);
  if (!h) return '直接访问 / 无来源';

  // 微信 / QQ 腾讯生态
  if (h.includes('weixin.qq.com') || h.includes('servicewechat.com') || h === 'weixin' || h.startsWith('wx.')) return '微信 / 公众号 / 内置浏览器';
  if (h.includes('qq.com')) return 'QQ / 腾讯生态';

  // 主流社交与社区平台
  if (h.includes('xiaohongshu.com') || h.includes('xhslink.com') || h.includes('xhs')) return '小红书';
  if (h.includes('weibo.com') || h.includes('weibo.cn') || h === 't.cn') return '新浪微博';
  if (h.includes('zhihu.com') || h.includes('zhimg.com')) return '知乎';
  if (h.includes('douyin.com') || h.includes('iesdouyin.com')) return '抖音';
  if (h.includes('kuaishou.com') || h.includes('kwai.com')) return '快手';
  if (h.includes('bilibili.com') || h.includes('b23.tv')) return '哔哩哔哩 Bilibili';
  if (h.includes('douban.com')) return '豆瓣';
  if (h.includes('v2ex.com')) return 'V2EX';
  if (h.includes('jike') || h.includes('okjike')) return '即刻';

  // 国际社交与通信（Telegram / X / Instagram 等）
  if (
    h.includes('t.me') ||
    h.includes('telegram.org') ||
    h.includes('telegram.me') ||
    h === 'tg' ||
    h === 'telegram' ||
    h.startsWith('tg_') ||
    h.startsWith('telegram_')
  ) {
    return 'Telegram';
  }
  if (h === 't.co' || h.includes('twitter.com') || h.includes('x.com') || h === 'x' || h === 'twitter') return 'X (Twitter)';
  if (h.includes('instagram.com') || h === 'instagram' || h === 'ins') return 'Instagram';
  if (h.includes('reddit.com') || h === 'reddit') return 'Reddit';
  if (h.includes('facebook.com') || h.includes('fb.com') || h === 'fb' || h === 'facebook') return 'Facebook';
  if (h.includes('github.com')) return 'GitHub';

  // 自白卡 / 线下扫码直达（只匹配明确渠道代号，避免误伤普通域名）
  if (h === 'sync_scan' || h === 'ewm' || h.startsWith('ewm.') || h.includes('qrcode')) return '自白卡扫码 (SYNC SCAN)';

  // 搜索引擎
  if (h.includes('google.')) return 'Google 搜索';
  if (h.includes('baidu.')) return '百度搜索';
  if (h.includes('bing.')) return '必应 Bing 搜索';
  if (h.includes('sogou.')) return '搜狗搜索';
  if (h === 'so.com' || h.endsWith('.so.com') || h.includes('360.cn')) return '360 搜索';
  if (h === 'sm.cn' || h.endsWith('.sm.cn')) return '神马搜索';
  if (h.includes('yandex.')) return 'Yandex';
  if (h.includes('duckduckgo.')) return 'DuckDuckGo';

  return `外部引流 (${h})`;
}
