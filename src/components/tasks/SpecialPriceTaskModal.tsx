import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, Crown, Loader2, X, Clock } from 'lucide-react';
import type { SpecialEvaluationResult } from '../../../shared/apiContracts';

interface SpecialPriceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: SpecialEvaluationResult | null;
  countdown: number;
  canEdit: boolean;
  submitting: boolean;
  onSubmit: (price: number, selfEvaluation: string) => Promise<{ ok: boolean; message?: string }>;
  title?: string;
  badgeText?: string;
  descriptionPrompt?: string;
  priceLabel?: string;
  pricePlaceholder?: string;
  priceStatLabel?: string;
  priceErrorText?: string;
  selfEvalLabel?: string;
  selfEvalPlaceholder?: string;
  selfEvalErrorText?: string;
  successToastText?: string;
  submitButtonText?: string;
  publicNoticeText?: string;
}

export const SpecialPriceTaskModal: React.FC<SpecialPriceTaskModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  countdown,
  canEdit,
  submitting,
  onSubmit,
  title = '如果你是一个婊子，你认为自己值多少钱',
  badgeText = 'SPECIAL · 仪式级特殊排位',
  descriptionPrompt = '剥离白天一切体面、职业与社交面具。假设在没有任何道德谴责的私密深处，面对内心的反差与沉沦，你为自己标定一个怎样的身价？',
  priceLabel = '① 自评价格 / 身价金额（元）',
  pricePlaceholder = '填写你心底认可的具体金额数字',
  priceStatLabel = '自评身价',
  priceErrorText = '请输入有效的金额（不能小于0）',
  selfEvalLabel = '② 文字自评（写下定价的真实理由与内心独白）',
  selfEvalPlaceholder = '写下你为什么给自己定这个数字？是源于对支配的渴望、骄傲、自我轻贱还是某种被占有的幻想？',
  selfEvalErrorText = '请填写文字自评，记录内心自白',
  successToastText = '排位测算完成！',
  submitButtonText = '测算我的全网排位',
  publicNoticeText = '提交后，你的昵称、自白内容与身价将公开出现在全网榜单。请勿填写真实姓名、联系方式或其他可识别身份的信息。',
}) => {
  const [priceInput, setPriceInput] = useState<string>('');
  const [selfEvalInput, setSelfEvalInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (evaluation) {
        setPriceInput(evaluation.price.toString());
        setSelfEvalInput(evaluation.selfEvaluation || '');
      } else {
        setPriceInput('');
        setSelfEvalInput('');
      }
      setFormError(null);
      setSuccessMsg(null);
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, evaluation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const priceNum = parseFloat(priceInput.trim());
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError(priceErrorText);
      return;
    }

    if (!selfEvalInput.trim()) {
      setFormError(selfEvalErrorText);
      return;
    }

    const res = await onSubmit(priceNum, selfEvalInput.trim());
    if (!res.ok) {
      setFormError(res.message || '提交失败');
    } else {
      setSuccessMsg(successToastText);
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(10, 4, 15, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: '1.4rem',
          borderRadius: 22,
          background: 'linear-gradient(145deg, #1c0a24 0%, #120716 100%)',
          border: '1px solid rgba(255, 112, 166, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 51, 119, 0.2)',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'rgba(255, 112, 166, 0.15)',
                border: '1px solid rgba(255, 112, 166, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(255, 112, 166, 0.25)',
                flexShrink: 0,
              }}
            >
              <Crown size={18} color="#ff70a6" />
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#ff70a6',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '0.15rem',
                }}
              >
                {badgeText}
              </span>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#fff0f5',
                  margin: 0,
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.35,
                }}
              >
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Prompt Description */}
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            marginBottom: '1.1rem',
            background: 'rgba(255, 112, 166, 0.06)',
            padding: '0.75rem 0.9rem',
            borderRadius: 14,
            borderLeft: '3px solid #ff70a6',
            boxSizing: 'border-box',
          }}
        >
          {descriptionPrompt}
        </p>

        {/* Existing Ranking Result Card */}
        {evaluation && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.12) 0%, rgba(170, 38, 218, 0.08) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              borderRadius: 16,
              padding: '0.9rem 1rem',
              marginBottom: '1.1rem',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Award size={15} color="#ffd180" />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffd180' }}>
                  当前全网排位证书
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                总参与 {evaluation.totalParticipants} 人
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div
                style={{
                  flex: 1,
                  background: 'rgba(12, 4, 16, 0.65)',
                  border: '1px solid rgba(255, 209, 128, 0.25)',
                  borderRadius: 12,
                  padding: '0.55rem 0.3rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>全网排位</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffd180', marginTop: '0.1rem' }}>
                  No. {evaluation.rank}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'rgba(12, 4, 16, 0.65)',
                  border: '1px solid rgba(255, 112, 166, 0.25)',
                  borderRadius: 12,
                  padding: '0.55rem 0.3rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>击败同频者</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ff70a6', marginTop: '0.1rem' }}>
                  {evaluation.defeatedPercentage}%
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'rgba(12, 4, 16, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: '0.55rem 0.3rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{priceStatLabel}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', marginTop: '0.1rem' }}>
                  ¥{evaluation.price.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Cooldown Warning */}
            {!canEdit && countdown > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginTop: '0.65rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  fontSize: '0.7rem',
                }}
              >
                <Clock size={12} />
                <span>距离下次重新定价还剩 <strong>{formatCountdown(countdown)}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Price Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#fff0f5',
                marginBottom: '0.4rem',
              }}
            >
              {priceLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#ffd180',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                }}
              >
                ¥
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                disabled={!canEdit && evaluation !== null}
                placeholder={pricePlaceholder}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem 0.65rem 2.2rem',
                  background: !canEdit && evaluation !== null ? 'rgba(12, 4, 16, 0.4)' : 'rgba(14, 5, 18, 0.85)',
                  border: '1px solid rgba(255, 112, 166, 0.28)',
                  borderRadius: 14,
                  color: '#ffd180',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: !canEdit && evaluation !== null ? 0.6 : 1,
                }}
              />
            </div>
          </div>

          {/* Self-evaluation Textarea */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#fff0f5',
                marginBottom: '0.4rem',
              }}
            >
              {selfEvalLabel}
            </label>
            <textarea
              rows={3}
              value={selfEvalInput}
              onChange={(e) => setSelfEvalInput(e.target.value)}
              disabled={!canEdit && evaluation !== null}
              placeholder={selfEvalPlaceholder}
              style={{
                width: '100%',
                minHeight: '76px',
                padding: '0.65rem 0.85rem',
                lineHeight: 1.5,
                fontSize: '0.8rem',
                background: !canEdit && evaluation !== null ? 'rgba(12, 4, 16, 0.4)' : 'rgba(14, 5, 18, 0.85)',
                border: '1px solid rgba(255, 112, 166, 0.28)',
                borderRadius: 14,
                color: '#fff0f5',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                opacity: !canEdit && evaluation !== null ? 0.6 : 1,
              }}
            />
          </div>

          {/* Messages */}
          {formError && (
            <div
              style={{
                color: '#ef4444',
                fontSize: '0.74rem',
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '0.5rem 0.75rem',
                borderRadius: 10,
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {formError}
            </div>
          )}
          {successMsg && (
            <div
              style={{
                color: '#10b981',
                fontSize: '0.74rem',
                background: 'rgba(16, 185, 129, 0.08)',
                padding: '0.5rem 0.75rem',
                borderRadius: 10,
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              {successMsg}
            </div>
          )}

          {/* 排行榜公示告知（静态文本告知，绝不添加多余确认步骤） */}
          <div
            role="note"
            aria-label="公开展示提醒"
            style={{
              fontSize: '0.74rem',
              color: '#ffe4ec',
              lineHeight: 1.5,
              textAlign: 'left',
              padding: '0.65rem 0.75rem',
              borderRadius: 12,
              border: '1px solid rgba(255, 112, 166, 0.48)',
              background: 'rgba(255, 51, 119, 0.12)',
              boxShadow: '0 0 18px rgba(255, 51, 119, 0.08)',
            }}
          >
            <strong style={{ color: '#ff8fb8' }}>⚠️ 公开展示提醒：</strong>
            {publicNoticeText}
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: 14,
                fontSize: '0.8rem',
              }}
            >
              关闭
            </button>
            <button
              type="submit"
              disabled={submitting || (!canEdit && evaluation !== null)}
              className="btn-glow"
              style={{
                flex: 2,
                padding: '0.6rem',
                borderRadius: 14,
                fontSize: '0.82rem',
                fontWeight: 700,
                opacity: submitting || (!canEdit && evaluation !== null) ? 0.5 : 1,
                cursor: submitting || (!canEdit && evaluation !== null) ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  <Loader2 className="animate-spin" size={14} />
                  <span>测算排位中...</span>
                </div>
              ) : !canEdit && evaluation !== null ? (
                `冷却中 (${formatCountdown(countdown)})`
              ) : evaluation !== null ? (
                '更新自评与全网排位'
              ) : (
                submitButtonText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
