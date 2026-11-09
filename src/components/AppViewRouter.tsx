import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { DossierSummaryContract, SessionUser } from '../../shared/apiContracts';
import type { ChapterOneData, FullDossierData } from '../data/chapterStructure';
import { ALL_BANK_METADATA } from '../data/questionBanks/bankRegistry';
import type { AppViewState, NavigateOptions } from '../hooks/useAppViewHistory';
import { IDLE_LLM_RETRY, type LlmRetryState } from '../hooks/useDossierSubmission';
import type { DynamicQuizPayload, QuestionBankDefinition } from '../types/quizEngine';
import type { FullDossierResult } from '../utils/calculator';
import { WelcomeView } from './WelcomeView';
import { LlmRetryNotice } from './LlmRetryNotice';
import { BasicInfoGate } from './BasicInfoGate';

const ResultView = React.lazy(() => import('./ResultView').then((module) => ({ default: module.ResultView })));
const BankSelectorView = React.lazy(() => import('./BankSelectorView').then((module) => ({ default: module.BankSelectorView })));
const ChapterOneView = React.lazy(() => import('./ChapterOneView').then((module) => ({ default: module.ChapterOneView })));
const LlmLoadingScreen = React.lazy(() => import('./LlmLoadingScreen').then((module) => ({ default: module.LlmLoadingScreen })));
const PersonalView = React.lazy(() => import('./PersonalView').then((module) => ({ default: module.PersonalView })));
const TasksView = React.lazy(() => import('./TasksView').then((module) => ({ default: module.TasksView })));
const BankEditorView = React.lazy(() => import('./BankEditorView').then((module) => ({ default: module.BankEditorView })));
const DynamicQuizEngine = React.lazy(() => import('./DynamicQuizEngine').then((module) => ({ default: module.DynamicQuizEngine })));
const DataView = React.lazy(() => import('./DataView').then((module) => ({ default: module.DataView })));
const PortalView = React.lazy(() => import('./PortalView').then((module) => ({ default: module.PortalView })));
const CardWorkshopView = React.lazy(() => import('./CardWorkshopView').then((module) => ({ default: module.CardWorkshopView })));
const InterrogationRoomView = React.lazy(() =>
  import('./InterrogationRoomView').then((module) => ({ default: module.InterrogationRoomView }))
);

const ViewLoadingFallback = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '55vh', color: '#ff70a6', gap: '0.6rem' }}>
    <Loader2 size={24} className="animate-spin" />
    <span>正在加载...</span>
  </div>
);

interface AppViewRouterProps {
  viewState: AppViewState;
  user: SessionUser | null;
  dossierData: FullDossierData;
  selectedBanks: QuestionBankDefinition[];
  editingBankId: string | null;
  bankRefreshKey: number;
  completedBankIds: string[];
  completedCounts: Record<string, number>;
  completionStatus: 'syncing' | 'ready' | 'stale' | 'error';
  sealedPersonaCount?: number;
  /** 是否已完成第一章基础信息登记（未完成时门禁拦截回响池/大盘/任务中心）。 */
  hasBasicInfo: boolean;
  reportLoading: boolean;
  diagnosticResult: FullDossierResult | null;
  submissionSaved: boolean;
  resultNotice: string | null;
  llmRetry?: LlmRetryState;
  onRetryAnalysis?: () => void;
  navigateTo: (view: AppViewState, options?: NavigateOptions) => void;
  onLoginSuccess: (user: SessionUser, latest?: DossierSummaryContract) => void;
  onRestoreDossier: (summary: DossierSummaryContract) => void;
  onContinue: () => void;
  onStart: () => void;
  onGoToBasicInfo: () => void;
  onGoToBasicInfoFromBanks?: () => void;
  onChapterOneBack?: () => void;
  onOpenBanks: () => void;
  onOpenTasks: () => void;
  onOpenCards: () => void;
  onOpenAstrolabe: () => void;
  onOpenInterrogation?: () => void;
  onStartBank?: (bankId: string) => void;
  dataInitialTab?: 'echoes' | 'metrics';
  onStartQuiz: (bank: QuestionBankDefinition, data: ChapterOneData) => void;
  onCreateOrEditBank: (bankId: string | null) => void;
  onLogout: () => void;
  onBankEditorBack: () => void;
  onBankMutated: () => void;
  onQuizComplete: (payload: DynamicQuizPayload) => void;
  onChapterOneNext: (data: ChapterOneData) => void;
  onGeneratingComplete: () => void;
  onEditPersonal: () => void;
  onOpenPersonal?: () => void;
  onOpenAuthPanel: (panel: 'change_password' | 'delete_account') => void;
  onSessionExpired: () => void;
  onOpenDossier: (summary: DossierSummaryContract) => void;
  onLoginClick: () => void;
  onViewResult: (bankId: string) => void;
  onOpenRetest?: (bankId: string, bankTitle: string) => void;
  onRestart?: () => void;
  onExitResult: () => void;
}

