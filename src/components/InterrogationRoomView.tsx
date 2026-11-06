import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  DoorOpen,
  FileWarning,
  Loader2,
  Lock,
  Send,
  Siren,
  Sparkles,
} from 'lucide-react';
import type {
  InterrogationMessageContract,
  InterrogationSessionContract,
  InterrogationStateResponse,
  InterrogationSummaryResponse,
  InterrogationTurnResponse,
  SessionUser,
} from '../../shared/apiContracts';
import interrogationChamberBg from '../assets/interrogation-chamber-bg.jpg';
import { ApiError, apiGet, apiPost } from '../utils/api';

interface InterrogationRoomViewProps {
  user: SessionUser | null;
  onBack: () => void;
  onGoBanks: () => void;
  onSessionExpired?: () => void;
}

const DANGER = '#ef4444';
const INPUT_PLACEHOLDER = '写下你的供词…';

function statusText(session: InterrogationSessionContract | null, remaining: number, maxTurns: number): string {
  if (!session || session.turnCount === 0 || session.summary || remaining <= 0) return '';
  return `已进行 ${session.turnCount} / ${maxTurns} 轮 · 还剩 ${remaining} 轮`;
}

/**
 * 审讯室（测试功能）。
 *
 * 采用裁切后的赤影审讯室实景底图（顶置红管灯 + 监控探头 + 单向观察镜 + 金属审讯桌）
 * 搭配半透烟熏黑曜石毛玻璃笔录层，营造沉浸式提审空间压迫感。
 */
