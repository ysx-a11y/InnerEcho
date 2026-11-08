import React, { useEffect, useMemo } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import * as echarts from 'echarts';
import type { AdminOverview } from '../../adminTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useEChartsInstance } from './useECharts';

interface DashboardFunnelProps {
  overview: AdminOverview | null;
}

export const DashboardFunnel: React.FC<DashboardFunnelProps> = ({ overview }) => {
  const { containerRef, chartInstance, theme } = useEChartsInstance();

  const currentPeriod = overview?.selectedPeriod || overview?.today;
  const visitors = currentPeriod?.visitors ?? 0;
  const users = currentPeriod?.users ?? 0;
  const dossiers = currentPeriod?.dossiers ?? 0;
  const uniquePeople = currentPeriod?.uniquePeople ?? 0;
  const cardExports = overview?.eventStats?.find((e) => e.eventType === 'export_card');
  const cardExporters = cardExports?.devices ?? 0;

  const rateOf = (count: number) =>
    visitors > 0 ? Math.min(100, Math.round((count / visitors) * 100)) : 0;

  const steps = useMemo(
    () => [
      {
        name: '① 探索访客',
        desc: '进入测试首页',
        count: visitors,
        unit: '人',
        rate: visitors > 0 ? '100%' : '0%',
        color: '#0284c7',
      },
      {
        name: '② 身份登记',
        desc: '录入职业与人设',
        count: users,
        unit: '人',
        rate: `${rateOf(users)}%`,
        color: '#6366f1',
      },
      {
        name: '③ 卷宗完成',
        desc: '完成卷宗剖析',
        count: dossiers,
        unit: '份',
        rate: `${rateOf(dossiers)}%`,
        color: '#8b5cf6',
      },
      {
        name: '④ 仪式自白',
        desc: '完成心理自白',
        count: uniquePeople,
        unit: '人',
        rate: `${rateOf(uniquePeople)}%`,
        color: '#ec4899',
      },
      {
        name: '⑤ 导出卡片',
        desc: '生成自白海报',
        count: cardExporters,
        unit: '人',
        rate: `${rateOf(cardExporters)}%`,
        color: '#f43f5e',
      },
    ],
    [visitors, users, dossiers, uniquePeople, cardExporters]
  );

  const overallRate = visitors > 0 ? ((cardExporters / visitors) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    // 当所有漏斗计数值均为 0 时，构建等阶梯视觉占位，避免漏斗塌陷
    const hasData = steps.some((s) => s.count > 0);
    const funnelData = steps.map((s, idx) => ({
      name: s.name,
      value: hasData ? Math.max(s.count, 1) : 100 - idx * 18,
      realCount: s.count,
      rate: s.rate,
      desc: s.desc,
      unit: s.unit,
      itemStyle: {
        color: s.color,
        borderColor: theme.isDark ? '#0f172a' : '#ffffff',
        borderWidth: 2,
        borderRadius: 4,
      },
    }));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animationDuration: 750,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: theme.tooltipText,
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const p = params as {
            data?: {
              name: string;
              realCount: number;
              rate: string;
              desc: string;
              unit: string;
            };
            color?: unknown;
          };
          const data = p?.data;
          if (!data) return '';
          const dotColor = typeof p.color === 'string' ? p.color : '#6366f1';

          return `
            <div style="min-width: 170px;">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; color: ${theme.tooltipText}; border-bottom: 1px solid ${theme.borderColor}; padding-bottom: 4px; margin-bottom: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor};"></span>
                <span>${data.name}</span>
              </div>
              <div style="font-size: 11px; color: ${theme.subTextColor}; margin-bottom: 6px;">
                ${data.desc}
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
                <span style="color: ${theme.subTextColor};">漏斗到达:</span>
                <span style="font-weight: 600; color: ${theme.tooltipText};">${data.realCount.toLocaleString()} ${data.unit}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
                <span style="color: ${theme.subTextColor};">全链转化率:</span>
                <span style="font-weight: 600; color: #10b981;">${data.rate}</span>
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          name: '全链路转化漏斗',
          type: 'funnel',
          left: '5%',
          top: 10,
          bottom: 10,
          width: '90%',
          min: 0,
          max: hasData ? Math.max(...steps.map((s) => s.count), 1) : 100,
          minSize: '24%',
          maxSize: '100%',
          sort: 'none',
          gap: 5,
          label: {
            show: true,
            position: 'inside',
            formatter: (params: unknown) => {
              const p = params as {
                data?: { name: string; realCount: number; rate: string };
              };
              if (!p.data) return '';
              return `${p.data.name}  ${p.data.realCount.toLocaleString()}人 (${p.data.rate})`;
            },
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 500,
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            label: {
              fontSize: 12,
              fontWeight: 700,
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          data: funnelData,
        },
      ],
    };

    chart.setOption(option, true);
  }, [steps, theme, chartInstance]);

  return (
    <Card className="shadow-xs border-border/80 flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">业务全链路转化漏斗</CardTitle>
            </div>
            <CardDescription className="mt-1">
              从首页探索至身价自白与回响互动的转化率
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-normal gap-1 bg-muted/40">
            <span>末端海报转化率</span>
            <span className="font-semibold text-foreground">{overallRate}%</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-1 pb-4 flex flex-col gap-3">
        {/* ECharts 转化漏斗主体 */}
        <div ref={containerRef} className="w-full h-44" />

        {/* 底部 5 阶段紧凑步骤卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-border/50">
          {steps.map((step, idx) => (
            <div
              key={step.name}
              className="flex flex-col justify-between rounded-md border border-border/60 bg-muted/20 p-2 text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: step.color }}
                />
                <span className="font-medium text-foreground truncate">{step.name}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-bold text-foreground">
                  {step.count.toLocaleString()}
                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                    {step.unit}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {step.rate}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
