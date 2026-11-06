import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { adminApi, formatTime } from '../adminApi';
import type { AdminDossier, DossierListParams } from '../adminTypes';
import { DossierDetailModal } from './DossierDetailModal';
import { RespondentProfileModal } from './RespondentProfileModal';
import {
  groupDossiersByUser,
  type UserGroupData,
} from './dossier/dossierGroupUtils';
import { DossierSubTable } from './dossier/DossierSubTable';
import { AdminImageLightbox } from './ui/AdminImageLightbox';
import { adminNotify } from './ui/adminNotify';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from './ui/card';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [deviceUserMap, setDeviceUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // 搜索与过滤条件
  const [searchInput, setSearchInput] = useState('');
  const [filterCredibility, setFilterCredibility] = useState('all');
  const [filterDepth, setFilterDepth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<
    'submitTime' | 'credibilityScore' | 'durationSeconds'
  >('submitTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 选中项与展开行
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 模态弹窗与详情
  const [selectedDossier, setSelectedDossier] = useState<AdminDossier | null>(
    null
  );
  const [selectedUserGroup, setSelectedUserGroup] =
    useState<UserGroupData | null>(null);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  // 删除确认对话框
  const [deleteConfirmDossierId, setDeleteConfirmDossierId] = useState<
    string | null
  >(null);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);

  // 数据拉取核心函数
  const load = useCallback(
    async (isManual = false) => {
      setLoading(true);
      const params: DossierListParams = {
        search: searchInput.trim(),
        depth: filterDepth,
        credibility: filterCredibility,
        status: filterStatus,
        sort: sortField,
        order: sortOrder,
        limit: pageSize,
        offset: page * pageSize,
      };
      try {
        const res = await adminApi.listDossiers(params);
        setDossiers(res.items);
        setTotal(res.total);
        setDeviceUserMap(res.deviceUserMap ?? {});
        if (res.bankNames) setBankNames(res.bankNames);
        setSelectedIds((prev) =>
          prev.filter((id) => res.items.some((d) => d.id === id))
        );
        if (isManual) {
          adminNotify.success('卷宗档案列表已刷新');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '加载失败';
        adminNotify.error(msg, '数据拉取错误');
      } finally {
        setLoading(false);
      }
    },
    [
      searchInput,
      filterDepth,
      filterCredibility,
      filterStatus,
      sortField,
      sortOrder,
      page,
      pageSize,
    ]
  );

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  // 打开卷宗详情
  const openDossier = async (id: string) => {
    try {
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '加载卷宗详情失败');
    }
  };

  const refreshDetail = async (id: string) => {
    if (selectedDossier?.id === id) {
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
    }
  };

  // 排序触发
  const handleSortChange = (
    field: 'submitTime' | 'credibilityScore' | 'durationSeconds'
  ) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(0);
  };

  // 批量物理删除
  const executeBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleteActionLoading(true);
    try {
      await adminApi.batchDelete(selectedIds);
      adminNotify.success(`已成功物理删除 ${selectedIds.length} 份卷宗`);
      setSelectedIds([]);
      setBatchDeleteConfirmOpen(false);
      await load();
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '批量删除失败');
    } finally {
      setDeleteActionLoading(false);
    }
  };

  // 单条物理删除
  const executeSingleDelete = async () => {
    if (!deleteConfirmDossierId) return;
    setDeleteActionLoading(true);
    try {
      await adminApi.deleteDossier(deleteConfirmDossierId);
      adminNotify.success('已物理删除该测评卷宗');
      setSelectedDossier(null);
      setDeleteConfirmDossierId(null);
      await load();
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteActionLoading(false);
    }
  };

  // 触发重新评估
  const handleReanalyze = async (id: string) => {
    setReanalyzing(id);
    try {
      await adminApi.reanalyze(id);
      await refreshDetail(id);
      await load();
      adminNotify.success('LLM 深度心理重新评估完成');
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '重新评估失败');
    } finally {
      setReanalyzing(null);
    }
  };

  // 导出 CSV
  const handleExportCSV = async () => {
    try {
      const res = await adminApi.listDossiers({
        search: searchInput.trim(),
        depth: filterDepth,
        credibility: filterCredibility,
        status: filterStatus,
        sort: sortField,
        order: sortOrder,
        limit: 10000,
        offset: 0,
      });

      const headers = [
        'ID',
        '称呼',
        '真实职业',
        '人前特质',
        '提交时间',
        '用时秒数',
        '深度等级',
        '可信度评分',
        '审核状态',
        '设备ID',
      ];
      const rows = res.items.map((d) => [
        d.id,
        d.nickname || '匿名',
        d.occupation || '-',
        d.personaTrait || '-',
        formatTime(d.submitTime),
        d.durationSeconds,
        d.depthRating,
        d.credibilityScore ?? '-',
        d.auditStatus,
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
      adminNotify.success(`已成功导出 ${res.items.length} 份卷宗数据`);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '导出 CSV 失败');
    }
  };

  // 用户聚合
  const userGroups = useMemo<UserGroupData[]>(() => {
    return groupDossiersByUser(dossiers, deviceUserMap);
  }, [dossiers, deviceUserMap]);

  // 全选/反选
  const handleSelectGroup = (group: UserGroupData, checked: boolean) => {
    const ids = group.dossiers.map((d) => d.id);
    setSelectedIds((prev) => {
      if (checked) {
        return [...prev, ...ids.filter((id) => !prev.includes(id))];
      }
      return prev.filter((id) => !ids.includes(id));
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? dossiers.map((d) => d.id) : []);
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* 1. 顶部控制栏卡片 (Card) */}
      <Card className="border-white/10 bg-slate-900/90 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  卷宗档案库
                </Badge>
                {onNavigateToUsers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNavigateToUsers}
                    className="text-xs text-slate-400 hover:text-slate-100 hover:bg-white/5 h-6 px-2"
                  >
                    <UserCheck className="h-3 w-3 mr-1 text-indigo-400" />
                    <span>注册用户画像中心 &gt;</span>
                  </Button>
                )}
              </div>
              <CardDescription className="text-slate-400 text-xs mt-1">
                直连生产库 · 共 {total} 份测评卷宗 · 诊断与数据实时同步
              </CardDescription>
            </div>

            {/* 右侧全局操作 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setExpandedKeys(
                    expandedKeys.length > 0
                      ? []
                      : userGroups.map((g) => g.userKey)
                  )
                }
                className="text-xs text-slate-300 border-white/10"
              >
                {expandedKeys.length > 0 ? (
                  <>
                    <Minimize2 className="h-3 w-3 mr-1.5" />
                    全部折叠
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3 mr-1.5" />
                    全部展开
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="text-xs text-slate-300 border-white/10"
              >
                <Download className="h-3 w-3 mr-1.5" />
                导出 CSV
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => void load(true)}
                disabled={loading}
                className="text-xs bg-indigo-600 hover:bg-indigo-500"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`}
                />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* 过滤输入栏 */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="搜索称呼 / 职业 / 设备ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void load()}
                className="pl-8 text-xs h-8 border-white/10 bg-slate-950/60"
              />
            </div>

            {/* 可信度选择 */}
            <select
              value={filterCredibility}
              onChange={(e) => {
                setFilterCredibility(e.target.value);
                setPage(0);
              }}
              className="h-8 rounded-md border border-white/10 bg-slate-950/80 px-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部可信度</option>
              <option value="high">极高可信 (≥85)</option>
              <option value="medium">良好可信 (60-84)</option>
              <option value="low">疑似乱填 (&lt;60)</option>
            </select>

            {/* 深度选择 */}
            <select
              value={filterDepth}
              onChange={(e) => {
                setFilterDepth(e.target.value);
                setPage(0);
              }}
              className="h-8 rounded-md border border-white/10 bg-slate-950/80 px-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部深度</option>
              <option value="deep">深度分析</option>
              <option value="medium">中度探索</option>
              <option value="light">浅层测验</option>
            </select>

            {/* 状态选择 */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
              className="h-8 rounded-md border border-white/10 bg-slate-950/80 px-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部状态</option>
              <option value="pending">待核准</option>
              <option value="approved">已核准</option>
              <option value="flagged">已作废</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              className="text-xs h-8"
            >
              查询
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setFilterCredibility('all');
                setFilterDepth('all');
                setFilterStatus('all');
                setPage(0);
              }}
              className="text-xs text-slate-400 h-8"
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. 批量操作条 (当有勾选时滑出) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <span>
              已选择{' '}
              <strong className="text-white font-semibold">
                {selectedIds.length}
              </strong>{' '}
              份测评卷宗
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-auto p-0 text-indigo-400"
            >
              取消全选
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBatchDeleteConfirmOpen(true)}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            批量物理删除 ({selectedIds.length})
          </Button>
        </div>
      )}

      {/* 3. 数据表格容器 (Card + Table) */}
      <Card className="border-white/10 bg-slate-900/90 shadow-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <Checkbox
                  checked={
                    dossiers.length > 0 &&
                    selectedIds.length === dossiers.length
                  }
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
              </TableHead>
              <TableHead className="w-10 text-center"></TableHead>
              <TableHead>用户身份 / 社交画像</TableHead>
              <TableHead>真实社会职业 · 表里人设</TableHead>
              <TableHead>卷宗归档</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSortChange('submitTime')}
              >
                <div className="flex items-center gap-1">
                  <span>最新作答时间</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-36 text-center text-slate-400"
                >
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
                  <span>卷宗数据同步中...</span>
                </TableCell>
              </TableRow>
            ) : userGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-36 text-center text-slate-500"
                >
                  暂无匹配的卷宗档案
                </TableCell>
              </TableRow>
            ) : (
              userGroups.map((group) => {
                const isGroupExpanded = expandedKeys.includes(group.userKey);
                const isGroupSelected =
                  group.dossiers.length > 0 &&
                  group.dossiers.every((d) => selectedIds.includes(d.id));

                return (
                  <React.Fragment key={group.userKey}>
                    {/* 父级行：用户画像汇总 */}
                    <TableRow
                      className={
                        isGroupSelected ? 'bg-indigo-950/20' : 'bg-slate-900/40'
                      }
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isGroupSelected}
                          onCheckedChange={(checked) =>
                            handleSelectGroup(group, Boolean(checked))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.userKey)}
                          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {isGroupExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 border-white/10">
                            {group.avatarUrl && (
                              <AvatarImage
                                src={group.avatarUrl}
                                alt={group.nickname}
                              />
                            )}
                            <AvatarFallback className="bg-indigo-700/60 text-[10px]">
                              {group.nickname.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">
                                {group.nickname}
                              </span>
                              {group.userId ? (
                                <Badge
                                  variant="default"
                                  className="text-[10px] py-0 px-1.5"
                                >
                                  注册会员
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 text-slate-400 border-white/10"
                                >
                                  访客设备
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {group.email ||
                                (group.deviceId
                                  ? `设备: ${group.deviceId.slice(0, 12)}...`
                                  : '纯匿名作答')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-slate-200">
                            {group.occupation || '未登记职业'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {group.personaTrait
                              ? `人前: ${group.personaTrait}`
                              : '未登记人前特质'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[11px] bg-slate-800 text-slate-300"
                        >
                          共 {group.dossiers.length} 份卷宗
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 font-mono text-[11px]">
                        {group.dossiers[0]?.submitTime
                          ? formatTime(group.dossiers[0].submitTime)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUserGroup(group)}
                          className="h-7 text-xs border-white/10"
                        >
                          <Users className="h-3 w-3 mr-1 text-indigo-400" />
                          画像档案
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* 展开的明细子表组件 (DossierSubTable) */}
                    {isGroupExpanded && (
                      <TableRow className="bg-slate-950/80 hover:bg-slate-950/80">
                        <TableCell colSpan={7} className="p-3 pl-12">
                          <DossierSubTable
                            dossiers={group.dossiers}
                            bankNames={bankNames}
                            selectedIds={selectedIds}
                            onToggleSelect={(id, checked) => {
                              setSelectedIds((prev) =>
                                checked
                                  ? [...prev, id]
                                  : prev.filter((item) => item !== id)
                              );
                            }}
                            onOpenDossier={openDossier}
                            onReanalyze={handleReanalyze}
                            onDelete={(id) => setDeleteConfirmDossierId(id)}
                            reanalyzingId={reanalyzing}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* 4. 底部分页控制栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-white/10 px-4 py-3 gap-3 bg-slate-950/60">
          <p className="text-xs text-slate-400">
            共 <strong className="text-white">{total}</strong> 份测评卷宗 ·
            当前第 <strong className="text-white">{page + 1}</strong> /{' '}
            {pageCount} 页
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>每页</span>
              <select
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="h-7 rounded border border-white/10 bg-slate-900 px-2 text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="10">10 条/页</option>
                <option value="20">20 条/页</option>
                <option value="50">50 条/页</option>
                <option value="100">100 条/页</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="h-7 px-2 text-xs"
              >
                首页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7 px-2 text-xs"
              >
                上一页
              </Button>
              <span className="px-2 text-xs font-mono text-slate-300">
                {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="h-7 px-2 text-xs"
              >
                下一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(pageCount - 1)}
                disabled={page >= pageCount - 1}
                className="h-7 px-2 text-xs"
              >
                末页
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. 卷宗详情全景档案模态框 */}
      <DossierDetailModal
        dossier={selectedDossier}
        onClose={() => setSelectedDossier(null)}
        onUpdateParams={async (id, patch) => {
          try {
            await adminApi.updateDossier(id, patch);
            adminNotify.success('卷宗审核状态已更新');
            await refreshDetail(id);
            await load();
          } catch (err) {
            adminNotify.error(err instanceof Error ? err.message : '更新状态失败');
          }
        }}
        onReanalyze={handleReanalyze}
        onDelete={(id) => setDeleteConfirmDossierId(id)}
        reanalyzingId={reanalyzing}
        onZoomImage={(url) => setZoomedImg(url)}
      />

      {/* 6. 用户画像全景模态框 */}
      {selectedUserGroup && (
        <RespondentProfileModal
          userGroup={selectedUserGroup}
          bankNames={bankNames}
          onClose={() => setSelectedUserGroup(null)}
          onSelectDossier={(d) => setSelectedDossier(d)}
          onZoomImage={(url) => setZoomedImg(url)}
        />
      )}

      {/* 7. 单条删除确认对话框 (Dialog) */}
      <Dialog
        open={Boolean(deleteConfirmDossierId)}
        onOpenChange={(open) => !open && setDeleteConfirmDossierId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认物理删除测评卷宗</DialogTitle>
            <DialogDescription>
              此操作将永久抹除该条测评卷宗及关联的所有作答与分析记录，该操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmDossierId(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteActionLoading}
              onClick={executeSingleDelete}
            >
              {deleteActionLoading ? '正在删除...' : '确认物理删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. 批量删除确认对话框 (Dialog) */}
      <Dialog
        open={batchDeleteConfirmOpen}
        onOpenChange={(open) => !open && setBatchDeleteConfirmOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量物理删除</DialogTitle>
            <DialogDescription>
              您已选中 {selectedIds.length}{' '}
              份卷宗，此操作将永久物理抹除所有选中记录，不可撤销。确认继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDeleteConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteActionLoading}
              onClick={executeBatchDelete}
            >
              {deleteActionLoading
                ? '正在删除...'
                : `确认物理删除 (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. 图片灯箱放大预览 */}
      <AdminImageLightbox
        imageUrl={zoomedImg}
        onClose={() => setZoomedImg(null)}
      />
    </div>
  );
};
