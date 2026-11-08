import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from '../theme-provider';

export interface EChartsThemeTokens {
  isDark: boolean;
  textColor: string;
  subTextColor: string;
  borderColor: string;
  splitLineColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  axisLineColor: string;
}

export function useChartTheme(): EChartsThemeTokens {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return {
    isDark,
    textColor: isDark ? '#f1f5f9' : '#0f172a',
    subTextColor: isDark ? '#94a3b8' : '#64748b',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    splitLineColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    tooltipBg: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
    axisLineColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
  };
}

/**
 * 封装通用 ECharts 初始化与生命周期 Hook
 * 自动处理 Canvas 容器挂载、主题适配、ResizeObserver 响应式监听与实例销毁
 */
export function useEChartsInstance(
  initOptions?: { renderer?: 'canvas' | 'svg' }
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const theme = useChartTheme();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dom = containerRef.current;
    if (!dom) return;

    let chart: echarts.ECharts;
    try {
      chart = echarts.init(dom, undefined, {
        renderer: initOptions?.renderer || 'canvas',
      });
      chartInstanceRef.current = chart;
    } catch {
      // 在无真实 DOM 渲染引擎（如某些单元测试环境）中静默降级
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        chart.resize();
      });
      resizeObserver.observe(dom);
    }

    const handleWindowResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [initOptions?.renderer]);

  return {
    containerRef,
    chartInstance: chartInstanceRef,
    theme,
  };
}

