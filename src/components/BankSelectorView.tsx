import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QuestionBankMetadata, QuestionBankDefinition } from '../types/quizEngine';
import { ChapterOneData } from '../data/chapterStructure';
import { Sparkles, Loader2, ArrowRight, Clock, Edit3, Plus, FileText, ChevronLeft, Search, X } from 'lucide-react';
import { loadQuestionBankById } from '../utils/bankLoader';
import { fetchUserBanks, fetchPublicApprovedBanks, summaryToMetadata, type UserBankSummaryDTO } from '../utils/userBanks';
import { prioritizeBank, prioritizeBasicInfo, prioritizeQuizAndBank, queueBankJourney } from '../utils/journeyPreloads';
import { sortBanksByDisplayOrder } from '../data/questionBanks/bankRegistry';
import { normalizeAge } from '../utils/age';
import { BankCard } from './BankCard';
import { MyBankItem } from './MyBankItem';

interface BankSelectorViewProps {
  availableBanks: QuestionBankMetadata[];
  initialDossier?: ChapterOneData;
  onGoToBasicInfo: () => void;
  onStartQuizWithBankAndData: (selectedBank: QuestionBankDefinition, chapter1Data: ChapterOneData) => void;
  /** 支持统一极速测验链路（带渐进式门禁） */
  onStartBank?: (bankId: string) => void;
  user?: { id: string; email: string } | null;
  onCreateOrEditBank?: (bankId: string | null) => void;
  onRequireLogin?: () => void;
  bankRefreshKey?: number;
  onBack?: () => void;
  completedBankIds?: string[];
  /** 已完成题库的作答次数（来自轻量卷宗列表）。 */
  completedCounts?: Record<string, number>;
  /** 登录历史完成状态的同步状态；未知时不能按“未完成”渲染。 */
  completionStatus?: 'syncing' | 'ready' | 'stale' | 'error';
  /** 报告全文按需加载中的状态。 */
  reportLoading?: boolean;
  onViewResult?: (bankId: string) => void;
  /** 仅登录用户可用：打开"首次 vs 最近一次"复测对比。 */
  onOpenRetest?: (bankId: string, bankTitle: string) => void;
}

