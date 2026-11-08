import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Clock,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import { usersApi, adminApi, formatTime } from '../adminApi';
import type {
  AdminUserSummary,
  AdminUserDetails,
  AdminUserStats,
  AdminUserListParams,
  AdminDossier,
} from '../adminTypes';
import { UserStatsHeader } from './users/UserStatsHeader';
import { UserProfileModal } from './UserProfileModal';
import { DossierDetailModal } from './DossierDetailModal';
import { AdminImageLightbox } from './ui/AdminImageLightbox';
import { adminNotify } from './ui/adminNotify';
import { DictBadge } from './ui/DictBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
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

interface UserWorkbenchProps {
  refreshTrigger?: number;
}

export function UserWorkbench({ refreshTrigger }: UserWorkbenchProps = {}): React.ReactElement {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image Zoom Lightbox
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  // Nested Dossier Detail Modal
  const [selectedDossier, setSelectedDossier] = useState<AdminDossier | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<'all' | 'with_dossier' | 'without_dossier' | 'deleted'>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'lastLoginAt' | 'dossierCount' | 'userBankCount' | 'taskCount' | 'echoCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selected User Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<AdminUserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUserSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AdminUserListParams = {
        search: search.trim() || undefined,
        sort: sortField,
        order: sortOrder,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };

      if (activeTab === 'with_dossier') {
        params.hasDossier = 'yes';
        params.status = 'active';
      } else if (activeTab === 'without_dossier') {
        params.hasDossier = 'no';
        params.status = 'active';
      } else if (activeTab === 'deleted') {
        params.status = 'deleted';
      } else {
        params.status = 'all';
      }

      const res = await usersApi.listUsers(params);
      setUsers(res.items);
      setTotal(res.total);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '拉取用户列表失败';
      setError(msg);
      adminNotify.error(msg, '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [search, sortField, sortOrder, page, activeTab]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  const handleOpenDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailsLoading(true);
    try {
      const res = await usersApi.getUserDetails(userId);
      setUserDetails(res.details);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '加载用户画像失败');
      setSelectedUserId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeleteLoading(true);
    try {
      await usersApi.deleteUser(deleteConfirmUser.id);
      adminNotify.success(`用户 ${deleteConfirmUser.email} 已成功注销`);
      setDeleteConfirmUser(null);
      void fetchUsers();
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '注销失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenDossier = async (dossierId: string) => {
    try {
      const res = await adminApi.getDossier(dossierId);
      setSelectedDossier(res.dossier);
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '加载卷宗详情失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* 1. 顶部紧凑控制与统计栏 */}
      <UserStatsHeader
        stats={stats}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        onRefresh={() => {
          void fetchUsers();
        }}
        loading={loading}
      />

      {/* 2. 搜索与排序工具栏 */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative w-72 max-w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索邮箱 / 昵称 / 职业 / ID"
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">排序维度:</span>
              <Select
                value={sortField}
                onValueChange={(val) => {
                  setSortField(val as any);
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="h-8 w-[125px] text-xs bg-background">
                  <SelectValue placeholder="排序维度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">注册时间</SelectItem>
                  <SelectItem value="lastLoginAt">最后活跃时间</SelectItem>
                  <SelectItem value="dossierCount">卷宗生成数</SelectItem>
                  <SelectItem value="userBankCount">自建题库数</SelectItem>
                  <SelectItem value="taskCount">认领任务数</SelectItem>
                  <SelectItem value="echoCount">投掷回响数</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortOrder}
                onValueChange={(val) => {
                  setSortOrder(val as any);
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="h-8 w-[95px] text-xs bg-background">
                  <SelectValue placeholder="顺序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">降序 ↓</SelectItem>
                  <SelectItem value="asc">升序 ↑</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 用户列表表格 */}
      <Card className="shadow-xs border-border/80 overflow-hidden">
        <CardHeader className="px-3.5 py-2.5 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs sm:text-sm font-semibold">用户与世系名录</CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              共 {total} 名用户
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">全站注册画像与跨设备世系</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="h-44 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              正在拉取用户画像...
            </div>
          ) : error ? (
            <div className="h-44 flex items-center justify-center text-sm text-destructive">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
              暂无符合条件的用户
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注册账号 / 邮箱</TableHead>
                    <TableHead>基础档案（第一章）</TableHead>
                    <TableHead>卷宗测评进展</TableHead>
                    <TableHead>绑定设备</TableHead>
                    <TableHead>多维贡献</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const hasDossier = u.dossierCount > 0;
                    const isDeleted = Boolean(u.deletedAt);
                    const hasBasic = Boolean(u.latestNickname || u.latestOccupation);

                    return (
                      <TableRow key={u.id}>
                        {/* Email / ID */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground text-xs">{u.email}</span>
                              <DictBadge
                                dictCode="user_account_status"
                                value={u.accountStatus || (isDeleted ? 'deleted' : 'active')}
                                size="xs"
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              第 {u.generation} 代 · {formatTime(u.createdAt).slice(0, 10)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Basic Info */}
                        <TableCell>
                          {hasBasic ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground text-xs">
                                  {u.latestNickname || '神秘访客'}
                                </span>
                                {u.latestOccupation && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 font-normal">
                                    {u.latestOccupation}
                                  </Badge>
                                )}
                              </div>
                              {u.latestPersonaTrait && (
                                <span className="text-[11px] text-muted-foreground">
                                  人前: {u.latestPersonaTrait}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">未填基础信息</span>
                          )}
                        </TableCell>

                        {/* Dossiers */}
                        <TableCell>
                          {hasDossier ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-foreground text-xs">
                                已测算 {u.dossierCount} 份卷宗
                              </span>
                              {u.latestDepthRating && (
                                <span className="text-[11px] text-muted-foreground">
                                  深度:{' '}
                                  {u.latestDepthRating === 'deep'
                                    ? '深度回响'
                                    : u.latestDepthRating === 'medium'
                                    ? '中度剖析'
                                    : '浅度探索'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" /> 尚未测评
                            </span>
                          )}
                        </TableCell>

                        {/* Devices */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Smartphone className="size-3.5" />
                            <span>{u.deviceCount} 台设备</span>
                          </div>
                        </TableCell>

                        {/* Contributions */}
                        <TableCell>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span title="题库数">📚 {u.userBankCount}</span>
                            <span title="任务数">🎯 {u.taskCount}</span>
                            <span title="回响数">🕯️ {u.echoCount}</span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleOpenDetails(u.id)}
                              className="h-7 px-2 text-xs gap-1"
                            >
                              <Eye className="size-3.5" />
                              <span>全维画像</span>
                            </Button>
                            {!isDeleted && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmUser(u)}
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                aria-label="注销"
                                title="注销"
                              >
                                <Trash2 className="size-3.5" />
                                <span>注销</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <div>
                共 {total} 位用户 · 第 {page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected User Profile Modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          userDetails={userDetails}
          loading={detailsLoading}
          onClose={() => {
            setSelectedUserId(null);
            setUserDetails(null);
          }}
          onZoomImage={(url) => setZoomedImg(url)}
          onOpenDossier={handleOpenDossier}
        />
      )}

      {/* Nested Dossier Detail Modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          reanalyzingId={reanalyzingId}
          onClose={() => setSelectedDossier(null)}
          onReanalyze={async (id) => {
            setReanalyzingId(id);
            try {
              await adminApi.reanalyze(id);
              const res = await adminApi.getDossier(id);
              setSelectedDossier(res.dossier);
              adminNotify.success('LLM 重新评估完成');
            } catch (err) {
              adminNotify.error(err instanceof Error ? err.message : '重新评估失败');
            } finally {
              setReanalyzingId(null);
            }
          }}
          onUpdateParams={async (id, patch) => {
            await adminApi.updateDossier(id, patch);
            setSelectedDossier((prev) => (prev ? { ...prev, ...patch } : null));
          }}
          onDelete={async (id) => {
            await adminApi.deleteDossier(id);
            setSelectedDossier(null);
            void fetchUsers();
          }}
          onZoomImage={(url) => setZoomedImg(url)}
        />
      )}

      {/* Image Lightbox */}
      {zoomedImg && (
        <AdminImageLightbox imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />
      )}

      {/* Delete User Confirm Dialog */}
      <Dialog
        open={Boolean(deleteConfirmUser)}
        onOpenChange={(open) => !open && setDeleteConfirmUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>注销用户确认</DialogTitle>
            <DialogDescription>
              确定注销用户 <strong>{deleteConfirmUser?.email}</strong> 吗？
              注销后该账号将无法再登录前台，但历史卷宗与行为轨迹将受合规保留。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmUser(null)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteLoading}
            >
              {deleteLoading ? '正在注销...' : '确认注销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default UserWorkbench;
