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
  Sparkles,
  Filter,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { echoesApi, formatTime } from '../adminApi';
import type { AdminEchoWhisper } from '../adminTypes';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { DictBadge } from './ui/DictBadge';
import { DictSelect } from './ui/DictSelect';
import { AdminWorkbenchShell } from './ui/AdminWorkbenchShell';
import { StateTransitionModal } from './ui/StateTransitionModal';
import { adminNotify } from './ui/adminNotify';

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
      icon={<Flame size={22} color="#ff70a6" />}
      loading={loading}
      onRefresh={() => load(true)}
    >
      {/* 筛选过滤工具栏 */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          borderRadius: 16,
          padding: '0.85rem 1.15rem',
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

        {/* 动态审核状态字典下拉 */}
        <div style={{ minWidth: 150 }}>
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
          {SHADOW_TAG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
          </div>
        ) : loading && echoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
            <span>正在检索深夜回响纸条...</span>
          </div>
        ) : echoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>
            <span>暂无符合条件的回响心声记录</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 112, 166, 0.15)', color: 'var(--admin-text-muted)' }}>
                <th style={{ padding: '0.6rem 0.5rem', width: 90 }}>状态</th>
                <th style={{ padding: '0.6rem 0.5rem', width: 140 }}>社会面具</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>自白心声内容</th>
                <th style={{ padding: '0.6rem 0.5rem', width: 110 }}>暗面倾向</th>
                <th style={{ padding: '0.6rem 0.5rem', width: 80, textAlign: 'center' }}>共鸣数</th>
                <th style={{ padding: '0.6rem 0.5rem', width: 130 }}>投递时间</th>
                <th style={{ padding: '0.6rem 0.5rem', width: 200, textAlign: 'right' }}>流转操作</th>
              </tr>
            </thead>
            <tbody>
              {echoes.map((item) => {
                const isItemLoading = actionLoadingId === item.id;
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* 状态 (动态字典 Badge) */}
                    <td style={{ padding: '0.8rem 0.5rem' }}>
                      <DictBadge dictCode="echo_audit_status" value={item.auditStatus} size="sm" />
                    </td>

                    {/* 面具职业 */}
                    <td style={{ padding: '0.8rem 0.5rem', color: '#80f3ff', fontWeight: 600 }}>
                      {item.surfaceRole}
                    </td>

                    {/* 自白正文 & 审核批注 */}
                    <td style={{ padding: '0.8rem 0.5rem', color: '#f3edf7', maxWidth: '380px' }}>
                      <div
                        style={{
                          wordBreak: 'break-word',
                          lineHeight: 1.45,
                          fontSize: '0.78rem',
                        }}
                      >
                        "{item.shadowDesire}"
                      </div>
                      {item.adminNotes && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: '0.7rem',
                            color: '#ffd180',
                            background: 'rgba(255, 209, 128, 0.08)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            display: 'inline-block',
                          }}
                        >
                          批注: {item.adminNotes}
                        </div>
                      )}
                    </td>

                    {/* 阴影标签 */}
                    <td style={{ padding: '0.8rem 0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: 'rgba(255, 112, 166, 0.12)',
                          color: '#ff70a6',
                          border: '1px solid rgba(255, 112, 166, 0.25)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        #{item.shadowTag}
                      </span>
                    </td>

                    {/* 共鸣次数 */}
                    <td style={{ padding: '0.8rem 0.5rem', textAlign: 'center', color: '#ff70a6', fontWeight: 700 }}>
                      {item.echoCount}
                    </td>

                    {/* 投递时间 */}
                    <td style={{ padding: '0.8rem 0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.72rem' }}>
                      {formatTime(item.createdAt)}
                    </td>

                    {/* 流转操作动作 */}
                    <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {item.auditStatus === 'pending' && (
                          <>
                            <button
                              disabled={isItemLoading}
                              onClick={() => handleUpdateStatus(item.id, 'approved')}
                              title="审核通过并公开"
                              style={{
                                background: 'rgba(79, 209, 161, 0.15)',
                                border: '1px solid rgba(79, 209, 161, 0.4)',
                                color: '#4fd1a1',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <CheckCircle2 size={12} />
                              通过
                            </button>
                            <button
                              disabled={isItemLoading}
                              onClick={() => handleUpdateStatus(item.id, 'rejected')}
                              title="驳回不通过"
                              style={{
                                background: 'rgba(240, 113, 120, 0.15)',
                                border: '1px solid rgba(240, 113, 120, 0.4)',
                                color: '#f07178',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <XCircle size={12} />
                              驳回
                            </button>
                          </>
                        )}

                        {item.auditStatus === 'approved' && (
                          <button
                            disabled={isItemLoading}
                            onClick={() => handleUpdateStatus(item.id, 'flagged')}
                            title="下架隐藏"
                            style={{
                              background: 'rgba(255, 179, 71, 0.15)',
                              border: '1px solid rgba(255, 179, 71, 0.4)',
                              color: '#ffb347',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <ShieldAlert size={12} />
                            下架
                          </button>
                        )}

                        {item.auditStatus === 'flagged' && (
                          <button
                            disabled={isItemLoading}
                            onClick={() => handleUpdateStatus(item.id, 'approved')}
                            title="重新上架公开"
                            style={{
                              background: 'rgba(79, 209, 161, 0.15)',
                              border: '1px solid rgba(79, 209, 161, 0.4)',
                              color: '#4fd1a1',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            重新上架
                          </button>
                        )}

                        {item.auditStatus === 'rejected' && (
                          <button
                            disabled={isItemLoading}
                            onClick={() => handleUpdateStatus(item.id, 'approved')}
                            title="重新审核通过"
                            style={{
                              background: 'rgba(79, 209, 161, 0.15)',
                              border: '1px solid rgba(79, 209, 161, 0.4)',
                              color: '#4fd1a1',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            重新通过
                          </button>
                        )}

                        {/* 状态流转与批注弹窗触发按钮 */}
                        <button
                          disabled={isItemLoading}
                          onClick={() =>
                            setTransitionTarget({
                              echo: item,
                              toStatus: item.auditStatus === 'pending' ? 'approved' : item.auditStatus === 'approved' ? 'flagged' : 'approved',
                              actionName: '流转批注',
                            })
                          }
                          title="流转与审核批注"
                          style={{
                            background: 'rgba(255, 112, 166, 0.08)',
                            border: '1px solid rgba(255, 112, 166, 0.25)',
                            color: '#ff70a6',
                            borderRadius: '6px',
                            padding: '4px 7px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <MessageSquare size={12} />
                        </button>

                        {/* 物理删除：仅限已下架或已驳回的心声 */}
                        {(item.auditStatus === 'rejected' || item.auditStatus === 'flagged') && (
                          <button
                            disabled={isItemLoading}
                            onClick={() => setDeleteConfirmEcho(item)}
                            title="物理删除该已下架/已驳回心声"
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: 'var(--admin-text-muted)',
                              borderRadius: '6px',
                              padding: '4px 7px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={12} />
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

        {/* 分页控制栏 */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.2rem',
              paddingTop: '0.8rem',
              borderTop: '1px solid rgba(255, 112, 166, 0.1)',
              fontSize: '0.76rem',
              color: 'var(--admin-text-muted)',
            }}
          >
            <span>
              共 {total} 条回响记录 · 第 {page + 1} / {totalPages} 页
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: page === 0 ? 'rgba(255, 255, 255, 0.2)' : '#fff0f5',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: page >= totalPages - 1 ? 'rgba(255, 255, 255, 0.2)' : '#fff0f5',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

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
    </AdminWorkbenchShell>
  );
};
