import React, { useEffect, useState, useCallback } from 'react';
import {
  Crown,
  Award,
  Search,
  RefreshCw,
  Clock,
  User,
  Mail,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { adminApi, formatTime } from '../../adminApi';
import type { AdminSpecialEvaluation, AdminSpecialEvaluationStats } from '../../adminTypes';

interface SpecialPriceLadderProps {
  refreshTrigger?: number;
}

const PAGE_SIZE = 15;

export const SpecialPriceLadder: React.FC<SpecialPriceLadderProps> = ({ refreshTrigger }) => {
  const [items, setItems] = useState<AdminSpecialEvaluation[]>([]);
  const [stats, setStats] = useState<AdminSpecialEvaluationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [taskType, setTaskType] = useState<'price_tag' | 'betrothal_gift'>('price_tag');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'high' | 'mid' | 'low' | 'zero'>('all');
  const [sortField, setSortField] = useState<'price' | 'createdAt' | 'updatedAt'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let minPrice: number | undefined;
      let maxPrice: number | undefined;

      if (tierFilter === 'high') {
        minPrice = 100000;
      } else if (tierFilter === 'mid') {
        minPrice = 10000;
        maxPrice = 99999.99;
      } else if (tierFilter === 'low') {
        minPrice = 0.01;
        maxPrice = 9999.99;
      } else if (tierFilter === 'zero') {
        minPrice = 0;
        maxPrice = 0;
      }

      const res = await adminApi.listSpecialEvaluations({
        taskType,
        search: search.trim() || undefined,
        minPrice,
        maxPrice,
        sort: sortField,
        order: sortOrder,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      if (res.success) {
        setItems(res.items);
        setStats(res.stats);
        setTotal(res.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载排位数据失败');
    } finally {
      setLoading(false);
    }
  }, [taskType, search, tierFilter, sortField, sortOrder, page]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
      {/* Task Type Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setTaskType('price_tag');
            setPage(0);
          }}
          className={taskType === 'price_tag' ? 'btn-primary' : 'btn-secondary'}
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Crown size={14} />
          <span>身价自评 (price_tag)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTaskType('betrothal_gift');
            setPage(0);
          }}
          className={taskType === 'betrothal_gift' ? 'btn-primary' : 'btn-secondary'}
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Sparkles size={14} />
          <span>彩礼与伴侣自白 (betrothal_gift)</span>
        </button>
      </div>

      {/* Top 4 Stats Summary Cards */}
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
              padding: '0.85rem 1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255, 209, 128, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(255, 209, 128, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
              全网参与测算人数
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffd180', marginTop: '0.15rem' }}>
              {stats.totalParticipants.toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>人</span>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
              最高自评身价
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ff70a6', marginTop: '0.15rem' }}>
              ¥{stats.highestPrice.toLocaleString()}
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(128, 243, 255, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(128, 243, 255, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
              中位数自评身价
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#80f3ff', marginTop: '0.15rem' }}>
              ¥{stats.medianPrice.toLocaleString()}
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(170, 38, 218, 0.12) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(170, 38, 218, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
              平均自评身价
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#c084fc', marginTop: '0.15rem' }}>
              ¥{stats.averagePrice.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Control & Search Bar */}
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
        {/* Tier filter chips */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>身价档位:</span>
          {[
            { key: 'all', label: '全部' },
            { key: 'high', label: '高价值区 (≥¥10万)' },
            { key: 'mid', label: '中段反差 (¥1万~¥10万)' },
            { key: 'low', label: '基础区 (<¥1万)' },
            { key: 'zero', label: '无价 / 0元' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTierFilter(t.key as any);
                setPage(0);
              }}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 12,
                fontSize: '0.72rem',
                fontWeight: tierFilter === t.key ? 700 : 500,
                background: tierFilter === t.key ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.3), rgba(225, 0, 255, 0.25))' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${tierFilter === t.key ? '#ff70a6' : 'rgba(255, 255, 255, 0.08)'}`,
                color: tierFilter === t.key ? '#ff70a6' : 'var(--admin-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search box & sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="搜索昵称 / 邮箱 / 自白关键词"
              style={{
                width: '100%',
                padding: '0.35rem 0.65rem 0.35rem 1.75rem',
                background: 'rgba(12, 4, 16, 0.8)',
                border: '1px solid rgba(255, 112, 166, 0.25)',
                borderRadius: 10,
                color: '#fff0f5',
                fontSize: '0.75rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            onClick={load}
            style={{
              padding: '0.35rem 0.65rem',
              background: 'rgba(255, 112, 166, 0.12)',
              border: '1px solid rgba(255, 112, 166, 0.3)',
              borderRadius: 10,
              color: '#ff70a6',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <RefreshCw size={12} className={loading ? 'spin-rotate' : ''} />
            <span>查询</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Crown size={17} color="#ffd180" />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
              全网身价天梯榜单与真实自白
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
            共检索到 {total} 条自评排位记录
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#ff70a6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} className="spin-rotate" />
            <span>正在加载天梯排位...</span>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
            暂无符合条件的身价排位记录
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--admin-text-muted)' }}>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600, width: '90px' }}>天梯排位</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600, width: '120px' }}>自评身价</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600 }}>内心独白 / 文字自评</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600, width: '140px' }}>用户身份</th>
                  <th style={{ padding: '0.55rem 0.6rem', fontWeight: 600, width: '130px' }}>测算时间</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isTop1 = item.rank === 1;
                  const isTop3 = item.rank <= 3;
                  const rankColor = isTop1 ? '#ffd180' : item.rank === 2 ? '#e2e8f0' : item.rank === 3 ? '#ff70a6' : 'var(--admin-text-secondary)';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 112, 166, 0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Rank */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 8,
                            background: isTop3 ? `${rankColor}20` : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${isTop3 ? rankColor : 'rgba(255, 255, 255, 0.08)'}`,
                            color: rankColor,
                            fontWeight: 800,
                            fontSize: '0.72rem',
                          }}
                        >
                          {isTop1 && <Crown size={12} />}
                          <span>No. {item.rank}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffd180' }}>
                          ¥{item.price.toLocaleString()}
                        </span>
                      </td>

                      {/* Self Evaluation quote */}
                      <td style={{ padding: '0.65rem 0.6rem', color: '#fff0f5', fontStyle: 'italic', lineHeight: 1.45 }}>
                        “{item.selfEvaluation}”
                      </td>

                      {/* User Info */}
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{item.nickname}</span>
                          <span style={{ fontSize: '0.66rem', color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                            {item.email || `游客 (${item.deviceId.slice(0, 8)})`}
                          </span>
                        </div>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '0.65rem 0.6rem', color: 'var(--admin-text-muted)', fontSize: '0.7rem' }}>
                        {formatTime(item.updatedAt || item.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
              第 {page + 1} / {pageCount} 页
            </span>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: 8,
                padding: '0.3rem 0.5rem',
                color: page === 0 ? 'var(--admin-text-muted)' : '#fff',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: 8,
                padding: '0.3rem 0.5rem',
                color: page >= pageCount - 1 ? 'var(--admin-text-muted)' : '#fff',
                cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
