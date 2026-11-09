import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Eye, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { adminApi, formatDuration, formatTime } from '../adminApi';
import type { AdminDossier, AdminOverview, AdminTimeRange } from '../adminTypes';
import { getQuestionnaireName } from '../adminUtils';
import { DossierDetailModal } from './DossierDetailModal';
import { DashboardMetrics } from './dashboard/DashboardMetrics';
import { DashboardTrendChart } from './dashboard/DashboardTrendChart';
import { DashboardFunnel } from './dashboard/DashboardFunnel';
import { DashboardDistribution } from './dashboard/DashboardDistribution';
import { AdminImageLightbox } from './ui/AdminImageLightbox';
import { adminNotify } from './ui/adminNotify';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface DashboardProps {
  range: AdminTimeRange;
  customDate: string;
  refreshTrigger: number;
  onNavigateToUsers: () => void;
}

const TIME_RANGES: { key: AdminTimeRange; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季度' },
  { key: 'year', label: '本年' },
];

export const Dashboard: React.FC<DashboardProps> = ({
  range,
  customDate,
  refreshTrigger,
  onNavigateToUsers,
}) => {
  const [currentRange, setCurrentRange] = useState<AdminTimeRange>(range);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<AdminDossier | null>(null);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  const rangeLabels: Record<string, string> = {
    today: '今日',
    yesterday: '昨日',
    week: '本周',
    month: '本月',
    quarter: '本季',
    year: '本年',
    custom: '指定日',
  };

  const load = useCallback(async (r?: AdminTimeRange) => {
    const targetRange = r ?? currentRange;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.overview(targetRange, targetRange === 'custom' ? customDate : undefined);
      setOverview(res.overview);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setError(msg);
      adminNotify.error(msg, '概览大盘加载失败');
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

  const openDossier = async (id: string) => {
    try {
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '加载卷宗详情失败');
    }
  };

  const handleReanalyze = async (id: string) => {
    setReanalyzing(id);
    try {
      await adminApi.reanalyze(id);
      if (selectedDossier?.id === id) {
        const res = await adminApi.getDossier(id);
        setSelectedDossier(res.dossier);
      }
      await load();
      adminNotify.success('LLM 重新评估完成，诊断结果已更新');
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '重新评估失败');
    } finally {
      setReanalyzing(null);
    }
  };

  const handleUpdateDossierParams = async (
    id: string,
    updates: Partial<Pick<AdminDossier, 'auditStatus' | 'adminNotes'>>
  ) => {
    try {
      const res = await adminApi.updateDossier(id, updates);
      setSelectedDossier(res.dossier);
      await load();
      adminNotify.success('卷宗审核状态与备注已保存');
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '更新失败');
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteDossier(deleteConfirmId);
      adminNotify.success('卷宗已成功物理删除');
      setSelectedDossier(null);
      setDeleteConfirmId(null);
      await load();
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm">正在加载全域数据大盘...</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-destructive">
        <AlertTriangle className="size-8" />
        <span className="text-sm">{error}</span>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
      {/* 0. 绝密监控大屏实时指挥状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-bold text-xs tracking-tight text-foreground flex items-center gap-1.5">
            <span>全域数据指挥大屏</span>
            <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              LIVE TELEMETRY
            </Badge>
          </span>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
            全站 {(overview?.totals.dossiers ?? 0).toLocaleString()} 份心理卷宗实时解构监控与跨域画像大盘
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
            <span>同步大屏</span>
          </Button>
        </div>
      </div>

      {/* 1. 核心指标卡片矩阵 */}
      <DashboardMetrics overview={overview} rangeLabel={rangeLabels[currentRange]} />

      {/* 2. 近7天趋势图 + 业务转化漏斗 */}
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2 w-full">
        <DashboardTrendChart weekly={overview?.weekly ?? []} />
        <DashboardFunnel overview={overview} />
      </div>

      {/* 3. 用户特征多维分布 */}
      <DashboardDistribution overview={overview} rangeLabel={rangeLabels[currentRange]} />

      {/* 4. 最近提交卷宗轻量流式卡片 */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                {rangeLabels[currentRange]}最新成功生成的测评卷宗
              </CardTitle>
            </div>
            <CardDescription className="mt-1">
              实时同步所选时段（{rangeLabels[currentRange]}）最新测评完成记录
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToUsers}
            className="text-xs gap-1 text-primary hover:text-primary"
          >
            <span>全域用户画像</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          {overview?.recent && overview.recent.length > 0 ? (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>填写人</TableHead>
                    <TableHead>题库卷宗</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recent.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-foreground">
                        {d.nickname || '神秘探索者'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getQuestionnaireName(d, overview.bankNames)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDuration(d.durationSeconds)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatTime(d.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void openDossier(d.id)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <Eye className="size-3.5" />
                          <span>查阅</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
              暂无卷宗提交记录
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dossier Detail Modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          reanalyzingId={reanalyzing}
          onClose={() => setSelectedDossier(null)}
          onReanalyze={handleReanalyze}
          onUpdateParams={handleUpdateDossierParams}
          onDelete={(id) => setDeleteConfirmId(id)}
          onZoomImage={(url) => setZoomedImg(url)}
        />
      )}

      {/* Image Zoom Lightbox Overlay */}
      {zoomedImg && (
        <AdminImageLightbox imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />
      )}

      {/* 物理删除确认弹窗 */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>物理删除卷宗记录</DialogTitle>
            <DialogDescription>
              确认物理删除该条卷宗数据？删除后该测评记录不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={executeDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '正在删除...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
