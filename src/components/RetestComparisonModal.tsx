import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type {
  DossierAttemptMetricsContract,
  RetestComparisonResponse,
} from '../../shared/apiContracts';
import { apiGet } from '../utils/api';
import { Z_LAYER } from '../utils/zLayers';

interface RetestComparisonModalProps {
  bankId: string;
  bankTitle: string;
  onClose: () => void;
  onSessionExpired?: () => void;
}

const METRICS: Array<{ key: keyof DossierAttemptMetricsContract; label: string }> = [
  { key: 'disparityScore', label: '反差张力' },
  { key: 'dominanceIndex', label: '支配指数' },
  { key: 'submissionIndex', label: '臣服指数' },
  { key: 'restraintIndex', label: '克制指数' },
  { key: 'sensoryThreshold', label: '感官阈值' },
];

const DEPTH_LABELS: Record<string, string> = {
  light: '轻度',
  medium: '中度',
  deep: '深度',
};

type LoadStatus = 'loading' | 'ready' | 'error';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatInterval(firstIso: string, lastIso: string): string {
  const first = new Date(firstIso).getTime();
  const last = new Date(lastIso).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last)) return '';
  const days = Math.max(0, Math.round((last - first) / 86_400_000));
  return days === 0 ? '同一天完成' : `间隔 ${days} 天`;
}

const MetricRow: React.FC<{ label: string; first: number | null; latest: number | null }> = ({
  label,
  first,
  latest,
}) => {
  if (first === null && latest === null) return null;
  const delta = first !== null && latest !== null ? latest - first : null;
  const deltaColor = delta === null || delta === 0 ? 'var(--text-muted)' : delta > 0 ? '#80f3ff' : '#c084fc';
  const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaText = delta === null
    ? '仅一次记录'
    : delta === 0
      ? '持平'
      : `${delta > 0 ? '+' : ''}${delta}`;

  const renderBar = (value: number | null, tone: 'first' | 'latest') => (
    <div
      style={{
        flex: 1,
        height: 6,
        borderRadius: 4,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        minWidth: 40,
      }}
    >
      <div
        style={{
          width: `${value ?? 0}%`,
          height: '100%',
          borderRadius: 4,
          background: tone === 'first'
            ? 'rgba(192, 132, 252, 0.42)'
            : 'linear-gradient(90deg, #ff70a6, #80f3ff)',
        }}
      />
    </div>
  );

  return (
    <div style={{ padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: deltaColor,
            whiteSpace: 'nowrap',
          }}
        >
          <DeltaIcon size={12} />
          {deltaText}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: '2rem', flexShrink: 0 }}>首测</span>
        {renderBar(first, 'first')}
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', width: '2rem', textAlign: 'right', flexShrink: 0 }}>
          {first ?? '—'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.68rem', color: '#ff70a6', width: '2rem', flexShrink: 0 }}>最近</span>
        {renderBar(latest, 'latest')}
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fff', width: '2rem', textAlign: 'right', flexShrink: 0 }}>
          {latest ?? '—'}
        </span>
      </div>
    </div>
  );
};

