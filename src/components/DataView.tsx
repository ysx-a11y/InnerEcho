import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Layers,
  Activity,
  Send,
  RefreshCw,
  Clock,
  Compass,
  AlertCircle,
  Lock,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import type {
  GlobalStatsContract,
  GlobalStatsResponse,
  EchoWhisperContract,
  EchoListResponse,
  CreateEchoResponse,
  ResonateEchoResponse,
  SessionUser,
} from '../../shared/apiContracts';
import type { FullDossierResult } from '../utils/calculator';
import { apiGet, apiPost } from '../utils/api';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { EchoCastModal } from './data/EchoCastModal';
import { DataViewMetricsPanel } from './data/DataViewMetricsPanel';

interface DataViewProps {
  diagnosticResult?: FullDossierResult | null;
  user?: SessionUser | null;
  onStartQuiz?: () => void;
  onViewResult?: () => void;
  initialMainTab?: 'echoes' | 'metrics';
  onBack?: () => void;
}

type MainTab = 'echoes' | 'metrics';

const SHADOW_TAGS = [
  '全部',
  '支配渴求',
  '绝对臣服',
  '角色互换',
  '安全束缚',
  '反差情绪',
  '心理补偿',
];

export const DataView: React.FC<DataViewProps> = ({
  diagnosticResult,
  user,
  onStartQuiz,
  onViewResult,
  initialMainTab = 'echoes',
  onBack,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(initialMainTab);
  const [selectedTag, setSelectedTag] = useState<string>('全部');

  // ==================== 回响池状态 ====================
  const [echoes, setEchoes] = useState<EchoWhisperContract[]>([]);
  const [myPendingEchoes, setMyPendingEchoes] = useState<EchoWhisperContract[]>([]);
  const [echoesLoading, setEchoesLoading] = useState(true);
  const [echoesError, setEchoesError] = useState<string | null>(null);

  // 投掷弹窗
  const [castModalOpen, setCastModalOpen] = useState(false);
  const [castRole, setCastRole] = useState(diagnosticResult?.dossierData?.chapter1?.occupation || '');
  const [castDesire, setCastDesire] = useState('');
  const [castTag, setCastTag] = useState(diagnosticResult?.dossierData?.selectedShadowTags?.[0] || '绝对臣服');
  const [castSubmitting, setCastSubmitting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);
  const [castSuccessMsg, setCastSuccessMsg] = useState<string | null>(null);

  // 点赞共鸣中状态 (防止连击)
  const [resonatingIds, setResonatingIds] = useState<Set<string>>(new Set());
  // +1 动效集合
  const [likedEffectIds, setLikedEffectIds] = useState<Set<string>>(new Set());

  // ==================== 全网大盘状态 ====================
  const [stats, setStats] = useState<GlobalStatsContract | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // 拉取回响列表
  const fetchEchoes = useCallback(async () => {
    setEchoesLoading(true);
    setEchoesError(null);
    try {
      const tagParam = selectedTag === '全部' ? '' : `?tag=${encodeURIComponent(selectedTag)}`;
      const { data } = await apiGet<EchoListResponse>(`/api/echoes${tagParam}`, {
        headers: { 'X-Device-Id': getOrCreateDeviceId() },
      });
      if (data.success) {
        setEchoes(data.items || []);
        setMyPendingEchoes(data.myPendingEchoes || []);
      } else {
        setEchoesError(data.message || '获取回响列表失败');
      }
    } catch (err) {
      setEchoesError(err instanceof Error ? err.message : '网络异常，获取回响失败');
    } finally {
      setEchoesLoading(false);
    }
  }, [selectedTag]);

  // 拉取全网大盘数据
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const { data } = await apiGet<GlobalStatsResponse>('/api/stats/global');
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        setStatsError(data.message || '获取统计数据失败');
      }
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : '网络异常，获取数据大盘失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEchoes();
  }, [fetchEchoes]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // 点亮共鸣微光（游客 / 用户均可点赞）
  const handleResonate = async (echoId: string) => {
    if (resonatingIds.has(echoId)) return;
    setResonatingIds((prev) => new Set(prev).add(echoId));

    const currentItem = echoes.find((it) => it.id === echoId);
    const willBeResonated = !currentItem?.isResonated;

    // 仅在点赞时触发 +1 浮动动效
    if (willBeResonated) {
      setLikedEffectIds((prev) => new Set(prev).add(echoId));
      setTimeout(() => {
        setLikedEffectIds((prev) => {
          const next = new Set(prev);
          next.delete(echoId);
          return next;
        });
      }, 1000);
    }

    // 乐观更新 UI（点赞 +1 / 取消点赞 -1）
    setEchoes((prev) =>
      prev.map((item) => {
        if (item.id !== echoId) return item;
        const newCount = willBeResonated ? item.echoCount + 1 : Math.max(1, item.echoCount - 1);
        return {
          ...item,
          isResonated: willBeResonated,
          echoCount: newCount,
          fuzzedEchoes: `${newCount} 灵魂共鸣`,
        };
      })
    );

    try {
      const { data } = await apiPost<ResonateEchoResponse>(`/api/echoes/${encodeURIComponent(echoId)}/resonate`, {}, {
        headers: { 'X-Device-Id': getOrCreateDeviceId() },
      });
      if (data.success) {
        setEchoes((prev) =>
          prev.map((item) =>
            item.id === echoId
              ? {
                  ...item,
                  isResonated: data.isResonated ?? item.isResonated,
                  echoCount: data.echoCount ?? item.echoCount,
                  fuzzedEchoes: data.fuzzedEchoes ?? `${data.echoCount ?? item.echoCount} 灵魂共鸣`,
                }
              : item
          )
        );
      }
    } catch {
      // 失败时回滚
      setEchoes((prev) =>
        prev.map((item) => (item.id === echoId ? (currentItem ?? item) : item))
      );
    } finally {
      setResonatingIds((prev) => {
        const next = new Set(prev);
        next.delete(echoId);
        return next;
      });
    }
  };

  // 弹窗开启时锁定底层滚动
  useEffect(() => {
    if (castModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [castModalOpen]);

  // 提交投掷心声 (支持一次点击立即提交)
  const handleSubmitCast = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (castSubmitting) return;
    if (castRole.trim().length < 2) {
      setCastError('请填写人前社会面具或职业（至少2字）');
      return;
    }
    if (castDesire.trim().length < 10) {
      setCastError('自白心声至少需要10个字符');
      return;
    }
    setCastSubmitting(true);
    setCastError(null);
    try {
      const { data } = await apiPost<CreateEchoResponse>(
        '/api/echoes',
        {
          surfaceRole: castRole.trim(),
          shadowDesire: castDesire.trim(),
          shadowTag: castTag,
        },
        { headers: { 'X-Device-Id': getOrCreateDeviceId() } }
      );
      if (data.success) {
        setCastSuccessMsg(data.message || '心声已投掷成功');
        if (data.echo) {
          setMyPendingEchoes((prev) => [data.echo!, ...prev]);
        }
        setTimeout(() => {
          setCastModalOpen(false);
          setCastSuccessMsg(null);
          setCastDesire('');
        }, 1800);
      } else {
        setCastError(data.message || '投掷失败');
      }
    } catch (err) {
      setCastError(err instanceof Error ? err.message : '网络异常，投掷失败');
    } finally {
      setCastSubmitting(false);
    }
  };

  // 用户个人四维得分（若有当前测评）
  const userDimensions = diagnosticResult?.llmAnalysis
    ? {
        dominance: diagnosticResult.llmAnalysis.dominanceIndex ?? 50,
        submission: diagnosticResult.llmAnalysis.submissionIndex ?? 50,
        restraint: diagnosticResult.llmAnalysis.restraintIndex ?? 50,
        sensory: diagnosticResult.llmAnalysis.sensoryThreshold ?? 50,
      }
    : null;

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '1.2rem 1rem 3rem',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        color: '#fff',
      }}
    >
      {/* 顶部返回导航 */}
      {onBack && (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: '0.45rem', padding: '0 0.1rem' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '0.2rem 0',
              transition: 'color 0.2s ease',
            }}
          >
            <ChevronLeft size={16} />
            <span>返回主页</span>
          </button>
        </div>
      )}

      {/* 顶部极简 Header 与轻量 Tab 切换 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
          padding: '0 0.1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#ff70a6',
              boxShadow: '0 0 10px #ff70a6',
              display: 'inline-block',
            }}
          />
          <h1
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              margin: 0,
              background: 'linear-gradient(135deg, #ffffff 0%, #ff70a6 60%, #ffd180 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.02em',
            }}
          >
            {activeMainTab === 'echoes' ? '回声树洞' : '潜意识大盘'}
          </h1>
        </div>

        {/* 轻量微型 Tab 切换 */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 2,
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            onClick={() => setActiveMainTab('echoes')}
            role="tab"
            aria-selected={activeMainTab === 'echoes'}
            style={{
              padding: '0.3rem 0.65rem',
              border: 'none',
              borderRadius: 9,
              background: activeMainTab === 'echoes' ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.28), rgba(225, 0, 255, 0.22))' : 'transparent',
              color: activeMainTab === 'echoes' ? '#ff70a6' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: activeMainTab === 'echoes' ? 700 : 500,
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
            }}
          >
            <Flame size={12} />
            <span>回声树洞</span>
          </button>
          <button
            onClick={() => setActiveMainTab('metrics')}
            role="tab"
            aria-selected={activeMainTab === 'metrics'}
            style={{
              padding: '0.3rem 0.65rem',
              border: 'none',
              borderRadius: 9,
              background: activeMainTab === 'metrics' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.28), rgba(170, 38, 218, 0.22))' : 'transparent',
              color: activeMainTab === 'metrics' ? '#80f3ff' : 'rgba(255, 255, 255, 0.5)',
              fontWeight: activeMainTab === 'metrics' ? 700 : 500,
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
            }}
          >
            <Activity size={12} />
            <span>大盘</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tab 1: 回声树洞 */}
      {/* ============================================================ */}
      {activeMainTab === 'echoes' && (
        <div>
          {/* 极简轻量投掷心声行动条 */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.85rem',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.1) 0%, rgba(18, 6, 24, 0.8) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.25)',
              marginBottom: '0.75rem',
              boxSizing: 'border-box',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', minWidth: 0 }}>
              <Flame size={14} color="#ffd180" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                完全匿名 · 倾诉你的隐秘渴望与自白
              </span>
            </div>

            <button
              onClick={() => {
                setCastError(null);
                setCastSuccessMsg(null);
                setCastModalOpen(true);
              }}
              className="btn-glow"
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <Send size={11} />
              <span>倾诉自白心声</span>
            </button>
          </div>

          {/* 我投掷的心声 */}
          {myPendingEchoes.length > 0 && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#ffd180', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} />
                <span>你投掷的心声</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {myPendingEchoes.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(255, 209, 128, 0.05)',
                      border: '1px dashed rgba(255, 209, 128, 0.35)',
                      borderRadius: 14,
                      padding: '0.9rem 1.1rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ color: '#ffd180', fontWeight: 700 }}>🎭 {p.surfaceRole}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255, 209, 128, 0.2)', color: '#ffd180' }}>
                        ⏳ 已投掷
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)', fontStyle: 'italic', lineHeight: 1.45 }}>
                      “{p.shadowDesire}”
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 阴影标签分类过滤条（单行横滑） */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              paddingBottom: '0.35rem',
              marginBottom: '0.85rem',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              alignItems: 'center',
            }}
          >
            {SHADOW_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '0.28rem 0.7rem',
                  borderRadius: 16,
                  fontSize: '0.72rem',
                  fontWeight: selectedTag === tag ? 700 : 500,
                  background: selectedTag === tag ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.3), rgba(225, 0, 255, 0.25))' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${selectedTag === tag ? '#ff70a6' : 'rgba(255, 255, 255, 0.08)'}`,
                  color: selectedTag === tag ? '#ff70a6' : 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  boxShadow: selectedTag === tag ? '0 0 10px rgba(255, 112, 166, 0.3)' : 'none',
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* 回响卡片列表 */}
          {echoesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#ff70a6' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.6rem' }} />
              <div style={{ fontSize: '0.82rem' }}>正在进入回声树洞...</div>
            </div>
          ) : echoesError ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255, 0, 0, 0.08)', borderRadius: 14 }}>
              <AlertCircle size={24} color="#ff70a6" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.85rem', color: '#fed7aa', marginBottom: '0.8rem' }}>{echoesError}</div>
              <button
                onClick={fetchEchoes}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                重试加载
              </button>
            </div>
          ) : echoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              <Flame size={32} style={{ margin: '0 auto 0.6rem', opacity: 0.5 }} />
              <div style={{ fontSize: '0.88rem' }}>此分类下暂无回响，做第一个投掷心声的人吧</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {echoes.map((echo) => (
                <div
                  key={echo.id}
                  style={{
                    background: 'rgba(18, 6, 24, 0.65)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 16,
                    padding: '1.1rem 1.3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
                    transition: 'border-color 0.25s ease, transform 0.15s ease',
                  }}
                >
                  {/* 顶部面具角色与标签 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffd180' }}>
                        🎭 {echo.surfaceRole}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'rgba(255, 112, 166, 0.15)',
                        border: '1px solid rgba(255, 112, 166, 0.3)',
                        color: '#ff70a6',
                        fontWeight: 600,
                      }}
                    >
                      {echo.shadowTag}
                    </span>
                    {echo.isPreset && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: 'rgba(128, 243, 255, 0.12)',
                          border: '1px solid rgba(128, 243, 255, 0.3)',
                          color: '#80f3ff',
                          fontWeight: 600,
                        }}
                      >
                        预置回声
                      </span>
                    )}
                  </div>

                  {/* 暗面自白正文 */}
                  <p
                    style={{
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      color: 'rgba(255, 255, 255, 0.9)',
                      margin: 0,
                      fontFamily: 'serif, -apple-system',
                      letterSpacing: '0.02em',
                    }}
                  >
                    “{echo.shadowDesire}”
                  </p>

                  {/* 底栏共鸣与时间 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '0.55rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                      来自深海的自白
                    </span>

                    <div style={{ position: 'relative' }}>
                      {likedEffectIds.has(echo.id) && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -24,
                            right: 12,
                            color: '#ff70a6',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            textShadow: '0 0 8px rgba(255, 112, 166, 0.8)',
                            pointerEvents: 'none',
                            animation: 'bounce 0.8s ease-out forwards',
                          }}
                        >
                          +1 💖
                        </span>
                      )}
                      <button
                        onClick={() => handleResonate(echo.id)}
                        disabled={resonatingIds.has(echo.id)}
                        title={echo.isResonated ? '已点亮共鸣' : '点赞心声'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '0.4rem 0.95rem',
                          borderRadius: 20,
                          background: echo.isResonated
                            ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.25), rgba(225, 0, 255, 0.2))'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${echo.isResonated ? '#ff70a6' : 'rgba(255, 112, 166, 0.3)'}`,
                          color: echo.isResonated ? '#ff70a6' : '#ffd180',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: resonatingIds.has(echo.id) ? 'not-allowed' : 'pointer',
                          boxShadow: echo.isResonated ? '0 0 14px rgba(255, 112, 166, 0.35)' : 'none',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        <Flame
                          size={14}
                          color={echo.isResonated ? '#ff70a6' : '#ffd180'}
                          fill={echo.isResonated ? '#ff70a6' : 'none'}
                        />
                        <span>
                          {echo.isResonated
                            ? `已点赞 · ${echo.echoCount}`
                            : `点赞共鸣 · ${echo.echoCount}`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab 2: 潜意识大盘 */}
      {/* ============================================================ */}
      {activeMainTab === 'metrics' && (
        <DataViewMetricsPanel
          statsLoading={statsLoading}
          stats={stats}
          userDimensions={userDimensions}
          onStartQuiz={onStartQuiz}
        />
      )}

      <EchoCastModal
        isOpen={castModalOpen}
        onClose={() => setCastModalOpen(false)}
        successMessage={castSuccessMsg}
        role={castRole}
        onRoleChange={setCastRole}
        tag={castTag}
        onTagChange={setCastTag}
        desire={castDesire}
        onDesireChange={setCastDesire}
        error={castError}
        submitting={castSubmitting}
        onSubmit={handleSubmitCast}
        shadowTags={SHADOW_TAGS}
      />
    </div>
  );
};
