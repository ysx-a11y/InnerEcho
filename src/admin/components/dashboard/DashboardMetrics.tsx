import React from 'react';
import { Activity, Users, FileText, Layers, TrendingUp, Share2 } from 'lucide-react';
import type { AdminOverview } from '../../adminTypes';

interface DashboardMetricsProps {
  overview: AdminOverview | null;
  rangeLabel: string;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ overview, rangeLabel }) => {
  const currentPeriod = overview?.selectedPeriod || overview?.today;
  const cardExports = overview?.eventStats?.find((e) => e.eventType === 'export_card');
  const weekly = overview?.weekly ?? [];

  // Mini sparkline derived from the same weekly series as the main trend chart,
  // only rendered for the metric it actually represents (PV / 填报卷宗).
  const generateSparkline = (points: number[], color: string) => {
    if (points.length < 2) return null;
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const width = 68;
    const height = 24;

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / (max - min || 1)) * (height - 4) - 2;
      return `${x},${y}`;
    });

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`sparkGrad_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${coords.join(' ')} ${width},${height}`}
          fill={`url(#sparkGrad_${color.replace('#', '')})`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords.join(' ')}
        />
      </svg>
    );
  };

  const cards = [
    {
      title: `${rangeLabel}访问量 (PV)`,
      val: (currentPeriod?.visits ?? 0).toLocaleString(),
      sub: `独立访客 ${currentPeriod?.visitors ?? 0}`,
      icon: Activity,
      color: '#80f3ff',
      badge: '活跃流量',
      spark: 'pv',
    },
    {
      title: `${rangeLabel}新增用户`,
      val: (currentPeriod?.users ?? 0).toLocaleString(),
      sub: `累计会员 ${overview?.totals.users ?? 0}`,
      icon: Users,
      color: '#ffd180',
      badge: '会员转化',
    },
    {
      title: `${rangeLabel}填报卷宗`,
      val: `${(currentPeriod?.dossiers ?? 0).toLocaleString()} 份`,
      sub: `填报人数 ${currentPeriod?.uniquePeople ?? 0} 人`,
      icon: FileText,
      color: '#ff70a6',
      badge: '卷宗沉淀',
      spark: 'submit',
    },
    {
      title: '全站累计填报总人数',
      val: `${(overview?.totals.uniquePeople ?? 0).toLocaleString()} 人`,
      sub: `累计报告 ${overview?.totals.dossiers ?? 0} 份`,
      icon: Layers,
      color: '#aa26da',
      badge: '总样本池',
      spark: null,
    },
    {
      title: `${rangeLabel}导出角色卡`,
      val: (cardExports?.count ?? 0).toLocaleString(),
      sub: `导出人数 ${cardExports?.devices ?? 0} · 累计 ${cardExports?.totalCount ?? 0} 张`,
      icon: Share2,
      color: '#4ade80',
      badge: '裂变素材',
      spark: null,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '0.85rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="glass-card"
            style={{
              padding: '1rem 1.15rem',
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
              border: `1px solid ${card.color}28`,
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px ${card.color}08`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
                {card.title}
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${card.color}18`,
                  border: `1px solid ${card.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                }}
              >
                <Icon size={14} />
              </div>
            </div>

            {/* Middle row: Big number & Sparkline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '0.2rem 0 0.5rem 0' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {card.val}
              </div>
              <div>
                {card.spark === 'pv' && generateSparkline(weekly.map((w) => w.pv), card.color)}
                {card.spark === 'submit' && generateSparkline(weekly.map((w) => w.submit), card.color)}
              </div>
            </div>

            {/* Bottom subtitle & tag */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>
                {card.sub}
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: 6,
                  background: `${card.color}15`,
                  color: card.color,
                  border: `1px solid ${card.color}30`,
                }}
              >
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
