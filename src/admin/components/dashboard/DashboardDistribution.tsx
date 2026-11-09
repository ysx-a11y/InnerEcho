import React, { useEffect, useMemo } from 'react';
import {
  MapPin,
  Briefcase,
  Link as LinkIcon,
} from 'lucide-react';
import * as echarts from 'echarts';
import type { AdminOverview } from '../../adminTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { useEChartsInstance, useChartTheme } from './useECharts';

interface DashboardDistributionProps {
  overview: AdminOverview | null;
  rangeLabel?: string;
}

/** 来源外链语义分类与友善名称 */
function formatReferrerInfo(raw: string): { label: string; icon: string; category: string } {
  if (!raw || raw === 'direct' || raw === '直接访问 / 无来源') {
    return { label: '直接访问 / 书签直达', icon: '🌐', category: '自主访问' };
  }
  if (raw === 't.co') {
    return { label: 'Twitter / X 社交推文外链', icon: '🐦', category: '社交推特' };
  }
  if (raw === 'secret.neural-node.xyz') {
    return { label: '暗网私密节点投递链接', icon: '🔒', category: '私密直链' };
  }
  if (raw === 'sync_scan') {
    return { label: '线下 / 手机二维码扫码唤醒', icon: '📱', category: '扫码唤醒' };
  }
  if (raw.includes('weixin') || raw.includes('qq.com')) {
    return { label: '微信群聊 / 私聊回音中转', icon: '💬', category: '微信社群' };
  }
  if (raw.includes('bing.com')) {
    return { label: '必应搜索引擎 (Bing)', icon: '🔍', category: '自然搜索' };
  }
  if (raw.includes('google.com')) {
    return { label: '谷歌搜索引擎 (Google)', icon: '🔎', category: '自然搜索' };
  }
  if (raw === 'share') {
    return { label: '自白角色卡海报分享裂变', icon: '✨', category: '海报裂变' };
  }
  return { label: raw, icon: '🔗', category: '站外外链' };
}

const CHANNEL_COLORS = ['#38bdf8', '#a855f7', '#06b6d4', '#ec4899', '#eab308', '#10b981'];

/**
 * 1. 访问来源外链与引流渠道 TOP 榜（严格按所选时段统计）
 */
