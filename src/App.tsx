import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { BackgroundStars } from './components/BackgroundStars';
import { Header } from './components/Header';
import { FullDossierData, ChapterOneData } from './data/chapterStructure';
import { draftManager } from './utils/draftManager';
import { clearBankCache, loadQuestionBankById } from './utils/bankLoader';
import { DynamicQuizPayload, QuestionBankDefinition } from './types/quizEngine';
import { BottomNav, BottomTab } from './components/BottomNav';
import { AppViewRouter } from './components/AppViewRouter';
import { useAuthSession } from './hooks/useAuthSession';
import { useAppViewHistory } from './hooks/useAppViewHistory';
import { useDossierHistory } from './hooks/useDossierHistory';
import { useDossierSubmission } from './hooks/useDossierSubmission';
import { useBankCompletion } from './hooks/useBankCompletion';
import { telemetryTracker } from './utils/telemetryTracker';
import { questionTelemetry } from './utils/questionTelemetryTracker';
import { getOrCreateDeviceId } from './utils/deviceId';
import { normalizeAge } from './utils/age';
import { validateNickname } from './utils/nickname';
import { basicInfoStore } from './utils/basicInfoStore';
import type {
  BasicInfoContract,
  DossierSummaryContract,
  RestoredDossierContract,
} from '../shared/apiContracts';
import { scheduleProgressiveLoad, scheduleEssentialPostLoad } from './utils/progressiveLoading';
import { queueHomeJourney } from './utils/journeyPreloads';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ApiError, apiGet, apiPost } from './utils/api';
import { AppModalsHost } from './components/AppModalsHost';

function createBlankDossierData(): FullDossierData {
  return {
    chapter1: { nickname: '' },
    chapter2: { boundaryText: '', fantasyText: '', relationPreference: '', awakeningMoment: '' },
    chapter3: { secretWords: '', secretRule: '' },
    selectedShadowTags: ['角色互换', '反差情绪'],
    depthRating: 'medium',
  };
}

