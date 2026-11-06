import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Eye, Shield, Trash2, Sparkles, ChevronRight, FileText } from 'lucide-react';
import { adminApi, formatDuration, formatTime } from '../adminApi';
import type { AdminDossier, AdminOverview, AdminTimeRange } from '../adminTypes';
import { getQuestionnaireName } from '../adminUtils';
import { DossierDetailModal } from './DossierDetailModal';
import { DashboardMetrics } from './dashboard/DashboardMetrics';
import { DashboardTrendChart } from './dashboard/DashboardTrendChart';
import { DashboardFunnel } from './dashboard/DashboardFunnel';
import { DashboardDistribution } from './dashboard/DashboardDistribution';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { AdminImageLightbox } from './ui/AdminImageLightbox';
import { AdminToast, type ToastMessage } from './ui/AdminToast';

interface DashboardProps {
  range: AdminTimeRange;
  customDate: string;
  refreshTrigger: number;
  onNavigateToUsers: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  range,
  customDate,
  refreshTrigger,
  onNavigateToUsers,
}) => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<AdminDossier | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  // Toast messages
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const rangeLabels: Record<string, string> = {
    today: '今日',
    yesterday: '昨日',
    week: '本周',
    month: '本月',
    quarter: '本季',
    year: '本年',
    custom: '指定日',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.overview(range, range === 'custom' ? customDate : undefined);
      setOverview(res.overview);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [range, customDate]);

  useEffect(() => {
    load();
  }, [range, customDate, load, refreshTrigger]);

  const openDossier = async (id: string) => {
    setModalLoading(true);
    try {
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '加载卷宗失败');
    } finally {
      setModalLoading(false);
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
      addToast('success', 'LLM 重新评估完成，诊断结果已更新');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '重新评估失败');
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
      addToast('success', '卷宗审核状态与备注已保存');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '更新失败');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteDossier(deleteConfirmId);
      addToast('success', '卷宗已成功物理删除');
      setSelectedDossier(null);
      setDeleteConfirmId(null);
      await load();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', color: '#818cf8', gap: '0.6rem' }}>
        <RefreshCw size={18} className="spin-rotate" />
        <span>正在加载全域数据大屏...</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', color: '#f87171', gap: '0.8rem' }}>
        <AlertTriangle size={28} />
        <span>{error}</span>
        <button
          onClick={() => load()}
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '6px 16px', cursor: 'pointer' }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', boxSizing: 'border-box', width: '100%' }}>
      {/* 1. 核心指标卡片矩阵 */}
      <DashboardMetrics overview={overview} rangeLabel={rangeLabels[range]} />

      {/* 2. 近7天趋势图 + 业务转化漏斗 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
        <DashboardTrendChart weekly={overview?.weekly ?? []} />
        <DashboardFunnel overview={overview} />
      </div>

      {/* 3. 用户特征多维分布（心理深度流光环形图、年龄段、职业排行） */}
      <DashboardDistribution overview={overview} />

      {/* 4. 最近提交卷宗轻量流式卡片 */}
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.3rem',
          borderRadius: 12,
          background: '#0f172a',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <FileText size={16} color="#818cf8" />
            <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              最近成功测算生成的深度卷宗
            </h3>
          </div>
          <button
            onClick={onNavigateToUsers}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 6,
              padding: '0.25rem 0.65rem',
              color: '#a5b4fc',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span>全域用户画像</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {overview?.recent && overview.recent.length > 0 ? (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--admin-text-muted)' }}>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>填写人</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>题库卷宗</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>耗时</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>提交时间</th>
                  <th style={{ padding: '0.5rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent.map((d) => (
                  <tr
                    key={d.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.6rem', color: '#fff', fontWeight: 600 }}>
                      {d.nickname || '神秘探索者'}
                    </td>
                    <td style={{ padding: '0.6rem', color: 'var(--admin-text-secondary)' }}>
                      {getQuestionnaireName(d, overview.bankNames)}
                    </td>
                    <td style={{ padding: '0.6rem', color: 'var(--admin-text-muted)' }}>
                      {formatDuration(d.durationSeconds)}
                    </td>
                    <td style={{ padding: '0.6rem', color: 'var(--admin-text-muted)' }}>
                      {formatTime(d.createdAt)}
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>
                      <button
                        onClick={() => openDossier(d.id)}
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: 5,
                          padding: '0.2rem 0.5rem',
                          color: '#a5b4fc',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Eye size={12} />
                        <span>查阅</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '2rem 0' }}>
            暂无卷宗提交记录
          </div>
        )}
      </div>

      {/* Dossier Detail Modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          reanalyzingId={reanalyzing}
          onClose={() => setSelectedDossier(null)}
          onReanalyze={handleReanalyze}
          onUpdateParams={handleUpdateDossierParams}
          onDelete={handleDeleteItem}
          onZoomImage={(url) => setZoomedImg(url)}
        />
      )}

      {/* Image Zoom Lightbox Overlay */}
      <AdminImageLightbox imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />

      {/* 物理删除确认弹窗 */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="物理删除卷宗记录"
        description="确认物理删除该条卷宗数据？删除后该测评记录不可恢复。"
        confirmText="确认删除"
        cancelText="取消"
        danger={true}
        loading={deleteLoading}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* 统一 Toast 提示 */}
      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
