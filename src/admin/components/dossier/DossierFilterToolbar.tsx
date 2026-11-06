import React from 'react';
import {
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface DossierFilterToolbarProps {
  total: number;
  selectedIdsCount: number;
  loading: boolean;
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  filterCredibility: string;
  onFilterCredibilityChange: (val: string) => void;
  filterDepth: string;
  onFilterDepthChange: (val: string) => void;
  filterStatus: string;
  onFilterStatusChange: (val: string) => void;
  onBatchDelete: () => void;
  onExportCSV: () => void;
  onRefresh: () => void;
  onNavigateToUsers?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export const DossierFilterToolbar: React.FC<DossierFilterToolbarProps> = ({
  total,
  selectedIdsCount,
  loading,
  searchInput,
  onSearchInputChange,
  filterCredibility,
  onFilterCredibilityChange,
  filterDepth,
  onFilterDepthChange,
  filterStatus,
  onFilterStatusChange,
  onBatchDelete,
  onExportCSV,
  onRefresh,
  onNavigateToUsers,
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <div
      className="glass-card"
      style={{
        background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.75) 0%, rgba(16, 8, 22, 0.85) 100%)',
        border: '1px solid rgba(255, 112, 166, 0.2)',
        borderRadius: 16,
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 112, 166, 0.15)',
                border: '1px solid rgba(255, 112, 166, 0.35)',
                color: '#ff70a6',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              📑 卷宗档案库
            </span>
            {onNavigateToUsers && (
              <button
                type="button"
                onClick={onNavigateToUsers}
                style={{
                  padding: '3px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 112, 166, 0.2)',
                  color: 'var(--admin-text-secondary)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>👥 注册用户画像中心</span>
                <ChevronRight size={13} color="#ff70a6" />
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', margin: 0 }}>
            直连生产库 · 共 {total} 条卷宗记录 · 诊断与数据实时同步
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {selectedIdsCount > 0 && (
            <button
              type="button"
              onClick={onBatchDelete}
              style={{
                background: 'rgba(255, 51, 119, 0.15)',
                border: '1px solid rgba(255, 51, 119, 0.4)',
                color: '#ff3377',
                padding: '6px 12px',
                borderRadius: '9px',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 0 10px rgba(255, 51, 119, 0.2)',
              }}
            >
              <Trash2 size={13} />
              <span>批量删除 ({selectedIdsCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportCSV}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
              color: 'var(--admin-text-secondary)',
              padding: '6px 12px',
              borderRadius: '9px',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <Download size={13} />
            <span>导出 CSV</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            style={{
              background: 'rgba(255, 112, 166, 0.12)',
              border: '1px solid rgba(255, 112, 166, 0.3)',
              color: '#ff70a6',
              padding: '6px 12px',
              borderRadius: '9px',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin-rotate' : ''} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 搜索与过滤 */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', display: 'flex' }}>
            <Search size={14} />
          </div>
          <input
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="搜索昵称 / 职业 / 设备ID..."
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
        {[
          {
            label: '可信度',
            value: filterCredibility,
            set: onFilterCredibilityChange,
            options: [
              ['all', '全部可信度'],
              ['high', '高可信度'],
              ['medium', '中可信度'],
              ['low', '低可信度'],
            ],
          },
          {
            label: '心理深度',
            value: filterDepth,
            set: onFilterDepthChange,
            options: [
              ['all', '全部深度'],
              ['deep', '深度分析'],
              ['medium', '中度分析'],
              ['light', '浅层分析'],
            ],
          },
          {
            label: '审核状态',
            value: filterStatus,
            set: onFilterStatusChange,
            options: [
              ['all', '全部状态'],
              ['pending', '待核准'],
              ['approved', '已核准'],
              ['flagged', '已作废'],
            ],
          },
        ].map((f) => (
          <select
            key={f.label}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
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
            {f.options.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        ))}

        {(onExpandAll || onCollapseAll) && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
            {onExpandAll && (
              <button
                type="button"
                onClick={onExpandAll}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 112, 166, 0.2)',
                  color: 'var(--admin-text-secondary)',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                全部展开
              </button>
            )}
            {onCollapseAll && (
              <button
                type="button"
                onClick={onCollapseAll}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 112, 166, 0.2)',
                  color: 'var(--admin-text-secondary)',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                全部折叠
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
