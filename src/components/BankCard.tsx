import React, { useState } from 'react';
import { QuestionBankMetadata } from '../types/quizEngine';
import { Clock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface BankCardProps {
  bank: QuestionBankMetadata;
  isLocked?: boolean;
  isLoading: boolean;
  isCompleted: boolean;
  onCardClick: (bankId: string) => void;
  completedCount?: number;
  completionStatus?: 'syncing' | 'ready' | 'stale' | 'error';
  reportLoading?: boolean;
  onViewResult?: (bankId: string) => void;
  /** 仅登录用户可用：打开"首次 vs 最近一次"复测对比。 */
  onOpenRetest?: (bankId: string) => void;
  onPreload?: (bankId: string) => void;
  onHoverPreload?: (bankId: string) => void;
}

interface CategoryTheme {
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  cardGradient: string;
  borderIdle: string;
  borderHover: string;
  cornerOrb: string;
  btnGradient?: string;
  btnBorder?: string;
  btnShadow?: string;
}

function getCategoryTheme(category?: string, isUserBank?: boolean): CategoryTheme {
  if (isUserBank) {
    return {
      accentColor: '#c084fc',
      badgeBg: 'rgba(192, 132, 252, 0.18)',
      badgeBorder: 'rgba(192, 132, 252, 0.45)',
      cardGradient:
        'linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(236, 72, 153, 0.06) 50%, rgba(18, 6, 26, 0.86) 100%)',
      borderIdle: 'rgba(192, 132, 252, 0.3)',
      borderHover: '#c084fc',
      cornerOrb: 'rgba(192, 132, 252, 0.22)',
      btnGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.42) 0%, rgba(236, 72, 153, 0.45) 100%)',
      btnBorder: '1px solid rgba(216, 180, 254, 0.55)',
      btnShadow: '0 4px 18px rgba(168, 85, 247, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
    };
  }

  switch (category) {
    case 'direct':
      return {
        accentColor: '#e879f9',
        badgeBg: 'rgba(232, 121, 249, 0.16)',
        badgeBorder: 'rgba(232, 121, 249, 0.45)',
        cardGradient:
          'linear-gradient(135deg, rgba(217, 70, 239, 0.14) 0%, rgba(168, 85, 247, 0.06) 50%, rgba(18, 6, 26, 0.86) 100%)',
        borderIdle: 'rgba(232, 121, 249, 0.3)',
        borderHover: '#e879f9',
        cornerOrb: 'rgba(217, 70, 239, 0.22)',
        btnGradient: 'linear-gradient(135deg, rgba(192, 38, 211, 0.42) 0%, rgba(236, 72, 153, 0.45) 100%)',
        btnBorder: '1px solid rgba(240, 171, 252, 0.55)',
        btnShadow: '0 4px 18px rgba(217, 70, 239, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      };
    case 'preference':
      return {
        accentColor: '#ffd180',
        badgeBg: 'rgba(255, 209, 128, 0.15)',
        badgeBorder: 'rgba(255, 209, 128, 0.42)',
        cardGradient:
          'linear-gradient(135deg, rgba(255, 209, 128, 0.13) 0%, rgba(255, 51, 119, 0.06) 50%, rgba(18, 6, 24, 0.86) 100%)',
        borderIdle: 'rgba(255, 209, 128, 0.3)',
        borderHover: '#ffd180',
        cornerOrb: 'rgba(255, 209, 128, 0.2)',
      };
    case 'scientific':
    case 'confession':
      return {
        accentColor: '#2dd4bf',
        badgeBg: 'rgba(45, 212, 191, 0.15)',
        badgeBorder: 'rgba(45, 212, 191, 0.4)',
        cardGradient:
          'linear-gradient(135deg, rgba(45, 212, 191, 0.13) 0%, rgba(168, 85, 247, 0.06) 50%, rgba(16, 7, 24, 0.86) 100%)',
        borderIdle: 'rgba(45, 212, 191, 0.28)',
        borderHover: '#2dd4bf',
        cornerOrb: 'rgba(45, 212, 191, 0.2)',
      };
    case 'scenario':
    default:
      return {
        accentColor: '#ff5c9e',
        badgeBg: 'rgba(255, 92, 158, 0.16)',
        badgeBorder: 'rgba(255, 92, 158, 0.45)',
        cardGradient:
          'linear-gradient(135deg, rgba(255, 51, 119, 0.14) 0%, rgba(170, 38, 218, 0.06) 50%, rgba(18, 6, 24, 0.86) 100%)',
        borderIdle: 'rgba(255, 112, 166, 0.3)',
        borderHover: '#ff70a6',
        cornerOrb: 'rgba(255, 51, 119, 0.22)',
      };
  }
}

