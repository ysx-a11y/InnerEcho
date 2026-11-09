import React, { Suspense } from 'react';
import type { FullDossierData, ChapterOneData } from '../data/chapterStructure';
import type { DossierSummaryContract, SessionUser } from '../../shared/apiContracts';
import { ErrorBoundary } from './ErrorBoundary';
import { InterrogationClosedModal } from './InterrogationClosedModal';

// 懒加载模态弹窗
const AuthModal = React.lazy(() => import('./AuthModal').then((m) => ({ default: m.AuthModal })));
const QuickProfileModal = React.lazy(() => import('./QuickProfileModal').then((m) => ({ default: m.QuickProfileModal })));
const DossierSealModal = React.lazy(() => import('./DossierSealModal').then((m) => ({ default: m.DossierSealModal })));
const RetestComparisonModal = React.lazy(() => import('./RetestComparisonModal').then((m) => ({ default: m.RetestComparisonModal })));

export interface AppModalsHostProps {
  quickProfileState: { isOpen: boolean; bankId: string | null };
  onCloseQuickProfile: () => void;
  onConfirmQuickProfile: (profile: { nickname: string; gender: string; age: string }) => void | Promise<void>;
  dossierData: FullDossierData;
  dossierSealState: { isOpen: boolean; payload?: any; bankId?: string | null; scores?: any };
  onConfirmDossierSeal: (sealData: ChapterOneData) => void;
  onCancelDossierSeal: () => void;
  retestBank: { bankId: string; bankTitle: string } | null;
  onCloseRetest: () => void;
  onSessionExpired: () => void;
  authModalOpen: boolean;
  onAuthModalClose: () => void;
  user: SessionUser | null;
  onLoginSuccess: (user: SessionUser, latestDossier?: DossierSummaryContract) => void;
  onLogout: () => void;
  onRestoreDossier: (summary: DossierSummaryContract) => void;
  onContinue: () => void;
  authModalPanel: 'main' | 'change_password' | 'delete_account';
  onResetAuthModalError: () => void;
  interrogationClosedOpen: boolean;
  onCloseInterrogationClosed: () => void;
  appNotice: string | null;
}

export const AppModalsHost: React.FC<AppModalsHostProps> = ({
  quickProfileState,
  onCloseQuickProfile,
  onConfirmQuickProfile,
  dossierData,
  dossierSealState,
  onConfirmDossierSeal,
  onCancelDossierSeal,
  retestBank,
  onCloseRetest,
  onSessionExpired,
  authModalOpen,
  onAuthModalClose,
  user,
  onLoginSuccess,
  onLogout,
  onRestoreDossier,
  onContinue,
  authModalPanel,
  onResetAuthModalError,
  interrogationClosedOpen,
  onCloseInterrogationClosed,
  appNotice,
}) => {
  return (
    <>
      {/* 极速身份登记门禁（2秒前置） */}
      <Suspense fallback={null}>
        {quickProfileState.isOpen && (
          <QuickProfileModal
            isOpen={quickProfileState.isOpen}
            onClose={onCloseQuickProfile}
            onConfirm={onConfirmQuickProfile}
            initialNickname={dossierData.chapter1?.nickname}
            initialGender={dossierData.chapter1?.gender}
            initialAge={dossierData.chapter1?.age}
          />
        )}
      </Suspense>

      {/* 绝密封缄门禁（答题后补全真实职业与9宫格骨相照片） */}
      <Suspense fallback={null}>
        {dossierSealState.isOpen && (
          <DossierSealModal
            isOpen={dossierSealState.isOpen}
            initialData={dossierData.chapter1}
            onConfirm={onConfirmDossierSeal}
            onCancel={onCancelDossierSeal}
          />
        )}
      </Suspense>

      {/* 复测对比（首次 vs 最近一次，仅登录用户） */}
      <Suspense fallback={null}>
        {retestBank && (
          <RetestComparisonModal
            bankId={retestBank.bankId}
            bankTitle={retestBank.bankTitle}
            onClose={onCloseRetest}
            onSessionExpired={onSessionExpired}
          />
        )}
      </Suspense>

      {/* 全局登录/注册弹窗 */}
      <ErrorBoundary
        resetKey={String(authModalOpen)}
        onReset={onResetAuthModalError}
      >
        <Suspense fallback={null}>
          {authModalOpen && (
            <AuthModal
              isOpen={authModalOpen}
              onClose={onAuthModalClose}
              user={user}
              onLoginSuccess={onLoginSuccess}
              onLogout={onLogout}
              onRestoreDossier={onRestoreDossier}
              onContinue={onContinue}
              initialPanel={authModalPanel}
            />
          )}
        </Suspense>
      </ErrorBoundary>

      {/* 审讯室暂时关闭提示 */}
      <InterrogationClosedModal
        isOpen={interrogationClosedOpen}
        onClose={onCloseInterrogationClosed}
      />

      {/* 全局轻提示 */}
      {appNotice && (
        <div className="fixed bottom-[5.5rem] left-1/2 -translate-x-1/2 z-[100002] px-5 py-2.5 rounded-xl bg-rose-600/90 text-white text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md pointer-events-none flex items-center gap-2 max-w-[90vw] text-center">
          <span>⚠️</span>
          <span>{appNotice}</span>
        </div>
      )}
    </>
  );
};

