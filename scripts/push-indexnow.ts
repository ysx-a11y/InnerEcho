/**
 * 向 Microsoft Bing / IndexNow 主动推送全站 Sitemap URL 列表。
 *
 * 使用方法：线上部署完成后执行 `npm run seo:indexnow`
 */
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'secret.neural-node.xyz';
const KEY = 'b8c027571ca99108795911fa71f2779b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_PATH = path.resolve('public/sitemap.xml');

async function main(): Promise<void> {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('[IndexNow] 找不到 public/sitemap.xml，请先运行 npm run gen:banks');
    process.exit(1);
  }

  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urlList = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());

  if (urlList.length === 0) {
    console.error('[IndexNow] sitemap.xml 中没有解析到任何 URL');
    process.exit(1);
  }

  console.log(`[IndexNow] 正在向 www.bing.com/indexnow 推送 ${urlList.length} 个 URL...`);

  const response = await fetch('https://www.bing.com/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  if (response.ok || response.status === 202) {
    console.log(`[IndexNow] 推送成功 (HTTP ${response.status})！共提交 ${urlList.length} 个页面。`);
  } else {
    const text = await response.text().catch(() => '');
    console.error(`[IndexNow] 推送返回 HTTP ${response.status}: ${text}`);
    process.exit(1);
  }
}

void main();

