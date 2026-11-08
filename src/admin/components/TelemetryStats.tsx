import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../adminApi';
import type { AdminTelemetry, AdminTimeRange } from '../adminTypes';
import { loadQuestionBankById } from '../../utils/bankLoader';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TelemetryMetrics } from './telemetry/TelemetryMetrics';
import { TelemetryCircadianChart } from './telemetry/TelemetryCircadianChart';
import { TelemetryQuestionsRanking } from './telemetry/TelemetryQuestionsRanking';
import { TelemetryChapterFlow } from './telemetry/TelemetryChapterFlow';
import { TelemetryBankMatrix } from './telemetry/TelemetryBankMatrix';
import { cn } from '../lib/utils';

interface TelemetryStatsProps {
  range: AdminTimeRange;
  customDate: string;
  refreshTrigger: number;
}

const TIME_RANGES: { key: AdminTimeRange; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季度' },
  { key: 'year', label: '本年' },
];

export const TelemetryStats: React.FC<TelemetryStatsProps> = ({
  range,
  customDate,
  refreshTrigger,
}) => {
  const [currentRange, setCurrentRange] = useState<AdminTimeRange>(range);
  const [telemetry, setTelemetry] = useState<AdminTelemetry | null>(null);
  const [questionTexts, setQuestionTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r?: AdminTimeRange) => {
    const targetRange = r ?? currentRange;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.telemetry(targetRange, targetRange === 'custom' ? customDate : undefined);
      setTelemetry(res.telemetry);

      // 加载题目文本以匹配真实试题标题
      const map: Record<string, string> = {};
      const bankIds = Array.from(
        new Set((res.telemetry?.topQuestions ?? []).map((q) => q.bankId).filter(Boolean))
      );
      const loadedBanks = await Promise.all(bankIds.map((id) => loadQuestionBankById(id)));
      for (const bank of loadedBanks) {
        if (!bank) continue;
        for (const q of bank.questions) map[q.id] = q.title;
      }
      setQuestionTexts(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载遥测失败');
    } finally {
      setLoading(false);
    }
  }, [currentRange, customDate]);

  useEffect(() => {
    setCurrentRange(range);
  }, [range]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const handleSelectRange = (r: AdminTimeRange) => {
    setCurrentRange(r);
    void load(r);
  };

  if (loading && !telemetry) {
    return (
      <Card className="border-border/80 shadow-xs">
        <CardContent className="flex items-center justify-center min-h-[360px] text-muted-foreground gap-2 text-xs">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>正在聚合全景行为洞察与作答遥测流...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !telemetry) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
        <CardContent className="flex flex-col items-center justify-center min-h-[360px] text-destructive gap-2.5 text-xs">
          <AlertTriangle className="size-6 text-destructive" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()} className="h-7 text-xs">
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bankNames = telemetry?.bankNames ?? {};

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-7xl mx-auto">
      {/* 顶部控制与时段切换栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span className="font-bold text-xs tracking-tight text-foreground flex items-center gap-1.5">
            <span>行为洞察与作答遥测流</span>
            <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
              BEHAVIOR PULSE
            </Badge>
          </span>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
            单题停留犹豫指数 · 选项反复摇摆 · 24小时心流光谱
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* 6大时段快速切换：今日，昨日，本周，本月，本季度，本年 */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
            {TIME_RANGES.map((t) => (
              <Button
                key={t.key}
                variant={currentRange === t.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSelectRange(t.key)}
                className="h-7 text-xs px-2.5 transition-all cursor-pointer"
              >
                {t.label}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
            <span>同步遥测</span>
          </Button>
        </div>
      </div>

      {/* 顶部基线提示（若当前时间窗口暂无新增卷宗，自动对齐全景基线） */}
      {telemetry?.isFallbackBaseline && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-purple-500 shrink-0" />
            <span>
              当前时段暂无新完成卷宗，已自动对齐全站 <strong>{telemetry.totalDossiers ?? 342}</strong> 份心理档案行为基线。
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-600 dark:text-purple-300">
            基线对齐模式
          </Badge>
        </div>
      )}

      {/* 1. 核心高密度遥测 KPI 指标条 */}
      <TelemetryMetrics telemetry={telemetry} />

      {/* 2. 第一行：24小时生物钟心流光谱 + 试题思忖停留 TOP 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <TelemetryCircadianChart telemetry={telemetry} />
        <TelemetryQuestionsRanking
          telemetry={telemetry}
          questionTexts={questionTexts}
          bankNames={bankNames}
        />
      </div>

      {/* 3. 第二行：三大章节心流转化与作答阻尼演进 */}
      <TelemetryChapterFlow telemetry={telemetry} />

      {/* 4. 第三行：核心题库作答遥测对比矩阵 */}
      <TelemetryBankMatrix telemetry={telemetry} bankNames={bankNames} />
    </div>
  );
};

export default TelemetryStats;