export const InterrogationRoomView: React.FC<InterrogationRoomViewProps> = ({
  onBack,
  onGoBanks,
  onSessionExpired,
}) => {
  const [state, setState] = useState<InterrogationStateResponse | null>(null);
  const [messages, setMessages] = useState<InterrogationMessageContract[]>([]);
  const [session, setSession] = useState<InterrogationSessionContract | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const handleUnauthorized = useCallback(() => {
    onSessionExpired?.();
  }, [onSessionExpired]);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiGet<InterrogationStateResponse>('/api/interrogation/state', {
        onUnauthorized: handleUnauthorized,
      });
      setState(data);
      setMessages(data.messages ?? []);
      setSession(data.session);
      setRemaining(data.remainingTurns ?? 0);
      setSummary(data.session?.summary ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : '审讯室暂时无法进入');
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, summary, notice]);

  const locked = session !== null && (session.status !== 'active' || remaining <= 0);
  const hasDossier = state?.hasDossier ?? false;
  const maxTurns = state?.config.maxTurns ?? 5;
  const currentTurns = session?.turnCount ?? 0;
  const statusLine = statusText(session, remaining, maxTurns);
  const canSend = !sending && !locked && input.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    const text = input.trim();
    setSending(true);
    setNotice(null);
    try {
      const { data } = await apiPost<InterrogationTurnResponse>(
        '/api/interrogation/messages',
        { message: text },
        { onUnauthorized: handleUnauthorized }
      );
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { id: `local_user_${now}`, role: 'user', content: text, createdAt: now },
        { id: `local_assistant_${now}`, role: 'assistant', content: data.reply ?? '', createdAt: now },
      ]);
      if (data.session) setSession(data.session);
      setRemaining(data.remainingTurns ?? 0);
      setInput('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      if (err instanceof ApiError && err.status === 409) {
        const payload = err.payload as InterrogationTurnResponse | null;
        if (payload?.session) setSession(payload.session);
        setRemaining(0);
        setNotice(payload?.message ?? '本次审讯已到对话上限，暂未开放更多对话。');
      } else {
        setNotice(err instanceof Error ? err.message : '审讯者暂时没有回应，请稍后再试。');
      }
    } finally {
      setSending(false);
    }
  };

  const handleSummary = async () => {
    if (summaryLoading) return;
    setSummaryLoading(true);
    setNotice(null);
    try {
      const { data } = await apiPost<InterrogationSummaryResponse>(
        '/api/interrogation/summary',
        {},
        { onUnauthorized: handleUnauthorized }
      );
      setSummary(data.summary ?? null);
      if (data.session) setSession(data.session);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setNotice(err instanceof Error ? err.message : '总结生成失败，请稍后再试。');
    } finally {
      setSummaryLoading(false);
    }
  };

  let interrogatorIndex = 0;
  let suspectIndex = 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 680,
        height: 'calc(100dvh - 56px)',
        minHeight: 540,
        margin: '0 auto',
        padding: '0.4rem 0.65rem 0.6rem',
        boxSizing: 'border-box',
        color: '#f1e4ea',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="animate-fade-in"
    >
      {/* 顶部单行控制栏：严格复刻原图顶部结构，单行不折行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.45rem',
          padding: '0.36rem 0.62rem',
          borderRadius: 12,
          background: 'rgba(12, 4, 8, 0.92)',
          border: '1px solid rgba(239, 68, 68, 0.32)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.48rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '0.26rem 0.62rem 0.26rem 0.48rem',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.14)',
              background: 'rgba(24, 10, 16, 0.85)',
              color: '#e5ced8',
              fontSize: '0.73rem',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={13} /> 离开
          </button>

          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.48)',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Siren size={13} color="#ff6b81" />
          </span>

          <span style={{ fontWeight: 900, fontSize: '0.92rem', letterSpacing: '0.06em', color: '#fff' }}>
            审讯室
          </span>

          <span
            style={{
              fontSize: '0.58rem',
              padding: '2px 7px',
              borderRadius: 6,
              border: `1px solid ${DANGER}55`,
              background: `${DANGER}1f`,
              color: '#fca5a5',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            测试功能
          </span>
        </div>

        {/* 右侧 5 轮进度灯轨 */}
        {!loading && !error && hasDossier && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.24rem 0.56rem',
              borderRadius: 8,
              background: 'rgba(8, 2, 6, 0.9)',
              border: '1px solid rgba(239, 68, 68, 0.32)',
              flexShrink: 0,
            }}
            title={`审讯进度：${currentTurns} / ${maxTurns}`}
          >
            <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#fca5a5' }}>
              {currentTurns}/{maxTurns}轮
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {Array.from({ length: maxTurns }).map((_, idx) => {
                const isUsed = idx < currentTurns;
                return (
                  <span
                    key={idx}
                    style={{
                      width: 11,
                      height: 6,
                      borderRadius: 2,
                      background: isUsed
                        ? 'linear-gradient(90deg, #dc2626, #fb7185)'
                        : 'rgba(255, 255, 255, 0.14)',
                      boxShadow: isUsed ? '0 0 8px rgba(239, 68, 68, 0.75)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 主审讯实景舱体：裁切后的赤影审讯室实景背景图 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          border: '1px solid rgba(239, 68, 68, 0.42)',
          backgroundImage: `linear-gradient(180deg, rgba(6, 2, 6, 0.08) 0%, rgba(6, 2, 6, 0.18) 48%, rgba(6, 2, 8, 0.62) 100%), url(${interrogationChamberBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          boxShadow:
            '0 20px 56px rgba(0, 0, 0, 0.92), inset 0 0 65px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 110, 110, 0.22)',
          padding: '0.75rem 0.8rem',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#fca5a5',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Loader2 size={24} className="animate-spin" />
            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textShadow: '0 2px 10px rgba(0,0,0,0.9)',
              }}
            >
              正在推开审讯室…
            </span>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '2rem 0.5rem',
              fontSize: '0.84rem',
              color: '#fca5a5',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                padding: '1.1rem 1.3rem',
                borderRadius: 12,
                background: 'rgba(10, 3, 7, 0.78)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              <div>{error}</div>
              <div style={{ marginTop: '0.9rem' }}>
                <button
                  type="button"
                  onClick={() => void loadState()}
                  className="btn-glow"
                  style={{
                    padding: '0.5rem 1.2rem',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  再试一次
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !hasDossier && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              textAlign: 'center',
              padding: '1.2rem 0.6rem 1.6rem',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 380,
                padding: '1.35rem 1.15rem',
                borderRadius: 14,
                background: 'rgba(10, 3, 8, 0.76)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(239, 68, 68, 0.42)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  margin: '0 auto 0.75rem',
                  background: 'radial-gradient(circle, rgba(239, 68, 68, 0.26) 0%, rgba(15, 4, 10, 0.9) 75%)',
                  border: '1.5px solid rgba(239, 68, 68, 0.55)',
                  boxShadow: '0 0 24px rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DoorOpen size={26} color="#f87171" />
              </div>
              <div style={{ fontSize: '1.06rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem' }}>
                门还没为你打开
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#d6bec8',
                  lineHeight: 1.6,
                  margin: '0 auto 1.1rem',
                }}
              >
                审讯室只对完成过一次自白的来访者开放。
              </div>
              <button
                type="button"
                onClick={onGoBanks}
                className="btn-glow"
                style={{
                  padding: '0.55rem 1.4rem',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                去选一份卷宗
              </button>
            </div>
          </div>
        )}

        {!loading && !error && hasDossier && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative', zIndex: 2 }}>
            {/* 右上角极简悬浮监控角标：完全不遮挡顶灯、监控探头与单向玻璃窗 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexShrink: 0,
                marginBottom: '0.4rem',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(10, 2, 6, 0.58)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(239, 68, 68, 0.32)',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: '#fca5a5',
                  letterSpacing: '0.06em',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 8px #ef4444',
                  }}
                />
                <span>REC · 底牌卷宗已调阅</span>
              </span>

              {statusLine && (
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(10, 2, 6, 0.62)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(239, 68, 68, 0.34)',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    color: '#fecaca',
                  }}
                >
                  {statusLine}
                </span>
              )}
            </div>

            {/* 提审对话滚动区：默认从下半屏桌面区域浮起，留出上半屏红管灯与单向观察镜实景 */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.62rem',
                paddingRight: 2,
                marginBottom: '0.6rem',
              }}
            >
              {/* 顶部弹性留白：消息较少时自动把卡片推到审讯桌位置，露出单向玻璃与红灯 */}
              <div style={{ flex: 1, minHeight: messages.length === 0 ? '26vh' : '6vh' }} aria-hidden="true" />

              {/* 开场初讯卡：半透黑曜石烟熏玻璃 */}
              <div
                style={{
                  position: 'relative',
                  padding: '0.78rem 0.92rem 0.82rem 1rem',
                  borderRadius: '4px 12px 12px 4px',
                  background: 'rgba(12, 3, 8, 0.68)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(239, 68, 68, 0.38)',
                  borderLeft: '3px solid #ef4444',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.68)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#f87171',
                    marginBottom: '0.28rem',
                  }}
                >
                  主审官 · 初讯
                </div>
                <div
                  style={{
                    color: 'rgba(245, 218, 226, 0.76)',
                    fontSize: '0.74rem',
                    lineHeight: 1.58,
                    marginBottom: '0.32rem',
                  }}
                >
                  铁门在你身后合上。顶灯打在桌面的卷宗上，单向玻璃后的人没有露面，只传出一句冷声逼问：
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                  }}
                >
                  「你最近一次对别人说真话，是什么时候？」
                </div>
              </div>

              {messages.map((message) => {
                const isUser = message.role === 'user';
                if (isUser) {
                  suspectIndex += 1;
                } else {
                  interrogatorIndex += 1;
                }
                const turnNo = String(isUser ? suspectIndex : interrogatorIndex).padStart(2, '0');

                return (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: isUser ? '82%' : '92%',
                      minWidth: isUser ? 108 : undefined,
                      padding: '0.65rem 0.85rem',
                      borderRadius: isUser ? '12px 4px 4px 12px' : '4px 12px 12px 4px',
                      background: isUser
                        ? 'rgba(32, 8, 22, 0.72)'
                        : 'rgba(14, 3, 8, 0.74)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: isUser
                        ? '1px solid rgba(251, 113, 133, 0.38)'
                        : '1px solid rgba(239, 68, 68, 0.42)',
                      borderLeft: isUser ? undefined : '3px solid #ef4444',
                      borderRight: isUser ? '3px solid #fb7185' : undefined,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
                      fontSize: '0.84rem',
                      color: '#fff',
                      lineHeight: 1.66,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        color: isUser ? '#fda4af' : '#f87171',
                        marginBottom: '0.2rem',
                      }}
                    >
                      {isUser ? `被审人 · 供词 #${turnNo}` : `主审官 · 追问 #${turnNo}`}
                    </div>
                    {message.content}
                  </div>
                );
              })}

              {sending && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0.45rem 0.78rem',
                    borderRadius: '4px 10px 10px 4px',
                    background: 'rgba(18, 4, 10, 0.72)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(239, 68, 68, 0.36)',
                    borderLeft: '3px solid #ef4444',
                    color: '#fca5a5',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                  }}
                >
                  <Loader2 size={13} className="animate-spin" />
                  <span>对方在看你刚才那句话…</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* 底部招供输入台：严格贴合赤影审讯室底部暗红细框设计 */}
            {!locked ? (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.45rem 0.55rem',
                  borderRadius: 12,
                  background: 'rgba(8, 2, 6, 0.82)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(239, 68, 68, 0.42)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                }}
              >
                <textarea
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    if (notice) setNotice(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder={INPUT_PLACEHOLDER}
                  style={{
                    flex: 1,
                    resize: 'none',
                    padding: '0.35rem 0.45rem',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#fff',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: 42,
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!canSend}
                  className={canSend ? 'btn-glow' : undefined}
                  style={{
                    height: 40,
                    padding: '0 0.95rem',
                    borderRadius: 9,
                    border: canSend
                      ? '1px solid rgba(254, 202, 202, 0.42)'
                      : '1px solid rgba(255, 255, 255, 0.14)',
                    background: canSend
                      ? 'linear-gradient(135deg, #dc2626 0%, #e11d48 65%, #9f1239 100%)'
                      : 'rgba(28, 12, 20, 0.75)',
                    color: canSend ? '#fff' : '#9c8492',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: canSend ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Send size={13} /> 递过去
                </button>
              </div>
            ) : (
              <div
                style={{
                  padding: '0.88rem',
                  borderRadius: 12,
                  border: `1px solid ${DANGER}66`,
                  background: 'rgba(12, 3, 8, 0.84)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.8)',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    color: '#fca5a5',
                    marginBottom: '0.7rem',
                  }}
                >
                  <Lock size={13} color="#ef4444" />
                  <span>暂未开放更多对话</span>
                </div>
                {summary ? (
                  <div
                    style={{
                      textAlign: 'left',
                      padding: '0.82rem 0.95rem',
                      borderRadius: 8,
                      background: 'rgba(6, 2, 6, 0.85)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderLeft: '3px solid #ef4444',
                      fontSize: '0.82rem',
                      lineHeight: 1.75,
                      color: '#f5e6ef',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#f87171',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        letterSpacing: '0.06em',
                        marginBottom: '0.38rem',
                      }}
                    >
                      <FileWarning size={14} /> 审讯总结
                    </div>
                    {summary}
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => void handleSummary()}
                      disabled={summaryLoading}
                      className="btn-glow"
                      style={{
                        padding: '0.52rem 1.25rem',
                        borderRadius: 8,
                        border: '1px solid rgba(254, 202, 202, 0.35)',
                        background: summaryLoading
                          ? 'rgba(255,255,255,0.1)'
                          : 'linear-gradient(135deg, #dc2626 0%, #e11d48 55%, #881337 100%)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: summaryLoading ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {summaryLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {summaryLoading ? '正在封存提审卷宗…' : '生成审讯总结'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {notice && (
              <div
                style={{
                  marginTop: '0.45rem',
                  padding: '0.42rem 0.7rem',
                  borderRadius: 8,
                  background: 'rgba(220, 38, 38, 0.24)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  color: '#fecaca',
                  lineHeight: 1.45,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={13} color="#f87171" style={{ flexShrink: 0 }} />
                <span>{notice}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
