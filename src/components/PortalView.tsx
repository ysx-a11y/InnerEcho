import React, { useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  ChevronRight,
  Library,
  Crown,
  Layers,
  Activity,
  User,
  UserCheck,
  LogIn,
  Clock,
  Zap,
  Mail,
  DoorOpen,
  Siren,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import type { DossierSummaryContract } from '../../shared/apiContracts';
import type { ChapterOneData } from '../data/chapterStructure';
import { prioritizeAuth, prioritizeBankSelector } from '../utils/journeyPreloads';
import { WhisperMailboxModal } from './WhisperMailboxModal';
import { FEATURED_BANKS, PortalSeoFooter } from './portal/PortalSeoFooter';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { progressivePreloader } from '../utils/progressiveLoading';

// 登录弹窗按需加载：点登录/注册才拉取
const AuthModal = React.lazy(() => import('./AuthModal').then((m) => ({ default: m.AuthModal })));

interface PortalViewProps {
  /** 第一层：前往基础信息登记 */
  onGoToBasicInfo: () => void;
  /** 第二层：前往题库/卷宗中心 */
  onOpenBanks: () => void;
  /** 第三层（前）：前往任务中心 */
  onOpenTasks: () => void;
  /** 第三层（后）：前往自制角色卡/自白海报 */
  onOpenCards: () => void;
  /** 第四层：前往潜意识星盘 */
  onOpenAstrolabe: () => void;
  /** 审讯室（测试功能）：仅登录用户可见 */
  onOpenInterrogation?: () => void;
  /** 前往个人中心 */
  onOpenPersonal?: () => void;
  /** 触发全局登录/注册弹窗 */
  onLoginClick?: () => void;
  /** 兼容通用开始入口 */
  onStart?: () => void;
  /** 直接开启指定爆款题库测验 */
  onStartBank?: (bankId: string) => void;
  /** 已完成归档的题库 ID 列表 */
  completedBankIds?: string[];
  user?: { id: string; email: string } | null;
  basicInfo?: ChapterOneData | null;
  onLoginSuccess?: (user: { id: string; email: string }, latestDossier?: DossierSummaryContract) => void;
  onRestoreDossier?: (summary: DossierSummaryContract) => void;
  /** 已登录态点击"继续使用"时触发 */
  onContinue?: () => void;
  /** 退出登录（含会话失效时的状态清理） */
  onLogout?: () => void;
}

function formatAccountBadge(account: string): string {
  const trimmed = account.trim();
  if (/^\d{11}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}****${trimmed.slice(7)}`;
  }
  return trimmed;
}

export const PortalView: React.FC<PortalViewProps> = ({
  onGoToBasicInfo,
  onOpenBanks,
  onOpenTasks,
  onOpenCards,
  onOpenAstrolabe,
  onOpenInterrogation,
  onOpenPersonal,
  onLoginClick,
  onStart,
  onStartBank,
  completedBankIds = [],
  user,
  basicInfo,
  onLoginSuccess,
  onRestoreDossier,
  onContinue,
  onLogout,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [hasUnreadMail, setHasUnreadMail] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const checkMail = async () => {
      try {
        const res = await fetch('/api/mailbox/my', {
          headers: { 'X-Device-Id': getOrCreateDeviceId() },
          credentials: 'include',
        });
        const data = await res.json();
        if (isMounted && data.success && data.hasUnreadReply) {
          setHasUnreadMail(true);
        }
      } catch {}
    };
    void checkMail();
    return () => { isMounted = false; };
  }, []);

  React.useEffect(() => {
    if (authMode === null) return;
    progressivePreloader.pause();
    return () => progressivePreloader.resume();
  }, [authMode]);

  const openAuth = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      setAuthMode('login');
      void prioritizeAuth();
    }
  };

  const handleBanksClick = () => {
    void prioritizeBankSelector();
    onOpenBanks();
  };

  const triggerBank = (bankId: string) => {
    if (onStartBank) {
      onStartBank(bankId);
    } else if (onStart) {
      onStart();
    } else {
      handleBanksClick();
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '0.75rem 1rem calc(4.5rem + env(safe-area-inset-bottom, 0px))',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 'min(520px, 100%)',
        margin: '0 auto',
        boxSizing: 'border-box',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
      className="animate-fade-in portal-container"
    >
      {/* 顶部极简问候与登录态微标 */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          padding: '0 0.25rem',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={14} stroke="url(#rose-magenta-gradient)" className="animate-icon-pulse" />
          <span style={{ fontSize: '0.78rem', color: '#ff70a6', fontWeight: 600, letterSpacing: '0.05em' }}>
            深层回响 · 极密卷宗
          </span>
        </div>

        {user ? (
          <button
            onClick={onOpenPersonal || onContinue || handleBanksClick}
            style={{
              background: 'rgba(255, 112, 166, 0.1)',
              border: '1px solid rgba(255, 112, 166, 0.26)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
              borderRadius: 14,
              padding: '0.24rem 0.62rem',
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.32rem',
            }}
            title={`前往个人中心 (${user.email})`}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 6px #34d399',
                flexShrink: 0,
              }}
            />
            <User size={12} />
            <span style={{ maxWidth: 105, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatAccountBadge(user.email)}
            </span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: 14,
                padding: '0.22rem 0.55rem',
                color: '#34d399',
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="已启用本地设备加密沙盒，无需注册直接测验"
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#34d399',
                  boxShadow: '0 0 6px #34d399',
                }}
              />
              <span>匿名加密沙盒</span>
            </span>

            <button
              onClick={openAuth}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 112, 166, 0.25)',
                borderRadius: 14,
                padding: '0.22rem 0.55rem',
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'background 0.2s',
              }}
              title="选填：云端备份或同步到其他设备"
            >
              <LogIn size={11} />
              <span>云端备份</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          第一层：高定水晶假面档案铭牌（内嵌角标极光与胶囊触发器）
          ======================================================== */}
      {(() => {
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
                        ? '已建档 · 建议补全真实职业与暗面渴望设定'
                        : (occupation
                            ? `职业：${occupation}${personaTrait ? ` · 人前：${personaTrait}` : ' · 点击查看或更新资料'}`
                            : '真实设定已存证 · 点击查看或更新资料'))
                    : '录入真实职业与人前假面设定'}
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
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                {isRegistered ? (hasMissingDetails ? '补全资料' : '修改资料') : '去登记'}
              </span>
              <ChevronRight size={14} />
            </div>
          </button>
        );
      })()}

      {/* ========================================================
          第二层：精选三大爆款特辑题库（高定珠宝三色光场 + 杂志级暗纹编号）
          ======================================================== */}
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
          onClick={handleBanksClick}
          className="glass-card portal-base-card"
          style={{
            width: '100%',
            marginTop: '0.68rem',
            padding: '0.66rem 0.95rem',
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

      {/* ========================================================
          第三层：并列双入口（流光香槟金任务 + 幻彩紫晶角色卡）
          ======================================================== */}
      <div
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.68rem',
          marginBottom: '0.75rem',
          boxSizing: 'border-box',
        }}
      >
        {/* 任务（前） */}
        <button
          type="button"
          onClick={onOpenTasks}
          className="glass-card portal-base-card"
          style={{
            padding: '0.88rem 0.75rem 0.82rem',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.36rem',
            cursor: 'pointer',
            border: '1px solid rgba(255, 209, 128, 0.32)',
            background: 'linear-gradient(145deg, rgba(255, 209, 128, 0.11) 0%, rgba(18, 6, 24, 0.72) 100%)',
            boxSizing: 'border-box',
            textAlign: 'center',
            minHeight: 102,
            fontFamily: 'inherit',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -24,
              right: -24,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 209, 128, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 209, 128, 0.15)',
              border: '1px solid rgba(255, 209, 128, 0.42)',
              boxShadow: '0 0 14px rgba(255, 209, 128, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Crown size={18} stroke="url(#gold-orange-gradient)" className="icon-glow-gold" />
          </span>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffd180', lineHeight: 1.2 }}>
            试炼任务
          </span>
          <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', opacity: 0.8, lineHeight: 1.2 }}>
            接取暗面悬赏与挑战
          </span>
        </button>

        {/* 自制角色卡（后） */}
        <button
          type="button"
          onClick={onOpenCards}
          className="glass-card portal-base-card"
          style={{
            padding: '0.88rem 0.75rem 0.82rem',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.36rem',
            cursor: 'pointer',
            border: '1px solid rgba(192, 132, 252, 0.34)',
            background: 'linear-gradient(145deg, rgba(192, 132, 252, 0.12) 0%, rgba(18, 6, 24, 0.72) 100%)',
            boxSizing: 'border-box',
            textAlign: 'center',
            minHeight: 102,
            fontFamily: 'inherit',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -24,
              right: -24,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(192, 132, 252, 0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(192, 132, 252, 0.16)',
              border: '1px solid rgba(192, 132, 252, 0.44)',
              boxShadow: '0 0 14px rgba(192, 132, 252, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Layers size={18} color="#c084fc" className="icon-glow-violet" />
          </span>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#c084fc', lineHeight: 1.2 }}>
            自制角色卡
          </span>
          <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', opacity: 0.8, lineHeight: 1.2 }}>
            生成专属自白卡片
          </span>
        </button>
      </div>

      {/* ========================================================
          第四层：潜意识星盘（冰晶青微光单行入口）
          ======================================================== */}
      <button
        type="button"
        onClick={onOpenAstrolabe}
        className="glass-card portal-base-card"
        style={{
          width: '100%',
          padding: '0.68rem 0.95rem',
          borderRadius: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
          cursor: 'pointer',
          border: '1px solid rgba(128, 243, 255, 0.26)',
          background: 'linear-gradient(135deg, rgba(128, 243, 255, 0.08) 0%, rgba(18, 6, 24, 0.65) 100%)',
          boxSizing: 'border-box',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.58rem', minWidth: 0 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(128, 243, 255, 0.14)',
              border: '1px solid rgba(128, 243, 255, 0.36)',
              boxShadow: '0 0 10px rgba(128, 243, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={14} color="#80f3ff" />
          </span>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#80f3ff' }}>
              潜意识星盘
            </span>
            <span style={{ fontSize: '0.69rem', color: 'var(--text-secondary)', opacity: 0.78, marginLeft: '0.45rem' }}>
              群体四维心流数据分布
            </span>
          </div>
        </div>

        <ChevronRight size={14} color="#80f3ff" style={{ flexShrink: 0 }} />
      </button>

      {/* 第五层：SEO 全站题库与心理专栏内链矩阵（防 React 挂载后抹除静态内链） */}
      <PortalSeoFooter />

      {/* Auth Modal */}
      <Suspense fallback={null}>
        {authMode !== null && (
          <AuthModal
            isOpen={authMode !== null}
            initialMode={authMode === 'register'}
            onClose={() => setAuthMode(null)}
            user={user ?? null}
            onLoginSuccess={(u, latestDossier) => {
              setAuthMode(null);
              onLoginSuccess?.(u, latestDossier);
            }}
            onLogout={onLogout ?? (() => {})}
            onRestoreDossier={onRestoreDossier}
            onContinue={onContinue}
          />
        )}
      </Suspense>
      {/* 暗室信箱常驻微光悬浮胶囊 */}
      {typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            right: 'max(14px, calc(50vw - 230px + 12px))',
            bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
            zIndex: 60,
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setMailboxOpen(true)}
            className="floating-mailbox-btn"
            title="投递回响或建言（1v1 私密）"
          >
            <Mail size={13} color="#ff70a6" />
            <span style={{ letterSpacing: '0.02em', color: '#ffb3d1' }}>暗室信箱</span>
          </button>
          {hasUnreadMail && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ff70a6',
                boxShadow: '0 0 8px #ff70a6',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>,
        document.body
      )}

      <WhisperMailboxModal
        isOpen={mailboxOpen}
        onClose={() => setMailboxOpen(false)}
        onMessagesRead={() => setHasUnreadMail(false)}
        userNickname={basicInfo?.nickname}
      />
    </div>
  );
};