/** Maps application view state to lazy page chunks; orchestration stays in App. */
export const AppViewRouter: React.FC<AppViewRouterProps> = ({
  viewState,
  user,
  dossierData,
  selectedBanks,
  editingBankId,
  bankRefreshKey,
  completedBankIds,
  completedCounts,
  completionStatus,
  sealedPersonaCount = 0,
  hasBasicInfo,
  reportLoading,
  diagnosticResult,
  submissionSaved,
  resultNotice,
  llmRetry = IDLE_LLM_RETRY,
  onRetryAnalysis,
  navigateTo,
  onLoginSuccess,
  onRestoreDossier,
  onContinue,
  onStart,
  onGoToBasicInfo,
  onGoToBasicInfoFromBanks,
  onChapterOneBack,
  onOpenBanks,
  onOpenTasks,
  onOpenCards,
  onOpenAstrolabe,
  onOpenInterrogation,
  onStartBank,
  dataInitialTab = 'metrics',
  onStartQuiz,
  onCreateOrEditBank,
  onLogout,
  onBankEditorBack,
  onBankMutated,
  onQuizComplete,
  onChapterOneNext,
  onGeneratingComplete,
  onEditPersonal,
  onOpenPersonal,
  onOpenAuthPanel,
  onSessionExpired,
  onOpenDossier,
  onLoginClick,
  onViewResult,
  onOpenRetest,
  onRestart,
  onExitResult,
}) => {
  return (
    <Suspense fallback={ViewLoadingFallback}>
    {viewState === 'welcome' && (
      <WelcomeView
        onStart={onStart}
        user={user}
        onLoginSuccess={onLoginSuccess}
        onRestoreDossier={onRestoreDossier}
        onContinue={onContinue}
        onLogout={onLogout}
      />
    )}

    {viewState === 'portal' && (
      <PortalView
        onGoToBasicInfo={onGoToBasicInfo}
        onOpenBanks={onOpenBanks}
        onOpenTasks={onOpenTasks}
        onOpenCards={onOpenCards}
        onOpenAstrolabe={onOpenAstrolabe}
        onOpenInterrogation={onOpenInterrogation}
        onOpenPersonal={onOpenPersonal || onEditPersonal}
        onLoginClick={onLoginClick}
        onStart={onStart}
        onStartBank={onStartBank}
        completedBankIds={completedBankIds}
        user={user}
        basicInfo={dossierData.chapter1}
        sealedPersonaCount={sealedPersonaCount}
        onLoginSuccess={onLoginSuccess}
        onRestoreDossier={onRestoreDossier}
        onContinue={onContinue}
        onLogout={onLogout}
      />
    )}

    {viewState === 'interrogation' && (user ? (
      <InterrogationRoomView
        user={user}
        onBack={() => navigateTo('portal')}
        onGoBanks={onOpenBanks}
        onSessionExpired={onSessionExpired}
      />
    ) : (
      // 直接访问 #/interrogation 的游客不进入房间：回落到欢迎页登录。
      <WelcomeView
        onStart={onStart}
        user={null}
        onLoginSuccess={onLoginSuccess}
        onRestoreDossier={onRestoreDossier}
        onContinue={onContinue}
        onLogout={onLogout}
      />
    ))}

    {viewState === 'bank_select' && (
      <BankSelectorView
        availableBanks={ALL_BANK_METADATA}
        initialDossier={dossierData.chapter1}
        onGoToBasicInfo={onGoToBasicInfoFromBanks || onGoToBasicInfo}
        onStartQuizWithBankAndData={onStartQuiz}
        onStartBank={onStartBank}
        user={user}
        onCreateOrEditBank={onCreateOrEditBank}
        onRequireLogin={onLoginClick}
        bankRefreshKey={bankRefreshKey}
        onBack={() => navigateTo('portal')}
        completedBankIds={completedBankIds}
        completedCounts={completedCounts}
        completionStatus={completionStatus}
        reportLoading={reportLoading}
        onViewResult={onViewResult}
        onOpenRetest={onOpenRetest}
      />
    )}

    {viewState === 'bank_editor' && user && (
      <BankEditorView
        bankId={editingBankId}
        onUnauthorized={onLogout}
        onBack={onBankEditorBack}
        onBankMutated={onBankMutated}
      />
    )}

    {viewState === 'dynamic_quiz' && (
      <DynamicQuizEngine
        selectedBanks={selectedBanks}
        onBackToBankSelect={() => navigateTo('bank_select')}
        onBackToHome={() => navigateTo('portal')}
        onComplete={onQuizComplete}
      />
    )}

    {viewState === 'chapter1' && (
      <ChapterOneView
        initialData={dossierData.chapter1}
        onNext={onChapterOneNext}
        onBack={onChapterOneBack || (() => navigateTo('portal'))}
      />
    )}

    {viewState === 'generating' && (
      <LlmLoadingScreen
        isReady={!!diagnosticResult}
        onComplete={onGeneratingComplete}
        onCancel={() => navigateTo('portal')}
      />
    )}

    {viewState === 'result' && diagnosticResult && (
      <>
        {resultNotice && (
          <div
            role="status"
            style={{
              width: 'calc(100% - 1.5rem)',
              margin: '0.75rem auto',
              padding: '0.75rem 1rem',
              borderRadius: 12,
              border: `1px solid ${submissionSaved ? 'rgba(128, 243, 255, 0.35)' : 'rgba(251, 146, 60, 0.45)'}`,
              background: submissionSaved ? 'rgba(128, 243, 255, 0.08)' : 'rgba(251, 146, 60, 0.1)',
              color: submissionSaved ? '#b9f8ff' : '#fed7aa',
              boxSizing: 'border-box',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: 'min(720px, calc(100% - 1.5rem))',
            }}
          >
            {resultNotice}
          </div>
        )}
        <LlmRetryNotice state={llmRetry} onRetry={onRetryAnalysis} />
        <Suspense
          fallback={(
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#ff70a6', gap: '0.6rem' }}>
              <Loader2 size={24} className="animate-spin" />
              <span>正在加载高奢卷宗海报引擎...</span>
            </div>
          )}
        >
          <ResultView result={diagnosticResult} onExit={onExitResult} />
        </Suspense>
      </>
    )}

    {viewState === 'personal_view' && (
      <PersonalView
        data={dossierData.chapter1}
        onEdit={onEditPersonal}
        user={user}
        onLogout={onLogout}
        onChangePassword={() => onOpenAuthPanel('change_password')}
        onDeleteAccount={() => onOpenAuthPanel('delete_account')}
        onSessionExpired={onSessionExpired}
        onViewDossier={onOpenDossier}
        onLoginClick={onLoginClick}
        onStartQuiz={onStart}
      />
    )}

    {viewState === 'tasks_view' && (hasBasicInfo ? (
      <TasksView user={user} onLoginClick={onLoginClick} onSessionExpired={onSessionExpired} />
    ) : (
      <BasicInfoGate
        title="先完成基础信息填写"
        description="填写昵称与基础资料后，才能进入任务接取中心。"
        onFill={onGoToBasicInfo}
      />
    ))}

    {viewState === 'data_view' && (hasBasicInfo ? (
      <DataView
        diagnosticResult={diagnosticResult}
        user={user}
        onStartQuiz={onStart}
        onViewResult={() => onViewResult('')}
        initialMainTab={dataInitialTab}
        onBack={() => navigateTo('portal')}
      />
    ) : (
      <BasicInfoGate
        title="先完成基础信息填写"
        description="填写昵称与基础资料后，才能查看深夜回响池与潜意识大盘。"
        onFill={onGoToBasicInfo}
      />
    ))}

    {viewState === 'cards' && (
      <CardWorkshopView
        initialData={dossierData.chapter1}
        user={user}
        onBack={() => navigateTo('portal')}
      />
    )}
    </Suspense>
  );
};
