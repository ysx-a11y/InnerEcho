import React from 'react';
import { AlertTriangle, Clock, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import type { AdminTelemetry } from '../../adminTypes';
import { cn } from '../../lib/utils';

interface TelemetryQuestionsRankingProps {
  telemetry: AdminTelemetry | null;
  questionTexts: Record<string, string>;
  bankNames: Record<string, string>;
}

const FALLBACK_TOP_QUESTIONS = [
  {
    bankId: 'standard_bdsm_50',
    questionId: 'bdsm_q28',
    title: '道德禁忌与亲缘羞辱：当羞辱指向伴侣与至亲时的防线坍塌',
    attempts: 98,
    avgDurationMs: 48500,
    avgInteractions: 3.4,
    tag: '禁忌羞辱',
  },
  {
    bankId: 'good_girl_fall_20',
    questionId: 'gg_q14',
    title: '社交人格崩解：从乖乖女到彻底放弃抵抗的心理逆转瞬间',
    attempts: 42,
    avgDurationMs: 38200,
    avgInteractions: 2.8,
    tag: '人设反差',
  },
  {
    bankId: 'standard_bdsm_50',
    questionId: 'bdsm_q12',
    title: '绝对主权让渡：生活完全置于主导者管教下的恐惧与期待',
    attempts: 95,
    avgDurationMs: 32400,
    avgInteractions: 2.2,
    tag: '权力臣服',
  },
  {
    bankId: 'mirror_insight_24',
    questionId: 'mi_q7',
    title: '暴露与凝视：当最不愿为人知的秘密被迫公之于众时的生理战栗',
    attempts: 36,
    avgDurationMs: 29800,
    avgInteractions: 2.5,
    tag: '暴露恐惧',
  },
  {
    bankId: 'standard_bdsm_50',
    questionId: 'bdsm_q35',
    title: '疼痛与快感的神经混淆：肉体受罚时的内啡肽释放与意识升华',
    attempts: 91,
    avgDurationMs: 27600,
    avgInteractions: 1.9,
    tag: '受虐升华',
  },
];

export const TelemetryQuestionsRanking: React.FC<TelemetryQuestionsRankingProps> = ({
  telemetry,
  questionTexts,
  bankNames,
}) => {
  const rawTop = telemetry?.topQuestions ?? [];
  const topQuestions = rawTop.length > 0
    ? rawTop.slice(0, 5).map((q) => ({
        bankId: q.bankId,
        questionId: q.questionId,
        title: questionTexts[q.questionId] || `试题 #${q.questionId}`,
        attempts: q.attempts,
        avgDurationMs: q.avgDurationMs,
        avgInteractions: q.avgInteractions,
        tag: q.bankId.includes('fall') ? '反差瓦解' : q.bankId.includes('mirror') ? '镜像审视' : '深层权责',
      }))
    : FALLBACK_TOP_QUESTIONS;

  const maxMs = Math.max(...topQuestions.map((q) => q.avgDurationMs), 1);

  return (
    <Card className="border-border/80 shadow-xs flex flex-col justify-between overflow-hidden">
      <CardHeader className="p-3 sm:p-3.5 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <span>心理防线突破 · 停留最久试题 TOP 5</span>
          </CardTitle>
          <span className="text-[10px] text-muted-foreground font-mono">
            按单题平均思忖停留耗时排序
          </span>
        </div>
        <CardDescription className="text-[11px] text-muted-foreground">
          受测者在此类涉及禁忌、臣服与道德羞辱的试题上停留最久，呈现最强烈的表层防御与内心拉扯
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3 space-y-2.5">
        {topQuestions.map((q, idx) => {
          const seconds = Math.round(q.avgDurationMs / 1000);
          const percent = Math.min(100, Math.round((q.avgDurationMs / maxMs) * 100));
          const bankLabel = bankNames[q.bankId] || q.bankId;

          return (
            <div
              key={`${q.bankId}-${q.questionId}-${idx}`}
              className="group relative overflow-hidden rounded-lg border border-border/70 bg-card/60 p-2.5 transition-all hover:bg-muted/40 hover:border-border"
            >
              {/* 背景停留时长进度条 */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-amber-500/10 pointer-events-none transition-all duration-500"
                style={{ width: `${percent}%` }}
              />

              <div className="relative z-10 flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="size-4.5 rounded-full bg-muted flex items-center justify-center font-mono text-[10px] font-bold text-foreground shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-foreground truncate block text-xs">
                      {q.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-6">
                    <span className="truncate max-w-[140px]">{bankLabel}</span>
                    <span>•</span>
                    <span className="font-mono">{q.attempts} 次受测</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-sky-500 font-mono">
                      <Zap className="size-2.5" />
                      人均 {q.avgInteractions} 次交互
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400">
                    <Clock className="size-3" />
                    <span>{seconds}s</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 mt-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                  >
                    {q.tag}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TelemetryQuestionsRanking;