/** 复测对比：把同一题库的首次与最近一次并排呈现（仅登录用户可打开）。 */
export const RetestComparisonModal: React.FC<RetestComparisonModalProps> = ({
  bankId,
  bankTitle,
  onClose,
  onSessionExpired,
}) => {
  const [attempts, setAttempts] = useState<DossierAttemptMetricsContract[]>([]);
  const [resolvedTitle, setResolvedTitle] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    setStatus('loading');

    void apiGet<RetestComparisonResponse>(`/api/dossiers/retest/${encodeURIComponent(bankId)}`, {
      signal: controller.signal,
      onUnauthorized: onSessionExpired,
    })
      .then(({ data }) => {
        if (!active) return;
        if (!data.success || !data.attempts) {
          setErrorMessage(data.message || '复测记录加载失败');
          setStatus('error');
          return;
        }
        setAttempts(data.attempts);
        setResolvedTitle(data.bankTitle ?? null);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setErrorMessage(error instanceof Error ? error.message : '网络异常，复测记录加载失败');
        setStatus('error');
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [bankId, onSessionExpired]);

  const first = attempts[0] ?? null;
  const latest = attempts.length > 1 ? attempts[attempts.length - 1] : null;
  const addedTags = latest
    ? latest.selectedShadowTags.filter((tag) => !(first?.selectedShadowTags ?? []).includes(tag))
    : [];
  const removedTags = first
    ? first.selectedShadowTags.filter((tag) => !(latest?.selectedShadowTags ?? []).includes(tag))
    : [];

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '0.85rem 0.9rem',
    boxSizing: 'border-box',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.userModal,
        background: 'rgba(6,2,12,0.82)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="复测对比"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: 24,
          border: '1px solid rgba(255, 112, 166, 0.35)',
          background: 'linear-gradient(160deg, rgba(30,11,40,0.98), rgba(12,4,20,0.99))',
          boxShadow: '0 24px 60px rgba(0,0,0,0.75), 0 0 30px rgba(255,51,119,0.18)',
          padding: '1.35rem 1.15rem 1.5rem',
          boxSizing: 'border-box',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 12,
                background: 'rgba(255, 112, 166, 0.14)',
                border: '1px solid rgba(255, 112, 166, 0.3)',
                color: '#ff70a6',
                fontSize: '0.7rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}
            >
              <Sparkles size={12} />
              复测对比
            </div>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.35,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {resolvedTitle || bankTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭复测对比"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: 'var(--text-secondary)',
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2.5rem 0', color: '#ff70a6' }}>
            <Loader2 size={18} className="animate-spin" />
            <span style={{ fontSize: '0.85rem' }}>正在调取两次作答记录…</span>
          </div>
        )}

        {status === 'error' && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              fontSize: '0.82rem',
            }}
          >
            {errorMessage || '复测记录加载失败，请稍后重试'}
          </div>
        )}

        {status === 'ready' && first && !latest && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: 14,
              background: 'rgba(128, 243, 255, 0.06)',
              border: '1px solid rgba(128, 243, 255, 0.2)',
              color: '#b9f8ff',
              fontSize: '0.82rem',
            }}
          >
            这套题库目前只有一次记录。完成第二次之后，这里会显示两次作答的差异。
          </div>
        )}

        {status === 'ready' && first && latest && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '0.9rem 0 0.85rem' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                首次 {formatDate(first.createdAt)}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>→</span>
              <span style={{ fontSize: '0.74rem', color: '#ff70a6', fontWeight: 700 }}>
                最近 {formatDate(latest.createdAt)}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                共 {attempts.length} 次 · {formatInterval(first.createdAt, latest.createdAt)}
              </span>
            </div>

            <div style={{ ...cardStyle, marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>心理原型称号</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {first.archetypeTitle || '—'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                  {latest.archetypeTitle || '—'}
                </span>
                {first.archetypeTitle && latest.archetypeTitle && first.archetypeTitle !== latest.archetypeTitle && (
                  <span style={{ fontSize: '0.68rem', color: '#80f3ff', padding: '0.12rem 0.45rem', borderRadius: 8, background: 'rgba(128,243,255,0.12)' }}>
                    已变化
                  </span>
                )}
              </div>
              {(first.archetypeSubtitle || latest.archetypeSubtitle) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{first.archetypeSubtitle || '—'}</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>→</span>
                  <span style={{ fontSize: '0.76rem', color: '#ff9dc6' }}>{latest.archetypeSubtitle || '—'}</span>
                </div>
              )}
              <div style={{ marginTop: '0.55rem', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                深度等级：{DEPTH_LABELS[first.depthRating] ?? first.depthRating}
                <span style={{ color: 'var(--text-muted)' }}> → </span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{DEPTH_LABELS[latest.depthRating] ?? latest.depthRating}</span>
                {first.depthRating === latest.depthRating && (
                  <span style={{ color: 'var(--text-muted)' }}>（无变化）</span>
                )}
              </div>
            </div>

            <div style={{ ...cardStyle, marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>指标变化</div>
              {METRICS.map((metric) => (
                <MetricRow
                  key={String(metric.key)}
                  label={metric.label}
                  first={(first[metric.key] as number | null) ?? null}
                  latest={(latest[metric.key] as number | null) ?? null}
                />
              ))}
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>阴影标签</div>
              {addedTags.length === 0 && removedTags.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>两次选择的标签一致，没有新增或移除。</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {addedTags.map((tag) => (
                    <span
                      key={`add-${tag}`}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 10,
                        background: 'rgba(45, 212, 191, 0.14)',
                        border: '1px solid rgba(45, 212, 191, 0.3)',
                        color: '#5eead4',
                      }}
                    >
                      + {tag}
                    </span>
                  ))}
                  {removedTags.map((tag) => (
                    <span
                      key={`remove-${tag}`}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 10,
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.25)',
                        color: '#fbbf24',
                        textDecoration: 'line-through',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p style={{ marginTop: '0.9rem', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              对比只呈现两次作答的指标差异，不代表心理状态的好坏或优劣；同一份心境在不同时间作答出现波动是正常的。
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
