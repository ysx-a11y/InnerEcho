import React from 'react';
import { Users, FileText, Target, Flame, RefreshCw } from 'lucide-react';
import type { AdminUserStats } from '../../adminTypes';

interface UserStatsHeaderProps {
  stats: AdminUserStats | null;
  activeTab: 'all' | 'with_dossier' | 'without_dossier' | 'deleted';
  onTabChange: (tab: 'all' | 'with_dossier' | 'without_dossier' | 'deleted') => void;
  onRefresh: () => void;
  loading: boolean;
}

export const UserStatsHeader: React.FC<UserStatsHeaderProps> = ({
  stats,
  activeTab,
  onTabChange,
  onRefresh,
  loading,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* 统计指标卡群 */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            width: '100%',
          }}
        >
          <div
            className="glass-card"
            style={{
              padding: '0.9rem 1.1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={13} color="#ff70a6" />
              <span>总注册用户</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginTop: '0.2rem' }}>
              {stats.totalUsers.toLocaleString()}{' '}
              <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', fontWeight: 400 }}>人</span>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '0.9rem 1.1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(128, 243, 255, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(128, 243, 255, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FileText size={13} color="#80f3ff" />
              <span>已测算生成卷宗</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#80f3ff', marginTop: '0.2rem' }}>
              {stats.withDossierCount.toLocaleString()}{' '}
              <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', fontWeight: 400 }}>人</span>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '0.9rem 1.1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255, 209, 128, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(255, 209, 128, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Target size={13} color="#ffd180" />
              <span>未答卷仅探索</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffd180', marginTop: '0.2rem' }}>
              {stats.withoutDossierCount.toLocaleString()}{' '}
              <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', fontWeight: 400 }}>人</span>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '0.9rem 1.1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(192, 132, 252, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Flame size={13} color="#c084fc" />
              <span>卷宗转化率</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c084fc', marginTop: '0.2rem' }}>
              {stats.totalUsers > 0 ? Math.round((stats.withDossierCount / stats.totalUsers) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* 筛选 Tab 栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: '全部用户' },
            { key: 'with_dossier', label: '已填卷用户' },
            { key: 'without_dossier', label: '未填卷潜客' },
            { key: 'deleted', label: '已注销' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key as any)}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: 10,
                fontSize: '0.74rem',
                fontWeight: activeTab === tab.key ? 800 : 500,
                background: activeTab === tab.key ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.25), rgba(225, 0, 255, 0.2))' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${activeTab === tab.key ? '#ff70a6' : 'rgba(255, 255, 255, 0.08)'}`,
                color: activeTab === tab.key ? '#ff70a6' : 'var(--admin-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: 10,
            background: 'rgba(255, 112, 166, 0.12)',
            border: '1px solid rgba(255, 112, 166, 0.3)',
            color: '#ff70a6',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <RefreshCw size={12} className={loading ? 'spin-rotate' : ''} />
          <span>刷新画像</span>
        </button>
      </div>
    </div>
  );
};
