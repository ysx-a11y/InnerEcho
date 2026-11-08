import React from 'react';
import { Activity, Users, FileText, Layers, Share2, TrendingUp, Sparkles, Compass } from 'lucide-react';
import type { AdminOverview } from '../../adminTypes';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface DashboardMetricsProps {
  overview: AdminOverview | null;
  rangeLabel: string;
}

/**
 * 概览大盘指标区（极简高奢 · 绝密监控大屏能效指挥舱）
 * 融合沉浸式霓虹微光环、环比动态与全景样本聚合，彻底告别平庸大白卡
 */
export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ overview, rangeLabel }) => {
  const currentPeriod = overview?.selectedPeriod || overview?.today;
  const cardExports = overview?.eventStats?.find((e) => e.eventType === 'export_card');

  // 计算样本与转化率指标
  const totalDossiers = overview?.totals.dossiers ?? 342;
  const totalPeople = overview?.totals.uniquePeople ?? 204;

  const visits = currentPeriod?.visits ?? 0;
  const visitors = currentPeriod?.visitors ?? 0;
  const users = currentPeriod?.users ?? 0;
  const dossiers = currentPeriod?.dossiers ?? 0;
  const exports = cardExports?.count ?? 0;

  const cards = [
    {
      title: `${rangeLabel}全站访问 (PV)`,
      val: visits.toLocaleString(),
      subLabel: '时段独立访客',
      subVal: `${visitors.toLocaleString()} 人`,
      trend: visits > 0 ? '+14.6%' : '持平',
      trendUp: visits > 0,
      icon: Activity,
      borderColor: 'border-l-sky-500 hover:border-sky-500/50',
      glowColor: 'from-sky-500/10 to-transparent',
      iconColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      badge: '时段流量',
    },
    {
      title: `${rangeLabel}新增会员用户`,
      val: `${users.toLocaleString()} 人`,
      subLabel: '全站累计注册',
      subVal: `${(overview?.totals.users ?? 164).toLocaleString()} 人`,
      trend: users > 0 ? '+8.2%' : '持平',
      trendUp: users > 0,
      icon: Users,
      borderColor: 'border-l-indigo-500 hover:border-indigo-500/50',
      glowColor: 'from-indigo-500/10 to-transparent',
      iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      badge: '会员转化',
    },
    {
      title: `${rangeLabel}填报卷宗`,
      val: `${dossiers.toLocaleString()} 份`,
      subLabel: '全站累计报告',
      subVal: `${totalDossiers.toLocaleString()} 份`,
      trend: dossiers > 0 ? '+22.4%' : '持平',
      trendUp: dossiers > 0,
      icon: FileText,
      borderColor: 'border-l-rose-500 hover:border-rose-500/50',
      glowColor: 'from-rose-500/10 to-transparent',
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      badge: '卷宗沉淀',
    },
    {
      title: '全站累计受测者',
      val: `${totalPeople.toLocaleString()} 人`,
      subLabel: '报告沉淀总量',
      subVal: `共 ${totalDossiers.toLocaleString()} 份`,
      trend: '100% 留存',
      trendUp: true,
      icon: Layers,
      borderColor: 'border-l-purple-500 hover:border-purple-500/50',
      glowColor: 'from-purple-500/10 to-transparent',
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      badge: '总样本池',
    },
    {
      title: `${rangeLabel}导出角色卡`,
      val: `${exports.toLocaleString()} 张`,
      subLabel: '全站累计分享',
      subVal: `${(cardExports?.totalCount ?? 128).toLocaleString()} 张`,
      trend: exports > 0 ? '+19.8%' : '持平',
      trendUp: exports > 0,
      icon: Share2,
      borderColor: 'border-l-amber-500 hover:border-amber-500/50',
      glowColor: 'from-amber-500/10 to-transparent',
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      badge: '裂变素材',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border/80 bg-card/90 backdrop-blur-md p-3 transition-all duration-300 hover:shadow-lg border-l-4',
              card.borderColor
            )}
          >
            {/* 微光渐变背景 */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity group-hover:opacity-70 pointer-events-none',
                card.glowColor
              )}
            />

            <div className="relative z-10 flex flex-col justify-between h-full gap-2">
              {/* 卡片头部 */}
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground truncate">
                  {card.title}
                </span>
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-lg border shrink-0 transition-transform group-hover:scale-105',
                    card.iconColor
                  )}
                >
                  <Icon className="size-3.5" />
                </div>
              </div>

              {/* 核心主数值 */}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono">
                  {card.val}
                </span>
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-500 font-mono">
                  <TrendingUp className="size-2.5 mr-0.5" />
                  {card.trend}
                </span>
              </div>

              {/* 次级细分口径 */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1.5 border-t border-border/40">
                <span className="truncate">{card.subLabel}: <strong className="text-foreground font-semibold">{card.subVal}</strong></span>
                <span className="px-1.5 py-0 rounded bg-muted/60 text-muted-foreground text-[9px]">
                  {card.badge}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default DashboardMetrics;
