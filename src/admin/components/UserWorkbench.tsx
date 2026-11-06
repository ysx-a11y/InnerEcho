import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Layers,
  Smartphone,
  Calendar,
  Flame,
  Target,
  Sparkles,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  Trash2,
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
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { AdminImageLightbox } from './ui/AdminImageLightbox';
import { AdminToast, type ToastMessage } from './ui/AdminToast';

interface UserWorkbenchProps {
  refreshTrigger?: number;
}

export function UserWorkbench({ refreshTrigger }: UserWorkbenchProps = {}): React.ReactElement {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast messages
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

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
      if (res.success) {
        setUsers(res.items);
        setStats(res.stats);
        setTotal(res.total);
      }
    } catch (err: any) {
      const msg = err?.message || '获取用户列表失败';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, sortField, sortOrder, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  const handleOpenDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailsLoading(true);
    try {
      const res = await usersApi.getUserDetails(userId);
      if (res.success) {
        setUserDetails(res.details);
      }
    } catch (err: any) {
      addToast('error', err?.message || '获取用户详情画像失败');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenDossier = async (dossierId: string) => {
    try {
      const res = await adminApi.getDossier(dossierId);
      setSelectedDossier(res.dossier);
    } catch (err: any) {
      addToast('error', err?.message || '获取卷宗详情失败');
    }
  };

  const handleReanalyzeDossier = async (id: string) => {
    setReanalyzingId(id);
    try {
      await adminApi.reanalyze(id);
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
      addToast('success', '重新诊断成功');
    } catch (err: any) {
      addToast('error', err?.message || '重新诊断失败');
    } finally {
      setReanalyzingId(null);
    }
  };

  const handleUpdateDossierParams = async (
    id: string,
    updates: Partial<Pick<AdminDossier, 'auditStatus' | 'adminNotes'>>
  ) => {
    try {
      const res = await adminApi.updateDossier(id, updates);
      setSelectedDossier(res.dossier);
      addToast('success', '卷宗审核状态已更新');
    } catch (err: any) {
      addToast('error', err?.message || '更新失败');
    }
  };

  const executeDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeleteLoading(true);
    try {
      const res = await usersApi.deleteUser(deleteConfirmUser.id);
      if (res.success) {
        addToast('success', `已成功注销/禁用用户「${deleteConfirmUser.email}」`);
        fetchUsers();
        if (selectedUserId === deleteConfirmUser.id) {
          setSelectedUserId(null);
        }
        setDeleteConfirmUser(null);
      }
    } catch (err: any) {
      addToast('error', err?.message || '注销用户失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', boxSizing: 'border-box' }}>
      {/* 1. Header & KPI Cards */}
      <UserStatsHeader
        stats={stats}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        onRefresh={fetchUsers}
        loading={loading}
      />

      {/* 2. 搜索与排序栏 */}
      <div
        className="glass-card"
        style={{
          padding: '0.85rem 1.1rem',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem',
        }}
      >
        <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索邮箱 / 昵称 / 职业 / ID"
            style={{
              width: '100%',
              padding: '0.4rem 0.75rem 0.4rem 2rem',
              background: 'rgba(12, 4, 16, 0.8)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
              borderRadius: 10,
              color: '#fff0f5',
              fontSize: '0.76rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>排序维度:</span>
          <select
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value as any);
              setPage(1);
            }}
            style={{
              background: 'rgba(12, 4, 16, 0.8)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
              borderRadius: 10,
              padding: '0.35rem 0.65rem',
              color: '#fff0f5',
              fontSize: '0.74rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="createdAt">注册时间</option>
            <option value="lastLoginAt">最后活跃时间</option>
            <option value="dossierCount">卷宗生成数</option>
            <option value="userBankCount">自建题库数</option>
            <option value="taskCount">认领任务数</option>
            <option value="echoCount">投掷回响数</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as any);
              setPage(1);
            }}
            style={{
              background: 'rgba(12, 4, 16, 0.8)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
              borderRadius: 10,
              padding: '0.35rem 0.65rem',
              color: '#fff0f5',
              fontSize: '0.74rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="desc">降序 ↓</option>
            <option value="asc">升序 ↑</option>
          </select>
        </div>
      </div>

      {/* 3. 用户列表表格 */}
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.25rem',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        {loading && users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#ff70a6', fontSize: '0.8rem' }}>
            正在拉取用户画像...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#ff3377', fontSize: '0.8rem' }}>
            {error}
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
            暂无符合条件的用户
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--admin-text-muted)' }}>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600 }}>注册账号 / 邮箱</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600 }}>基础档案（第一章）</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600 }}>卷宗测评进展</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600 }}>绑定设备</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600 }}>多维贡献</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const hasDossier = u.dossierCount > 0;
                  const isDeleted = Boolean(u.deletedAt);
                  const hasBasic = Boolean(u.latestNickname || u.latestOccupation);

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 112, 166, 0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Email / ID */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: '#fff', fontWeight: 700 }}>{u.email}</span>
                            {isDeleted && (
                              <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, background: 'rgba(255, 51, 119, 0.2)', color: '#ff3377' }}>
                                已注销
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>
                            第 {u.generation} 代 · 注册于 {formatTime(u.createdAt).slice(0, 10)}
                          </span>
                        </div>
                      </td>

                      {/* Basic Info (Chapter 1) */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        {hasBasic ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ color: '#80f3ff', fontWeight: 700 }}>
                                👤 {u.latestNickname || '神秘访客'}
                              </span>
                              {u.latestOccupation && (
                                <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, background: 'rgba(128, 243, 255, 0.12)', color: '#80f3ff', border: '1px solid rgba(128, 243, 255, 0.25)' }}>
                                  {u.latestOccupation}
                                </span>
                              )}
                            </div>
                            {u.latestPersonaTrait && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-secondary)' }}>
                                人前: {u.latestPersonaTrait}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem' }}>
                            未填基础信息
                          </span>
                        )}
                      </td>

                      {/* Dossiers */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        {hasDossier ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            <span style={{ color: '#c084fc', fontWeight: 700 }}>
                              📑 已测算 {u.dossierCount} 份卷宗
                            </span>
                            {u.latestDepthRating && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-secondary)' }}>
                                深度: {u.latestDepthRating === 'deep' ? '暗夜破局 (Deep)' : u.latestDepthRating === 'medium' ? '双重倒错 (Medium)' : '暗光萌芽 (Light)'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#ffd180', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={11} /> 尚未完成测评
                          </span>
                        )}
                      </td>

                      {/* Devices */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#80f3ff' }}>
                          <Smartphone size={13} />
                          <span>{u.deviceCount} 台设备</span>
                        </div>
                      </td>

                      {/* Contributions */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.72rem', color: 'var(--admin-text-secondary)' }}>
                          <span>📚 {u.userBankCount}</span>
                          <span>🎯 {u.taskCount}</span>
                          <span>🕯️ {u.echoCount}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.65rem 0.6rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(u.id)}
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: 6,
                              background: 'rgba(255, 112, 166, 0.12)',
                              border: '1px solid rgba(255, 112, 166, 0.3)',
                              color: '#ff70a6',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            全维画像
                          </button>
                          {!isDeleted && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(u)}
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: 6,
                                background: 'rgba(255, 51, 119, 0.1)',
                                border: '1px solid rgba(255, 51, 119, 0.25)',
                                color: '#ff3377',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                              title="注销该用户"
                              aria-label="注销"
                            >
                              <Trash2 size={11} />
                              <span>注销</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.74rem', color: 'var(--admin-text-muted)' }}>
            <div>
              共 {total} 位用户 · 第 {page} / {totalPages} 页
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0.25rem 0.5rem',
                  color: page <= 1 ? 'var(--admin-text-muted)' : '#fff',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0.25rem 0.5rem',
                  color: page >= totalPages ? 'var(--admin-text-muted)' : '#fff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Full Profile Modal */}
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

      {/* 5. Nested Dossier Detail Modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          reanalyzingId={reanalyzingId}
          onClose={() => setSelectedDossier(null)}
          onReanalyze={handleReanalyzeDossier}
          onUpdateParams={handleUpdateDossierParams}
          onDelete={async (id) => {
            await adminApi.deleteDossier(id);
            setSelectedDossier(null);
            addToast('success', '卷宗已成功删除');
            if (selectedUserId) handleOpenDetails(selectedUserId);
          }}
          onZoomImage={(url) => setZoomedImg(url)}
        />
      )}

      {/* 6. Image Zoom Lightbox Overlay */}
      <AdminImageLightbox imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />

      {/* 注销用户确认弹窗 */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteConfirmUser)}
        title="注销/禁用用户账号"
        description={`确定注销/禁用用户「${deleteConfirmUser?.email}」吗？该操作将使该用户当前 Token 立即失效，并禁止登录。`}
        confirmText="确认注销"
        cancelText="取消"
        danger={true}
        loading={deleteLoading}
        onConfirm={executeDeleteUser}
        onCancel={() => setDeleteConfirmUser(null)}
      />

      {/* 统一 Toast 提示 */}
      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
