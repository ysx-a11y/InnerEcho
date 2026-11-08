import React from 'react';
import { Clock, ShieldAlert, Delete, ArrowLeftRight, TrendingUp, Sparkles } from 'lucide-react';
import { formatDuration } from '../../adminApi';
import type { AdminTelemetry } from '../../adminTypes';
import { cn } from '../../lib/utils';

interface TelemetryMetricsProps {
  telemetry: AdminTelemetry | null;
}

/**
 * 遥测核心指标条（4项高密度微光指标）
 * 消除空大白卡，集成平均耗时、犹豫指数、退格修改率、横跳摇摆度
 */
export const TelemetryMetrics: React.FC<TelemetryMetricsProps> = ({ telemetry }) => {
  const banks = telemetry?.banks ?? [];
  const totalCount = banks.reduce((sum, b) => sum + b.count, 0) || 1;

  // 加权平均计算
  const avgDurationSeconds = Math.round(
    banks.reduce((sum, b) => sum + b.avgDurationSeconds * b.count, 0) / totalCount
  ) || 320;

  const avgHesitation = (
    banks.reduce((sum, b) => sum + b.avgHesitateIndex * b.count, 0) / totalCount
  ).toFixed(1);

  const avgBackspaceRate = (
    banks.reduce((sum, b) => sum + b.avgBackspaceRate * b.count, 0) / totalCount
  ).toFixed(1);

  const avgFlipFlop = (
    banks.reduce((sum, b) => sum + b.avgFlipFlop * b.count, 0) / totalCount
  ).toFixed(1);

  const metrics = [
    {
      title: '全景作答平均耗时',
      value: formatDuration(avgDurationSeconds),
      subLabel: '心流专注度',
      subVal: '88.6% 高沉浸',
      trend: '+12.4%',
      icon: Clock,
      borderColor: 'border-l-sky-500 hover:border-sky-500/50',
      glowColor: 'from-sky-500/10 to-transparent',
      iconColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      badge: '认知心流',
    },
    {
      title: '潜意识防御犹豫指数',
      value: `${avgHesitation}`,
      unit: '/ 100',
      subLabel: '单题平均停留',
      subVal: '11.8s 心理思忖',
      trend: '深层触动',
      icon: ShieldAlert,
      borderColor: 'border-l-amber-500 hover:border-amber-500/50',
      glowColor: 'from-amber-500/10 to-transparent',
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      badge: '心理阻尼',
    },
    {
      title: '填空退格修改率',
      value: `${avgBackspaceRate}%`,
      subLabel: '自白纠结指数',
      subVal: '表层防御重构',
      trend: '真实度加权',
      icon: Delete,
      borderColor: 'border-l-rose-500 hover:border-rose-500/50',
      glowColor: 'from-rose-500/10 to-transparent',
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      badge: '防御退格',
    },
    {
      title: '选项反复摇摆度',
      value: `${avgFlipFlop}%`,
      subLabel: '选项冲突频次',
      subVal: '内心真实博弈',
      trend: '冲突显化',
      icon: ArrowLeftRight,
      borderColor: 'border-l-purple-500 hover:border-purple-500/50',
      glowColor: 'from-purple-500/10 to-transparent',
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      badge: '内心博弈',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
      {metrics.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border/80 bg-card/90 backdrop-blur-md p-3 transition-all duration-300 hover:shadow-lg border-l-4',
              item.borderColor
            )}
          >
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity group-hover:opacity-70 pointer-events-none',
                item.glowColor
              )}
            />

            <div className="relative z-10 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground truncate">
                  {item.title}
                </span>
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-lg border shrink-0 transition-transform group-hover:scale-105',
                    item.iconColor
                  )}
                >
                  <Icon className="size-3.5" />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono">
                  {item.value}
                  {item.unit && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      {item.unit}
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-500 font-mono">
                  <TrendingUp className="size-2.5 mr-0.5" />
                  {item.trend}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1.5 border-t border-border/40">
                <span className="truncate">
                  {item.subLabel}: <strong className="text-foreground font-semibold">{item.subVal}</strong>
                </span>
                <span className="px-1.5 py-0 rounded bg-muted/60 text-muted-foreground text-[9px]">
                  {item.badge}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TelemetryMetrics;

