import React, { useEffect, useState, useCallback } from 'react';
import {
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  MessageSquare,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { echoesApi, formatTime } from '../adminApi';
import type { AdminEchoWhisper } from '../adminTypes';
import { cn } from '../lib/utils';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { DictBadge } from './ui/DictBadge';
import { DictSelect } from './ui/DictSelect';
import { AdminWorkbenchShell } from './ui/AdminWorkbenchShell';
import { StateTransitionModal } from './ui/StateTransitionModal';
import { adminNotify } from './ui/adminNotify';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const PAGE_SIZE = 20;

const SHADOW_TAG_OPTIONS = [
  { value: 'all', label: '全部阴影倾向' },
  { value: '支配渴求', label: '支配渴求' },
  { value: '绝对臣服', label: '绝对臣服' },
  { value: '角色互换', label: '角色互换' },
  { value: '安全束缚', label: '安全束缚' },
  { value: '反差情绪', label: '反差情绪' },
  { value: '心理补偿', label: '心理补偿' },
];

interface EchoWorkbenchProps {
  refreshTrigger?: number;
  onStatusChanged?: () => void;
}

export const EchoWorkbench: React.FC<EchoWorkbenchProps> = ({ refreshTrigger, onStatusChanged }) => {
  const [echoes, setEchoes] = useState<AdminEchoWhisper[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirmEcho, setDeleteConfirmEcho] = useState<AdminEchoWhisper | null>(null);

  // State Transition Modal State
  const [transitionTarget, setTransitionTarget] = useState<{
    echo: AdminEchoWhisper;
    toStatus: 'approved' | 'rejected' | 'flagged' | 'pending';
    actionName: string;
  } | null>(null);

  const load = useCallback(async (isManual = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await echoesApi.listEchoes({
        status: filterStatus as any,
        tag: filterTag,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if (res.success) {
        setEchoes(res.items);
        setTotal(res.total);
        if (isManual) {
          adminNotify.success('回响心声列表已刷新');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载回响心声失败';
      setError(msg);
      adminNotify.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterTag, search, page]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const handleUpdateStatus = async (
    id: string,
    newStatus: 'approved' | 'rejected' | 'flagged' | 'pending',
    notesData?: { adminNotes?: string; remark?: string }
  ) => {
    setActionLoadingId(id);
    try {
      if (notesData) {
        await echoesApi.updateStatus(id, newStatus, notesData);
      } else {
        await echoesApi.updateStatus(id, newStatus);
      }
      setEchoes((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                auditStatus: newStatus,
                adminNotes: notesData?.adminNotes !== undefined ? notesData.adminNotes : item.adminNotes,
                remark: notesData?.remark !== undefined ? notesData.remark : item.remark,
              }
            : item
        )
      );
      onStatusChanged?.();
      const statusLabel =
        newStatus === 'approved' ? '已核准公开' : newStatus === 'rejected' ? '已驳回' : newStatus === 'flagged' ? '已下架' : '状态已更新';
      adminNotify.success(`心声${statusLabel}`);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteTransition = async (notesData: { adminNotes?: string; remark?: string }) => {
    if (!transitionTarget) return;
    const { echo, toStatus } = transitionTarget;
    await handleUpdateStatus(echo.id, toStatus, notesData);
    setTransitionTarget(null);
  };

  const executeDelete = async () => {
    if (!deleteConfirmEcho) return;
    const id = deleteConfirmEcho.id;
    setActionLoadingId(id);
    try {
      await echoesApi.deleteEcho(id);
      setEchoes((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      onStatusChanged?.();
      adminNotify.success('已永久删除该条回响心声');
      setDeleteConfirmEcho(null);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminWorkbenchShell
      title="深夜回响心声审核工作台"
      description="访客匿名自白与共鸣广场治理，支持动态字典状态机、审核批注与违规下架"
      icon={<Flame className="size-5 text-rose-500" />}
      loading={loading}
      onRefresh={() => load(true)}
    >
      <div className="flex flex-col gap-2.5 w-full">
        {/* 筛选过滤工具栏 */}
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-2.5 sm:p-3 flex flex-wrap items-center gap-2.5">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="搜索职业面具或自白关键词..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9 h-8 text-xs"
              />
            </div>

            {/* 动态审核状态字典下拉 */}
            <div className="min-w-[140px]">
              <DictSelect
                dictCode="echo_audit_status"
                value={filterStatus === 'all' ? null : filterStatus}
                onChange={(val) => {
                  setFilterStatus(val || 'all');
                  setPage(0);
                }}
                placeholder="全部审核状态"
                includeAllOption
                allOptionLabel="全部审核状态"
                allOptionValue="all"
                size="xs"
              />
            </div>

            {/* 阴影标签下拉 (标准 shadcn Select) */}
            <Select
              value={filterTag}
              onValueChange={(val) => {
                setFilterTag(val);
                setPage(0);
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-[140px] text-xs bg-background">
                <SelectValue placeholder="全部阴影倾向" />
              </SelectTrigger>
              <SelectContent>
                {SHADOW_TAG_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 紧凑统计与刷新 */}
            <div className="ms-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                共 {total} 条
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load(true)}
                disabled={loading}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                <span>刷新</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 表格容器 */}
        <Card className="shadow-xs border-border/80 overflow-hidden">
          <CardContent className="p-0">
            {error ? (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-4 m-4 rounded-md">
                <AlertTriangle className="size-4" />
                <span>{error}</span>
              </div>
            ) : loading && echoes.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin mr-2" />
                <span>正在检索深夜回响纸条...</span>
              </div>
            ) : echoes.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                暂无符合条件的回响心声记录
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/80">
                    <TableHead className="w-24 font-semibold text-xs">状态</TableHead>
                    <TableHead className="w-36 font-semibold text-xs">社会面具</TableHead>
                    <TableHead className="font-semibold text-xs">自白心声内容</TableHead>
                    <TableHead className="w-28 font-semibold text-xs">暗面倾向</TableHead>
                    <TableHead className="w-20 font-semibold text-xs text-center">共鸣数</TableHead>
                    <TableHead className="w-32 font-semibold text-xs">投递时间</TableHead>
                    <TableHead className="w-48 font-semibold text-xs text-right">流转操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {echoes.map((item) => {
                    const isItemLoading = actionLoadingId === item.id;
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        {/* 状态 */}
                        <TableCell>
                          <DictBadge dictCode="echo_audit_status" value={item.auditStatus} size="sm" />
                        </TableCell>

                        {/* 面具职业 */}
                        <TableCell className="font-semibold text-xs text-foreground">
                          {item.surfaceRole}
                        </TableCell>

                        {/* 自白正文 & 审核批注 */}
                        <TableCell className="max-w-[340px]">
                          <div className="text-xs text-foreground leading-relaxed">
                            "{item.shadowDesire}"
                          </div>
                          {item.adminNotes && (
                            <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded inline-block">
                              批注: {item.adminNotes}
                            </div>
                          )}
                        </TableCell>

                        {/* 阴影标签 */}
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            #{item.shadowTag}
                          </Badge>
                        </TableCell>

                        {/* 共鸣次数 */}
                        <TableCell className="text-center font-medium text-xs text-muted-foreground">
                          {item.echoCount}
                        </TableCell>

                        {/* 投递时间 */}
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {formatTime(item.createdAt)}
                        </TableCell>

                        {/* 流转操作动作 */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {item.auditStatus === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isItemLoading}
                                  onClick={() => handleUpdateStatus(item.id, 'approved')}
                                  title="审核通过并公开"
                                  className="h-7 px-2.5 text-xs text-foreground hover:bg-muted"
                                >
                                  <CheckCircle2 className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                  通过
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isItemLoading}
                                  onClick={() => handleUpdateStatus(item.id, 'rejected')}
                                  title="驳回不通过"
                                  className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                                >
                                  <XCircle className="size-3.5 mr-1" />
                                  驳回
                                </Button>
                              </>
                            )}

                            {item.auditStatus === 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isItemLoading}
                                onClick={() => handleUpdateStatus(item.id, 'flagged')}
                                title="下架隐藏"
                                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <ShieldAlert className="size-3.5 mr-1 text-muted-foreground" />
                                下架
                              </Button>
                            )}

                            {item.auditStatus === 'flagged' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isItemLoading}
                                onClick={() => handleUpdateStatus(item.id, 'approved')}
                                title="重新上架公开"
                                className="h-7 px-2.5 text-xs text-foreground hover:bg-muted"
                              >
                                <CheckCircle2 className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                重新上架
                              </Button>
                            )}

                            {item.auditStatus === 'rejected' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isItemLoading}
                                onClick={() => handleUpdateStatus(item.id, 'approved')}
                                title="重新审核通过"
                                className="h-7 px-2.5 text-xs text-foreground hover:bg-muted"
                              >
                                <CheckCircle2 className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                重新通过
                              </Button>
                            )}

                            {/* 状态流转与批注弹窗 */}
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isItemLoading}
                              onClick={() =>
                                setTransitionTarget({
                                  echo: item,
                                  toStatus: item.auditStatus === 'pending' ? 'approved' : item.auditStatus === 'approved' ? 'flagged' : 'approved',
                                  actionName: '流转批注',
                                })
                              }
                              className="size-6 text-muted-foreground hover:text-foreground"
                              title="流转与审核批注"
                            >
                              <MessageSquare className="size-3" />
                            </Button>

                            {/* 物理删除：仅限已下架或已驳回 */}
                            {(item.auditStatus === 'rejected' || item.auditStatus === 'flagged') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isItemLoading}
                                onClick={() => setDeleteConfirmEcho(item)}
                                className="size-6 text-muted-foreground hover:text-destructive"
                                title="物理删除该已下架/已驳回心声"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* 分页控制栏 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground">
                <span>
                  共 {total} 条回响记录 · 第 {page + 1} / {totalPages} 页
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 px-2"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 状态流转与审核批注 Modal */}
        {transitionTarget && (
          <StateTransitionModal
            opened={Boolean(transitionTarget)}
            onClose={() => setTransitionTarget(null)}
            dictCode="echo_audit_status"
            fromValue={transitionTarget.echo.auditStatus}
            toValue={transitionTarget.toStatus}
            actionName={transitionTarget.actionName}
            targetName={`【${transitionTarget.echo.surfaceRole}】"${transitionTarget.echo.shadowDesire.slice(0, 20)}..."`}
            onConfirm={handleExecuteTransition}
          />
        )}

        {/* 物理删除确认对话框 */}
        <AdminConfirmDialog
          isOpen={Boolean(deleteConfirmEcho)}
          title="物理删除回响心声"
          description={`确定要永久删除来自「${deleteConfirmEcho?.surfaceRole || '匿名'}」的这条心声吗？此操作不可逆。`}
          confirmText="确认删除"
          cancelText="取消"
          danger={true}
          loading={Boolean(actionLoadingId)}
          onConfirm={executeDelete}
          onCancel={() => setDeleteConfirmEcho(null)}
        />
      </div>
    </AdminWorkbenchShell>
  );
};
export default EchoWorkbench;
