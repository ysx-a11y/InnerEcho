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
    <div className="rounded-lg border border-border/80 bg-muted/30 overflow-hidden shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 border-b border-border/80">
            <TableHead className="w-8 text-center" />
            <TableHead className="font-semibold text-xs">提交时间</TableHead>
            <TableHead className="font-semibold text-xs">作答用时</TableHead>
            <TableHead className="font-semibold text-xs">问卷卷轴</TableHead>
            <TableHead className="font-semibold text-xs">心理深度</TableHead>
            <TableHead className="font-semibold text-xs">可信度</TableHead>
            <TableHead className="text-right font-semibold text-xs">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dossiers.map((d) => {
            const isSelected = selectedIds.includes(d.id);
            const depthVariant: 'default' | 'secondary' | 'outline' =
              d.depthRating === 'deep'
                ? 'default'
                : d.depthRating === 'medium'
                ? 'secondary'
                : 'outline';

            return (
              <TableRow
                key={d.id}
                className={isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      onToggleSelect(d.id, Boolean(checked))
                    }
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground text-xs">
                  {formatTime(d.submitTime)}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDuration(d.durationSeconds)}
                </TableCell>
                <TableCell className="text-foreground text-xs max-w-[200px] truncate" title={getQuestionnaireName(d, bankNames)}>
                  {getQuestionnaireName(d, bankNames)}
                </TableCell>
                <TableCell>
                  <Badge variant={depthVariant} className="text-[10px] px-1.5 py-0">
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
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {d.credibilityScore != null
                      ? `${d.credibilityScore}分`
                      : '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDossier(d.id)}
                      className="h-7 px-2 text-xs"
                    >
                      <Eye className="size-3 mr-1" />
                      查阅卷宗
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReanalyze(d.id)}
                      disabled={reanalyzingId === d.id}
                      className="size-7 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400"
                      title="触发 LLM 心理学重新评估"
                    >
                      <Sparkles
                        className={`size-3.5 ${
                          reanalyzingId === d.id ? 'animate-spin' : ''
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(d.id)}
                      className="size-7 text-muted-foreground hover:text-destructive"
                      title="物理删除本条记录"
                    >
                      <Trash2 className="size-3.5" />
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