export const BankCard: React.FC<BankCardProps> = ({
  bank,
  isLoading,
  isCompleted,
  completedCount = 0,
  completionStatus = 'ready',
  reportLoading = false,
  onCardClick,
  onViewResult,
  onOpenRetest,
  onPreload,
  onHoverPreload,
}) => {
  const [hovered, setHovered] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCardClick(bank.id);
    }
  };

  const isUserBank = bank.id.startsWith('ubk_');
  const theme = getCategoryTheme(bank.category, isUserBank);

  const badgeText = isUserBank
    ? '✦ 我的题库'
    : (bank.badge || (bank.category === 'scientific' ? '量表评估' : '暗面剧情'));

  const dimensionPreview =
    bank.dimensions && bank.dimensions.length > 0
      ? `维度：${bank.dimensions.slice(0, 2).map((d) => d.name).join(' · ')}`
      : bank.subtitle
        ? bank.subtitle
        : `深度潜意识测评 · 约 ${bank.estimatedMinutes ?? 5} 分钟`;

  const cardStyle: React.CSSProperties = {
    background: theme.cardGradient,
    borderRadius: 18,
    padding: '1.05rem 1.15rem',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    overflow: 'hidden',
    border: `1px solid ${hovered ? theme.borderHover : theme.borderIdle}`,
    boxShadow: hovered
      ? `0 14px 32px -6px rgba(8, 2, 14, 0.82), 0 0 22px -4px ${theme.cornerOrb}, inset 0 1px 0 0 rgba(255, 235, 245, 0.28)`
      : '0 10px 28px -6px rgba(8, 2, 14, 0.72), inset 0 1px 0 0 rgba(255, 230, 242, 0.18)',
    transform: hovered ? 'translateY(-2px)' : 'none',
  };

  return (
    <div
      onClick={() => onCardClick(bank.id)}
      onMouseEnter={() => {
        setHovered(true);
        if (onHoverPreload) onHoverPreload(bank.id);
      }}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={() => {
        if (onPreload) onPreload(bank.id);
      }}
      style={cardStyle}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${bank.title}, ${badgeText}, 预估 ${bank.estimatedMinutes || 5} 分钟`}
    >
      {/* 右上角内嵌宝石极光晕染 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -34,
          right: -24,
          width: 135,
          height: 135,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.cornerOrb} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        {/* Top Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.55rem',
            flexWrap: 'nowrap',
            gap: '0.4rem',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.18rem 0.58rem',
              borderRadius: 10,
              background: theme.badgeBg,
              color: theme.accentColor,
              border: `1px solid ${theme.badgeBorder}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {badgeText}
          </span>

          <span
            style={{
              fontSize: '0.7rem',
              color: 'rgba(255, 240, 248, 0.62)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.22rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {completionStatus === 'syncing' ? (
              <span
                style={{
                  marginRight: '0.35rem',
                  color: '#80f3ff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Loader2 size={11} className="animate-spin" />
                同步记录
              </span>
            ) : completionStatus === 'error' ? (
              <span style={{ marginRight: '0.35rem', color: '#fbbf24' }}>记录不可用</span>
            ) : (
              <span
                style={{
                  marginRight: '0.35rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 8,
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  color: isCompleted ? '#2dd4bf' : 'rgba(255, 235, 245, 0.52)',
                  background: isCompleted ? 'rgba(45, 212, 191, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${isCompleted ? 'rgba(45, 212, 191, 0.34)' : 'rgba(255, 255, 255, 0.1)'}`,
                }}
              >
                {isCompleted
                  ? (completedCount > 1 ? `已完成 · ${completedCount} 次` : '已完成')
                  : '未完成'}
              </span>
            )}
            <Clock size={11} style={{ flexShrink: 0 }} />
            <span>预估 {bank.estimatedMinutes || 5} 分钟</span>
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.02rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.3rem',
            lineHeight: 1.32,
            boxSizing: 'border-box',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
          }}
        >
          {bank.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '0.76rem',
            color: 'rgba(255, 238, 246, 0.74)',
            lineHeight: 1.45,
            marginBottom: '0.85rem',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            boxSizing: 'border-box',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
          }}
        >
          {bank.description}
        </p>
      </div>

      {/* Bottom Button Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.68rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          width: '100%',
          gap: '0.6rem',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {completionStatus === 'syncing' ? (
          <span
            style={{
              fontSize: '0.74rem',
              color: '#80f3ff',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Loader2 size={12} className="animate-spin" />
            正在同步完成记录
          </span>
        ) : completionStatus === 'error' ? (
          <span style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: 600, whiteSpace: 'nowrap' }}>
            完成记录暂不可用
          </span>
        ) : isCompleted && (onViewResult || (onOpenRetest && completedCount > 1)) ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {onViewResult && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewResult(bank.id);
                }}
                disabled={reportLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
                className="hover:text-white"
              >
                {reportLoading ? '加载中...' : '查看上次报告'}
              </button>
            )}
            {onViewResult && onOpenRetest && completedCount > 1 && (
              <span style={{ color: 'rgba(255, 255, 255, 0.18)' }}>|</span>
            )}
            {onOpenRetest && completedCount > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRetest(bank.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff70a6',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
                className="hover:text-white"
              >
                复测对比
              </button>
            )}
          </span>
        ) : (
          <span
            style={{
              fontSize: '0.71rem',
              color: 'rgba(255, 230, 242, 0.58)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.28rem',
              minWidth: 0,
            }}
          >
            <Sparkles size={11} color={theme.accentColor} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dimensionPreview}
            </span>
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCardClick(bank.id);
          }}
          className={isLoading ? 'btn-secondary' : 'btn-glow'}
          disabled={Boolean(isLoading)}
          style={{
            fontSize: '0.76rem',
            padding: '0.38rem 0.9rem',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.32rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
            ...(theme.btnGradient && !isLoading
              ? {
                  background: theme.btnGradient,
                  border: theme.btnBorder,
                  boxShadow: theme.btnShadow,
                }
              : {}),
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>正在加载</span>
            </>
          ) : (
            <>
              <span>开启测试</span>
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
