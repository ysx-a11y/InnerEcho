import React from 'react';
import { UserCheck, Sparkles, ChevronRight } from 'lucide-react';
import type { ChapterOneData } from '../../data/chapterStructure';

interface PortalUserCardProps {
  basicInfo?: ChapterOneData | null;
  onGoToBasicInfo: () => void;
  sealedPersonaCount?: number;
}

export const PortalUserCard: React.FC<PortalUserCardProps> = ({
  basicInfo,
  onGoToBasicInfo,
  sealedPersonaCount = 0,
}) => {
  const nickname = basicInfo?.nickname?.trim();
  const isRegistered = Boolean(nickname);
  const occupation = basicInfo?.occupation?.trim();
  const personaTrait = basicInfo?.personaTrait?.trim();
  const innerDesire = basicInfo?.innerDesire?.trim();
  const hasMissingDetails = isRegistered && (!occupation || !innerDesire);

  const accentColor = isRegistered
    ? (hasMissingDetails ? '#34d399' : '#c084fc')
    : '#ff70a6';

  return (
    <button
      type="button"
      onClick={onGoToBasicInfo}
      className="glass-card portal-base-card"
      style={{
        width: '100%',
        padding: '0.8rem 1rem',
        borderRadius: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        cursor: 'pointer',
        border: isRegistered
          ? (hasMissingDetails ? '1px solid rgba(52, 211, 153, 0.38)' : '1px solid rgba(192, 132, 252, 0.4)')
          : '1px solid rgba(255, 112, 166, 0.34)',
        background: isRegistered
          ? (hasMissingDetails
              ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.11) 0%, rgba(18, 6, 24, 0.78) 100%)'
              : 'linear-gradient(135deg, rgba(192, 132, 252, 0.13) 0%, rgba(255, 51, 119, 0.06) 50%, rgba(18, 6, 24, 0.8) 100%)')
          : 'linear-gradient(135deg, rgba(255, 51, 119, 0.12) 0%, rgba(18, 6, 24, 0.76) 100%)',
        marginBottom: '0.85rem',
        boxSizing: 'border-box',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      {/* 右上角环境微光斑 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -28,
          right: -20,
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}28 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, position: 'relative' }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isRegistered
              ? (hasMissingDetails ? 'rgba(52, 211, 153, 0.16)' : 'rgba(192, 132, 252, 0.18)')
              : 'rgba(255, 112, 166, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1px solid ${accentColor}66`,
            boxShadow: `0 0 14px ${accentColor}30, inset 0 1px 0 rgba(255, 255, 255, 0.25)`,
          }}
        >
          {isRegistered ? (
            <UserCheck size={17} color={accentColor} />
          ) : (
            <Sparkles size={17} stroke="url(#rose-magenta-gradient)" />
          )}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isRegistered ? `代号：${nickname} · 假面档案` : '身份与表里假面登记'}
          </div>
          <div
            style={{
              fontSize: '0.71rem',
              color: isRegistered ? 'rgba(255,255,255,0.74)' : 'var(--text-secondary)',
              lineHeight: 1.25,
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isRegistered
              ? (hasMissingDetails
                  ? `已建档 · 建议补全职业与渴望设定${sealedPersonaCount > 0 ? ` · 已封印人格卡 ${sealedPersonaCount} 张` : ''}`
                  : (occupation
                      ? `真实职业：${occupation}${personaTrait ? ` · 人前：${personaTrait}` : ''}${sealedPersonaCount > 0 ? ` · 已封印人格卡 ${sealedPersonaCount} 张` : ''}`
                      : `真实设定已密存存证${sealedPersonaCount > 0 ? ` · 已封印人格卡 ${sealedPersonaCount} 张` : ''}`))
              : `录入真实职业与人前假面设定${sealedPersonaCount > 0 ? ` · 已封印人格卡 ${sealedPersonaCount} 张` : ''}`}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.2rem',
          color: accentColor,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}45`,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
          padding: '0.26rem 0.58rem 0.26rem 0.68rem',
          borderRadius: 999,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {isRegistered ? (hasMissingDetails ? '补全资料' : '修改资料') : '去登记'}
        </span>
        <ChevronRight size={14} />
      </div>
    </button>
  );
};

