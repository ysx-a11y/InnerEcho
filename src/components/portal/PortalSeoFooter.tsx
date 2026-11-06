import React from 'react';
import { BookOpen, Compass } from 'lucide-react';
import { ALL_BANK_METADATA } from '../../data/questionBanks/bankRegistry';

export interface FeaturedBankItem {
  id: string;
  isHero: boolean;
  watermark: string;
  rankLabel?: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  time: string;
  gradient: string;
  borderColor: string;
  cornerOrbColor: string;
  btnBackground?: string;
  btnBorder?: string;
  btnShadow?: string;
}

/**
 * 首页第二层的运营精选题库（三套题库分别赋予绯红玫瑰 / 魅惑电光紫 / 炽烈红宝石三种高定珠宝色温）。
 */
export const FEATURED_BANKS: FeaturedBankItem[] = [
  {
    id: 'wife_taboo_20',
    isHero: true,
    watermark: '01',
    rankLabel: 'TOP 1 · 首推',
    badge: '禁断觉醒 · 20题',
    badgeColor: '#ff5c9e',
    title: '体面人妻的聚会与婚房 · 背德日常编年史',
    subtitle: '餐桌布下的试探、地下车库密令到婚床沦陷与终极物化',
    time: '约 12 分钟',
    gradient:
      'linear-gradient(135deg, rgba(255, 51, 119, 0.16) 0%, rgba(170, 38, 218, 0.08) 48%, rgba(18, 6, 24, 0.86) 100%)',
    borderColor: 'rgba(255, 92, 158, 0.42)',
    cornerOrbColor: 'rgba(255, 51, 119, 0.24)',
  },
  {
    id: 'normal_insulation_18',
    isHero: false,
    watermark: '02',
    badge: '温存厌恶 · 18题',
    badgeColor: '#e879f9',
    title: '恋爱冷感与纯粹折辱沉沦：《常态绝缘》',
    subtitle: '听不进半句情话，却在被撕碎体面、剥夺意志的快感里彻底清醒',
    time: '约 10 分钟',
    gradient:
      'linear-gradient(135deg, rgba(192, 132, 252, 0.15) 0%, rgba(236, 72, 153, 0.07) 48%, rgba(18, 6, 26, 0.86) 100%)',
    borderColor: 'rgba(216, 115, 255, 0.36)',
    cornerOrbColor: 'rgba(192, 38, 211, 0.22)',
    btnBackground:
      'linear-gradient(135deg, rgba(168, 85, 247, 0.38) 0%, rgba(217, 70, 239, 0.44) 52%, rgba(236, 72, 153, 0.42) 100%)',
    btnBorder: '1px solid rgba(232, 121, 249, 0.55)',
    btnShadow: '0 4px 20px rgba(192, 38, 211, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
  },
  {
    id: 'ubk_1786761974188_kup9jc',
    isHero: false,
    watermark: '03',
    badge: '社死极刑 · 15题',
    badgeColor: '#fb7185',
    title: '社会性死亡极刑与尊严崩溃试炼',
    subtitle: '当众失禁、众目睽睽下的检阅、把柄公开与终极羞耻抵抗力评估',
    time: '约 8 分钟',
    gradient:
      'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(159, 18, 57, 0.09) 48%, rgba(20, 6, 22, 0.86) 100%)',
    borderColor: 'rgba(251, 113, 133, 0.38)',
    cornerOrbColor: 'rgba(244, 63, 94, 0.22)',
    btnBackground:
      'linear-gradient(135deg, rgba(225, 29, 72, 0.4) 0%, rgba(244, 63, 94, 0.46) 52%, rgba(192, 38, 211, 0.38) 100%)',
    btnBorder: '1px solid rgba(251, 113, 133, 0.56)',
    btnShadow: '0 4px 20px rgba(225, 29, 72, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
  },
];

const GUIDE_ARTICLES = [
  { href: '/articles/contrast-personality-test.html', label: '反差人格测试：为什么表里不一不是虚伪？' },
  { href: '/articles/contrast-confession.html', label: '反差自白：那些说不出口的隐秘渴望' },
  { href: '/articles/contrast-questionnaire.html', label: '反差问卷：50道题如何测出表里不一的你' },
  { href: '/articles/bdsm-tendency-test.html', label: 'BDSM倾向测试：支配、臣服与隐秘渴望' },
  { href: '/articles/why-do-good-girls-want-to-lose-control.html', label: '为什么越乖的人越想失控？' },
  { href: '/articles/shadow-self-psychology.html', label: '阴影自我：如何面对不被看见的一面' },
  { href: '/articles/anonymous-psychology-questionnaire.html', label: '匿名心理问卷：为什么匿名更诚实' },
] as const;

/**
 * 首页底部 SEO 内链矩阵：
 * 保证 React 挂载替换 `#root` 后，搜索引擎爬虫（Googlebot WRS）依然能在 DOM 中抓取到
 * 指向 `/banks/*.html` 与 `/articles/*.html` 的全部真实 `<a href>` 链接，避免文章与题库沦为孤立页。
 */
export const PortalSeoFooter: React.FC = () => {
  return (
    <footer
      aria-label="测评卷宗档案与心理探索专栏索引"
      style={{
        marginTop: '0.35rem',
        padding: '0.85rem 0.95rem',
        borderRadius: 16,
        background: 'rgba(14, 5, 20, 0.58)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.6rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <a
          href="/banks/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.73rem',
            fontWeight: 800,
            color: '#ff9ec7',
            textDecoration: 'none',
          }}
        >
          <Compass size={13} color="#ff70a6" />
          <span>全部测评题库卷宗索引</span>
        </a>

        <a
          href="/articles/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.73rem',
            fontWeight: 800,
            color: '#d8b4fe',
            textDecoration: 'none',
          }}
        >
          <BookOpen size={13} color="#c084fc" />
          <span>心理探索指南专栏</span>
        </a>
      </div>

      {/* 题库静态落地页链接网 */}
      <nav aria-label="公开测评题库预览" style={{ marginBottom: '0.6rem' }}>
        <div
          style={{
            fontSize: '0.64rem',
            fontWeight: 700,
            color: 'rgba(240, 214, 232, 0.55)',
            marginBottom: '0.35rem',
            letterSpacing: '0.04em',
          }}
        >
          热门测评卷宗样题预览：
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.65rem' }}>
          {ALL_BANK_METADATA.map((bank) => (
            <a
              key={bank.id}
              href={`/banks/${bank.id}.html`}
              style={{
                fontSize: '0.68rem',
                color: 'rgba(244, 222, 236, 0.76)',
                textDecoration: 'none',
                lineHeight: 1.5,
              }}
            >
              {bank.title}
            </a>
          ))}
        </div>
      </nav>

      {/* 心理探索专栏文章链接网 */}
      <nav aria-label="心理探索专栏文章">
        <div
          style={{
            fontSize: '0.64rem',
            fontWeight: 700,
            color: 'rgba(240, 214, 232, 0.55)',
            marginBottom: '0.35rem',
            letterSpacing: '0.04em',
          }}
        >
          反差人格与阴影心理学深度阅读：
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.32rem 0.65rem' }}>
          {GUIDE_ARTICLES.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                fontSize: '0.67rem',
                color: 'rgba(216, 190, 232, 0.72)',
                textDecoration: 'none',
                lineHeight: 1.5,
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </footer>
  );
};

