import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { adminApi, formatDuration, formatTime } from '../adminApi';
import type { AdminDossier } from '../adminTypes';
import { getQuestionnaireName } from '../adminUtils';
import { DossierDetailModal } from './DossierDetailModal';
import { RespondentProfileModal } from './RespondentProfileModal';
import { groupDossiersByUser, type UserGroupData } from './dossier/dossierGroupUtils';
import { AdminImageLightbox } from './ui/AdminImageLightbox';
import { adminNotify } from './ui/adminNotify';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from './data-table';
import { cn } from '../lib/utils';

export type { UserGroupData };

interface DossierListProps {
  refreshTrigger?: number;
  onNavigateToUsers?: () => void;
}

export const DossierList: React.FC<DossierListProps> = ({
  refreshTrigger,
  onNavigateToUsers,
}) => {
  const [dossiers, setDossiers] = useState<AdminDossier[]>([]);
  const [bankNames, setBankNames] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [deviceUserMap, setDeviceUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Table State
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submitTime', desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Modals & Details
  const [selectedDossier, setSelectedDossier] = useState<AdminDossier | null>(null);
  const [selectedUserGroup, setSelectedUserGroup] = useState<UserGroupData | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  // Delete Dialog State
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 数据拉取核心函数（真实服务端分页与排序检索）
  const load = useCallback(async (isManual = false) => {
    setLoading(true);
    try {
      const sortItem = sorting[0];
      const sortField =
        sortItem?.id === 'credibilityScore' || sortItem?.id === 'durationSeconds'
          ? sortItem.id
          : 'submitTime';
      const order = sortItem?.desc === false ? 'asc' : 'desc';

      const credFilter = columnFilters.find((f) => f.id === 'credibilityLevel')?.value as string[] | undefined;

      const res = await adminApi.listDossiers({
        search: globalFilter.trim() || undefined,
        credibility: credFilter && credFilter.length > 0 ? credFilter[0] : undefined,
        sort: sortField,
        order,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      });
      setDossiers(res.items);
      setTotal(res.total);
      setDeviceUserMap(res.deviceUserMap ?? {});
      if (res.bankNames) setBankNames(res.bankNames);
      if (isManual) {
        adminNotify.success('卷宗档案列表已刷新');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      adminNotify.error(msg, '数据拉取错误');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, sorting, globalFilter, columnFilters]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const openDossierDetail = async (id: string) => {
    try {
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '加载卷宗详情失败');
    }
  };

  const openUserProfile = (dossier: AdminDossier) => {
    const groups = groupDossiersByUser([dossier], deviceUserMap);
    if (groups.length > 0) {
      setSelectedUserGroup(groups[0]);
    }
  };

  const handleReanalyze = async (id: string) => {
    setReanalyzingId(id);
    try {
      await adminApi.reanalyze(id);
      await load();
      adminNotify.success('LLM 深度心理重新评估完成');
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '重新评估失败');
    } finally {
      setReanalyzingId(null);
    }
  };

  const executeSingleDelete = async () => {
    if (!singleDeleteId) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteDossier(singleDeleteId);
      adminNotify.success('已物理删除该测评卷宗');
      setDossiers((prev) => prev.filter((d) => d.id !== singleDeleteId));
      setTotal((prev) => Math.max(0, prev - 1));
      setSingleDeleteId(null);
      if (selectedDossier?.id === singleDeleteId) setSelectedDossier(null);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const executeBatchDelete = async () => {
    const selectedKeys = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    if (selectedKeys.length === 0) return;
    const selectedDossierIds = selectedKeys.map((idx) => dossiers[Number(idx)]?.id).filter(Boolean);
    setDeleteLoading(true);
    try {
      await adminApi.batchDelete(selectedDossierIds);
      adminNotify.success(`已成功物理删除 ${selectedDossierIds.length} 份卷宗`);
      setDossiers((prev) => prev.filter((d) => !selectedDossierIds.includes(d.id)));
      setTotal((prev) => Math.max(0, prev - selectedDossierIds.length));
      setRowSelection({});
      setBatchDeleteOpen(false);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '批量删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'ID',
        '称呼',
        '真实职业',
        '人前特质',
        '测评问卷',
        '提交时间',
        '用时秒数',
        '可信度评分',
        '设备ID',
      ];
      const rows = dossiers.map((d) => [
        d.id,
        d.nickname || '匿名',
        d.occupation || '-',
        d.personaTrait || '-',
        getQuestionnaireName(d, bankNames),
        formatTime(d.submitTime),
        d.durationSeconds,
        d.credibilityScore ?? '-',
        d.deviceId || '-',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `深层回响_测评卷宗库_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      adminNotify.success(`已成功导出 ${dossiers.length} 份卷宗数据`);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '导出 CSV 失败');
    }
  };

  // TanStack Columns Definition
  const columns = useMemo<ColumnDef<AdminDossier>[]>(() => {
    return [
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="卷宗号" />
        ),
        cell: ({ row }) => {
          const id = row.original.id;
          return (
            <button
              onClick={() => void openDossierDetail(id)}
              className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
            >
              #{id.slice(-8)}
            </button>
          );
        },
      },
      {
        id: 'nickname',
        accessorFn: (row: AdminDossier) => `${row.nickname || ''} ${row.deviceId || ''}`,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="用户身份 / 社交画像" />
        ),
        cell: ({ row }) => {
          const d = row.original;
          const isRegistered = Boolean(d.userId);
          const initial = d.nickname ? d.nickname.slice(0, 1) : '匿';

          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 rounded-md border border-border/60 shrink-0">
                <AvatarFallback className="rounded-md text-[10px] font-semibold bg-muted/80 text-foreground/85">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span
                    onClick={() => void openDossierDetail(d.id)}
                    className="font-medium text-xs truncate hover:text-primary cursor-pointer"
                  >
                    {d.nickname || '匿名访客'}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] px-1.5 py-0 h-4 rounded-xs font-medium shrink-0',
                      isRegistered
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    )}
                  >
                    {isRegistered ? '注册用户' : '访客'}
                  </Badge>
                </div>
                {d.deviceId && (
                  <span className="font-mono text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                    {d.deviceId}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'occupation',
        accessorFn: (row: AdminDossier) => `${row.occupation || ''} ${row.personaTrait || ''}`,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="真实社会职业 · 表里人设" />
        ),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs font-normal">
                  {d.occupation || '未填写社会职业'}
                </Badge>
              </div>
              {d.personaTrait && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                  人前: {d.personaTrait}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'questionnaire',
        accessorFn: (row: AdminDossier) => getQuestionnaireName(row, bankNames),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="问卷卷宗" />
        ),
        cell: ({ row }) => {
          const qName = getQuestionnaireName(row.original, bankNames);
          return (
            <span className="text-sm font-medium text-foreground truncate max-w-[200px] block" title={qName}>
              {qName}
            </span>
          );
        },
      },
      {
        id: 'credibilityLevel',
        accessorFn: (row: AdminDossier) => {
          const score = row.credibilityScore ?? 95;
          if (score >= 90) return 'high';
          if (score >= 80) return 'normal';
          return 'low';
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="可信度" />
        ),
        cell: ({ row }) => {
          const score = row.original.credibilityScore ?? 95;
          const dotColor =
            score >= 90
              ? 'bg-emerald-500'
              : score >= 80
              ? 'bg-amber-500'
              : 'bg-destructive';
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
              <span className="font-medium">{score}分</span>
            </div>
          );
        },
        filterFn: (row: Row<AdminDossier>, id: string, value: string[]) => {
          return value.includes(String(row.getValue(id)));
        },
      },
      {
        accessorKey: 'submitTime',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="作答耗时 · 提交时间" />
        ),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span className="font-mono text-foreground font-medium">
                {formatDuration(d.durationSeconds)}
              </span>
              <span className="text-[11px]">{formatTime(d.submitTime)}</span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="text-xs">操作</span>,
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex items-center gap-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void openDossierDetail(d.id);
                }}
                className="h-7 px-2 text-xs gap-1 hover:text-primary cursor-pointer text-muted-foreground hover:bg-primary/10"
                title="直接查阅卷宗"
              >
                <Eye className="size-3.5" />
                <span>查阅</span>
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    className="flex h-7 w-7 p-0 data-[state=open]:bg-muted cursor-pointer"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">打开菜单</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 text-xs">
                  <DropdownMenuItem
                    onClick={() => void openDossierDetail(d.id)}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="mr-2 size-3.5 text-muted-foreground" />
                    <span>查阅卷宗</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openUserProfile(d)}
                    className="cursor-pointer"
                  >
                    <Layers className="mr-2 size-3.5 text-muted-foreground" />
                    <span>用户画像</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void handleReanalyze(d.id)}
                    disabled={reanalyzingId === d.id}
                    className="cursor-pointer"
                  >
                    <RotateCcw className={cn('mr-2 size-3.5 text-muted-foreground', reanalyzingId === d.id && 'animate-spin')} />
                    <span>重新评估</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setSingleDeleteId(d.id)}
                    className="cursor-pointer"
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    <span>删除卷宗</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];
  }, [bankNames, deviceUserMap, reanalyzingId]);

  const table = useReactTable({
    data: dossiers,
    columns,
    pageCount: Math.ceil(total / Math.max(1, pagination.pageSize)),
    rowCount: total,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onGlobalFilterChange: (val) => {
      setGlobalFilter(val);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  return (
    <div className="flex flex-1 flex-col gap-3 sm:gap-4">
      {/* 1. 紧凑操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base text-foreground">卷宗档案库</span>
          <Badge variant="outline" className="text-xs">
            共 {total} 份
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBatchDeleteOpen(true)}
              className="h-8 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              批量删除 ({selectedCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 gap-1.5"
          >
            <Download className="size-3.5" />
            导出 CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(true)}
            disabled={loading}
            className="h-8 gap-1.5"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            刷新
          </Button>
          {onNavigateToUsers && (
            <Button
              variant="default"
              size="sm"
              onClick={onNavigateToUsers}
              className="h-8 gap-1.5"
            >
              <UserCheck className="size-3.5" />
              用户画像中心
            </Button>
          )}
        </div>
      </div>

      {/* 2. DataTable Toolbar (Search & Faceted Filters) */}
      <DataTableToolbar
        table={table}
        searchPlaceholder="搜索称呼、职业、人设、设备ID..."
        filters={[
          {
            columnId: 'credibilityLevel',
            title: '可信度',
            options: [
              { label: '≥90分 高信', value: 'high' },
              { label: '80-89分 基本可信', value: 'normal' },
              { label: '<80分 存疑/乱填', value: 'low' },
            ],
          },
        ]}
      />

      {/* 3. Table Container */}
      <div className="overflow-hidden rounded-md border border-border/60 bg-card">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => void openDossierDetail(row.original.id)}
                  className="h-9 border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-1 px-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {loading ? '正在同步卷宗数据...' : '没有找到符合条件的测评卷宗'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. DataTable Pagination */}
      <DataTablePagination table={table} totalCount={total} />

      {/* 5. Detail Modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          onClose={() => setSelectedDossier(null)}
          onUpdateParams={async (id, patch) => {
            await adminApi.updateDossier(id, patch);
            setSelectedDossier((prev) => (prev ? { ...prev, ...patch } : null));
            setDossiers((prev) =>
              prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
            );
          }}
          onReanalyze={handleReanalyze}
          onDelete={(id) => setSingleDeleteId(id)}
          reanalyzingId={reanalyzingId}
          onZoomImage={(url) => setZoomedImg(url)}
        />
      )}

      {/* 6. Respondent Profile Modal */}
      {selectedUserGroup && (
        <RespondentProfileModal
          userGroup={selectedUserGroup}
          bankNames={bankNames}
          onClose={() => setSelectedUserGroup(null)}
          onSelectDossier={(d) => void openDossierDetail(d.id)}
        />
      )}

      {/* 7. Image Lightbox */}
      {zoomedImg && (
        <AdminImageLightbox
          imageUrl={zoomedImg}
          onClose={() => setZoomedImg(null)}
        />
      )}

      {/* 8. Single Delete Dialog */}
      <Dialog
        open={Boolean(singleDeleteId)}
        onOpenChange={(open) => !open && setSingleDeleteId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>物理删除卷宗确认</DialogTitle>
            <DialogDescription>
              确定要永久删除该份测评卷宗吗？该操作不可逆，将同步清除卷宗作答日志及评估记录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSingleDeleteId(null)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={executeSingleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '正在删除...' : '确认物理删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Batch Delete Dialog */}
      <Dialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批量物理删除确认</DialogTitle>
            <DialogDescription>
              确定要物理删除已选中的 {selectedCount} 份卷宗吗？此操作将永久抹除选中的所有测评数据。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBatchDeleteOpen(false)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={executeBatchDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '正在删除...' : `确认删除 ${selectedCount} 份卷宗`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DossierList;
