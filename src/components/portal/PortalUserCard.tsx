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
      className="glass-card portal-base-card w-full p-3.5 sm:px-4 sm:py-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer mb-3.5 box-border text-left relative overflow-hidden transition-all"
      style={{
        border: isRegistered
          ? (hasMissingDetails ? '1px solid rgba(52, 211, 153, 0.38)' : '1px solid rgba(192, 132, 252, 0.4)')
          : '1px solid rgba(255, 112, 166, 0.34)',
        background: isRegistered
          ? (hasMissingDetails
              ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.11) 0%, rgba(18, 6, 24, 0.78) 100%)'
              : 'linear-gradient(135deg, rgba(192, 132, 252, 0.13) 0%, rgba(255, 51, 119, 0.06) 50%, rgba(18, 6, 24, 0.8) 100%)')
          : 'linear-gradient(135deg, rgba(255, 51, 119, 0.12) 0%, rgba(18, 6, 24, 0.76) 100%)',
      }}
    >
      {/* 右上角环境微光斑 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-7 -right-5 size-28 rounded-full"
        style={{
          background: `radial-gradient(circle, ${accentColor}28 0%, transparent 70%)`,
        }}
      />

      <div className="flex items-center gap-3 min-w-0 relative">
        <span
          className="size-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: isRegistered
              ? (hasMissingDetails ? 'rgba(52, 211, 153, 0.16)' : 'rgba(192, 132, 252, 0.18)')
              : 'rgba(255, 112, 166, 0.18)',
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
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-white leading-snug truncate">
            {isRegistered ? `代号：${nickname} · 假面档案` : '身份与表里假面登记'}
          </div>
          <div className="text-xs text-[var(--text-secondary)] leading-snug mt-1 truncate">
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
        className="flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0 relative"
        style={{
          color: accentColor,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}45`,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }}
      >
        <span className="text-xs font-bold whitespace-nowrap">
          {isRegistered ? (hasMissingDetails ? '补全资料' : '修改资料') : '去登记'}
        </span>
        <ChevronRight size={13} />
      </div>
    </button>
  );
};

