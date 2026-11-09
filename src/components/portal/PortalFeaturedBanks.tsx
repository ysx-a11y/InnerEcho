import React from 'react';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Zap,
  ChevronRight,
  Library,
  DoorOpen,
  Siren,
} from 'lucide-react';
import { FEATURED_BANKS } from './PortalSeoFooter';

interface PortalFeaturedBanksProps {
  completedBankIds?: string[];
  triggerBank: (bankId: string) => void;
  onOpenBanks: () => void;
  user?: { id: string; email: string } | null;
  onOpenInterrogation?: () => void;
}

export const PortalFeaturedBanks: React.FC<PortalFeaturedBanksProps> = ({
  completedBankIds = [],
  triggerBank,
  onOpenBanks,
  user,
  onOpenInterrogation,
}) => {
  return (
    <div className="w-full mb-3 text-left">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} color="#ff70a6" className="icon-glow-rose" />
          <span className="text-sm font-extrabold text-white tracking-wide">
            精选潜意识卷宗 · 即刻首测
          </span>
        </div>
        <span className="text-xs text-[var(--text-secondary)] opacity-85">
          免注册 · 极速自白
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {FEATURED_BANKS.map((bank) => {
          const isCompleted = completedBankIds.includes(bank.id);

          return (
            <div
              key={bank.id}
              className={`glass-card ${bank.isHero ? 'portal-hero-card' : 'portal-secondary-card'} w-full p-3.5 sm:px-4 sm:py-3.5 rounded-2xl box-border relative overflow-hidden`}
              style={{
                border: `1px solid ${bank.borderColor}`,
                background: bank.gradient,
              }}
            >
              {/* 卡片右上角内嵌宝石极光晕染 */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-9 -right-6 size-36 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${bank.cornerOrbColor} 0%, transparent 70%)`,
                }}
              />

              {/* 杂志感大号暗纹编号水印 (01 / 02 / 03) */}
              <span
                aria-hidden="true"
                className="pointer-events-none select-none absolute top-1.5 right-3.5 text-5xl font-black leading-none tracking-tighter opacity-[0.08]"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: bank.badgeColor,
                }}
              >
                {bank.watermark}
              </span>

              {/* Card Meta Row */}
              <div className="flex items-center justify-between mb-1.5 relative">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {bank.rankLabel && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[rgba(255,51,119,0.34)] to-[rgba(225,0,255,0.28)] border border-[rgba(255,112,166,0.6)] shadow-[0_0_10px_rgba(255,51,119,0.25)] text-white text-[11px] font-extrabold">
                      <Flame size={10} color="#ff70a6" fill="#ff70a6" />
                      <span>{bank.rankLabel}</span>
                    </span>
                  )}
                  <span
                    className="px-2 py-0.5 rounded-lg text-xs font-bold"
                    style={{
                      background: `${bank.badgeColor}24`,
                      border: `1px solid ${bank.badgeColor}60`,
                      color: bank.badgeColor,
                    }}
                  >
                    {bank.badge}
                  </span>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(52,211,153,0.15)] border border-[rgba(52,211,153,0.42)] text-[#34d399] text-[11px] font-bold">
                      <CheckCircle2 size={10} />
                      <span>已归档</span>
                    </span>
                  )}
                </div>

                <span className="flex items-center gap-1 text-xs text-white/60">
                  <Clock size={11} />
                  <span>{bank.time}</span>
                </span>
              </div>

              {/* Title */}
              <h3
                className={`m-0 mb-1 font-extrabold text-white leading-snug truncate relative ${
                  bank.isHero ? 'text-base' : 'text-sm'
                }`}
              >
                {bank.title}
              </h3>

              {/* Subtitle / Hook */}
              <p className="m-0 mb-3 text-xs text-white/75 leading-relaxed line-clamp-2 relative">
                {bank.subtitle}
              </p>

              {/* Action Button */}
              {bank.isHero ? (
                <button
                  type="button"
                  onClick={() => triggerBank(bank.id)}
                  className="btn-glow w-full py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 border-none cursor-pointer whitespace-nowrap"
                  style={{
                    minHeight: 44,
                    height: 44,
                    boxSizing: 'border-box',
                  }}
                >
                  <Zap size={13} fill="currentColor" />
                  <span>立即开启测验</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerBank(bank.id)}
                  className="portal-jewel-btn w-full py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap text-white"
                  style={{
                    background: bank.btnBackground,
                    border: bank.btnBorder,
                    boxShadow: bank.btnShadow,
                    fontFamily: 'var(--font-heading)',
                    minHeight: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <Zap size={13} color={bank.badgeColor} fill={bank.badgeColor} />
                  <span>立即开启测验</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* View All Banks link */}
      <button
        type="button"
        onClick={onOpenBanks}
        className="glass-card portal-base-card w-full mt-3 py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-[rgba(255,112,166,0.34)] bg-gradient-to-r from-[rgba(255,112,166,0.06)] via-[rgba(225,0,255,0.12)] to-[rgba(255,112,166,0.06)] text-[#ff85b3] text-xs font-bold box-border"
        style={{
          minHeight: 44,
          height: 44,
          boxSizing: 'border-box',
        }}
      >
        <Library size={14} />
        <span>查看全部绝密卷宗库与社区自制题库 (10+)</span>
        <ChevronRight size={14} />
      </button>

      {/* 审讯室：只对已登录账号显示 */}
      {user && onOpenInterrogation && (
        <button
          type="button"
          onClick={onOpenInterrogation}
          className="glass-card portal-base-card w-full mt-3 py-2.5 px-3.5 rounded-2xl flex items-center gap-3 cursor-pointer border border-[rgba(244,63,94,0.36)] bg-gradient-to-br from-[rgba(244,63,94,0.16)] to-[rgba(16,5,22,0.85)] box-border"
          style={{
            minHeight: 48,
            boxSizing: 'border-box',
          }}
        >
          <span className="size-8 rounded-xl inline-flex items-center justify-center bg-[rgba(244,63,94,0.18)] border border-[rgba(244,63,94,0.38)] shadow-[0_0_12px_rgba(244,63,94,0.22)] shrink-0">
            <DoorOpen size={17} color="#ff9a7a" />
          </span>
          <span className="flex-1 text-left min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[#ffe6df]">审讯室</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[rgba(244,63,94,0.5)] bg-[rgba(244,63,94,0.15)] text-[#ffb0c4] font-bold">
                测试功能
              </span>
            </span>
          </span>
          <Siren size={15} color="#ff9a7a" />
          <ChevronRight size={15} color="#ff9a7a" />
        </button>
      )}
    </div>
  );
};

