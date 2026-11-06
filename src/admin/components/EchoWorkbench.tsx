import React, { useEffect, useState, useCallback } from 'react';
import {
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Filter,
} from 'lucide-react';
import { echoesApi, formatTime } from '../adminApi';
import type { AdminEchoWhisper } from '../adminTypes';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { AdminToast, type ToastMessage } from './ui/AdminToast';

const PAGE_SIZE = 20;

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

  // Toast messages
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirmEcho, setDeleteConfirmEcho] = useState<AdminEchoWhisper | null>(null);

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
          addToast('success', '回响心声列表已刷新');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载回响心声失败';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterTag, search, page]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected' | 'flagged' | 'pending') => {
    setActionLoadingId(id);
    try {
      await echoesApi.updateStatus(id, newStatus);
      setEchoes((prev) =>
        prev.map((item) => (item.id === id ? { ...item, auditStatus: newStatus } : item))
      );
      onStatusChanged?.();
      const statusLabel = newStatus === 'approved' ? '已核准公开' : newStatus === 'rejected' ? '已下架/拒绝' : '状态已更新';
      addToast('success', `心声${statusLabel}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoadingId(null);
    }
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
      addToast('success', '已永久删除该条回响心声');
      setDeleteConfirmEcho(null);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '删除失败');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* 筛选过滤工具栏 */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          borderRadius: 16,
          padding: '0.85rem 1.15rem',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.8rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* 搜索框 */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={14}
            color="var(--admin-text-muted)"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="搜索职业面具或自白关键词..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={{
              width: '100%',
              background: 'rgba(12, 6, 16, 0.85)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
              borderRadius: '10px',
              padding: '8px 12px 8px 32px',
              color: '#fff0f5',
              fontSize: '0.78rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <Filter size={14} color="#ff70a6" />

        {/* 审核状态下拉 */}
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(0);
          }}
          style={{
            background: 'rgba(12, 6, 16, 0.85)',
            border: '1px solid rgba(255, 112, 166, 0.25)',
            borderRadius: '10px',
            padding: '7px 10px',
            color: '#fff0f5',
            fontSize: '0.76rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">全部审核状态</option>
          <option value="pending">⏳ 待审核 (Pending)</option>
          <option value="approved">✅ 已通过 (Approved)</option>
          <option value="rejected">❌ 已驳回 (Rejected)</option>
          <option value="flagged">🚩 已下架 (Flagged)</option>
        </select>

        {/* 阴影标签下拉 */}
        <select
          value={filterTag}
          onChange={(e) => {
            setFilterTag(e.target.value);
            setPage(0);
          }}
          style={{
            background: 'rgba(12, 6, 16, 0.85)',
            border: '1px solid rgba(255, 112, 166, 0.25)',
            borderRadius: '10px',
            padding: '7px 10px',
            color: '#fff0f5',
            fontSize: '0.76rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">全部阴影倾向</option>
          <option value="支配渴求">支配渴求</option>
          <option value="绝对臣服">绝对臣服</option>
          <option value="角色互换">角色互换</option>
          <option value="安全束缚">安全束缚</option>
          <option value="反差情绪">反差情绪</option>
          <option value="心理补偿">心理补偿</option>
        </select>
      </div>

      {/* 表格容器 */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          borderRadius: 16,
          padding: '1rem 1.25rem',
          boxSizing: 'border-box',
          overflowX: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        {error ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#f07178',
              fontSize: '0.82rem',
              padding: '1rem',
              background: 'rgba(240, 113, 120, 0.1)',
              borderRadius: '10px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button
              onClick={() => { void load(true); }}
              style={{
                marginLeft: 'auto',
                background: 'rgba(240, 113, 120, 0.15)',
                border: '1px solid rgba(240, 113, 120, 0.3)',
                color: '#fff',
                borderRadius: '8px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '0.76rem',
              }}
            >
              重试
            </button>
          </div>
        ) : loading && echoes.length === 0 ? (
          <div style={{ color: '#8d879e', textAlign: 'center', padding: '3rem 0', fontSize: '0.85rem' }}>
            正在加载回响心声列表...
          </div>
        ) : echoes.length === 0 ? (
          <div style={{ color: '#8d879e', textAlign: 'center', padding: '3rem 0', fontSize: '0.85rem' }}>
            暂无匹配的回响心声记录
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '860px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#8d879e' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600, width: '100px' }}>状态</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, width: '130px' }}>现实面具/职业</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, width: '110px' }}>阴影标签</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>暗面自白心声</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, width: '90px' }}>共鸣数</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, width: '150px' }}>投掷时间</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, width: '190px', textAlign: 'right' }}>审核操作</th>
              </tr>
            </thead>
            <tbody>
              {echoes.map((echo) => {
                const isOperating = actionLoadingId === echo.id;
                return (
                  <tr
                    key={echo.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* 状态徽标 */}
                    <td style={{ padding: '12px 8px' }}>
                      {echo.auditStatus === 'approved' && (
                        <span
                          style={{
                            background: 'rgba(79, 209, 161, 0.12)',
                            border: '1px solid rgba(79, 209, 161, 0.35)',
                            color: '#4fd1a1',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          已公开
                        </span>
                      )}
                      {echo.auditStatus === 'pending' && (
                        <span
                          style={{
                            background: 'rgba(245, 185, 95, 0.12)',
                            border: '1px solid rgba(245, 185, 95, 0.35)',
                            color: '#f5b95f',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          待审核
                        </span>
                      )}
                      {echo.auditStatus === 'rejected' && (
                        <span
                          style={{
                            background: 'rgba(240, 113, 120, 0.12)',
                            border: '1px solid rgba(240, 113, 120, 0.35)',
                            color: '#f07178',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          已驳回
                        </span>
                      )}
                      {echo.auditStatus === 'flagged' && (
                        <span
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#a8b0bf',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          已下架
                        </span>
                      )}
                    </td>

                    {/* 角色面具 */}
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#ffd180' }}>
                      🎭 {echo.surfaceRole}
                    </td>

                    {/* 阴影标签 */}
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          background: 'rgba(147, 51, 234, 0.15)',
                          border: '1px solid rgba(147, 51, 234, 0.3)',
                          color: '#c084fc',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        {echo.shadowTag}
                      </span>
                    </td>

                    {/* 暗面自白 */}
                    <td style={{ padding: '12px 8px', maxWidth: '380px', lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.9)' }}>
                      “{echo.shadowDesire}”
                    </td>

                    {/* 共鸣数 */}
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#ff70a6',
                          fontWeight: 700,
                        }}
                      >
                        <Flame size={13} />
                        <span>{echo.echoCount}</span>
                      </span>
                    </td>

                    {/* 投掷时间 */}
                    <td style={{ padding: '12px 8px', fontSize: '0.75rem', color: '#8d879e' }}>
                      {formatTime(echo.createdAt)}
                    </td>

                    {/* 审核操作 */}
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* 1. 待审核状态：显示【通过】与【驳回】 */}
                        {echo.auditStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(echo.id, 'approved')}
                              disabled={isOperating}
                              title="审核通过并公开"
                              style={{
                                background: 'rgba(79, 209, 161, 0.12)',
                                border: '1px solid rgba(79, 209, 161, 0.35)',
                                color: '#4fd1a1',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                cursor: isOperating ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>通过</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(echo.id, 'rejected')}
                              disabled={isOperating}
                              title="驳回不通过"
                              style={{
                                background: 'rgba(245, 185, 95, 0.12)',
                                border: '1px solid rgba(245, 185, 95, 0.35)',
                                color: '#f5b95f',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                cursor: isOperating ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                              }}
                            >
                              <XCircle size={13} />
                              <span>驳回</span>
                            </button>
                          </>
                        )}

                        {/* 2. 已通过/已公开状态：仅显示【下架】 */}
                        {echo.auditStatus === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(echo.id, 'flagged')}
                            disabled={isOperating}
                            title="下架隐藏"
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#ffd180',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              cursor: isOperating ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            <ShieldAlert size={13} />
                            <span>下架</span>
                          </button>
                        )}

                        {/* 3. 已下架状态：显示【上架】 */}
                        {echo.auditStatus === 'flagged' && (
                          <button
                            onClick={() => handleUpdateStatus(echo.id, 'approved')}
                            disabled={isOperating}
                            title="重新上架公开"
                            style={{
                              background: 'rgba(79, 209, 161, 0.12)',
                              border: '1px solid rgba(79, 209, 161, 0.35)',
                              color: '#4fd1a1',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              cursor: isOperating ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>上架</span>
                          </button>
                        )}

                        {/* 4. 已驳回状态：可重新【通过】 */}
                        {echo.auditStatus === 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(echo.id, 'approved')}
                            disabled={isOperating}
                            title="重新审核通过"
                            style={{
                              background: 'rgba(79, 209, 161, 0.12)',
                              border: '1px solid rgba(79, 209, 161, 0.35)',
                              color: '#4fd1a1',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              cursor: isOperating ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>通过</span>
                          </button>
                        )}

                        {/* 5. 仅在【已下架】或【已驳回】状态下出现【删除】按钮；上架和待审核状态无法删除 */}
                        {(echo.auditStatus === 'flagged' || echo.auditStatus === 'rejected') && (
                          <button
                            onClick={() => setDeleteConfirmEcho(echo)}
                            disabled={isOperating}
                            title="物理删除该已下架/已驳回心声"
                            style={{
                              background: 'rgba(240, 113, 120, 0.12)',
                              border: '1px solid rgba(240, 113, 120, 0.35)',
                              color: '#f07178',
                              padding: '4px 7px',
                              borderRadius: '8px',
                              cursor: isOperating ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '0.74rem',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
            padding: '0.4rem 0.2rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#8d879e' }}>
            共 {total} 条心声 · 第 {page + 1} / {totalPages} 页
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: page === 0 ? '#555' : '#fff',
                fontSize: '0.78rem',
                cursor: page === 0 || loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ChevronLeft size={14} />
              <span>上一页</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: page >= totalPages - 1 ? '#555' : '#fff',
                fontSize: '0.78rem',
                cursor: page >= totalPages - 1 || loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>下一页</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 物理删除确认弹窗 */}
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

      {/* 统一 Toast 提示 */}
      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
