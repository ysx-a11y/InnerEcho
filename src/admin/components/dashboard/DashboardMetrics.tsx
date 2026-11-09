import React, { useMemo, useRef, useState } from 'react';
import { Activity, Terminal, ShieldCheck, Layers } from 'lucide-react';
import type { AdminOverview } from '../../adminTypes';
import { formatDuration } from '../../adminApi';
import { cn } from '../../lib/utils';

interface DashboardMetricsProps {
  overview: AdminOverview | null;
  rangeLabel: string;
}

/**
 * 语义化自适应微光聚光灯 Bento 卡片：
 * 严格使用项目的 bg-card / text-foreground / border-border / var(--primary) 语义变量，
 * 完美融入亮色与暗色模式，并随主题配色皮肤实时联动，不再突兀割裂。
 */
const SpotlightBentoCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos((p) => ({ ...p, active: false }))}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground p-4 sm:p-5 shadow-xs transition-all duration-300 hover:border-primary/35 hover:shadow-md',
        className
      )}
    >
      {/* 顶部主题色微光细线 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      {/* 鼠标跟随径向微光（自动跟随当前主题 primary 色值） */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: pos.active ? 1 : 0,
          background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, color-mix(in oklch, var(--primary) 10%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative z-10 flex h-full flex-col justify-between">{children}</div>
    </div>
  );
};

/**
 * 单个 SVG 环形进度表（自适应亮/暗色与主题色）
 */
const NeonGaugeRing: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex size-13 items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 52 52">
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth="3.5"
          />
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            className="stroke-emerald-500 dark:stroke-emerald-400"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>
        <span className="absolute font-mono text-xs font-bold tracking-tight text-foreground">
          {clamped}
        </span>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
        {label}
      </span>
    </div>
  );
};

/**
 * 概览大盘 Bento 实时遥测指挥舱（严格绑定所选时段 rangeLabel，仅将全站累计作为辅助参考）
 */
