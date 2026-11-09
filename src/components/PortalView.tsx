import React, { useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Mail } from 'lucide-react';
import type { DossierSummaryContract } from '../../shared/apiContracts';
import type { ChapterOneData } from '../data/chapterStructure';
import { prioritizeAuth, prioritizeBankSelector } from '../utils/journeyPreloads';
import { WhisperMailboxModal } from './WhisperMailboxModal';
import { PortalSeoFooter } from './portal/PortalSeoFooter';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { progressivePreloader } from '../utils/progressiveLoading';

// 门户拆解子模块
import { PortalHeaderBar } from './portal/PortalHeaderBar';
import { PortalUserCard } from './portal/PortalUserCard';
import { PortalFeaturedBanks } from './portal/PortalFeaturedBanks';
import { PortalShortcuts } from './portal/PortalShortcuts';

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
  sealedPersonaCount?: number;
  onLoginSuccess?: (user: { id: string; email: string }, latestDossier?: DossierSummaryContract) => void;
  onRestoreDossier?: (summary: DossierSummaryContract) => void;
  /** 已登录态点击"继续使用"时触发 */
  onContinue?: () => void;
  /** 退出登录（含会话失效时的状态清理） */
  onLogout?: () => void;
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
  sealedPersonaCount = 0,
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
    <div className="min-h-[calc(100dvh-120px)] flex flex-col items-center justify-start px-4 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] text-center relative z-[1] w-full max-w-[min(520px,100%)] mx-auto box-border [word-break:break-word] [overflow-wrap:break-word] animate-fade-in portal-container">
      {/* 顶部极简问候与登录态微标 */}
      <PortalHeaderBar
        user={user}
        onOpenPersonal={onOpenPersonal}
        onContinue={onContinue}
        onOpenBanks={handleBanksClick}
        onOpenAuth={openAuth}
      />

      {/* 第一层：高定水晶假面档案铭牌 */}
      <PortalUserCard
        basicInfo={basicInfo}
        onGoToBasicInfo={onGoToBasicInfo}
        sealedPersonaCount={sealedPersonaCount}
      />

      {/* 第二层：精选三大爆款特辑题库 */}
      <PortalFeaturedBanks
        completedBankIds={completedBankIds}
        triggerBank={triggerBank}
        onOpenBanks={handleBanksClick}
        user={user}
        onOpenInterrogation={onOpenInterrogation}
      />

      {/* 第三层 & 第四层：任务 / 自制卡 / 潜意识星盘 */}
      <PortalShortcuts
        onOpenTasks={onOpenTasks}
        onOpenCards={onOpenCards}
        onOpenAstrolabe={onOpenAstrolabe}
      />

      {/* 第五层：SEO 全站题库与心理专栏内链矩阵 */}
      <PortalSeoFooter />

      {/* 登录/注册浮层 */}
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
        <div className="fixed right-[max(14px,calc(50vw-230px+12px))] bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-[60] pointer-events-auto">
          <button
            type="button"
            onClick={() => setMailboxOpen(true)}
            className="floating-mailbox-btn"
            title="投递回响或建言（1v1 私密）"
          >
            <Mail size={13} color="#ff70a6" />
            <span className="tracking-wide text-[#ffb3d1]">暗室信箱</span>
          </button>
          {hasUnreadMail && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#ff70a6] shadow-[0_0_8px_#ff70a6] pointer-events-none" />
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

export default PortalView;
