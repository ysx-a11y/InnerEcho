/**
 * 构建期 SEO 静态落地页与 Sitemap 生成器：
 *
 * 1. 为每个公开题库生成独立静态 HTML 落地页 `public/banks/<bankId>.html`（包含维度说明、前 4 道真实样题预览、结构化 JSON-LD 与开测 CTA）；
 * 2. 生成题库总览索引页 `public/banks/index.html`；
 * 3. 自动将所有题库静态页与心理探索文章汇总更新至 `public/sitemap.xml`。
 *
 * 注意：`public/banks/` 在 `.gitignore` 中忽略，不在 Git 仓库中硬编码题库正文，仅在构建/开发期由 `npm run gen:banks` 动态生成。
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE_ORIGIN = 'https://secret.neural-node.xyz';
const PUBLIC_DIR = path.resolve('public');
const BANKS_PUBLIC_DIR = path.join(PUBLIC_DIR, 'banks');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

export interface SeoBankInput {
  id: string;
  listedInSelector: boolean;
  isPublished: boolean;
  displayRank: number;
  updatedAt?: string;
  card?: Record<string, any> | null;
  bank: {
    title: string;
    subtitle?: string;
    description?: string;
    category?: string;
    badge?: string;
    badgeColor?: string;
    estimatedMinutes?: number;
    dimensions?: Array<{
      key: string;
      name: string;
      description?: string;
    }>;
    questions?: Array<{
      id: string;
      title: string;
      type?: string;
      placeholder?: string;
      options?: Array<{ id: string; text: string }>;
    }>;
  };
}

const STATIC_ARTICLES: Array<{ slug: string; title: string }> = [
  { slug: 'contrast-personality-test.html', title: '反差人格测试：为什么表里不一不是虚伪？' },
  { slug: 'contrast-confession.html', title: '反差自白：为什么匿名写下隐秘渴望更真实？' },
  { slug: 'contrast-questionnaire.html', title: '反差问卷：50 道题如何测出表里不一的你？' },
  { slug: 'bdsm-tendency-test.html', title: 'BDSM 倾向测试：如何读懂支配、臣服与隐秘渴望' },
  { slug: 'why-do-good-girls-want-to-lose-control.html', title: '为什么越乖的人越想失控？' },
  { slug: 'shadow-self-psychology.html', title: '阴影自我：如何面对自己不被看见的一面' },
  { slug: 'anonymous-psychology-questionnaire.html', title: '匿名心理问卷：为什么匿名比面对面更诚实？' },
];

const CATEGORY_LABEL: Record<string, string> = {
  scenario: '情境切片卷宗',
  direct: '真实自白卷宗',
  preference: '权责谱系量表',
  scientific: '心相镜像量表',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toIsoDate(value?: string): string {
  if (value && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return '2026-08-21';
}

function buildBankPageHtml(item: SeoBankInput, allListed: SeoBankInput[]): string {
  const b = item.bank;
  const card = item.card ?? b;
  const title = String(card.title || b.title || item.id);
  const subtitle = String(card.subtitle || b.subtitle || '');
  const description = String(card.description || b.description || subtitle || title);
  const badge = String(card.badge || b.badge || '深度测评');
  const categoryName = CATEGORY_LABEL[String(card.category || b.category || '')] || '深度心理测评';
  const questionCount = Array.isArray(b.questions) ? b.questions.length : 0;
  const estimatedMinutes = Number(card.estimatedMinutes || b.estimatedMinutes || 10);
  const dimensions = Array.isArray(b.dimensions) && b.dimensions.length > 0
    ? b.dimensions
    : Array.isArray(card.dimensions)
      ? card.dimensions
      : [];
  const sampleQuestions = (b.questions ?? []).slice(0, 4);
  const canonicalUrl = `${SITE_ORIGIN}/banks/${item.id}.html`;
  const startUrl = `/?bank=${encodeURIComponent(item.id)}#/explore`;

  const dimensionKeywords = dimensions.map((d: { name: string }) => d.name).join('、');
  const rawMetaDesc = `《${title}》${subtitle ? `（${subtitle}）` : ''}：${description} 本卷宗共 ${questionCount} 道题，重点测量${
    dimensionKeywords || '反差张力与潜意识臣服倾向'
  }，支持全程匿名作答并生成专属高奢自白诊断海报。`;
  const seoMetaDesc = rawMetaDesc.length > 158 ? `${rawMetaDesc.slice(0, 155)}…` : rawMetaDesc;

  const keywords = [
    title,
    categoryName,
    badge.replace(/\s*·\s*/g, ','),
    dimensions.map((d: { name: string }) => d.name).join(','),
    '反差人格测试,隐秘渴望,BDSM倾向测试,镜界自白',
  ]
    .filter(Boolean)
    .join(',');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: title,
    headline: `${title} - ${subtitle || badge}`,
    description,
    url: canonicalUrl,
    educationalUse: 'Self-Assessment',
    inLanguage: 'zh-CN',
    numberOfQuestions: questionCount,
    timeRequired: `PT${estimatedMinutes}M`,
    author: {
      '@type': 'Organization',
      name: '镜界自白',
      url: `${SITE_ORIGIN}/`,
    },
    publisher: {
      '@type': 'Organization',
      name: '镜界自白',
      url: `${SITE_ORIGIN}/`,
      logo: `${SITE_ORIGIN}/apple-touch-icon.png`,
    },
    hasPart: sampleQuestions.map((q, idx) => ({
      '@type': 'Question',
      position: idx + 1,
      name: q.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.options?.[0]?.text || q.placeholder || '开放式匿名深度自白作答',
      },
    })),
  };

  const dimensionItemsHtml = dimensions
    .map(
      (dim: { name: string; description?: string }) =>
        `<li><strong>${escapeHtml(dim.name)}：</strong>${escapeHtml(
          dim.description || `测量个体在「${dim.name}」维度上的潜意识张力与真实倾向指数。`,
        )}</li>`,
    )
    .join('\n        ');

  const sampleQuestionsHtml = sampleQuestions
    .map((q, idx) => {
      const isChoice = Array.isArray(q.options) && q.options.length > 0;
      const optionsHtml = isChoice
        ? `<ul class="sample-options">\n${q
            .options!.slice(0, 4)
            .map((opt) => `            <li>${escapeHtml(opt.text)}</li>`)
            .join('\n')}\n          </ul>`
        : `<p class="sample-confession-hint">【深度手写自白题】${escapeHtml(
            q.placeholder || '匿名写下你在此情境下的真实生理与心理反应…',
          )}</p>`;

      return `        <div class="sample-q-card">
          <div class="sample-q-head">样题 0${idx + 1} / 共 ${questionCount} 题 · ${
            isChoice ? '情境单选' : '深度自白'
          }</div>
          <h3>${escapeHtml(q.title)}</h3>
          ${optionsHtml}
        </div>`;
    })
    .join('\n');

  const otherBanksHtml = allListed
    .filter((other) => other.id !== item.id)
    .slice(0, 5)
    .map(
      (other) =>
        `        <a href="${escapeHtml(other.id)}.html">${escapeHtml(
          String((other.card ?? other.bank).title),
        )}（${escapeHtml(String((other.card ?? other.bank).badge || '深度测评'))}）</a>`,
    )
    .join('\n');

  const articlesHtml = STATIC_ARTICLES.slice(0, 4)
    .map(
      (art) =>
        `        <a href="/articles/${art.slug}">${escapeHtml(art.title)}</a>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}｜匿名测评卷宗与样题预览 - 镜界自白</title>
  <meta name="description" content="${escapeHtml(seoMetaDesc)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta name="theme-color" content="#120716" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="镜界自白" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="author" content="镜界自白" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:site_name" content="镜界自白" />
  <meta property="og:title" content="${escapeHtml(title)} - 镜界自白匿名测评" />
  <meta property="og:description" content="${escapeHtml(seoMetaDesc)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${SITE_ORIGIN}/og-cover.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@fanchawen" />
  <meta name="twitter:title" content="${escapeHtml(title)} - 镜界自白匿名测评" />
  <meta name="twitter:description" content="${escapeHtml(seoMetaDesc)}" />
  <meta name="twitter:image" content="${SITE_ORIGIN}/og-cover.png" />
  <link rel="stylesheet" href="/articles/theme.css" />
  <style>
    .sample-q-card{margin:1rem 0;padding:1.05rem 1.15rem;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,112,166,.22)}
    .sample-q-head{font-size:.74rem;font-weight:700;color:#ff85b3;letter-spacing:.04em;margin-bottom:.35rem}
    .sample-q-card h3{margin:.2rem 0 .65rem;font-size:.98rem;line-height:1.6;color:#fff}
    .sample-options{margin:0;padding-left:1.2rem;color:#d9c6e0;font-size:.88rem}
    .sample-options li{margin:.32rem 0;line-height:1.55}
    .sample-confession-hint{margin:.3rem 0 0;padding:.55rem .75rem;border-radius:8px;background:rgba(225,0,255,.08);border:1px dashed rgba(255,112,166,.3);font-size:.84rem;color:#e6c8dc}
    .badge-pill{display:inline-block;padding:.18rem .65rem;border-radius:999px;background:rgba(255,112,166,.16);border:1px solid rgba(255,112,166,.38);color:#ff9ec7;font-weight:700;font-size:.75rem}
  </style>
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body>
  <div class="wrap">
    <header class="site">
      <a class="logo" href="/"><span class="mark">镜</span>镜界自白</a>
      <nav class="crumbs"><a href="/">首页</a> / <a href="/banks/">测评题库总览</a> / ${escapeHtml(title)}</nav>
    </header>

    <article class="card">
      <div class="meta">
        <span class="badge-pill">${escapeHtml(badge)}</span>
        <span>${escapeHtml(categoryName)}</span>
        <span>共 ${questionCount} 道题</span>
        <span>预计 ${estimatedMinutes} 分钟完成</span>
      </div>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="lead">${escapeHtml(subtitle)}</p>` : ''}

      <h2>卷宗背景与测评说明</h2>
      <p>${escapeHtml(description)}</p>
      <p>本卷宗支持匿名作答，完成后将结合你的人前社会形象与卷宗作答轨迹，计算各维度潜意识倾向得分，并生成专属高奢诊断海报与暗面深度判词。</p>

      ${
        dimensionItemsHtml
          ? `<h2>核心心理测量维度</h2>\n      <ul>\n        ${dimensionItemsHtml}\n      </ul>`
          : ''
      }

      <div class="cta">
        <p>准备好直面这份卷宗里的真实自己了吗？全程匿名保护，即刻生成你的专属诊断报告。</p>
        <a href="${startUrl}">立即开启本卷宗匿名测评 →</a>
      </div>

      <h2>卷宗真实样题预览（节选前 ${sampleQuestions.length} 题）</h2>
      <p>以下为《${escapeHtml(title)}》卷宗中的前 ${sampleQuestions.length} 道真实题目预览（完整测评共 ${questionCount} 题）：</p>