const ReferrerLinksAndChannelCockpit: React.FC<{
  referrerLinks?: { referrer: string; count: number }[];
  sources?: { source: string; count: number }[];
  rangeLabel: string;
}> = ({ referrerLinks, sources, rangeLabel }) => {
  const chartHook = useEChartsInstance();
  const theme = useChartTheme();

  const effectiveLinks = useMemo(
    () => (referrerLinks ?? []).filter((item) => item.count > 0).slice(0, 6),
    [referrerLinks]
  );

  const totalLinkVisits = useMemo(
    () => effectiveLinks.reduce((sum, item) => sum + item.count, 0) || 1,
    [effectiveLinks]
  );

  const channelItems = useMemo(() => {
    const rawSources = (sources ?? []).filter((item) => item.count > 0);
    if (rawSources.length > 0) {
      return rawSources.slice(0, 6).map((item, idx) => ({
        name: item.source,
        value: item.count,
        color: CHANNEL_COLORS[idx % CHANNEL_COLORS.length],
      }));
    }
    return effectiveLinks.map((item, idx) => ({
      name: formatReferrerInfo(item.referrer).label,
      value: item.count,
      color: CHANNEL_COLORS[idx % CHANNEL_COLORS.length],
    }));
  }, [sources, effectiveLinks]);

  const totalChannelCount = useMemo(
    () => channelItems.reduce((sum, item) => sum + item.value, 0),
    [channelItems]
  );

  useEffect(() => {
    const chart = chartHook.chartInstance.current;
    if (!chart) return;

    const hasChannelData = channelItems.length > 0;
    const pieData = hasChannelData
      ? channelItems.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: item.color },
        }))
      : [
          {
            name: `${rangeLabel}暂无访问来源`,
            value: 1,
            itemStyle: { color: theme.isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.25)' },
          },
        ];

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontSize: 11 },
        formatter: hasChannelData
          ? '{b}: <b>{c} 次点击</b> ({d}%)'
          : `${rangeLabel}暂无访问渠道记录`,
      },
      series: [
        {
          name: '引流渠道',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '50%'],
          label: { show: false },
          data: pieData,
        },
      ],
    };

    chart.setOption(option, true);
  }, [channelItems, rangeLabel, theme, chartHook.chartInstance]);

  return (
    <Card className="shadow-xs border-border/80 overflow-hidden relative group">
      <CardHeader className="p-3.5 pb-2 border-b border-border/60 flex flex-row items-center justify-between bg-card">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <LinkIcon className="size-4 text-sky-400" />
            <span>访问来源外链与引流渠道 TOP 榜</span>
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            {rangeLabel}受测者从哪个具体链接或投放渠道进入本站
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-sky-400 border-sky-500/30">
          {rangeLabel}外链
        </Badge>
      </CardHeader>

      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* 左侧：具体外链排名列表 */}
        <div className="space-y-2 w-full">
          {effectiveLinks.length > 0 ? (
            effectiveLinks.map((item, idx) => {
              const info = formatReferrerInfo(item.referrer);
              const pct = Math.round((item.count / totalLinkVisits) * 100);

              return (
                <div key={`${item.referrer}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="size-4 rounded-full bg-muted flex items-center justify-center font-mono text-[9px] font-bold text-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate block max-w-[150px]" title={info.label}>
                        {info.label}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-foreground shrink-0">
                      {item.count} 次 <span className="text-[9px] text-muted-foreground font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-sky-400 to-indigo-500"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 text-center">
              <span className="text-xs font-medium text-muted-foreground">
                {rangeLabel}暂无外链点击记录
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground/70">
                有新访客进入后将实时按实际来源聚合
              </span>
            </div>
          )}
        </div>

        {/* 右侧：渠道来源环形图 */}
        <div className="flex flex-col items-center">
          <div ref={chartHook.containerRef} className="w-full h-44" />
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground mt-1">
            {channelItems.length > 0 ? (
              channelItems.slice(0, 3).map((item) => {
                const pct =
                  totalChannelCount > 0 ? Math.round((item.value / totalChannelCount) * 100) : 0;
                return (
                  <span key={item.name} className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate max-w-[72px]">{item.name}</span>
                    <span>{pct}%</span>
                  </span>
                );
              })
            ) : (
              <span>{rangeLabel}暂无渠道占比数据</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 2. 访客来源地区与地域聚集分布（严格按所选时段统计）
 */
const RegionDistributionCockpit: React.FC<{
  regionDistribution?: { code: string; city: string; count: number }[];
  rangeLabel: string;
}> = ({ regionDistribution, rangeLabel }) => {
  const chartHook = useEChartsInstance();
  const theme = useChartTheme();

  const effectiveRegions = useMemo(
    () => (regionDistribution ?? []).filter((item) => item.count > 0).slice(0, 7),
    [regionDistribution]
  );

  const totalRegionVisits = useMemo(
    () => effectiveRegions.reduce((sum, item) => sum + item.count, 0) || 1,
    [effectiveRegions]
  );

  useEffect(() => {
    const chart = chartHook.chartInstance.current;
    if (!chart) return;

    const sortedData =
      effectiveRegions.length > 0
        ? [...effectiveRegions].reverse()
        : [{ code: 'NONE', city: '暂无访客', count: 0 }];
    const cities = sortedData.map((d) => d.city.replace(' / 代理出口', ''));
    const counts = sortedData.map((d) => d.count);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontSize: 11 },
        formatter: (params: unknown) => {
          const item = Array.isArray(params) ? params[0] : (params as { name?: string; value?: number });
          return `${item?.name ?? ''}: <b>${item?.value ?? 0} 人次</b>`;
        },
      },
      grid: {
        top: 10,
        right: 20,
        bottom: 20,
        left: 10,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: theme.splitLineColor, type: 'dashed' } },
        axisLabel: { color: theme.subTextColor, fontSize: 9 },
      },
      yAxis: {
        type: 'category',
        data: cities,
        axisLine: { lineStyle: { color: theme.axisLineColor } },
        axisTick: { show: false },
        axisLabel: { color: theme.textColor, fontSize: 10 },
      },
      series: [
        {
          name: '访客量',
          type: 'bar',
          data: counts,
          barWidth: 10,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#06b6d4' },
              { offset: 1, color: '#38bdf8' },
            ]),
          },
        },
      ],
    };

    chart.setOption(option, true);
  }, [effectiveRegions, theme, chartHook.chartInstance]);

  const regionSummaryText = useMemo(() => {
    if (effectiveRegions.length === 0) return `${rangeLabel}暂无地域聚集数据`;
    if (effectiveRegions.length === 1) {
      return `${effectiveRegions[0].city} (${effectiveRegions[0].count}人) 居首`;
    }
    return `${effectiveRegions[0].city} (${effectiveRegions[0].count}人) · ${effectiveRegions[1].city} (${effectiveRegions[1].count}人) 居首`;
  }, [effectiveRegions, rangeLabel]);

  return (
    <Card className="shadow-xs border-border/80 overflow-hidden relative group">
      <CardHeader className="p-3.5 pb-2 border-b border-border/60 flex flex-row items-center justify-between bg-card">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <MapPin className="size-4 text-emerald-400" />
            <span>访客来源地区分布 (极为重要)</span>
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            {rangeLabel}基于 IP 真实解析受测者省市与地域聚集特征
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
          {rangeLabel}地域
        </Badge>
      </CardHeader>

      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* 左侧：省市排行清单 */}
        <div className="space-y-2 w-full">
          {effectiveRegions.length > 0 ? (
            effectiveRegions.slice(0, 6).map((item, idx) => {
              const pct = Math.round((item.count / totalRegionVisits) * 100);

              return (
                <div key={`${item.code}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="size-4 rounded-full bg-muted flex items-center justify-center font-mono text-[9px] font-bold text-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate block max-w-[130px]">
                        {item.city}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-foreground shrink-0">
                      {item.count} 人 <span className="text-[9px] text-muted-foreground font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 text-center">
              <span className="text-xs font-medium text-muted-foreground">
                {rangeLabel}暂无访客地区数据
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground/70">
                产生新访问后将自动解析省市与海外出口分布
              </span>
            </div>
          )}
        </div>

        {/* 右侧：水平横条对比图 */}
        <div className="flex flex-col items-center">
          <div ref={chartHook.containerRef} className="w-full h-44" />
          <span className="text-[10px] text-muted-foreground font-mono text-center">
            {regionSummaryText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 3. 社会化职业面具与五维潜意识雷达（严格按所选时段统计）
 */
const OccupationAndRadarCockpit: React.FC<{
  overview: AdminOverview | null;
  rangeLabel: string;
}> = ({ overview, rangeLabel }) => {
  const radarHook = useEChartsInstance();
  const theme = useChartTheme();

  const effectiveOccupations = useMemo(
    () => (overview?.occupationDistribution ?? []).filter((item) => item.count > 0).slice(0, 6),
    [overview?.occupationDistribution]
  );

  const maxCount = useMemo(
    () => Math.max(...effectiveOccupations.map((o) => o.count), 1),
    [effectiveOccupations]
  );

  // 根据当前所选时段的真实卷宗深度分布、可信度与职业填写率计算五维潜意识雷达
  const radarDimensions = useMemo(() => {
    const periodDossiers = overview?.selectedPeriod?.dossiers ?? 0;
    const depthList = overview?.depthDistribution ?? [];
    const totalDepth = depthList.reduce((acc, item) => acc + item.count, 0);

    if (periodDossiers === 0 && totalDepth === 0) {
      return [
        { name: '深潜觉醒', value: 0 },
        { name: '中度探索', value: 0 },
        { name: '职业敞开', value: 0 },
        { name: '自白可信', value: 0 },
        { name: '任务行动力', value: 0 },
      ];
    }

    const deepCount = depthList.find((d) => d.rating === 'deep')?.count ?? 0;
    const mediumCount = depthList.find((d) => d.rating === 'medium')?.count ?? 0;
    const denom = Math.max(totalDepth, periodDossiers, 1);

    const deepScore = Math.min(100, Math.round((deepCount / denom) * 100));
    const mediumScore = Math.min(100, Math.round((mediumCount / denom) * 100));

    const occCount = (overview?.occupationDistribution ?? []).reduce((s, o) => s + o.count, 0);
    const opennessScore = Math.min(100, Math.round((occCount / denom) * 100));

    const recent = overview?.recent ?? [];
    const credScore =
      recent.length > 0
        ? Math.min(
            100,
            Math.round(recent.reduce((s, r) => s + (r.credibilityScore || 0), 0) / recent.length)
          )
        : 0;

    const taskAccepted = (overview?.taskStats ?? []).reduce((s, t) => s + t.accepted, 0);
    const taskScore = Math.min(100, Math.round((taskAccepted / denom) * 100));

    return [
      { name: '深潜觉醒', value: deepScore },
      { name: '中度探索', value: mediumScore },
      { name: '职业敞开', value: opennessScore },
      { name: '自白可信', value: credScore },
      { name: '任务行动力', value: taskScore },
    ];
  }, [overview]);

  const radarFooterText = useMemo(() => {
    const active = radarDimensions.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    if (active.length === 0) return `${rangeLabel}暂无卷宗谱系样本`;
    if (active.length === 1) return `${active[0].name} (${active[0].value}%) 居首`;
    return `${active[0].name} (${active[0].value}%) · ${active[1].name} (${active[1].value}%) 居首`;
  }, [radarDimensions, rangeLabel]);

  useEffect(() => {
    const chart = radarHook.chartInstance.current;
    if (!chart) return;

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontSize: 11 },
      },
      radar: {
        indicator: radarDimensions.map((d) => ({ name: d.name, max: 100 })),
        center: ['50%', '52%'],
        radius: '68%',
        splitNumber: 4,
        axisName: {
          color: theme.textColor,
          fontSize: 10,
          fontWeight: 600,
        },
        splitArea: {
          areaStyle: {
            color: theme.isDark
              ? ['rgba(168, 85, 247, 0.05)', 'rgba(56, 189, 248, 0.03)']
              : ['rgba(240, 245, 255, 0.5)', 'rgba(255, 255, 255, 0.8)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
        splitLine: {
          lineStyle: {
            color: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
      series: [
        {
          name: `${rangeLabel}潜意识谱系`,
          type: 'radar',
          symbol: 'circle',
          symbolSize: 4,
          data: [
            {
              value: radarDimensions.map((d) => d.value),
              name: `${rangeLabel}倾向指数`,
              itemStyle: { color: '#ec4899' },
              lineStyle: { width: 2, color: '#ec4899' },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(236, 72, 153, 0.45)' },
                  { offset: 1, color: 'rgba(168, 85, 247, 0.15)' },
                ]),
              },
            },
          ],
        },
      ],
    };

    chart.setOption(option, true);
  }, [radarDimensions, rangeLabel, theme, radarHook.chartInstance]);

  return (
    <Card className="shadow-xs border-border/80 overflow-hidden relative group">
      <CardHeader className="p-3.5 pb-2 border-b border-border/60 flex flex-row items-center justify-between bg-card">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <Briefcase className="size-4 text-purple-400" />
            <span>社会化职业面具与五维潜意识雷达</span>
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            {rangeLabel}人前社会身份与隐秘渴望反差谱系聚合
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-purple-400 border-purple-500/30">
          {rangeLabel}画像
        </Badge>
      </CardHeader>

      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* 左侧：职业排行 */}
        <div className="space-y-2 w-full">
          {effectiveOccupations.length > 0 ? (
            effectiveOccupations.map((item, idx) => {
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={`${item.occupation}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="size-4 rounded-full bg-muted flex items-center justify-center font-mono text-[9px] font-bold text-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate block max-w-[140px]">
                        {item.occupation}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-foreground shrink-0">
                      {item.count} 人
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 text-center">
              <span className="text-xs font-medium text-muted-foreground">
                {rangeLabel}暂无职业画像样本
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground/70">
                受测者完成填报后将按真实职业聚合排行
              </span>
            </div>
          )}
        </div>

        {/* 右侧：五维雷达 */}
        <div className="flex flex-col items-center">
          <div ref={radarHook.containerRef} className="w-full h-44" />
          <span className="text-[10px] text-muted-foreground font-mono text-center">
            {radarFooterText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

/** 全域特征与多维心理大盘总入口 */
export const DashboardDistribution: React.FC<DashboardDistributionProps> = ({
  overview,
  rangeLabel = '当前时段',
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full">
      {/* 模块 1：访问来源外链与渠道 TOP 榜 */}
      <ReferrerLinksAndChannelCockpit
        referrerLinks={overview?.referrerLinks}
        sources={overview?.sourceDistribution}
        rangeLabel={rangeLabel}
      />

      {/* 模块 2：访客来源地区与地域分布（极为重要） */}
      <RegionDistributionCockpit
        regionDistribution={overview?.regionDistribution}
        rangeLabel={rangeLabel}
      />

      {/* 模块 3：社会化职业面具与五维潜意识雷达 */}
      <OccupationAndRadarCockpit
        overview={overview}
        rangeLabel={rangeLabel}
      />
    </div>
  );
};

export default DashboardDistribution;
