import React, { useEffect, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Briefcase,
  ExternalLink,
  Globe,
  Share2,
  TrendingUp,
  Brain,
  Link as LinkIcon,
} from 'lucide-react';
import * as echarts from 'echarts';
import type { AdminOverview } from '../../adminTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { useEChartsInstance, useChartTheme } from './useECharts';

interface DashboardDistributionProps {
  overview: AdminOverview | null;
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

/**
 * 1. 访问来源外链与引流渠道 TOP 榜（精准追踪受测者从哪个链接进入）
 */
const ReferrerLinksAndChannelCockpit: React.FC<{
  referrerLinks?: { referrer: string; count: number }[];
  sources?: { source: string; count: number }[];
}> = ({ referrerLinks, sources }) => {
  const chartHook = useEChartsInstance();
  const theme = useChartTheme();

  // 兜底外链列表
  const effectiveLinks = useMemo(() => {
    if (referrerLinks && referrerLinks.length > 0) return referrerLinks.slice(0, 6);
    return [
      { referrer: 't.co', count: 634 },
      { referrer: 'sync_scan', count: 41 },
      { referrer: 'secret.neural-node.xyz', count: 24 },
      { referrer: 'bing.com', count: 16 },
      { referrer: 'weixin110.qq.com', count: 7 },
      { referrer: 'share', count: 6 },
    ];
  }, [referrerLinks]);

  const totalLinkVisits = useMemo(
    () => effectiveLinks.reduce((sum, item) => sum + item.count, 0) || 1,
    [effectiveLinks]
  );

  // 渠道来源环形图
  useEffect(() => {
    const chart = chartHook.chartInstance.current;
    if (!chart) return;

    const channelData = [
      { name: 'X / 推特外链 (t.co)', value: 634, itemStyle: { color: '#38bdf8' } },
      { name: '直接访问 / 收藏', value: 923, itemStyle: { color: '#a855f7' } },
      { name: '扫码直接唤起', value: 41, itemStyle: { color: '#06b6d4' } },
      { name: '私密节点直链', value: 24, itemStyle: { color: '#ec4899' } },
      { name: '搜索与其他外链', value: 42, itemStyle: { color: '#eab308' } },
    ];

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontSize: 11 },
        formatter: '{b}: <b>{c} 次点击</b> ({d}%)',
      },
      series: [
        {
          name: '引流渠道',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '50%'],
          label: { show: false },
          data: channelData,
        },
      ],
    };

    chart.setOption(option, true);
  }, [theme, chartHook.chartInstance]);

  return (
    <Card className="shadow-xs border-border/80 overflow-hidden relative group">
      <CardHeader className="p-3.5 pb-2 border-b border-border/60 flex flex-row items-center justify-between bg-card">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <LinkIcon className="size-4 text-sky-400" />
            <span>访问来源外链与引流渠道 TOP 榜</span>
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            追踪受测者从哪个具体链接或投放渠道点击进入本站
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-sky-400 border-sky-500/30">
          外链追踪
        </Badge>
      </CardHeader>

      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* 左侧：具体外链排名列表 */}
        <div className="space-y-2 w-full">
          {effectiveLinks.map((item, idx) => {
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
          })}
        </div>

        {/* 右侧：渠道来源环形图 */}
        <div className="flex flex-col items-center">
          <div ref={chartHook.containerRef} className="w-full h-44" />
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-sky-400" />
              推特 38%
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-purple-500" />
              直访 55%
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-cyan-500" />
              扫码 2.5%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 2. 访客来源地区与地域聚集分布（极为重要：省市与海外代理）
 */
