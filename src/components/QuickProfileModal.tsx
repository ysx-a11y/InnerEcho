import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight, X, AlertCircle } from 'lucide-react';
import { MAX_AGE, MIN_AGE, normalizeAge, validateAge } from '../utils/age';
import { validateNickname } from '../utils/nickname';
import { Z_LAYER } from '../utils/zLayers';

interface QuickProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { nickname: string; gender: string; age: string }) => void;
  initialNickname?: string;
  initialGender?: string;
  initialAge?: string;
  bankTitle?: string;
}

const GENDER_OPTIONS = [
  { label: '女性 ♀', value: '女' },
  { label: '男性 ♂', value: '男' },
  { label: '非二元 ⚥', value: '其他' },
];

/** 常用年龄快捷值；其余年龄直接手动输入准确岁数。 */
const AGE_QUICK_OPTIONS = ['20', '25', '28', '32', '38', '45'];

const ERROR_COLOR = '#fca5a5';
const ERROR_BORDER = '1.5px solid rgba(239, 68, 68, 0.75)';

export const QuickProfileModal: React.FC<QuickProfileModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialNickname,
  initialGender = '女',
  initialAge,
  bankTitle,
}) => {
  // 昵称是卷宗的署名，管理端靠它区分受访者；这里不给"匿名"兜底，
  // 缺昵称就必须当场补上（详见 handleSubmit）。
  const [nickname, setNickname] = useState(initialNickname || '');
  const [gender, setGender] = useState(initialGender || '女');
  // 年龄必须是准确岁数（纯数字），区间文案会导致服务端校验失败。
  const [age, setAge] = useState(() => normalizeAge(initialAge));
  // 字段级校验状态：只有用户"碰过"这个字段（失焦）或尝试提交后才提示，
  // 避免刚打开弹窗或正在输入 "1"→"18" 的过程中就开始报错。
  const [nicknameTouched, setNicknameTouched] = useState(false);
  const [ageTouched, setAgeTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const ageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 昵称校验与服务端 nicknameSchema 一致（min 2 且禁止 aa/11 全重复字符）。
  const nicknameError = validateNickname(nickname);
  const showNicknameError = Boolean(nicknameError) && (nicknameTouched || submitAttempted);

  // 该门禁里年龄是必填（与 ChapterOneView 的"(可选)"不同），空值要给出必填提示。
  const ageError = !age ? '请输入你的准确年龄（岁）' : validateAge(age);
  const showAgeError = Boolean(ageError) && (ageTouched || submitAttempted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (nicknameError) {
      nicknameInputRef.current?.focus();
      return;
    }

    if (ageError) {
      // 就地提示 + 聚焦到出错的字段，而不是让用户去顶部找原因
      ageInputRef.current?.focus();
      return;
    }

    onConfirm({ nickname: nickname.trim(), gender, age: normalizeAge(age) });
  };

  return createPortal(
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.userModal,
        background: 'rgba(10, 4, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="glass-card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'linear-gradient(145deg, rgba(28, 12, 38, 0.95) 0%, rgba(12, 5, 18, 0.98) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.35)',
          borderRadius: 20,
          padding: '1.4rem 1.25rem',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 112, 166, 0.15)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
          }}
          aria-label="关闭"
        >
          <X size={14} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 112, 166, 0.15)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.45rem',
            }}
          >
            <Sparkles size={16} color="#ff70a6" />
          </div>
          <h3
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#fff',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.04em',
            }}
          >
            潜意识基线快速校准
          </h3>
          <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {bankTitle ? `正在进入《${bankTitle}》· ` : ''}仅需几秒登记署名与基线，校准人称代词与深度映射
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Nickname：卷宗署名必填，避免管理端全是无法分辨的"匿名" */}
          <div style={{ marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.45rem' }}>
              <label htmlFor="quick-profile-nickname" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                你的名称或昵称：
              </label>
              <span style={{ fontSize: '0.68rem', color: showNicknameError ? ERROR_COLOR : 'var(--text-muted)' }}>
                必填 · 2-20 字
              </span>
            </div>

            <input
              id="quick-profile-nickname"
              ref={nicknameInputRef}
              type="text"
              autoComplete="off"
              maxLength={20}
              value={nickname}
              aria-invalid={showNicknameError}
              aria-describedby={showNicknameError ? 'quick-profile-nickname-error' : undefined}
              onBlur={() => setNicknameTouched(true)}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：夜樱、克制者、林小姐"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                border: showNicknameError ? ERROR_BORDER : '1px solid rgba(255, 255, 255, 0.15)',
                background: showNicknameError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            />

            {showNicknameError && (
              <div
                id="quick-profile-nickname-error"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '0.4rem',
                  fontSize: '0.72rem',
                  color: ERROR_COLOR,
                  lineHeight: 1.35,
                }}
              >
                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                <span>{nicknameError}</span>
              </div>
            )}
          </div>

          {/* Gender Selector */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600, marginBottom: '0.45rem' }}>
              你的生理/心理性别：
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {GENDER_OPTIONS.map((opt) => {
                const isSelected = gender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    style={{
                      padding: '0.55rem 0.2rem',
                      borderRadius: 10,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.12)',
                      background: isSelected ? 'rgba(255, 112, 166, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age Selector: 精确岁数 + 手动输入（字段级校验） */}
          <div style={{ marginBottom: '1.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.45rem' }}>
              <label htmlFor="quick-profile-age" style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                你的准确年龄（岁）：
              </label>
              <span style={{ fontSize: '0.68rem', color: showAgeError ? ERROR_COLOR : 'var(--text-muted)' }}>
                必填 · {MIN_AGE}-{MAX_AGE} 岁
              </span>
            </div>

            <input
              id="quick-profile-age"
              ref={ageInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              value={age}
              aria-invalid={showAgeError}
              aria-describedby={showAgeError ? 'quick-profile-age-error' : undefined}
              onBlur={() => setAgeTouched(true)}
              onChange={(e) => {
                // 输入阶段就做字符级限制：非数字直接剥离，最多 2 位
                setAge(normalizeAge(e.target.value));
              }}
              placeholder="直接输入岁数，如 26"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                border: showAgeError ? ERROR_BORDER : '1px solid rgba(255, 255, 255, 0.15)',
                background: showAgeError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            />

            {/* 字段内联错误：紧贴输入框，而不是顶部横幅 */}
            {showAgeError && (
              <div
                id="quick-profile-age-error"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '0.4rem',
                  fontSize: '0.72rem',
                  color: ERROR_COLOR,
                  lineHeight: 1.35,
                }}
              >
                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                <span>{ageError}</span>
              </div>
            )}

            {/* Quick age chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {AGE_QUICK_OPTIONS.map((opt) => {
                const isSelected = age === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setAge(opt);
                      setAgeTouched(true);
                    }}
                    style={{
                      padding: '1px 8px',
                      borderRadius: 6,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                    }}
                  >
                    {opt} 岁
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            className="btn-glow"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 12,
              fontSize: '0.88rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>开启深度答题</span>
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