${sampleQuestionsHtml}

      <div class="cta">
        <p>还有 ${Math.max(0, questionCount - sampleQuestions.length)} 道深度递进题目等待解锁，完成后即可保存完整自白卷宗海报。</p>
        <a href="${startUrl}">解锁剩余 ${Math.max(0, questionCount - sampleQuestions.length)} 道题目并生成诊断海报 →</a>
      </div>

      <nav class="related">
        <h2>其他热门测评卷宗</h2>
${otherBanksHtml}
        <a href="/banks/">查看全部 ${allListed.length} 套测评题库总览</a>
      </nav>

      <nav class="related">
        <h2>心理探索指南专栏</h2>
${articlesHtml}
        <a href="/articles/">浏览全部心理探索指南文章</a>
      </nav>
    </article>

    <footer>镜界自白 · 匿名自白频道 <a href="https://t.me/fanchawen" target="_blank" rel="noopener noreferrer">t.me/fanchawen</a> · <a href="/banks/">全部测评题库</a> · <a href="/articles/">心理探索指南</a> · 内容仅供个人趣味探索与娱乐体验参考</footer>
  </div>
</body>
</html>
`;
}

function buildBanksIndexHtml(allListed: SeoBankInput[]): string {
  const canonicalUrl = `${SITE_ORIGIN}/banks/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '镜界自白全部测评题库总览',
    url: canonicalUrl,
    description:
      '汇总镜界自白全部匿名反差人格问卷、情境切片卷宗、真实自白、权责谱系（BDSM 50题）与心相镜像深度量表。',
    hasPart: allListed.map((item) => ({
      '@type': 'Quiz',
      name: String((item.card ?? item.bank).title),
      url: `${SITE_ORIGIN}/banks/${item.id}.html`,
    })),
  };

  const bankCardsHtml = allListed
    .map((item) => {
      const card = item.card ?? item.bank;
      const title = String(card.title || item.bank.title);
      const badge = String(card.badge || item.bank.badge || '深度测评');
      const desc = String(card.description || item.bank.description || '');
      const dims = Array.isArray(card.dimensions || item.bank.dimensions)
        ? (card.dimensions || item.bank.dimensions)
            .map((d: { name: string }) => d.name)
            .join(' / ')
        : '';
      return `      <a class="list-card" href="${escapeHtml(item.id)}.html" style="padding:1rem 1.15rem;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,112,166,.22);margin-bottom:1rem">
        <div style="font-size:.74rem;color:#ff85b3;font-weight:700;margin-bottom:.25rem">${escapeHtml(badge)}${dims ? ` · 测量维度：${escapeHtml(dims)}` : ''}</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(desc)}</p>
      </a>`;
    })
    .join('\n');

  const articlesHtml = STATIC_ARTICLES.map(
    (art) => `        <a href="/articles/${art.slug}">${escapeHtml(art.title)}</a>`,
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>全部测评题库总览：反差人格、情境切片与BDSM倾向测试 - 镜界自白</title>
  <meta name="description" content="镜界自白（InnerEcho）全部匿名测评题库总览：涵盖体面人妻背德日常编年史、社会性死亡边缘、生活主权让渡管教协议、连带折辱亲缘审判、乖乖女失格日常、常态绝缘、心相镜像与标准 BDSM 50 题深度卷宗，提供真实样题预览与多维心理指数测定。" />
  <meta name="keywords" content="反差人格测试,BDSM测试题库,隐秘渴望测试,情境心理测试,臣服倾向测试,镜界自白题库" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta name="theme-color" content="#120716" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:site_name" content="镜界自白" />
  <meta property="og:title" content="镜界自白全部测评题库总览" />
  <meta property="og:description" content="探索情境切片、真实自白、权责谱系与心相镜像全系列匿名测评卷宗。" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${SITE_ORIGIN}/og-cover.png" />
  <link rel="stylesheet" href="/articles/theme.css" />
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body>
  <div class="wrap">
    <header class="site">
      <a class="logo" href="/"><span class="mark">镜</span>镜界自白</a>
      <nav class="crumbs"><a href="/">首页</a> / 测评题库总览</nav>
    </header>

    <article class="card">
      <h1>镜界自白测评题库总览（共 ${allListed.length} 套深度卷宗）</h1>
      <p class="lead">挑选任意一份绝密卷宗，预览真实测评维度与样题，或直接开启匿名潜意识测试生成专属高奢自白海报。</p>

${bankCardsHtml}

      <div class="cta">
        <p>进入交互式题库大厅，自由筛选情境切片、真实自白与标准 50 题卷宗。</p>
        <a href="/#/explore">进入交互式题库大厅 →</a>
      </div>

      <nav class="related">
        <h2>心理探索指南专栏</h2>
${articlesHtml}
        <a href="/articles/">查看心理探索指南全部文章</a>
      </nav>
    </article>

    <footer>镜界自白 · 匿名自白频道 <a href="https://t.me/fanchawen" target="_blank" rel="noopener noreferrer">t.me/fanchawen</a> · <a href="/articles/">心理探索指南</a> · 内容仅供个人趣味探索与娱乐体验参考</footer>
  </div>
</body>
</html>
`;
}

function buildSitemapXml(allListed: SeoBankInput[]): string {
  const latestBankDate =
    allListed
      .map((b) => toIsoDate(b.updatedAt))
      .sort()
      .at(-1) || '2026-08-21';

  const urls: Array<{ loc: string; lastmod: string; changefreq?: string; priority: string }> = [
    { loc: `${SITE_ORIGIN}/`, lastmod: latestBankDate, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_ORIGIN}/banks/`, lastmod: latestBankDate, changefreq: 'weekly', priority: '0.95' },
    ...allListed.map((item) => ({
      loc: `${SITE_ORIGIN}/banks/${item.id}.html`,
      lastmod: toIsoDate(item.updatedAt),
      changefreq: 'weekly',
      priority: '0.9',
    })),
    { loc: `${SITE_ORIGIN}/articles/`, lastmod: '2026-08-21', changefreq: 'weekly', priority: '0.85' },
    ...STATIC_ARTICLES.map((art) => ({
      loc: `${SITE_ORIGIN}/articles/${art.slug}`,
      lastmod: '2026-08-21',
      priority: '0.8',
    })),
  ];

  const urlBlocks = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>${u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlBlocks}\n</urlset>\n`;
}

export function generateSeoPagesAndSitemap(banks: SeoBankInput[]): void {
  const listed = banks
    .filter((b) => b.listedInSelector && b.isPublished)
    .sort((a, b) => a.displayRank - b.displayRank || a.id.localeCompare(b.id));

  fs.rmSync(BANKS_PUBLIC_DIR, { recursive: true, force: true });
  fs.mkdirSync(BANKS_PUBLIC_DIR, { recursive: true });

  fs.writeFileSync(path.join(BANKS_PUBLIC_DIR, 'index.html'), buildBanksIndexHtml(listed), 'utf8');

  for (const item of listed) {
    const html = buildBankPageHtml(item, listed);
    fs.writeFileSync(path.join(BANKS_PUBLIC_DIR, `${item.id}.html`), html, 'utf8');
  }

  fs.writeFileSync(SITEMAP_PATH, buildSitemapXml(listed), 'utf8');
}

