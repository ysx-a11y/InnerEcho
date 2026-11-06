import React from 'react';
import { Award, ChevronRight, Crown, Sparkles } from 'lucide-react';
import type { SpecialEvaluationResult } from '../../../shared/apiContracts';

interface SpecialPriceTaskCardProps {
  evaluation: SpecialEvaluationResult | null;
  countdown: number;
  canEdit: boolean;
  onClick: () => void;
  onOpenLeaderboard?: () => void;
  title?: string;
  defaultDescription?: string;
  badgeText?: string;
  pricePrefix?: string;
  evalPrefix?: string;
  leaderboardButtonText?: string;
  submitButtonText?: string;
}

export const SpecialPriceTaskCard: React.FC<SpecialPriceTaskCardProps> = ({
  evaluation,
  onClick,
  onOpenLeaderboard,
  title = '如果你是一个婊子，你认为自己值多少钱',
  defaultDescription = '剥离一切道德防备，为骨子里的反差与沉沦明码标价，实时测算全网排位',
  badgeText = 'SPECIAL · 仪式级特殊排位',
  pricePrefix = '我的定价',
  evalPrefix = '自白',
  leaderboardButtonText = '查看 Top 10 身价榜',
  submitButtonText = '自评',
}) => {
  const isBetrothal = pricePrefix.includes('彩礼');
  const accentColor = isBetrothal ? '#e879f9' : '#ff70a6';
  const cornerOrb = isBetrothal ? 'rgba(217, 70, 239, 0.22)' : 'rgba(255, 51, 119, 0.22)';
  const cardBg = isBetrothal
    ? 'linear-gradient(135deg, rgba(192, 132, 252, 0.14) 0%, rgba(236, 72, 153, 0.06) 50%, rgba(18, 7, 24, 0.88) 100%)'
    : 'linear-gradient(135deg, rgba(255, 51, 119, 0.14) 0%, rgba(170, 38, 218, 0.06) 50%, rgba(18, 7, 24, 0.88) 100%)';
  const borderColor = isBetrothal ? 'rgba(232, 121, 249, 0.36)' : 'rgba(255, 112, 166, 0.36)';

  return (
    <div
      className="glass-card portal-secondary-card"
      style={{
        position: 'relative',
        padding: '0.88rem 1.05rem',
        borderRadius: 18,
        marginBottom: '0.75rem',
        background: cardBg,
        border: `1px solid ${borderColor}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 右上角内嵌宝石极光晕染 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -32,
          right: -24,
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cornerOrb} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.35rem',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              padding: '0.12rem 0.48rem',
              borderRadius: 8,
              background: `${accentColor}22`,
              color: accentColor,
              border: `1px solid ${accentColor}55`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Crown size={11} color={accentColor} />
            {badgeText}
          </span>
        </div>

        {/* Status Pill */}
        {evaluation ? (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: '#ffd180',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              background: 'rgba(255, 209, 128, 0.14)',
              padding: '0.12rem 0.48rem',
              borderRadius: 8,
              border: '1px solid rgba(255, 209, 128, 0.35)',
            }}
          >
            <Award size={11} color="#ffd180" />
            No. {evaluation.rank} · 击败 {evaluation.defeatedPercentage}%
          </span>
        ) : (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            <Sparkles size={11} />
            待测算
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '0.92rem',
          fontWeight: 800,
          color: '#fff',
          margin: '0 0 0.24rem 0',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '-0.01em',
          position: 'relative',
        }}
      >
        {title}
      </h3>

      {/* Description / Self-evaluation snippet */}
      <p
        style={{
          fontSize: '0.73rem',
          color: 'rgba(255, 238, 246, 0.74)',
          margin: '0 0 0.6rem 0',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {evaluation
          ? `${pricePrefix}: ¥${evaluation.price.toLocaleString()} | ${evalPrefix}: "${evaluation.selfEvaluation}"`
          : defaultDescription}
      </p>

      {/* Bottom Action Bar: View Top 10 + Submit / Edit */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          paddingTop: '0.48rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenLeaderboard) onOpenLeaderboard();
          }}
          className="btn-secondary"
          style={{
            fontSize: '0.71rem',
            padding: '0.32rem 0.65rem',
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: '#ffd180',
            borderColor: 'rgba(255, 209, 128, 0.38)',
            background: 'rgba(255, 209, 128, 0.1)',
          }}
        >
          <Crown size={12} color="#ffd180" />
          <span>{leaderboardButtonText}</span>
        </button>

        <button
          type="button"
          onClick={onClick}
          className="btn-glow"
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.34rem 0.78rem',
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            whiteSpace: 'nowrap',
            ...(isBetrothal
              ? {
                  background:
                    'linear-gradient(135deg, rgba(168, 85, 247, 0.45) 0%, rgba(217, 70, 239, 0.52) 52%, rgba(236, 72, 153, 0.48) 100%)',
                  border: '1px solid rgba(232, 121, 249, 0.55)',
                  boxShadow: '0 4px 16px rgba(192, 38, 211, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                }
              : {}),
          }}
        >
          <span>{evaluation ? `修改${submitButtonText}` : `立即${submitButtonText}`}</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};
