import React from 'react';
import { Eye, Sparkles, Trash2 } from 'lucide-react';
import { formatDuration, formatTime } from '../../adminApi';
import type { AdminDossier } from '../../adminTypes';
import { getQuestionnaireName } from '../../adminUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface DossierSubTableProps {
  dossiers: AdminDossier[];
  bankNames: Record<string, string>;
  selectedIds: string[];
  onToggleSelect: (id: string, checked: boolean) => void;
  onOpenDossier: (id: string) => void;
  onReanalyze: (id: string) => void;
  onDelete: (id: string) => void;
  reanalyzingId?: string | null;
}

export const DossierSubTable: React.FC<DossierSubTableProps> = ({
  dossiers,
  bankNames,
  selectedIds,
  onToggleSelect,
  onOpenDossier,
  onReanalyze,
  onDelete,
  reanalyzingId,
}) => {
  return (
    <div className="rounded-lg border border-indigo-500/20 bg-slate-950/90 overflow-hidden shadow-inner">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-900/60 border-b border-white/10">
            <TableHead className="w-8 text-center" />
            <TableHead>提交时间</TableHead>
            <TableHead>作答用时</TableHead>
            <TableHead>问卷卷轴</TableHead>
            <TableHead>心理深度</TableHead>
            <TableHead>可信度</TableHead>
            <TableHead>审核状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dossiers.map((d) => {
            const isSelected = selectedIds.includes(d.id);
            const depthVariant =
              d.depthRating === 'deep'
                ? 'default'
                : d.depthRating === 'medium'
                ? 'cyan'
                : 'outline';
            const statusVariant =
              d.auditStatus === 'approved'
                ? 'success'
                : d.auditStatus === 'flagged'
                ? 'destructive'
                : 'warning';
            const statusLabel =
              d.auditStatus === 'approved'
                ? '已核准'
                : d.auditStatus === 'flagged'
                ? '已作废'
                : '待核准';

            return (
              <TableRow
                key={d.id}
                className={isSelected ? 'bg-indigo-950/30' : ''}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      onToggleSelect(d.id, Boolean(checked))
                    }
                  />
                </TableCell>
                <TableCell className="font-medium text-slate-100">
                  {formatTime(d.submitTime)}
                </TableCell>
                <TableCell className="text-slate-400">
                  {formatDuration(d.durationSeconds)}
                </TableCell>
                <TableCell className="text-slate-300">
                  {getQuestionnaireName(d, bankNames)}
                </TableCell>
                <TableCell>
                  <Badge variant={depthVariant} className="text-[10px]">
                    {d.depthRating === 'deep'
                      ? '深度'
                      : d.depthRating === 'medium'
                      ? '中度'
                      : '浅层'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold text-xs ${
                      d.credibilityScore && d.credibilityScore >= 80
                        ? 'text-teal-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {d.credibilityScore != null
                      ? `${d.credibilityScore}分`
                      : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant} className="text-[10px]">
                    {statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onOpenDossier(d.id)}
                      className="h-6 px-2 text-[11px] bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      查阅卷宗
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReanalyze(d.id)}
                      disabled={reanalyzingId === d.id}
                      className="h-6 w-6 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                      title="触发 LLM 心理学重新评估"
                    >
                      <Sparkles
                        className={`h-3 w-3 ${
                          reanalyzingId === d.id ? 'animate-spin' : ''
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(d.id)}
                      className="h-6 w-6 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      title="物理删除本条记录"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