export const App: React.FC = () => {
  React.useEffect(() => {
    // Warm the most likely next screens one at a time after the shell is interactive.
    // User intent can pause and reorder this queue at any moment.
    return scheduleProgressiveLoad(queueHomeJourney, 2_000);
  }, []);

  React.useEffect(() => {
    // Analytics is deliberately post-load and omitted on data-saving/2G connections.
    // It must never compete with the assets needed to make the page interactive.
    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    // 访问埋点属于核心口径，不套用省流量/慢网络门禁（否则导出有数据、访问为 0，漏斗分子分母口径不一致）。
    const cancelSchedule = scheduleEssentialPostLoad(() => {
      try {
        const ua = navigator.userAgent;
        if (/\b(bot|crawler|spider|slurp)\b|bingbot|applebot|googlebot|bytespider|gptbot|claudebot|ccbot|headlesschrome/i.test(ua)) return;
        controller = new AbortController();
        // Capture external channel/campaign params from query string or hash (e.g. ?src=tg or ?utm_source=telegram)
        const searchParams = new URLSearchParams(window.location.search);
        let channelSource =
          searchParams.get('utm_source') ||
          searchParams.get('src') ||
          searchParams.get('source') ||
          searchParams.get('channel') ||
          searchParams.get('ref') ||
          searchParams.get('from');

        if (!channelSource && window.location.hash.includes('?')) {
          const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
          channelSource =
            hashParams.get('utm_source') ||
            hashParams.get('src') ||
            hashParams.get('source') ||
            hashParams.get('channel') ||
            hashParams.get('ref') ||
            hashParams.get('from');
        }

        // Check clean URL path alias (e.g. /tg or /ewm or #/tg)
        if (window.location.pathname.startsWith('/tg') || window.location.hash.startsWith('#/tg')) {
          channelSource = 'tg';
        } else if (window.location.pathname.startsWith('/ewm') || window.location.hash.startsWith('#/ewm')) {
          channelSource = channelSource || 'sync_scan';
        }

        // 自动化测试 / Lighthouse / 无头浏览器不上报埋点，避免 6 秒延迟请求打断 Lighthouse 网络空闲判定
        if (typeof navigator !== 'undefined' && (navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(navigator.userAgent))) {
          return;
        }

        const effectiveReferrer =
          document.referrer ||
          (channelSource ? (channelSource.toLowerCase() === 'tg' ? 't.me' : channelSource) : '') ||
          '';

        void fetch('/api/visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getOrCreateDeviceId(),
          },
          credentials: 'include',
          body: JSON.stringify({
            path: window.location.pathname || '/',
            referrer: effectiveReferrer,
          }),
          signal: controller.signal,
        })
          .catch(() => {})
          .finally(() => {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
          });
      } catch {
        // Visit metrics are best-effort only.
      }
    }, 6_000);

    return () => {
      cancelSchedule();
      controller?.abort();
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  const { viewState, navigateTo } = useAppViewHistory();

  // 记录打开 chapter1 的来源（portal 返回综合入口 | bank_select 返回题库选择 | personal 返回个人中心）
  const [chapter1Origin, setChapter1Origin] = useState<'portal' | 'bank_select' | 'personal'>('portal');

  // 题库编辑器：当前编辑的 bankId（null=新建；string=编辑指定题库）
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankRefreshKey, setBankRefreshKey] = useState(0);

  // AuthModal 受控状态（上提到 App 层，便于 PersonalView 触发打开修改密码/注销面板）
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalPanel, setAuthModalPanel] = useState<'main' | 'change_password' | 'delete_account'>('main');
  // 审讯室暂时关闭：门牌点击后只弹一个「暂未开启」，不进入房间。
  const [interrogationClosedOpen, setInterrogationClosedOpen] = useState(false);
  const [appNotice, setAppNotice] = useState<string | null>(null);
  const [dataInitialTab, setDataInitialTab] = useState<'echoes' | 'metrics'>('metrics');

  const showAppNotice = useCallback((text: string) => {
    setAppNotice(text);
    setTimeout(() => setAppNotice((prev) => (prev === text ? null : prev)), 4000);
  }, []);

  const [selectedBanks, setSelectedBanks] = useState<QuestionBankDefinition[]>([]);

  const {
    user,
    latestDossier: sessionLatestDossier,
    basicInfo: sessionBasicInfo,
    setAuthenticatedUser,
    refreshSession,
    logout,
  } = useAuthSession();

  const [dossierData, setDossierData] = useState<FullDossierData>(() => {
    const draft = draftManager.loadDraft();
    const owner = basicInfoStore.ownerFor(user?.id, getOrCreateDeviceId());
    const cached = basicInfoStore.load(owner);
    const draftCh1: ChapterOneData = draft?.chapter1 ?? { nickname: '' };
    // 草稿优先；草稿无昵称时用本地缓存补全（照片/时长不入缓存，只补文本字段）
    const chapter1 = (draftCh1.nickname ?? '').trim()
      ? draftCh1
      : { ...(cached ?? {}), ...draftCh1 };
    return {
      chapter1: {
        nickname: chapter1.nickname || '',
        gender: chapter1.gender || '',
        occupation: chapter1.occupation || '',
        avatarUrl: draft?.chapter1?.avatarUrl || '',
        personaTrait: chapter1.personaTrait || '',
        age: normalizeAge(chapter1.age),
        maritalStatus: chapter1.maritalStatus || '未婚',
        hasBoyfriend: chapter1.maritalStatus === '已婚'
          ? undefined
          : (chapter1.hasBoyfriend || '单身'),
        surfaceTrait: chapter1.surfaceTrait || '',
        innerDesire: chapter1.innerDesire || '',
      },
      chapter2: {
        boundaryText: draft?.chapter2?.boundaryText || '',
        fantasyText: draft?.chapter2?.fantasyText || '',
        relationPreference: draft?.chapter2?.relationPreference || '',
        awakeningMoment: draft?.chapter2?.awakeningMoment || '',
      },
      chapter3: {
        secretWords: draft?.chapter3?.secretWords || '',
        secretRule: draft?.chapter3?.secretRule || '',
      },
      selectedShadowTags: draft?.selectedShadowTags || ['角色互换', '反差情绪'],
      depthRating: draft?.depthRating || 'medium',
    };
  });

  const [reportLoading, setReportLoading] = useState(false);
  // 复测对比弹窗（仅登录用户可从题库卡片打开）
  const [retestBank, setRetestBank] = useState<{ bankId: string; bankTitle: string } | null>(null);
  const mergeDossierSummary = useCallback((summary: DossierSummaryContract) => {
    setDossierData((prev) => ({
      ...prev,
      chapter1: { ...prev.chapter1, ...(summary.chapter1 ?? {}) },
      selectedShadowTags: summary.selectedShadowTags ?? prev.selectedShadowTags,
      depthRating: summary.depthRating ?? prev.depthRating,
    }));
  }, []);

  const sessionExpiredHandlerRef = useRef<() => void>(() => {});
  const notifySessionExpired = useCallback(() => sessionExpiredHandlerRef.current(), []);
  const history = useDossierHistory({
    user,
    sessionLatestDossier,
    onApplySummary: mergeDossierSummary,
    onSessionExpired: notifySessionExpired,
  });
  const submission = useDossierSubmission({
    dossierData,
    user,
    viewState,
    navigateTo,
    onSavedDossier: history.recordSavedDossier,
  });
  const {
    diagnosticResult,
    submissionSaved,
    resultNotice,
    llmRetry,
    submitDossier,
    finishGenerating,
    resetSubmission,
    restoreResult,
    showCurrentResult,
    retryAnalysis,
  } = submission;
  const {
    applyDossierSummary,
    seedForLogin,
    resetHistory,
    findDossierId,
  } = history;
  const initialSessionHandledRef = useRef(false);

  // 提交成功后把基础信息写入本地缓存（finishGenerating 会清草稿，缓存负责下次恢复）
  React.useEffect(() => {
    if (!submissionSaved || !diagnosticResult) return;
    const ch1 = dossierData.chapter1;
    if (!ch1?.nickname?.trim()) return;
    basicInfoStore.save(basicInfoStore.ownerFor(user?.id, getOrCreateDeviceId()), ch1);
  }, [submissionSaved, diagnosticResult, dossierData.chapter1, user?.id]);

  // 首次刷新只恢复安全的顶层入口：保持当前有效页面，滚动到顶部。
  React.useEffect(() => {
    if (initialSessionHandledRef.current) return;
    initialSessionHandledRef.current = true;
    if (user) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [user]);

  // 登录用户：/me 返回的档案基础信息异步回填（服务端为准，覆盖本地空/旧值）
  React.useEffect(() => {
    if (!sessionBasicInfo?.nickname?.trim()) return;
    setDossierData((prev) => {
      const updated = {
        ...prev,
        chapter1: { ...prev.chapter1, ...sessionBasicInfo },
      };
      basicInfoStore.save(basicInfoStore.ownerFor(user?.id, getOrCreateDeviceId()), updated.chapter1);
      return updated;
    });
  }, [sessionBasicInfo, user?.id]);

  // 匿名用户：本地草稿与缓存都没有昵称时，才发一次设备恢复请求（限流接口）
  const deviceRestoreAttemptedRef = useRef(false);
  React.useEffect(() => {
    if (user) return;
    if ((dossierData.chapter1?.nickname ?? '').trim()) return;
    const owner = basicInfoStore.ownerFor(null, getOrCreateDeviceId());
    if (basicInfoStore.load(owner)?.nickname?.trim()) return;
    if (deviceRestoreAttemptedRef.current) return;
    deviceRestoreAttemptedRef.current = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    void fetch('/api/basic-info/device', {
      headers: { 'X-Device-Id': getOrCreateDeviceId() },
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { basicInfo?: BasicInfoContract | null } | null) => {
        const basic = data?.basicInfo;
        if (!basic?.nickname?.trim()) return;
        setDossierData((prev) => {
          const updated = {
            ...prev,
            chapter1: { ...prev.chapter1, ...basic },
          };
          draftManager.saveDraft(updated);
          return updated;
        });
        basicInfoStore.save(owner, basic);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeoutId));
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [user, dossierData.chapter1?.nickname]);

  const handleLoginSuccess = async (
    usr: { id: string; email: string },
    latest?: DossierSummaryContract,
  ) => {
    seedForLogin(usr, latest);
    setAuthenticatedUser(usr);
    // 登录后刷新一次会话，取回服务端档案基础信息（basicInfo）
    void refreshSession();
    navigateTo('portal');
    setAuthModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    resetSubmission();
    resetHistory(user?.id);
    const deviceId = getOrCreateDeviceId();
    if (user?.id) {
      basicInfoStore.clear(basicInfoStore.ownerFor(user.id, deviceId));
    }
    basicInfoStore.clear(basicInfoStore.ownerFor(null, deviceId));
    logout();
    draftManager.clearDraft();
    setDossierData(createBlankDossierData());
    setSelectedBanks([]);
    setAuthModalOpen(false);
    navigateTo('portal', { replace: true });
  };

  const handleSessionExpired = useCallback(() => {
    resetSubmission();
    resetHistory(user?.id);
    const deviceId = getOrCreateDeviceId();
    if (user?.id) {
      basicInfoStore.clear(basicInfoStore.ownerFor(user.id, deviceId));
    }
    basicInfoStore.clear(basicInfoStore.ownerFor(null, deviceId));
    logout();
    draftManager.clearDraft();
    setDossierData(createBlankDossierData());
    setSelectedBanks([]);
    navigateTo('portal', { replace: true });
    setAuthModalPanel('main');
    setAuthModalOpen(true);
  }, [logout, navigateTo, resetHistory, resetSubmission, user]);

  React.useEffect(() => {
    sessionExpiredHandlerRef.current = handleSessionExpired;
  }, [handleSessionExpired]);

  // 已登录态点击"继续使用" → 进入综合入口
  const handleContinue = async () => {
    navigateTo('portal');
    setAuthModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 从 PersonalView 打开 AuthModal 的指定面板
  const openAuthPanel = (panel: 'change_password' | 'delete_account') => {
    setAuthModalPanel(panel);
    setAuthModalOpen(true);
  };

  // 关闭弹窗时同步重置面板（避免下次从 Header 打开仍停在子面板）
  const handleAuthModalOpenChange = (open: boolean) => {
    setAuthModalOpen(open);
    if (!open) setAuthModalPanel('main');
  };

  const handleRestoreDossier = (summary: DossierSummaryContract) => {
    applyDossierSummary(summary);
    navigateTo('portal');
    setAuthModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 点击首页"游客"或"开启探索"，进入综合入口
  const handleStart = () => {
    navigateTo('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 从综合入口点击【基础信息】卡片 → 全屏跳转 chapter1，保存后返回 portal
  const handleGoToBasicInfoFromPortal = () => {
    setChapter1Origin('portal');
    navigateTo('chapter1');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 在题库选择界面点击【基础信息】卡片 → 全屏跳转 chapter1，保存后返回 bank_select
  const handleGoToBasicInfoFromBanks = () => {
    setChapter1Origin('bank_select');
    navigateTo('chapter1');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChapterOneBack = () => {
    if (chapter1Origin === 'personal') {
      navigateTo('personal_view');
    } else if (chapter1Origin === 'bank_select') {
      navigateTo('bank_select');
    } else {
      navigateTo('portal');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 在题库选择界面或首页点击题库卡片后，直接带上基础信息开启答题
  const handleStartQuizWithBankAndData = useCallback((
    loadedBank: QuestionBankDefinition,
    ch1Data: ChapterOneData
  ) => {
    setSelectedBanks([loadedBank]);
    setDossierData((prev) => {
      const updated = {
        ...prev,
        chapter1: {
          ...prev.chapter1,
          ...ch1Data,
        },
      };
      draftManager.saveDraft(updated);
      return updated;
    });
    navigateTo('dynamic_quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateTo]);

  // 极速身份门禁状态（未填性别/年龄时直接点首页特色题库）
  const [quickProfileState, setQuickProfileState] = useState<{
    isOpen: boolean;
    bankId: string | null;
  }>({
    isOpen: false,
    bankId: null,
  });

  // 答题后密封门禁状态（作答完成但未填真实职业/照片时拦截）
  const [dossierSealState, setDossierSealState] = useState<{
    isOpen: boolean;
    payload: DynamicQuizPayload | null;
  }>({
    isOpen: false,
    payload: null,
  });

  // 从首页特色题库卡片点击“立即开启测验”
  const handleStartBank = useCallback(async (bankId: string) => {
    const ch1 = dossierData.chapter1;

    // 先确认题库能加载，再决定是否弹身份门禁：
    // 否则题库已下架/未过审时用户会白填一次表单。
    let bank: QuestionBankDefinition | null = null;
    try {
      bank = await loadQuestionBankById(bankId);
    } catch (err) {
      console.error('Failed to load bank:', err);
    }

    if (!bank) {
      showAppNotice('该题库暂时不可用，已为你打开全部题库列表。');
      navigateTo('bank_select');
      return;
    }

    const hasRequiredBaseline = Boolean(
      !validateNickname(ch1?.nickname ?? '') &&
      ch1?.gender?.trim() &&
      ch1?.age?.trim()
    );
    if (!hasRequiredBaseline) {
      setQuickProfileState({
        isOpen: true,
        bankId,
      });
      return;
    }

    handleStartQuizWithBankAndData(bank, ch1);
  }, [dossierData.chapter1, handleStartQuizWithBankAndData, navigateTo, showAppNotice]);

  // 确认极速身份信息（署名 + 基线登记）
  const handleConfirmQuickProfile = useCallback(async ({ nickname, gender, age }: { nickname: string; gender: string; age: string }) => {
    const bankId = quickProfileState.bankId;
    setQuickProfileState({ isOpen: false, bankId: null });

    const updatedCh1: ChapterOneData = {
      ...dossierData.chapter1,
      // 署名来自用户当场填写，任何情况下都不再兜底成"匿名倾诉者"。
      nickname: nickname.trim(),
      gender,
      // 统一归一化为纯数字，保证提交体能通过服务端 analyzeDossierSchema
      age: normalizeAge(age),
    };

    setDossierData((prev) => {
      const updated = { ...prev, chapter1: updatedCh1 };
      draftManager.saveDraft(updated);
      return updated;
    });

    const owner = basicInfoStore.ownerFor(user?.id, getOrCreateDeviceId());
    basicInfoStore.save(owner, updatedCh1);

    // bankId 缺失时不静默返回，给用户一个明确去处
    if (!bankId) {
      navigateTo('bank_select');
      return;
    }

    try {
      const bank = await loadQuestionBankById(bankId);
      if (bank) {
        handleStartQuizWithBankAndData(bank, updatedCh1);
        return;
      }
    } catch (err) {
      console.error('Failed to load bank:', err);
    }
    showAppNotice('该题库暂时不可用，已为你打开全部题库列表。');
    navigateTo('bank_select');
  }, [quickProfileState.bankId, dossierData.chapter1, user?.id, handleStartQuizWithBankAndData, navigateTo, showAppNotice]);

  // 拦截问卷答题完成：缺少署名、职业或照片，一律先走密封门禁补齐
  const handleQuizComplete = useCallback((payload: DynamicQuizPayload) => {
    const ch1 = dossierData.chapter1;
    // 署名是卷宗的必要字段：缺失时不能直接提交，否则管理端会收到无法分辨的匿名卷宗。
    const hasNickname = !validateNickname(ch1?.nickname ?? '');
    const hasFullSealedProfile = Boolean(
      hasNickname && ch1?.occupation?.trim() && (ch1?.avatarUrls?.length || ch1?.avatarUrl)
    );

    if (hasFullSealedProfile) {
      void submitDossier(payload);
    } else {
      setDossierSealState({
        isOpen: true,
        payload,
      });
    }
  }, [dossierData.chapter1, submitDossier]);

  // 确认绝密封缄：保存照片与真实职业假面，然后提交诊断
  const handleConfirmDossierSeal = useCallback((sealedCh1: ChapterOneData) => {
    const payload = dossierSealState.payload;
    setDossierSealState({ isOpen: false, payload: null });

    const updatedCh1: ChapterOneData = {
      ...dossierData.chapter1,
      ...sealedCh1,
    };

    setDossierData((prev) => {
      const updated = { ...prev, chapter1: updatedCh1 };
      draftManager.saveDraft(updated);
      return updated;
    });

    const owner = basicInfoStore.ownerFor(user?.id, getOrCreateDeviceId());
    basicInfoStore.save(owner, updatedCh1);

    if (payload) {
      void submitDossier(payload, updatedCh1);
    }
  }, [dossierSealState.payload, dossierData.chapter1, user?.id, submitDossier]);

  // 跳过绝密封缄直接生成报告
  const handleCancelDossierSeal = useCallback(() => {
    const payload = dossierSealState.payload;
    setDossierSealState({ isOpen: false, payload: null });
    if (payload) {
      void submitDossier(payload);
    }
  }, [dossierSealState.payload, submitDossier]);

  // 进入题库创建/编辑器。bankId=null 表示新建
  const handleCreateOrEditBank = (bankId: string | null) => {
    if (!user) return; // 未登录时由 onRequireLogin 处理
    setEditingBankId(bankId);
    navigateTo('bank_editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 题库编辑器返回（保存/删除/取消都会调用）
  const handleBankEditorBack = () => {
    setEditingBankId(null);
    navigateTo('bank_select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 第一阶段保存后：来自 bank_select 返回选题界面，否则直接进入选题
  const handleChapterOneNext = async (ch1Data: ChapterOneData) => {
    setDossierData((prev) => {
      const updated = { ...prev, chapter1: ch1Data };
      draftManager.saveDraft(updated);
      return updated;
    });
    // 本地缓存立即更新，下次打开零请求恢复；登录用户同时同步服务端档案。
    basicInfoStore.save(basicInfoStore.ownerFor(user?.id, getOrCreateDeviceId()), ch1Data);
    if (user) {
      void apiPost('/api/auth/basic-info', {
        nickname: ch1Data.nickname ?? '',
        gender: ch1Data.gender ?? '',
        occupation: ch1Data.occupation ?? '',
        personaTrait: ch1Data.personaTrait ?? '',
        age: ch1Data.age ?? '',
        maritalStatus: ch1Data.maritalStatus ?? '',
        hasBoyfriend: ch1Data.hasBoyfriend ?? '',
        surfaceTrait: ch1Data.surfaceTrait ?? '',
        innerDesire: ch1Data.innerDesire ?? '',
      }).catch(() => {
        // 档案同步失败不阻塞主流程，下次填写时重试
      });
    }
    if (chapter1Origin === 'personal') {
      navigateTo('personal_view');
    } else if (chapter1Origin === 'bank_select') {
      navigateTo('bank_select');
    } else {
      navigateTo('portal');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestart = () => {
    resetSubmission();
    draftManager.clearDraft();
    // 清掉答题进度与自白正文，但保留已填写的基础信息（草稿或缓存），避免再次要求填写
    const cached = basicInfoStore.load(basicInfoStore.ownerFor(user?.id, getOrCreateDeviceId()));
    const blank = createBlankDossierData();
    setDossierData({
      ...blank,
      chapter1: {
        ...blank.chapter1,
        ...(dossierData.chapter1?.nickname?.trim() ? dossierData.chapter1 : (cached ?? {})),
      },
    });
    setSelectedBanks([]);
    // 重启时清空行为遥测，避免下一次测评混入本次残留数据
    telemetryTracker.reset();
    questionTelemetry.reset();
    navigateTo('portal', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 退出报告页：保留基础信息与草稿，回到题库选择，不重置会话
  const handleExitResult = () => {
    navigateTo('bank_select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 题库完成情况由服务端聚合（游客按设备、登录用户按账号），
  // 这样未登录访客也能看到「已完成 / 未完成」，而不是只有登录用户才知道自己做过什么。
  const bankCompletion = useBankCompletion({
    user,
    // 保存成功后重新拉取，保证刚提交的题库立刻显示为已完成。
    refreshKey: submissionSaved && diagnosticResult?.dossierId ? diagnosticResult.dossierId : '',
  });

  // 每套题库的已答次数 = 服务端计数 + 当前会话已生成但服务端尚未返回的那一次
  const completedCounts = useMemo(() => {
    const counts: Record<string, number> = { ...bankCompletion.counts };
    const sessionDossierId = diagnosticResult?.dossierId;
    const sessionBanks = diagnosticResult?.dossierData?.selectedBankIds ?? [];
    if (!sessionDossierId || sessionBanks.length === 0) return counts;
    for (const bankId of sessionBanks) {
      const alreadyCounted = bankCompletion.entries.some(
        (entry) => entry.bankId === bankId && entry.lastDossierId === sessionDossierId
      );
      if (!alreadyCounted) counts[bankId] = (counts[bankId] ?? 0) + 1;
    }
    return counts;
  }, [bankCompletion.counts, bankCompletion.entries, diagnosticResult]);

  const completedBankIds = useMemo(() => Object.keys(completedCounts), [completedCounts]);
  const completionStatus: 'syncing' | 'ready' | 'stale' | 'error' = bankCompletion.status;

  const openDossierById = async (dossierId: string) => {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      const { data: json } = await apiGet<{
        success: boolean;
        dossier?: RestoredDossierContract;
        message?: string;
      }>(`/api/dossiers/${encodeURIComponent(dossierId)}`, {
        onUnauthorized: handleSessionExpired,
      });
      if (!json.success || !json.dossier) {
        throw new Error(json.message || '报告加载失败');
      }

      const { buildRestoredDossierResult } = await import('./utils/calculator');
      const restored = buildRestoredDossierResult(json.dossier);
      if (!restored) throw new Error('报告数据不完整');
      restoreResult(restored);
      navigateTo('result');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      if (error instanceof ApiError && error.status === 401) return;
      showAppNotice(error instanceof Error ? error.message : '网络异常，报告加载失败，请稍后重试');
    } finally {
      setReportLoading(false);
    }
  };

  // 查看上次报告：当前会话有结果则直接展示；否则按需拉取该题库最新卷宗全文
  const handleViewResult = async (bankId?: string) => {
    if (showCurrentResult()) return;
    const dossierId = findDossierId(bankId);
    if (!dossierId) return;
    await openDossierById(dossierId);
  };

  const handleOpenBanks = () => {
    navigateTo('bank_select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTasks = () => {
    navigateTo('tasks_view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCards = () => {
    navigateTo('cards');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAstrolabe = () => {
    setDataInitialTab('metrics');
    navigateTo('data_view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 审讯室（测试功能）：暂时关闭，点击门牌只弹提示；游客入口处先走登录弹窗。
  const handleOpenInterrogation = () => {
    if (!user) {
      setAuthModalPanel('main');
      setAuthModalOpen(true);
      return;
    }
    setInterrogationClosedOpen(true);
  };

  // 关闭期间直接访问 #/interrogation 也回落到首页，并给出同样的提示。
  useEffect(() => {
    if (viewState === 'interrogation') {
      setInterrogationClosedOpen(true);
      navigateTo('portal', { replace: true });
    }
  }, [viewState, navigateTo]);

  // 底栏导航：从 viewState 派生活跃 tab
  const activeTab: BottomTab | null =
    viewState === 'portal' ? 'home' :
    viewState === 'bank_select' ? 'banks' :
    viewState === 'personal_view' ? 'personal' :
    viewState === 'tasks_view' ? 'tasks' :
    viewState === 'data_view' ? 'home' :
    viewState === 'cards' ? 'home' :
    viewState === 'result' ? 'banks' :
    null;

  // 结果页是长文阅读场景，移动端固定底栏会持续遮挡正文与图表。欢迎登录首页不显示底栏。
  const showBottomNav = ['portal', 'bank_select', 'personal_view', 'tasks_view', 'data_view', 'cards'].includes(viewState);

  const handleTabChange = async (tab: BottomTab) => {
    if (tab === 'home') {
      navigateTo('portal');
    } else if (tab === 'banks') {
      // 「题库」标签始终进入题库选择页；历史报告只能通过题库卡片上的
      // 「查看上次报告」按钮进入，绝不因存在历史结果而自动跳转报告页。
      navigateTo('bank_select');
    } else if (tab === 'tasks') {
      navigateTo('tasks_view');
    } else if (tab === 'personal') {
      navigateTo('personal_view');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Canvas Ambient Stars */}
      <BackgroundStars />

      {/* Global SVG Gradients for Icons */}
      <svg style={{ width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <linearGradient id="rose-magenta-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff70a6" />
            <stop offset="100%" stopColor="#e100ff" />
          </linearGradient>
          <linearGradient id="gold-orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd180" />
            <stop offset="100%" stopColor="#ff8c42" />
          </linearGradient>
          <linearGradient id="cyan-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#80f3ff" />
            <stop offset="100%" stopColor="#aa26da" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <Header
        onRestart={handleRestart}
        showRestart={viewState === 'result'}
      />

      {/* Chapter & Dynamic Quiz Views */}
      <main style={{ flex: 1, paddingBottom: (showBottomNav && activeTab) ? 72 : 0 }}>
        <ErrorBoundary
          key={viewState}
          resetKey={viewState}
          onReset={() => navigateTo('portal', { replace: true })}
        >
          <AppViewRouter
            viewState={viewState}
            user={user}
            onRestart={handleRestart}
            onExitResult={handleExitResult}
            dossierData={dossierData}
            selectedBanks={selectedBanks}
            editingBankId={editingBankId}
            bankRefreshKey={bankRefreshKey}
            completedBankIds={completedBankIds}
            completedCounts={completedCounts}
            completionStatus={completionStatus}
            sealedPersonaCount={history.dossierList.length}
            reportLoading={reportLoading}
            diagnosticResult={diagnosticResult}
            submissionSaved={submissionSaved}
            resultNotice={resultNotice}
            llmRetry={llmRetry}
            onRetryAnalysis={() => { void retryAnalysis(); }}
            navigateTo={navigateTo}
            onLoginSuccess={handleLoginSuccess}
            onRestoreDossier={handleRestoreDossier}
            onContinue={handleContinue}
            onStart={handleStart}
            onGoToBasicInfo={handleGoToBasicInfoFromPortal}
            onGoToBasicInfoFromBanks={handleGoToBasicInfoFromBanks}
            onChapterOneBack={handleChapterOneBack}
            onOpenBanks={handleOpenBanks}
            onOpenTasks={handleOpenTasks}
            onOpenCards={handleOpenCards}
            onOpenAstrolabe={handleOpenAstrolabe}
            onOpenInterrogation={handleOpenInterrogation}
            onStartBank={handleStartBank}
            dataInitialTab={dataInitialTab}
            onStartQuiz={handleStartQuizWithBankAndData}
            onCreateOrEditBank={handleCreateOrEditBank}
            onLogout={handleLogout}
            onBankEditorBack={handleBankEditorBack}
            onBankMutated={() => {
              if (editingBankId) clearBankCache(editingBankId);
              setBankRefreshKey((key) => key + 1);
            }}
            onQuizComplete={handleQuizComplete}
            onChapterOneNext={handleChapterOneNext}
            onGeneratingComplete={finishGenerating}
            onEditPersonal={() => {
              setChapter1Origin('personal');
              navigateTo('chapter1');
            }}
            onOpenPersonal={() => {
              navigateTo('personal_view');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAuthPanel={openAuthPanel}
            onSessionExpired={handleSessionExpired}
            onOpenDossier={(summary) => { void openDossierById(summary.id); }}
            onLoginClick={() => {
              setAuthModalOpen(true);
              setAuthModalPanel('main');
            }}
            onViewResult={(bankId) => { void handleViewResult(bankId); }}
            onOpenRetest={(bankId, bankTitle) => setRetestBank({ bankId, bankTitle })}
          />
        </ErrorBoundary>
      </main>

      {/* 底部导航栏 */}
      {showBottomNav && activeTab && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      {/* 全局模态窗集合 */}
      <AppModalsHost
        quickProfileState={quickProfileState}
        onCloseQuickProfile={() => setQuickProfileState({ isOpen: false, bankId: null })}
        onConfirmQuickProfile={handleConfirmQuickProfile}
        dossierData={dossierData}
        dossierSealState={dossierSealState}
        onConfirmDossierSeal={handleConfirmDossierSeal}
        onCancelDossierSeal={handleCancelDossierSeal}
        retestBank={retestBank}
        onCloseRetest={() => setRetestBank(null)}
        onSessionExpired={handleSessionExpired}
        authModalOpen={authModalOpen}
        onAuthModalClose={() => handleAuthModalOpenChange(false)}
        user={user}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onRestoreDossier={handleRestoreDossier}
        onContinue={handleContinue}
        authModalPanel={authModalPanel}
        onResetAuthModalError={() => {
          setAuthModalOpen(false);
          setAuthModalPanel('main');
          navigateTo('portal', { replace: true });
        }}
        interrogationClosedOpen={interrogationClosedOpen}
        onCloseInterrogationClosed={() => setInterrogationClosedOpen(false)}
        appNotice={appNotice}
      />
    </div>
  );
};

export default App;