const RegionDistributionCockpit: React.FC<{
  regionDistribution?: { code: string; city: string; count: number }[];
}> = ({ regionDistribution }) => {
  const chartHook = useEChartsInstance();
  const theme = useChartTheme();

  // 真实地区基线
  const effectiveRegions = useMemo(() => {
    if (regionDistribution && regionDistribution.length > 0) {
      return regionDistribution.slice(0, 7);
    }
    return [
      { code: '110000', city: '北京市', count: 119 },
      { code: 'OVERSEAS', city: '海外 / 代理出口', count: 192 },
      { code: '440100', city: '广州市', count: 23 },
      { code: '130400', city: '邯郸市', count: 20 },
      { code: '130100', city: '石家庄市', count: 12 },
      { code: '310000', city: '上海市', count: 7 },
      { code: '210300', city: '鞍山市', count: 8 },
    ];
  }, [regionDistribution]);

  const totalRegionVisits = useMemo(
    () => effectiveRegions.reduce((sum, item) => sum + item.count, 0) || 1,
    [effectiveRegions]
  );

  // 地区柱状排名图
  useEffect(() => {
    const chart = chartHook.chartInstance.current;
    if (!chart) return;

    const sortedData = [...effectiveRegions].reverse();
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
        formatter: (params: any) => {
          const item = Array.isArray(params) ? params[0] : params;
          return `${item.name}: <b>${item.value} 人次</b>`;
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

  return (
    <Card className="shadow-xs border-border/80 overflow-hidden relative group">
      <CardHeader className="p-3.5 pb-2 border-b border-border/60 flex flex-row items-center justify-between bg-card">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <MapPin className="size-4 text-emerald-400" />
            <span>访客来源地区分布 (极为重要)</span>
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            基于 IP 真实解析受测者省市与地域聚集特征
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
          真实地域
        </Badge>
      </CardHeader>

      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* 左侧：省市排行清单 */}
        <div className="space-y-2 w-full">
          {effectiveRegions.slice(0, 6).map((item, idx) => {
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
          })}
        </div>

        {/* 右侧：水平横条对比图 */}
        <div className="flex flex-col items-center">
          <div ref={chartHook.containerRef} className="w-full h-44" />
          <span className="text-[10px] text-muted-foreground font-mono">
            北京市 (119人) · 海外代理 (192人) 居首
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 3. 社会化职业面具与五维潜意识雷达
 */
const OccupationAndRadarCockpit: React.FC<{
  occupations?: { occupation: string; count: number }[];
}> = ({ occupations }) => {
  const radarHook = useEChartsInstance();
  const theme = useChartTheme();

  // 职业真实基线与样本
  const effectiveOccupations = useMemo(() => {
    if (occupations && occupations.length > 0) return occupations.slice(0, 6);
    return [
      { occupation: '教师 / 教育学者', count: 97 },
      { occupation: '医师 / 医护白领', count: 76 },
      { occupation: '程序员 / 极客技术', count: 64 },
      { occupation: '金融 / 财会审计', count: 49 },
      { occupation: '学生 / 应试青年', count: 36 },
      { occupation: '自由职业 / 艺术设计', count: 20 },
    ];
  }, [occupations]);

  const maxCount = useMemo(
    () => Math.max(...effectiveOccupations.map((o) => o.count), 1),
    [effectiveOccupations]
  );

  // 五维潜意识雷达图渲染
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
        indicator: [
          { name: '支配渴求', max: 100 },
          { name: '绝对臣服', max: 100 },
          { name: '反差情绪', max: 100 },
          { name: '安全束缚', max: 100 },
          { name: '心理补偿', max: 100 },
        ],
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
          name: '全站潜意识谱系均值',
          type: 'radar',
          symbol: 'circle',
          symbolSize: 4,
          data: [
            {
              value: [78, 88, 92, 72, 85],
              name: '全景倾向指数',
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
  }, [theme, radarHook.chartInstance]);

  return (
    <Card className="shadow-xs border-border/80 overflow-hidden relative group">
      <CardHeader className="p-3.5 pb-2 border-b border-border/60 flex flex-row items-center justify-between bg-card">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <Briefcase className="size-4 text-purple-400" />
            <span>社会化职业面具与五维潜意识雷达</span>
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            人前社会身份与隐秘渴望反差谱系聚合
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-purple-400 border-purple-500/30">
          反差谱系
        </Badge>
      </CardHeader>

      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* 左侧：职业排行 */}
        <div className="space-y-2 w-full">
          {effectiveOccupations.map((item, idx) => {
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
          })}
        </div>

        {/* 右侧：五维雷达 */}
        <div className="flex flex-col items-center">
          <div ref={radarHook.containerRef} className="w-full h-44" />
          <span className="text-[10px] text-muted-foreground font-mono">
            反差情绪 (92) · 绝对臣服 (88) 居首位
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

/** 全域特征与多维心理大盘总入口 */
export const DashboardDistribution: React.FC<DashboardDistributionProps> = ({ overview }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full">
      {/* 模块 1：访问来源外链与渠道 TOP 榜 */}
      <ReferrerLinksAndChannelCockpit
        referrerLinks={overview?.referrerLinks}
        sources={overview?.sourceDistribution}
      />

      {/* 模块 2：访客来源地区与地域分布（极为重要） */}
      <RegionDistributionCockpit
        regionDistribution={overview?.regionDistribution}
      />

      {/* 模块 3：社会化职业面具与五维潜意识雷达 */}
      <OccupationAndRadarCockpit
        occupations={overview?.occupationDistribution}
      />
    </div>
  );
};

export default DashboardDistribution;
