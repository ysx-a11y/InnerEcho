import React from 'react';
import { Activity, AlertCircle, Shield, RefreshCw, Trash2 } from 'lucide-react';
import type { AdminDossier } from '../../adminTypes';
import { formatDuration } from '../../adminApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface DossierSidebarProps {
  dossier: AdminDossier;
  isReanalyzing: boolean;
  onUpdateParams?: (id: string, patch: { adminNotes?: string }) => void;
  onReanalyze?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const DossierSidebar: React.FC<DossierSidebarProps> = ({
  dossier,
  isReanalyzing,
  onUpdateParams,
  onReanalyze,
  onDelete,
}) => {
  const credibilityReasons = ((dossier.diagnosticResult?.credibilityReasons ?? []) as unknown[])
    .filter((reason): reason is string => typeof reason === 'string' && reason.trim() !== '');

  return (
    <aside className="w-full md:w-80 shrink-0 border-l border-border bg-muted/10 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
      {/* 遥测与防刷指标 */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="p-3.5 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-amber-500" />
            <CardTitle className="text-xs font-semibold">行为遥测与可信度</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3.5 pt-1 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">可信度评级</span>
              <span
                className={`font-bold text-sm ${
                  dossier.credibilityScore >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
                }`}
              >
                {dossier.credibilityLevel?.toUpperCase() || 'LOW'} ({dossier.credibilityScore}分)
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">作答耗时</span>
              <span className="font-semibold text-sm text-foreground">
                {formatDuration(dossier.durationSeconds)}
              </span>
            </div>
          </div>

          {/* 判定依据 */}
          {credibilityReasons.length > 0 ? (
            <div className="pt-2 border-t border-border/60 flex flex-col gap-1.5">
              <span className="text-[11px] text-muted-foreground font-medium">判定依据</span>
              {credibilityReasons.map((reason) => (
                <div key={reason} className="text-[11px] text-foreground flex items-start gap-1.5 leading-snug">
                  <AlertCircle className="size-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground leading-snug">
              该卷宗未记录详细判定依据（历史数据），可在下方控制中心重新诊断。
            </div>
          )}
        </CardContent>
      </Card>

      {/* 控制中心 */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="p-3.5 pb-2">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <CardTitle className="text-xs font-semibold">管理者控制中心</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3.5 pt-1 flex flex-col gap-3">
          {/* 管理备注 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              内部管理备注 (内部追踪)
            </label>
            <Textarea
              placeholder="添加追踪备注或研判批注..."
              value={dossier.adminNotes || ''}
              onChange={(e) => onUpdateParams?.(dossier.id, { adminNotes: e.target.value })}
              className="min-h-[72px] bg-background text-xs resize-none"
            />
          </div>

          {/* 操作按钮组 */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReanalyze?.(dossier.id)}
              disabled={isReanalyzing}
              className="w-full text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span>{isReanalyzing ? '重新诊断中...' : '重新运行 LLM 深度诊断'}</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete?.(dossier.id)}
              className="w-full text-xs h-8 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              <span>物理删除此卷宗</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
};
export default DossierSidebar;