export const BankSelectorView: React.FC<BankSelectorViewProps> = ({
  availableBanks,
  initialDossier,
  onGoToBasicInfo,
  onStartQuizWithBankAndData,
  onStartBank,
  user,
  onCreateOrEditBank,
  onRequireLogin,
  bankRefreshKey = 0,
  onBack,
  completedBankIds = [],
  completedCounts,
  completionStatus = 'ready',
  reportLoading = false,
  onViewResult,
  onOpenRetest,
}) => {
  // 1. Derived values from initialDossier prop directly (fixes state-sync Issue 1)
  const nickname = initialDossier?.nickname || '';
  const gender = initialDossier?.gender || '';
  const age = normalizeAge(initialDossier?.age);
  const maritalStatus = initialDossier?.maritalStatus || '未婚';
  const hasBoyfriend = initialDossier?.maritalStatus === '已婚'
    ? undefined
    : (initialDossier?.hasBoyfriend || '单身');
  const occupation = initialDossier?.occupation || '';
  const avatarUrl = initialDossier?.avatarUrl || '';
  const surfaceTrait = initialDossier?.surfaceTrait || '';
  const innerDesire = initialDossier?.innerDesire || '';

  const isRegistered = Boolean(nickname.trim());

  // Custom hover state for Basic Info card to resolve Tailwind CSS inline override conflict
  const [basicCardHovered, setBasicCardHovered] = useState(false);

  // Loading state for fetching a specific bank's detailed definition
  const [loadingBankId, setLoadingBankId] = useState<string | null>(null);

  // Public approved community banks list (for all users and visitors)
  const [publicBanks, setPublicBanks] = useState<UserBankSummaryDTO[]>([]);

  // User-created bank list (logged in users only)
  const [userBanks, setUserBanks] = useState<UserBankSummaryDTO[]>([]);
  const [userBanksLoading, setUserBanksLoading] = useState(false);
  const [userBanksError, setUserBanksError] = useState<string | null>(null);

  // Fetch all approved public user banks (no auth required)
  useEffect(() => {
    let active = true;
    fetchPublicApprovedBanks()
      .then((banks) => {
        if (active) setPublicBanks(banks);
      })
      .catch((err) => {
        console.warn('[BankSelectorView] Fetching public banks failed:', err);
      });

    return () => {
      active = false;
    };
  }, [bankRefreshKey]);

  // Fetch user custom banks (Issue 2 Cleanup & Issue 3 Error Overwrite fixes)
  useEffect(() => {
    let active = true;
    if (!user) {
      setUserBanks([]);
      return;
    }
    setUserBanksLoading(true);
    setUserBanksError(null);
    fetchUserBanks(() => {
      if (active) setUserBanksError('登录已失效，请重新登录');
    })
      .then((banks) => {
        if (active) setUserBanks(banks);
      })
      .catch((err) => {
        if (active) {
          // If already set to '登录已失效，请重新登录' by the unauthorized callback, don't overwrite
          setUserBanksError((prev) => prev || (err instanceof Error ? err.message : '加载用户题库失败'));
        }
      })
      .finally(() => {
        if (active) setUserBanksLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, bankRefreshKey]);

  // User published & approved banks - converted for quiz grid selection
  const publishedUserBankMetas: QuestionBankMetadata[] = useMemo(() => {
    const map = new Map<string, UserBankSummaryDTO>();
    for (const b of publicBanks) {
      if (b.isPublished) map.set(b.id, b);
    }
    for (const b of userBanks) {
      if (b.isPublished && b.auditStatus === 'approved') {
        map.set(b.id, b);
      }
    }
    return Array.from(map.values()).map(summaryToMetadata);
  }, [publicBanks, userBanks]);

  // Combine built-in available banks with community published banks (deduplicated by id)
  const allAnswerableBanks: QuestionBankMetadata[] = useMemo(() => {
    const map = new Map<string, QuestionBankMetadata>();
    for (const b of availableBanks) {
      map.set(b.id, b);
    }
    for (const b of publishedUserBankMetas) {
      map.set(b.id, b);
    }
    return sortBanksByDisplayOrder(Array.from(map.values()));
  }, [availableBanks, publishedUserBankMetas]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'scenario' | 'direct' | 'preference' | 'scientific'>('all');

  const normalizeBankCategory = (category?: string): 'scenario' | 'direct' | 'preference' | 'scientific' => {
    if (category === 'scenario') return 'scenario';
    if (category === 'direct') return 'direct';
    if (category === 'preference') return 'preference';
    if (category === 'scientific' || category === 'confession') return 'scientific';
    return 'scenario';
  };

  const categoryCounts = useMemo(() => {
    let scenario = 0;
    let direct = 0;
    let preference = 0;
    let scientific = 0;
    for (const b of allAnswerableBanks) {
      const cat = normalizeBankCategory(b.category);
      if (cat === 'scenario') scenario++;
      else if (cat === 'direct') direct++;
      else if (cat === 'preference') preference++;
      else if (cat === 'scientific') scientific++;
    }
    return {
      all: allAnswerableBanks.length,
      scenario,
      direct,
      preference,
      scientific,
    };
  }, [allAnswerableBanks]);

  const filteredBanks = useMemo(() => {
    return allAnswerableBanks.filter((bank) => {
      // 1. 分类筛选
      if (selectedCategory !== 'all') {
        const normCat = normalizeBankCategory(bank.category);
        if (normCat !== selectedCategory) return false;
      }
      // 2. 关键词模糊检索
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = bank.title.toLowerCase().includes(q);
        const matchSub = (bank.subtitle || '').toLowerCase().includes(q);
        const matchDesc = (bank.description || '').toLowerCase().includes(q);
        const matchBadge = (bank.badge || '').toLowerCase().includes(q);
        const matchDim = bank.dimensions?.some((d) => d.name.toLowerCase().includes(q)) ?? false;
        if (!matchTitle && !matchSub && !matchDesc && !matchBadge && !matchDim) {
          return false;
        }
      }
      return true;
    });
  }, [allAnswerableBanks, selectedCategory, searchQuery]);

  const answerableBankIds = useMemo(() => {
    return allAnswerableBanks.map((bank) => bank.id);
  }, [allAnswerableBanks]);

  // Preload journey IDs
  useEffect(() => {
    queueBankJourney(answerableBankIds);
  }, [answerableBankIds]);

  // 支持从 SEO 题库静态落地页（/?bank=<bankId>#/explore）一键直达开启对应题库
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (deepLinkHandledRef.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetBankId = params.get('bank')?.trim();
    if (!targetBankId) return;
    deepLinkHandledRef.current = true;
    params.delete('bank');
    const nextSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', cleanUrl);
    if (onStartBank) {
      onStartBank(targetBankId);
    }
  }, [onStartBank]);

  // Click card handler: 优先调用统一极速开测链路
  const handleBankCardClick = async (bankId: string) => {
    if (onStartBank) {
      onStartBank(bankId);
      return;
    }
    if (loadingBankId) return;

    setLoadingBankId(bankId);
    try {
      await prioritizeQuizAndBank(bankId);
      const bank = await loadQuestionBankById(bankId);
      if (bank) {
        onStartQuizWithBankAndData(bank, {
          nickname: nickname.trim(),
          gender: gender.trim(),
          occupation: occupation.trim(),
          avatarUrl,
          personaTrait: surfaceTrait.trim(),
          age: normalizeAge(age),
          maritalStatus,
          hasBoyfriend: maritalStatus === '已婚' ? undefined : hasBoyfriend,
          surfaceTrait: surfaceTrait.trim(),
          innerDesire: innerDesire.trim(),
        } as ChapterOneData);
      }
    } catch (err) {
      console.error('[BankSelectorView] Error loading bank:', err);
    } finally {
      setLoadingBankId(null);
    }
  };

  const handleBasicCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onGoToBasicInfo();
    }
  };

  // Slim crystal status bar style for Basic Info (replaces the bulky 180px card so question banks take center stage)
  const basicCardStyle: React.CSSProperties = {
    gridColumn: '1 / -1',
    background: isRegistered
      ? 'linear-gradient(135deg, rgba(192, 132, 252, 0.14) 0%, rgba(255, 51, 119, 0.06) 50%, rgba(18, 6, 24, 0.82) 100%)'
      : 'linear-gradient(135deg, rgba(255, 112, 166, 0.14) 0%, rgba(18, 6, 24, 0.82) 100%)',
    border: `1px solid ${isRegistered ? (basicCardHovered ? '#c084fc' : 'rgba(192, 132, 252, 0.38)') : (basicCardHovered ? '#ff70a6' : 'rgba(255, 112, 166, 0.36)')}`,
    borderRadius: 16,
    padding: '0.72rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    boxShadow: '0 8px 24px -6px rgba(8, 2, 14, 0.68), inset 0 1px 0 0 rgba(255, 235, 245, 0.18)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 860,
        margin: '0 auto',
        padding: '0.75rem 0.85rem 3.5rem',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
      }}
      className="animate-fade-in"
    >
      {/* Compact Header Section */}
      <div style={{ marginBottom: '0.9rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.45rem',
          }}
        >
          {onBack ? (
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 999,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                padding: '0.24rem 0.65rem 0.24rem 0.45rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={14} style={{ flexShrink: 0 }} />
              <span>返回</span>
            </button>
          ) : (
            <span />
          )}

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.24rem 0.72rem',
              borderRadius: 999,
              background: 'rgba(255, 112, 166, 0.12)',
              border: '1px solid rgba(255, 112, 166, 0.28)',
              color: '#ff70a6',
              fontSize: '0.72rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Sparkles size={12} style={{ flexShrink: 0 }} />
            <span>选定维度 · 即刻测评</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', padding: '0 0.1rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }} className="text-gradient">
            选择探索题库
          </h2>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, opacity: 0.85 }}>
            ⚡ 挑选任意绝密卷宗，即刻开启潜意识测验
          </p>
        </div>
      </div>

      {/* ==================== Search & Category Filter Section ==================== */}
      <div style={{ marginBottom: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {/* Search Box */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={14}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索题库标题、描述或心理维度..."
            style={{
              width: '100%',
              padding: '0.5rem 2.1rem 0.5rem 2.2rem',
              background: 'rgba(20, 8, 28, 0.65)',
              border: '1px solid rgba(255, 112, 166, 0.26)',
              borderRadius: 13,
              color: '#fff',
              fontSize: '0.78rem',
              outline: 'none',
              backdropFilter: 'blur(10px)',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="清除搜索"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Tabs (强制单行排布，绝不孤零零掉行) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.32rem',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            paddingBottom: 2,
          }}
        >
          {[
            { key: 'all', label: '全部', count: categoryCounts.all },
            { key: 'scenario', label: '情境切片', count: categoryCounts.scenario },
            { key: 'direct', label: '真实自白', count: categoryCounts.direct },
            { key: 'preference', label: '权责谱系', count: categoryCounts.preference },
            { key: 'scientific', label: '心相镜像', count: categoryCounts.scientific },
          ].map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                role="tab"
                data-testid={`category-tab-${cat.key}`}
                aria-selected={isActive}
                onClick={() => setSelectedCategory(cat.key as any)}
                style={{
                  flex: '1 0 auto',
                  padding: '0.28rem 0.56rem',
                  borderRadius: 12,
                  border: isActive ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.26), rgba(192, 132, 252, 0.18))'
                    : 'rgba(255, 255, 255, 0.035)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.71rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.18rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 0 12px rgba(255, 112, 166, 0.22)' : 'none',
                }}
              >
                <span>{cat.label}</span>
                <span style={{ fontSize: '0.63rem', opacity: 0.72 }}>({cat.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid containing Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '0.85rem',
        }}
      >
        {/* ==================== 1. First Bar: Slim Persona Status Bar (释放 130px 首屏空间) ==================== */}
        {(!searchQuery.trim() && selectedCategory === 'all') && (
          <div
            onClick={onGoToBasicInfo}
            onMouseEnter={() => setBasicCardHovered(true)}
            onMouseLeave={() => setBasicCardHovered(false)}
            onKeyDown={handleBasicCardKeyDown}
            style={basicCardStyle}
            role="button"
            tabIndex={0}
            aria-label={isRegistered ? `基础信息, 代号：${nickname}` : '身份与表里假面设定'}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
                <span
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    padding: '0.12rem 0.48rem',
                    borderRadius: 8,
                    background: isRegistered ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255, 112, 166, 0.2)',
                    color: isRegistered ? '#c084fc' : '#ff70a6',
                    border: `1px solid ${isRegistered ? 'rgba(192, 132, 252, 0.4)' : 'rgba(255, 112, 166, 0.4)'}`,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {isRegistered ? '已录入 · 假面档案' : '表里假面设定'}
                </span>
                <h3
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: '#fff',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {isRegistered ? `代号：${nickname} · 假面档案` : '身份与表里假面档案'}
                </h3>
              </div>

              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.3,
                  margin: '0.24rem 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {isRegistered
                  ? (occupation ? `职业：${occupation} · 点击查看或完善深度设定（特质与渴望）` : '已建档 · 点击完善真实职业与暗面渴望设定')
                  : '支持直接挑选题库极速开测，也可预先录入社交形象与真实职业'}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void prioritizeBasicInfo();
                onGoToBasicInfo();
              }}
              onPointerDown={() => { void prioritizeBasicInfo(); }}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.32rem 0.72rem',
                borderRadius: 999,
                background: isRegistered ? 'rgba(192, 132, 252, 0.18)' : 'rgba(255, 112, 166, 0.2)',
                border: `1px solid ${isRegistered ? 'rgba(192, 132, 252, 0.45)' : 'rgba(255, 112, 166, 0.45)'}`,
                color: isRegistered ? '#e9d5ff' : '#ffd6e7',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.28rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {isRegistered ? (
                <>
                  <Edit3 size={11} />
                  <span>修改信息</span>
                </>
              ) : (
                <>
                  <span>去登记</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </div>
        )}

        {/* ==================== 2. Render filtered answerable quiz cards ==================== */}
        {filteredBanks.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 20,
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}
          >
            <Sparkles size={24} color="#ff70a6" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', marginBottom: '0.3rem' }}>
              未找到匹配题库
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              尝试调整搜索词或切换其他分类
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.74rem', borderRadius: 12 }}
            >
              重置筛选
            </button>
          </div>
        ) : (
          filteredBanks.map((bank) => (
            <BankCard
              key={bank.id}
              bank={bank}
              isLocked={false}
              isLoading={loadingBankId === bank.id}
              isCompleted={completedBankIds.includes(bank.id)}
              completedCount={completedCounts?.[bank.id] ?? 0}
              completionStatus={completionStatus}
              reportLoading={reportLoading}
              onCardClick={handleBankCardClick}
              // 游客没有可读取的报告全文与复测记录：只给"已完成 / 未完成"标记，
              // 不渲染点了没反应的入口。
              onViewResult={user ? onViewResult : undefined}
              onOpenRetest={user && onOpenRetest ? (bankId) => onOpenRetest(bankId, bank.title) : undefined}
              onPreload={prioritizeQuizAndBank}
              onHoverPreload={prioritizeBank}
            />
          ))
        )}

        {/* ==================== 3. Custom Bank Creation Card (For logged-in users) ==================== */}
        {user && onCreateOrEditBank && (
          <div
            onClick={() => onCreateOrEditBank(null)}
            style={{
              background: 'rgba(147, 51, 234, 0.06)',
              border: '1.5px dashed rgba(147, 51, 234, 0.4)',
              borderRadius: 20,
              padding: '1.35rem 1.4rem',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 180,
              textAlign: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
            className="hover:border-[#c084fc] hover:shadow-lg"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCreateOrEditBank(null);
              }
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff70a6, #9333ea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.85rem',
                boxShadow: '0 0 20px rgba(147, 51, 234, 0.4)',
              }}
            >
              <Plus size={22} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#c084fc', marginBottom: '0.3rem' }}>
              创建我的题库
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              支持单选 / 多选 / 文本框三种题型<br />自定义选项与必答设置
            </p>
          </div>
        )}

        {/* Guest Lock prompt for creating bank */}
        {!user && onRequireLogin && (
          <div
            onClick={onRequireLogin}
            style={{
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1.5px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 20,
              padding: '1.35rem 1.4rem',
              cursor: 'pointer',
              transition: 'all 0.25s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 180,
              textAlign: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRequireLogin();
              }
            }}
          >
            <Plus size={28} color="var(--text-muted)" style={{ marginBottom: '0.6rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              登录后可创建题库
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              点击登录以解锁创建功能
            </p>
          </div>
        )}
      </div>

      {/* ==================== 4. My custom banks dashboard (Logged-in users only) ==================== */}
      {user && (
        <div style={{ marginTop: '2.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
              paddingBottom: '0.6rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FileText size={16} color="#c084fc" />
              <span>我的题库</span>
              {userBanks.length > 0 && (
                <span
                  style={{
                    padding: '0.1rem 0.5rem',
                    borderRadius: 8,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: 'rgba(147, 51, 234, 0.15)',
                    color: '#c084fc',
                  }}
                >
                  {userBanks.length}
                </span>
              )}
            </h3>
            {onCreateOrEditBank && (
              <button
                type="button"
                onClick={() => onCreateOrEditBank(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(147, 51, 234, 0.4)',
                  color: '#c084fc',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Plus size={13} style={{ flexShrink: 0 }} /> 新建
              </button>
            )}
          </div>

          {userBanksLoading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: '#c084fc', marginBottom: '0.5rem' }} />
              <div>加载中...</div>
            </div>
          ) : userBanksError ? (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontSize: '0.85rem',
              }}
            >
              {userBanksError}
            </div>
          ) : userBanks.length === 0 ? (
            <div
              style={{
                padding: '1.5rem 1rem',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 14,
                border: '1px dashed rgba(255,255,255,0.08)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              <FileText size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <div>暂无自建题库</div>
              <div style={{ fontSize: '0.76rem', marginTop: '0.3rem', opacity: 0.7 }}>
                点击上方"新建"开始创建你的第一个题库
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {userBanks.map((b) => (
                <MyBankItem key={b.id} bank={b} onClick={onCreateOrEditBank || (() => {})} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
