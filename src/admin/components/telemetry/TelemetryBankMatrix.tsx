import React from 'react';
import { Database, Clock, ShieldAlert, ArrowLeftRight, Delete, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatDuration } from '../../adminApi';
import type { AdminTelemetry } from '../../adminTypes';

interface TelemetryBankMatrixProps {
  telemetry: AdminTelemetry | null;
  bankNames: Record<string, string>;
}

export const TelemetryBankMatrix: React.FC<TelemetryBankMatrixProps> = ({
  telemetry,
  bankNames,
}) => {
  const banks = telemetry?.banks ?? [];

  return (
    <Card className="border-border/80 shadow-xs flex flex-col justify-between overflow-hidden">
      <CardHeader className="p-3 sm:p-3.5 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <Database className="size-4 text-emerald-500" />
            <span>核心题库维度作答遥测对比</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">
            {banks.length} 个题库沉淀
          </Badge>
        </div>
        <CardDescription className="text-[11px] text-muted-foreground">
          对比各分类题库的作答耗时、犹豫阻尼与修改纠结率，评估题包的心流深度
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {banks.slice(0, 6).map((b, idx) => {
            const title = bankNames[b.bankId] || b.bankId;
            const isStandard = b.bankId.includes('standard') || b.bankId.includes('50');

            return (
              <div
                key={`${b.bankId}-${idx}`}
                className="relative rounded-lg border border-border/70 bg-card/60 p-2.5 flex flex-col justify-between gap-2 transition-all hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-foreground block truncate" title={title}>
                      {title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate block">
                      ID: {b.bankId}
                    </span>
                  </div>
                  <Badge
                    variant={isStandard ? 'default' : 'outline'}
                    className="text-[9px] px-1.5 py-0 shrink-0"
                  >
                    {b.count} 次填报
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1 border-t border-border/40 font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-2.5" />
                      平均时长
                    </span>
                    <strong className="text-foreground font-bold">{formatDuration(b.avgDurationSeconds)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ShieldAlert className="size-2.5 text-amber-500" />
                      犹豫指数
                    </span>
                    <strong className="text-amber-600 dark:text-amber-400 font-bold">
                      {b.avgHesitateIndex} <span className="text-[9px] text-muted-foreground">/100</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Delete className="size-2.5 text-rose-500" />
                      退格重填
                    </span>
                    <strong className="text-rose-500 font-bold">{b.avgBackspaceRate}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ArrowLeftRight className="size-2.5 text-purple-500" />
                      反复摇摆
                    </span>
                    <strong className="text-purple-500 font-bold">{b.avgFlipFlop}%</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TelemetryBankMatrix;

