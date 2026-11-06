import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Send, CheckCircle2, HeartHandshake } from 'lucide-react';
import { getOrCreateDeviceId } from '../utils/deviceId';

export type ResonanceLevel = 'exact' | 'partial' | 'guarded' | 'custom';

interface MirrorResonanceFeedbackProps {
  dossierId?: string;
  initialLevel?: ResonanceLevel | null;
  initialText?: string | null;
  accentColor?: string;
}

const RESONANCE_OPTIONS: { level: ResonanceLevel; label: string; sub: string; icon: string }[] = [
  {
    level: 'exact',
    label: '90% 灵魂被彻底剥离',
    sub: '精准击中 · 深度共鸣',
    icon: '💎',
  },
  {
    level: 'partial',
    label: '60% 隐约触碰到了暗面',
    sub: '部分触动 · 隐约可见',
    icon: '🪞',
  },
  {
    level: 'guarded',
    label: '尚有防备，未完全敞开',
    sub: '理性防御 · 留有保留',
    icon: '🛡️',
  },
  {
    level: 'custom',
    label: '暗面另有隐衷',
    sub: '手写自白 · 修正定义',
    icon: '✍️',
  },
];

export const MirrorResonanceFeedback: React.FC<MirrorResonanceFeedbackProps> = ({
  dossierId,
  initialLevel,
  initialText,
  accentColor = '#ff70a6',
}) => {
  const [selectedLevel, setSelectedLevel] = useState<ResonanceLevel | null>(initialLevel || null);
  const [customText, setCustomText] = useState(initialText || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(initialLevel));
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(
    initialText || initialLevel ? '暗面心声已封存入卷宗档案' : null
  );
  const [showInput, setShowInput] = useState(initialLevel === 'custom' || Boolean(initialText));

  // 本地存储兜底
  useEffect(() => {
    if (!dossierId) return;
    try {
      const cached = localStorage.getItem(`innerecho_resonance_${dossierId}`);
      if (cached) {
        const parsed = JSON.parse(cached) as { level: ResonanceLevel; text?: string };
        if (parsed.level) {
          setSelectedLevel(parsed.level);
          if (parsed.text) setCustomText(parsed.text);
          if (parsed.level === 'custom' || parsed.text) setShowInput(true);
          setSubmitted(true);
        }
      }
    } catch {
      // ignore
    }
  }, [dossierId]);

  const sendFeedback = async (level: ResonanceLevel, text?: string) => {
    if (!dossierId) {
      setSubmitted(true);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/resonance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getOrCreateDeviceId(),
        },
        credentials: 'include',
        body: JSON.stringify({
          resonanceLevel: level,
          resonanceText: text || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!response.ok || body?.success !== true) {
        setError(body?.message || '共鸣反馈未能保存，请稍后重试');
        return;
      }
      localStorage.setItem(
        `innerecho_resonance_${dossierId}`,
        JSON.stringify({ level, text: text || undefined, timestamp: Date.now() })
      );
      setSubmitted(true);
      setSuccessNotice('✨ 暗面心声已成功封存入卷宗，成为你灵魂演化的永恒印记');
      setError(null);
    } catch (err) {
      console.warn('Failed to submit resonance feedback:', err);
      setError('网络异常，共鸣反馈尚未保存，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOption = (level: ResonanceLevel) => {
    setSelectedLevel(level);
    if (level === 'custom') {
      setShowInput(true);
    } else {
      void sendFeedback(level, customText.trim() || undefined);
    }
  };

  const handleSubmitCustomText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLevel) setSelectedLevel('custom');
    void sendFeedback(selectedLevel || 'custom', customText.trim());
  };

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        width: '100%',
        maxWidth: 720,
        margin: '1.25rem auto 0',
        padding: 'clamp(1rem, 3.5vw, 1.4rem)',
        borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(22, 10, 30, 0.95) 0%, rgba(12, 5, 18, 0.98) 100%)',
        border: '1px solid rgba(255, 112, 166, 0.25)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 112, 166, 0.08)',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {/* 头部标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(255, 112, 166, 0.15)',
              border: '1px solid rgba(255, 112, 166, 0.3)',
              color: accentColor,
            }}
          >
            <Sparkles size={13} />
          </span>
          <span style={{ fontSize: 'clamp(0.88rem, 2.8vw, 0.96rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            这面暗色镜像，照出了几分真实的你？
          </span>
        </div>

        {submitted && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: '#80f3ff', fontWeight: 600 }}>
            <CheckCircle2 size={12} />
            <span>暗面已印记</span>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.55rem 0.75rem',
            borderRadius: 10,
            background: 'rgba(255, 51, 119, 0.08)',
            border: '1px solid rgba(255, 51, 119, 0.35)',
            color: '#ff70a6',
            fontSize: '0.72rem',
            fontWeight: 600,
            lineHeight: 1.45,
            boxSizing: 'border-box',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #8d879e)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
        本测试完全匿名。你的共鸣选择与心声仅用于暗面镜像校准，绝不公开展示。
      </p>

      {/* 4 选项网格 - 移动端完美 2x2 / 自适应流式排布 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.6rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {RESONANCE_OPTIONS.map((opt) => {
          const isSelected = selectedLevel === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              onClick={() => handleSelectOption(opt.level)}
              disabled={isSubmitting}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '0.75rem 0.85rem',
                minHeight: 58,
                borderRadius: 12,
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(255, 112, 166, 0.25) 0%, rgba(170, 38, 218, 0.25) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: isSelected
                  ? '1px solid rgba(255, 112, 166, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isSelected ? '0 0 16px rgba(255, 112, 166, 0.25)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                boxSizing: 'border-box',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%' }}>
                <span style={{ fontSize: '0.88rem' }}>{opt.icon}</span>
                <span
                  style={{
                    fontSize: 'clamp(0.74rem, 2.2vw, 0.78rem)',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#fff' : '#dfd9eb',
                    lineHeight: 1.3,
                  }}
                >
                  {opt.label}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.64rem',
                  color: isSelected ? 'rgba(255, 255, 255, 0.75)' : '#8d879e',
                  marginTop: '0.2rem',
                }}
              >
                {opt.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* 方案一展开的暗黑手写心声文本域 */}
      {showInput && (
        <form onSubmit={handleSubmitCustomText} style={{ marginTop: '0.9rem', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, 300))}
              placeholder="写下那些算法未能完全道破的心底隐秘、细微反差或真实暗响..."
              rows={3}
              style={{
                width: '100%',
                minHeight: 84,
                padding: '0.75rem 0.85rem',
                borderRadius: 12,
                background: 'rgba(10, 4, 15, 0.85)',
                border: '1px solid rgba(255, 112, 166, 0.35)',
                color: '#fff',
                fontSize: '0.78rem',
                lineHeight: 1.55,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(255, 112, 166, 0.7)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 112, 166, 0.35)')}
            />
            <div
              style={{
                position: 'absolute',
                right: '0.65rem',
                bottom: '0.65rem',
                fontSize: '0.64rem',
                color: customText.length >= 280 ? '#ff3377' : '#8d879e',
                pointerEvents: 'none',
              }}
            >
              {customText.length}/300
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.6rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.66rem', color: '#8d879e' }}>
              <Shield size={11} color="#80f3ff" />
              <span>端到端私密封存 · 仅作暗面共振</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!customText.trim() && !selectedLevel)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.38rem 0.95rem',
                borderRadius: 999,
                background: submitted && !isSubmitting
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #aa26da 0%, #ff70a6 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: submitted
                  ? '0 4px 14px rgba(16, 185, 129, 0.3)'
                  : '0 4px 14px rgba(255, 112, 166, 0.3)',
                transition: 'all 0.2s ease',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <Send size={11} />
                  <span>封存中...</span>
                </>
              ) : submitted ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>已封存（点击可更新）</span>
                </>
              ) : (
                <>
                  <Send size={11} />
                  <span>封存此段暗面心声</span>
                </>
              )}
            </button>
          </div>

          {successNotice && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: '0.65rem',
                padding: '0.55rem 0.8rem',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#6ee7b7',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.12)',
              }}
            >
              <CheckCircle2 size={14} color="#34d399" />
              <span>{successNotice}</span>
            </div>
          )}
        </form>
      )}

      {/* 底部私密声明与触碰感悟 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          marginTop: '0.85rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.66rem',
          color: '#6e677c',
          textAlign: 'center',
        }}
      >
        <HeartHandshake size={12} color={accentColor} />
        <span>感谢你向深渊敞开真实的自己</span>
      </div>
    </div>
  );
};
