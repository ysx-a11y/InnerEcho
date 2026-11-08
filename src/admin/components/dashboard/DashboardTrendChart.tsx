import React, { useEffect, useMemo } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import * as echarts from 'echarts';
import type { AdminOverview } from '../../adminTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useEChartsInstance } from './useECharts';

interface DashboardTrendChartProps {
  weekly: AdminOverview['weekly'];
}

export const DashboardTrendChart: React.FC<DashboardTrendChartProps> = ({ weekly }) => {
  const { containerRef, chartInstance, theme } = useEChartsInstance();

  const dataList = useMemo(() => {
    return (weekly ?? []).map((item) => ({
      label: item.label || item.date || '—',
      pv: item.pv ?? 0,
      submit: item.submit ?? 0,
    }));
  }, [weekly]);

  const summary = useMemo(() => {
    const totalPv = dataList.reduce((sum, d) => sum + d.pv, 0);
    const totalSubmit = dataList.reduce((sum, d) => sum + d.submit, 0);
    const avgRate = totalPv > 0 ? ((totalSubmit / totalPv) * 100).toFixed(1) : '0.0';
    return { totalPv, totalSubmit, avgRate };
  }, [dataList]);

  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || dataList.length === 0) return;

    const labels = dataList.map((d) => d.label);
    const pvData = dataList.map((d) => d.pv);
    const submitData = dataList.map((d) => d.submit);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animationDuration: 750,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: theme.tooltipText,
          fontSize: 12,
        },
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: theme.subTextColor,
          },
          lineStyle: {
            color: theme.subTextColor,
            type: 'dashed',
            width: 1,
          },
        },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const first = params[0] as { name?: string; axisValueLabel?: string };
          const title = first?.name || first?.axisValueLabel || '';
          let pvVal = 0;
          let submitVal = 0;

          const lines = params.map((p: { seriesName?: string; value?: number; color?: unknown }) => {
            const val = Number(p.value ?? 0);
            if (p.seriesName?.includes('PV')) pvVal = val;
            if (p.seriesName?.includes('Submit')) submitVal = val;
            const dotColor = typeof p.color === 'string' ? p.color : '#3b82f6';

            return `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 4px;">
                <span style="display: inline-flex; align-items: center; gap: 6px; color: ${theme.subTextColor}; font-size: 11px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor};"></span>
                  ${p.seriesName || ''}
                </span>
                <span style="font-weight: 600; font-size: 12px; color: ${theme.tooltipText};">
                  ${val.toLocaleString()}
                </span>
              </div>
            `;
          });

          const rate = pvVal > 0 ? ((submitVal / pvVal) * 100).toFixed(1) : '0.0';

          return `
            <div style="min-width: 160px;">
              <div style="font-weight: 600; font-size: 12px; border-bottom: 1px solid ${theme.borderColor}; padding-bottom: 4px; margin-bottom: 6px; color: ${theme.tooltipText};">
                ${title}
              </div>
              ${lines.join('')}
              <div style="margin-top: 6px; pt-1; border-top: 1px dashed ${theme.borderColor}; padding-top: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                <span style="color: ${theme.subTextColor};">完成转化率</span>
                <span style="font-weight: 600; color: #10b981;">${rate}%</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        textStyle: {
          color: theme.subTextColor,
          fontSize: 11,
        },
      },
      grid: {
        top: 36,
        right: 12,
        bottom: 8,
        left: 8,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: theme.axisLineColor,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: theme.subTextColor,
          fontSize: 11,
          margin: 10,
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: {
          lineStyle: {
            color: theme.splitLineColor,
            type: 'dashed',
          },
        },
        axisLabel: {
          color: theme.subTextColor,
          fontSize: 11,
        },
      },
      series: [
        {
          name: '页面访问 (PV)',
          type: 'line',
          smooth: 0.35,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#3b82f6',
            borderWidth: 2,
            borderColor: theme.isDark ? '#0f172a' : '#ffffff',
          },
          lineStyle: {
            width: 2.5,
            color: '#3b82f6',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.35)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.01)' },
            ]),
          },
          data: pvData,
        },
        {
          name: '卷宗提交 (Submit)',
          type: 'line',
          smooth: 0.35,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#f43f5e',
            borderWidth: 2,
            borderColor: theme.isDark ? '#0f172a' : '#ffffff',
          },
          lineStyle: {
            width: 2.5,
            color: '#f43f5e',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(244, 63, 94, 0.35)' },
              { offset: 1, color: 'rgba(244, 63, 94, 0.01)' },
            ]),
          },
          data: submitData,
        },
      ],
    };

    chart.setOption(option, true);
  }, [dataList, theme, chartInstance]);

  return (
    <Card className="shadow-xs border-border/80 flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">近 7 天流量与填报趋势分析</CardTitle>
            </div>
            <CardDescription className="mt-1">
              页面浏览量 (PV) 与 50 题深度卷宗完成量对比
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal gap-1 bg-muted/40">
              <TrendingUp className="size-3 text-emerald-500" />
              <span>7天均转率</span>
              <span className="font-semibold text-foreground">{summary.avgRate}%</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1 pb-4">
        {dataList.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
            暂无近 7 天趋势数据
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-56" />
        )}
      </CardContent>
    </Card>
  );
};