export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ overview, rangeLabel }) => {
  const currentPeriod = overview?.selectedPeriod || overview?.today;
  const cardExports = overview?.eventStats?.find((e) => e.eventType === 'export_card');

  const totalDossiers = overview?.totals.dossiers ?? 0;
  const totalUsers = overview?.totals.users ?? 0;
  const periodTasksCompleted = overview?.tasksCompleted ?? 0;

  const visits = currentPeriod?.visits ?? 0;
  const visitors = currentPeriod?.visitors ?? 0;
  const users = currentPeriod?.users ?? 0;
  const dossiers = currentPeriod?.dossiers ?? 0;
  const uniquePeople = currentPeriod?.uniquePeople ?? 0;
  const exports = cardExports?.count ?? 0;

  // 1. 左卡：平滑 SVG 面积脉冲折线（基于近 7 天真实 PV 序列与当前时段脉冲）
  const sparkline = useMemo(() => {
    const raw = (overview?.weekly ?? []).map((d) => d.pv ?? 0);
    const base = raw.length >= 2 ? raw : [0, 0, 0, 0, 0, 0, visits];
    const points: number[] = [];
    for (let i = 0; i < base.length; i++) {
      const curr = base[i];
      const next = base[i + 1];
      points.push(curr);
      if (next !== undefined) {
        points.push(Math.round((curr + next) / 2));
      }
    }

    const maxVal = Math.max(...points, 10);
    const minVal = Math.min(...points, 0);
    const span = Math.max(maxVal - minVal, 1);
    const width = 420;
    const height = 88;
    const padTop = 12;
    const padBottom = 8;
    const usableH = height - padTop - padBottom;

    const coords = points.map((v, idx) => {
      const x = (idx / Math.max(points.length - 1, 1)) * (width - 8) + 4;
      const y = padTop + usableH - ((v - minVal) / span) * usableH;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), v };
    });

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = Number(((p0.x + p1.x) / 2).toFixed(1));
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const last = coords[coords.length - 1];
    const areaD = `${d} L ${last.x} ${height} L ${coords[0].x} ${height} Z`;

    return { linePath: d, areaPath: areaD, last, width, height };
  }, [overview?.weekly, visits]);

  // 2. 右上卡：四维质量环真实百分比计算（严格基于所选时段数据，无样本时归 0）
  const qualityScores = useMemo(() => {
    const recent = overview?.recent ?? [];
    const avgCred =
      recent.length > 0
        ? Math.round(
            recent.reduce((acc, item) => acc + (item.credibilityScore || 0), 0) / recent.length
          )
        : 0;

    const depthList = overview?.depthDistribution ?? [];
    const totalDepth = depthList.reduce((acc, item) => acc + item.count, 0);
    const deepCount = depthList
      .filter((item) => item.rating === 'deep' || item.rating === 'medium')
      .reduce((acc, item) => acc + item.count, 0);
    const deepRate = totalDepth > 0 ? Math.round((deepCount / totalDepth) * 100) : 0;

    const userConvRate =
      visitors > 0
        ? Math.min(100, Math.round((uniquePeople / visitors) * 100))
        : uniquePeople > 0
          ? 100
          : 0;

    const auditList = overview?.auditDistribution ?? [];
    const totalAudit = auditList.reduce((acc, item) => acc + item.count, 0);
    const flaggedCount = auditList
      .filter((item) => item.status === 'flagged')
      .reduce((acc, item) => acc + item.count, 0);
    const cleanRate =
      totalAudit > 0 ? Math.round(((totalAudit - flaggedCount) / totalAudit) * 100) : 0;

    return [
      { label: '可信度', score: avgCred },
      { label: '深潜率', score: deepRate },
      { label: '完成率', score: userConvRate },
      { label: '合规率', score: cleanRate },
    ];
  }, [overview, visitors, uniquePeople]);

  // 3. 右下卡：16 柱均衡器脉冲条高度（基于近 7 天真实提交与所选时段卷宗量）
  const pulseBars = useMemo(() => {
    const submits = (overview?.weekly ?? []).map((w) => w.submit ?? 0);
    const seed = submits.length > 0 ? submits : [0, 0, 0, 0, 0, 0, dossiers];
    const maxS = Math.max(...seed, dossiers, 1);
    const bars: number[] = [];
    for (let i = 0; i < 16; i++) {
      const v = seed[i % seed.length];
      const ratio = v > 0 ? 0.25 + (v / maxS) * 0.65 : 0.16;
      bars.push(Math.min(0.92, Math.max(0.16, ratio)));
    }
    bars[15] = dossiers > 0 ? Math.min(0.96, Math.max(0.35, dossiers / maxS)) : 0.16;
    return bars;
  }, [overview?.weekly, dossiers]);

  const recentTwo = (overview?.recent ?? []).slice(0, 2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 w-full">
      {/* ==================== 左卡：流量脉冲与发光面积曲线 (5 cols) ==================== */}
      <SpotlightBentoCard className="lg:col-span-5 min-h-[268px]">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Activity className="size-3.5 text-primary" />
              <span>{rangeLabel}全站访问脉冲</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {visits.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-muted-foreground">PV</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              独立访客 <strong className="text-foreground font-semibold">{visitors.toLocaleString()}</strong>
              <span className="mx-1.5 opacity-40">·</span>
              归档卷宗 <strong className="text-foreground font-semibold">{dossiers.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* 主题色自适应面积折线图 */}
        <div className="my-2.5">
          <svg
            viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
            className="w-full h-22 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="bentoSparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1="22"
              x2={sparkline.width}
              y2="22"
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <line
              x1="0"
              y1="54"
              x2={sparkline.width}
              y2="54"
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <path d={sparkline.areaPath} fill="url(#bentoSparkGrad)" />
            <path
              d={sparkline.linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle
              cx={sparkline.last.x}
              cy={sparkline.last.y}
              r="5.5"
              fill="var(--primary)"
              fillOpacity="0.25"
            />
            <circle
              cx={sparkline.last.x}
              cy={sparkline.last.y}
              r="3"
              fill="var(--background)"
              stroke="var(--primary)"
              strokeWidth="2.2"
            />
          </svg>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>7d window</span>
            <span>{rangeLabel}</span>
          </div>
        </div>

        {/* 底部 2x2 细分实时指标 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border/60 pt-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {rangeLabel}独立访客
            </span>
            <span className="font-semibold text-foreground whitespace-nowrap">
              {visitors.toLocaleString()} 人
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {rangeLabel}填报卷宗
            </span>
            <span className="font-semibold text-foreground whitespace-nowrap">
              {dossiers.toLocaleString()} 份
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {rangeLabel}新增会员
            </span>
            <span className="font-semibold text-foreground whitespace-nowrap">
              {users.toLocaleString()} 人
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {rangeLabel}角色卡导出
            </span>
            <span className="font-semibold text-foreground whitespace-nowrap">
              {exports.toLocaleString()} 张
            </span>
          </div>
        </div>
      </SpotlightBentoCard>

      {/* ==================== 中卡：实时卷宗归档流 (4 cols) ==================== */}
      <SpotlightBentoCard className="lg:col-span-4 min-h-[268px]">
        <div className="flex items-center justify-between pb-2.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Terminal className="size-3.5 text-primary" />
            <span>{rangeLabel}卷宗归档流</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
        </div>

        <div className="flex-1 rounded-xl border border-border/60 bg-muted/40 dark:bg-muted/20 p-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="text-foreground font-medium">
              <span className="text-primary mr-1.5">$</span>
              innerecho status --range={rangeLabel}
            </div>
            <div>
              <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">✓</span>
              {rangeLabel}归档 <strong className="text-foreground">{dossiers.toLocaleString()}</strong> 份卷宗（
              独立受测 {uniquePeople.toLocaleString()} 人）
            </div>
            <div>
              <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">✓</span>
              {rangeLabel}新增探索者 <strong className="text-foreground">{users.toLocaleString()}</strong> 人 · 任务完成{' '}
              {periodTasksCompleted.toLocaleString()} 次
            </div>

            <div className="pt-1 text-foreground font-medium">
              <span className="text-primary mr-1.5">$</span>
              tail -f /var/log/dossier.live
            </div>

            {recentTwo.length > 0 ? (
              recentTwo.map((d) => (
                <div key={d.id} className="truncate">
                  <span className="text-primary mr-1.5">&gt;</span>
                  [{d.nickname || '匿名探索者'}] 耗时 {formatDuration(d.durationSeconds)} · 可信度{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {d.credibilityScore}
                  </span>
                </div>
              ))
            ) : (
              <div>
                <span className="text-primary mr-1.5">&gt;</span>
                {rangeLabel}暂无新提交卷宗，实时监听中...
              </div>
            )}

            <div className="text-[10px] text-muted-foreground/80">
              <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">✓</span>
              全站累计基线: {totalDossiers.toLocaleString()} 份卷宗 / {totalUsers.toLocaleString()} 名用户
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 text-foreground flex items-center">
            <span className="text-primary mr-1.5">$</span>
            <span>watch --telemetry-hub</span>
            <span className="ml-1.5 inline-block h-3.5 w-1.5 bg-primary animate-pulse" />
          </div>
        </div>
      </SpotlightBentoCard>

      {/* ==================== 右列：四联质量圆环 + 脉冲均衡器 (3 cols) ==================== */}
      <div className="lg:col-span-3 flex flex-col gap-2.5 sm:gap-3">
        {/* 右上卡：四维质量环形仪表 */}
        <SpotlightBentoCard className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>{rangeLabel}卷宗质量指数</span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{rangeLabel}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {qualityScores.map((item) => (
              <NeonGaugeRing key={item.label} score={item.score} label={item.label} />
            ))}
          </div>
        </SpotlightBentoCard>

        {/* 右下卡：所选时段样本与末端高亮脉冲柱 */}
        <SpotlightBentoCard className="flex-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Layers className="size-3.5 text-primary" />
              <span>{rangeLabel}归档卷宗样本</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="my-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {dossiers.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-muted-foreground">份</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              全站累计 <strong className="text-foreground font-semibold">{totalDossiers.toLocaleString()}</strong> 份
            </span>
          </div>

          {/* 16 根主题色自适应脉冲柱（最后一根高亮） */}
          <div className="mt-2 flex h-11 items-end justify-between gap-1 pt-1">
            {pulseBars.map((ratio, idx) => {
              const isLast = idx === pulseBars.length - 1;
              return (
                <div
                  key={idx}
                  style={{ height: `${Math.round(ratio * 100)}%` }}
                  className={cn(
                    'flex-1 rounded-full transition-all duration-500',
                    isLast
                      ? 'bg-primary shadow-sm'
                      : 'bg-primary/20 group-hover:bg-primary/35'
                  )}
                />
              );
            })}
          </div>
        </SpotlightBentoCard>
      </div>
    </div>
  );
};

export default DashboardMetrics;
