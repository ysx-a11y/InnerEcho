import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Crown,
  ThumbsUp,
  ThumbsDown,
  X,
  Sparkles,
  Award,
  Edit3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type {
  SpecialPriceLeaderboardItem,
  SpecialPriceMyStatus,
} from './taskTypes';

interface SpecialPriceLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SpecialPriceLeaderboardItem[];
  myStatus: SpecialPriceMyStatus | null;
  loading: boolean;
  error: string | null;
  onVote: (evaluationId: string, voteType: 'up' | 'down') => void;
  onOpenSubmitModal: () => void;
  onRefresh: () => void;
  title?: string;
  subtitle?: string;
  loadingText?: string;
  priceLabel?: string;
  unsubmittedText?: string;
}

export const SpecialPriceLeaderboardModal: React.FC<SpecialPriceLeaderboardModalProps> = ({
  isOpen,
  onClose,
  items,
  myStatus,
  loading,
  error,
  onVote,
  onOpenSubmitModal,
  onRefresh,
  title = '全网身价天梯 · Top 10',
  subtitle = '展示近 7 天净赞数（赞 - 踩）最高的前十位自白档案',
  loadingText = '正在同步全网排位...',
  priceLabel = '身价',
  unsubmittedText = '你尚未参与评定',
}) => {
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return `¥ ${price.toLocaleString()}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
            color: '#1a0b22',
            fontWeight: 800,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
            flexShrink: 0,
          }}
        >
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e0e0e0, #9e9e9e)',
            color: '#1a0b22',
            fontWeight: 800,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(224, 224, 224, 0.4)',
            flexShrink: 0,
          }}
        >
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #cd7f32, #8b4513)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(205, 127, 50, 0.4)',
            flexShrink: 0,
          }}
        >
          3
        </span>
      );
    }
    return (
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          color: 'var(--text-secondary)',
          fontWeight: 700,
          fontSize: '0.74rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          flexShrink: 0,
        }}
      >
        {rank}
      </span>
    );
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        background: 'rgba(10, 4, 15, 0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 22,
          background: 'linear-gradient(145deg, rgba(28, 10, 36, 0.96) 0%, rgba(14, 5, 20, 0.98) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.35)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7), 0 0 24px rgba(255, 51, 119, 0.15)',
          overflow: 'hidden',
          boxSizing: 'border-box',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 209, 128, 0.15)',
                border: '1px solid rgba(255, 209, 128, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={16} color="#ffd180" />
            </span>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                {subtitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={onRefresh}
              className="btn-secondary"
              style={{ padding: '0.35rem', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="刷新榜单"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '0.35rem', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Leaderboard List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            boxSizing: 'border-box',
          }}
        >
          {loading && items.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0', color: '#ff70a6', gap: '0.5rem' }}>
              <Loader2 size={20} className="animate-spin" />
              <span style={{ fontSize: '0.85rem' }}>{loadingText}</span>
            </div>
          ) : error && items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {error}
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Sparkles size={28} color="#ff70a6" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>暂无上榜记录</div>
              <div style={{ fontSize: '0.72rem', marginTop: 4 }}>抢先提交自评，成为全网第一位霸榜先锋！</div>
            </div>
          ) : (
            items.map((item) => {
              const isMe = myStatus?.id === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 14,
                    padding: '0.75rem 0.9rem',
                    background: isMe
                      ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.12) 0%, rgba(255, 209, 128, 0.08) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isMe
                      ? '1px solid rgba(255, 112, 166, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Top line: Rank, Nickname, Price, NetScore */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      {getRankBadge(item.rank)}
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: isMe ? '#ff70a6' : '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 120,
                        }}
                      >
                        {item.nickname}
                        {isMe && (
                          <span style={{ fontSize: '0.65rem', marginLeft: 4, color: '#ffd180', fontWeight: 600 }}>
                            (我)
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffd180' }}>
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>

                  {/* Confession text quote */}
                  <div
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 10,
                      borderLeft: '2px solid rgba(255, 112, 166, 0.4)',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    “{item.selfEvaluation}”
                  </div>

                  {/* Bottom vote action bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      净获赞: <b style={{ color: item.netScore >= 0 ? '#80f3ff' : '#ff70a6' }}>{item.netScore > 0 ? `+${item.netScore}` : item.netScore}</b>
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {/* Upvote button */}
                      <button
                        type="button"
                        onClick={() => onVote(item.id, 'up')}
                        style={{
                          background: item.userVote === 'up' ? 'rgba(128, 243, 255, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                          border: item.userVote === 'up' ? '1px solid #80f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: item.userVote === 'up' ? '#80f3ff' : 'var(--text-secondary)',
                          borderRadius: 8,
                          padding: '0.2rem 0.45rem',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ThumbsUp size={12} />
                        <span>{item.upvotes}</span>
                      </button>

                      {/* Downvote button */}
                      <button
                        type="button"
                        onClick={() => onVote(item.id, 'down')}
                        style={{
                          background: item.userVote === 'down' ? 'rgba(255, 112, 166, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                          border: item.userVote === 'down' ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: item.userVote === 'down' ? '#ff70a6' : 'var(--text-secondary)',
                          borderRadius: 8,
                          padding: '0.2rem 0.45rem',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ThumbsDown size={12} />
                        <span>{item.downvotes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Bottom Status Row */}
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(10, 4, 15, 0.95)',
            borderTop: '1px solid rgba(255, 112, 166, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          {myStatus && myStatus.hasSubmitted ? (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Award size={13} color="#ffd180" />
                <span>你的排名：第 <b style={{ color: '#ffd180', fontSize: '0.85rem' }}>{myStatus.rank}</b> 名</span>
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {priceLabel}：<b style={{ color: '#ffd180' }}>{formatPrice(myStatus.price || 0)}</b> ｜ 净获赞：<b style={{ color: '#80f3ff' }}>{myStatus.netScore > 0 ? `+${myStatus.netScore}` : myStatus.netScore}</b>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#ff70a6' }}>
                {unsubmittedText}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                立即提交自评，即刻进入全网天梯榜
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="btn-glow"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap',
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <Edit3 size={13} />
            <span>{myStatus?.hasSubmitted ? '修改自评' : '立即评定上榜'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
