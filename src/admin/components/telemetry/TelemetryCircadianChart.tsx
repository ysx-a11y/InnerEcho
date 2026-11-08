import React, { useEffect } from 'react';
import * as echarts from 'echarts';
import { Activity, Moon, Sun, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useEChartsInstance, useChartTheme } from '../dashboard/useECharts';
import type { AdminTelemetry } from '../../adminTypes';

interface TelemetryCircadianChartProps {
  telemetry: AdminTelemetry | null;
}

const CIRCADIAN_PHASE_NAMES: Record<number, { name: string; tag: string }> = {
  0: { name: '深夜潜意识潮涌期', tag: '防御全面放开' },
  1: { name: '深夜潜意识潮涌期', tag: '欲望极度真实' },
  2: { name: '深夜潜意识潮涌期', tag: '隐秘渴求解构' },
  3: { name: '深夜潜意识潮涌期', tag: '暗夜心流极致' },
  4: { name: '黎明清醒期', tag: '理性微弱复苏' },
  5: { name: '黎明清醒期', tag: '孤寂心理审视' },
  6: { name: '黎明清醒期', tag: '晨曦自我反省' },
  7: { name: '晨起准备期', tag: '现实秩序重构' },
  8: { name: '社会化面具构建期', tag: '职场人设立起' },
  9: { name: '社会化面具构建期', tag: '理性防御严实' },
  10: { name: '社会化面具构建期', tag: '人际交往活跃' },
  11: { name: '日间工作调试期', tag: '社交注意力转移' },
  12: { name: '午间片刻留白', tag: '短暂心理透气' },
  13: { name: '午后工作沉浸', tag: '理性思考主导' },
  14: { name: '日间工作调试期', tag: '工作节奏平稳' },
  15: { name: '午后疲态初显', tag: '注意力走神期' },
  16: { name: '下班前防御松动', tag: '期待解脱束缚' },
  17: { name: '黄昏归途期', tag: '社会身份卸载' },
  18: { name: '夜幕降临面具消解', tag: '私密空间回归' },
  19: { name: '晚餐与休整期', tag: '独处意识萌发' },
  20: { name: '晚间自由探索', tag: '自我关照启动' },
  21: { name: '深夜暗流涌动', tag: '渴望破土而出' },
  22: { name: '深夜潜意识潮涌期', tag: '防线快速瓦解' },
  23: { name: '深夜潜意识潮涌期', tag: '午夜自白爆发' },
};

/**
 * 24小时昼夜心流光谱分布（ECharts 平滑渐变脉冲波形图）
 * 替代死板的 0% 进度条，动态展现深层心理在午夜与白昼的生物钟潮汐
 */
export const TelemetryCircadianChart: React.FC<TelemetryCircadianChartProps> = ({ telemetry }) => {
  const { containerRef, chartInstance } = useEChartsInstance();
  const theme = useChartTheme();

  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    // 提取24小时数据
    const timeline = telemetry?.hourlyTimeline ?? [];
    const hourData = Array.from({ length: 24 }, (_, i) => {
      const match = timeline.find((item) => item.hour === i);
      return match ? match.count : 0;
    });

    const totalSubmissions = hourData.reduce((sum, c) => sum + c, 0) || 1;
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        top: 28,
        right: 16,
        bottom: 30,
        left: 42,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 12 },
        formatter: (params: any) => {
          const item = Array.isArray(params) ? params[0] : params;
          const hourIndex = item.dataIndex;
          const count = item.value;
          const percent = ((count / totalSubmissions) * 100).toFixed(1);
          const phase = CIRCADIAN_PHASE_NAMES[hourIndex] ?? { name: '心流探索期', tag: '深度答卷' };

          return `
            <div style="font-family: inherit; min-width: 170px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: ${theme.textColor}; font-size: 13px;">${item.axisValue}</strong>
                <span style="font-size: 10px; color: #a78bfa; background: rgba(167, 139, 250, 0.15); padding: 1px 6px; border-radius: 9999px;">${phase.name}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px;">
                <span style="color: ${theme.subTextColor};">提交卷宗量:</span>
                <strong style="color: #38bdf8; font-family: monospace;">${count} 份</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px;">
                <span style="color: ${theme.subTextColor};">全天心流占比:</span>
                <strong style="color: #ec4899; font-family: monospace;">${percent}%</strong>
              </div>
              <div style="font-size: 10px; color: ${theme.subTextColor}; border-top: 1px solid ${theme.borderColor}; padding-top: 4px; margin-top: 4px;">
                状态标签: <span style="color: #34d399;">${phase.tag}</span>
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLine: { lineStyle: { color: theme.axisLineColor } },
        axisLabel: {
          color: theme.subTextColor,
          fontSize: 10,
          interval: 2,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.splitLineColor, type: 'dashed' } },
        axisLabel: {
          color: theme.subTextColor,
          fontSize: 10,
          formatter: '{value}',
        },
      },
      series: [
        {
          name: '答题心流密度',
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbolSize: 6,
          lineStyle: {
            width: 2.5,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#38bdf8' },
              { offset: 0.5, color: '#a855f7' },
              { offset: 1, color: '#ec4899' },
            ]),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(168, 85, 247, 0.45)' },
              { offset: 0.7, color: 'rgba(56, 189, 248, 0.12)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.0)' },
            ]),
          },
          data: hourData,
          markArea: {
            itemStyle: {
              color: 'rgba(168, 85, 247, 0.06)',
            },
            data: [
              [
                {
                  name: '深夜潜意识潮涌 (22:00-04:00)',
                  xAxis: '22:00',
                  label: {
                    position: 'insideTopRight',
                    color: '#c084fc',
                    fontSize: 10,
                  },
                },
                { xAxis: '23:00' },
              ],
              [
                { xAxis: '00:00' },
                { xAxis: '04:00' },
              ],
            ],
          },
        },
      ],
    };

    chart.setOption(option);
  }, [telemetry, theme, chartInstance]);

  return (
    <Card className="border-border/80 shadow-xs flex flex-col justify-between overflow-hidden">
      <CardHeader className="p-3 sm:p-3.5 pb-1 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Activity className="size-4 text-cyan-500" />
            <span>24小时昼夜心流光谱分布</span>
          </CardTitle>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 text-purple-400">
              <Moon className="size-3" />
              <span>深夜峰值</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Sun className="size-3" />
              <span>白昼面具</span>
            </span>
          </div>
        </div>
        <CardDescription className="text-[11px] text-muted-foreground">
          基于北京时间 24 小时动态波形，揭示潜意识在深夜与白昼的心理防线消长
        </CardDescription>
      </CardHeader>

      <CardContent className="p-2 sm:p-3 pt-0">
        <div ref={containerRef} className="w-full h-56 sm:h-64" />
      </CardContent>
    </Card>
  );
};

export default TelemetryCircadianChart;

