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
    <div style={{ width: '100%', marginBottom: '0.8rem', textAlign: 'left' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.55rem',
          padding: '0 0.2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.38rem' }}>
          <Sparkles size={14} color="#ff70a6" className="icon-glow-rose" />
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
            精选潜意识卷宗 · 即刻首测
          </span>
        </div>
        <span style={{ fontSize: '0.69rem', color: 'var(--text-secondary)', opacity: 0.85 }}>
          免注册 · 极速自白
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.68rem' }}>
        {FEATURED_BANKS.map((bank) => {
          const isCompleted = completedBankIds.includes(bank.id);

          return (
            <div
              key={bank.id}
              className={`glass-card ${bank.isHero ? 'portal-hero-card' : 'portal-secondary-card'}`}
              style={{
                width: '100%',
                padding: '0.9rem 1.05rem',
                borderRadius: 18,
                border: `1px solid ${bank.borderColor}`,
                background: bank.gradient,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {/* 卡片右上角内嵌宝石极光晕染 */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -36,
                  right: -24,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${bank.cornerOrbColor} 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />

              {/* 杂志感大号暗纹编号水印 (01 / 02 / 03) */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 14,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.9rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  color: bank.badgeColor,
                  opacity: 0.08,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {bank.watermark}
              </span>

              {/* Card Meta Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.4rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.38rem', flexWrap: 'wrap' }}>
                  {bank.rankLabel && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, rgba(255, 51, 119, 0.34) 0%, rgba(225, 0, 255, 0.28) 100%)',
                        border: '1px solid rgba(255, 112, 166, 0.6)',
                        boxShadow: '0 0 10px rgba(255, 51, 119, 0.25)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                      }}
                    >
                      <Flame size={10} color="#ff70a6" fill="#ff70a6" />
                      <span>{bank.rankLabel}</span>
                    </span>
                  )}
                  <span
                    style={{
                      padding: '2px 9px',
                      borderRadius: 10,
                      background: `${bank.badgeColor}24`,
                      border: `1px solid ${bank.badgeColor}60`,
                      color: bank.badgeColor,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                    }}
                  >
                    {bank.badge}
                  </span>
                  {isCompleted && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.42)',
                        color: '#34d399',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={10} />
                      <span>已归档</span>
                    </span>
                  )}
                </div>

                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.68rem',
                    color: 'rgba(255, 240, 248, 0.62)',
                  }}
                >
                  <Clock size={11} />
                  <span>{bank.time}</span>
                </span>
              </div>

              {/* Title */}
              <h3
                style={{
                  margin: '0 0 0.28rem',
                  fontSize: bank.isHero ? '0.98rem' : '0.93rem',
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1.32,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  position: 'relative',
                }}
              >
                {bank.title}
              </h3>

              {/* Subtitle / Hook */}
              <p
                style={{
                  margin: '0 0 0.78rem',
                  fontSize: '0.74rem',
                  color: 'rgba(255, 238, 246, 0.74)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {bank.subtitle}
              </p>

              {/* Action Button：首推卡采用满功率流光主按钮，第 2/3 卡采用各自珠宝色系的通透水晶流光按钮 */}
              {bank.isHero ? (
                <button
                  type="button"
                  onClick={() => triggerBank(bank.id)}
                  className="btn-glow"
                  style={{
                    width: '100%',
                    padding: '0.58rem 0.85rem',
                    minHeight: 40,
                    borderRadius: 12,
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
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
                  className="portal-jewel-btn"
                  style={{
                    width: '100%',
                    padding: '0.54rem 0.85rem',
                    minHeight: 40,
                    borderRadius: 12,
                    background: bank.btnBackground,
                    border: bank.btnBorder,
                    boxShadow: bank.btnShadow,
                    color: '#ffffff',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
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
        className="glass-card portal-base-card"
        style={{
          width: '100%',
          marginTop: '0.68rem',
          padding: '0.66rem 0.95rem',
          minHeight: 42,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.42rem',
          cursor: 'pointer',
          border: '1px solid rgba(255, 112, 166, 0.34)',
          background:
            'linear-gradient(90deg, rgba(255, 112, 166, 0.06) 0%, rgba(225, 0, 255, 0.12) 50%, rgba(255, 112, 166, 0.06) 100%)',
          color: '#ff85b3',
          fontSize: '0.78rem',
          fontWeight: 700,
          boxSizing: 'border-box',
          fontFamily: 'inherit',
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
          className="glass-card portal-base-card"
          style={{
            width: '100%',
            marginTop: '0.68rem',
            padding: '0.75rem 0.95rem',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            gap: '0.72rem',
            cursor: 'pointer',
            border: '1px solid rgba(244, 63, 94, 0.36)',
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.16) 0%, rgba(16, 5, 22, 0.85) 75%)',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(244, 63, 94, 0.18)',
              border: '1px solid rgba(244, 63, 94, 0.38)',
              boxShadow: '0 0 12px rgba(244, 63, 94, 0.22)',
              flexShrink: 0,
            }}
          >
            <DoorOpen size={17} color="#ff9a7a" />
          </span>
          <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#ffe6df' }}>审讯室</span>
              <span
                style={{
                  fontSize: '0.6rem',
                  padding: '1px 6px',
                  borderRadius: 999,
                  border: '1px solid rgba(244, 63, 94, 0.5)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: '#ffb0c4',
                  fontWeight: 700,
                }}
              >
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

