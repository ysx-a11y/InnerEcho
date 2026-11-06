import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Flame, Loader2, Send, X } from 'lucide-react';

const PRESET_ROLE_CHIPS = [
  '法务总监', '高校教师', '外科医生', '架构师',
  '金融风控', '艺术设计', '全职主妇', '企业高管',
];

interface EchoCastModalProps {
  isOpen: boolean;
  onClose: () => void;
  successMessage: string | null;
  role: string;
  onRoleChange: (value: string) => void;
  tag: string;
  onTagChange: (value: string) => void;
  desire: string;
  onDesireChange: (value: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (event?: React.FormEvent | React.MouseEvent) => void;
  shadowTags: string[];
}

export const EchoCastModal: React.FC<EchoCastModalProps> = ({
  isOpen,
  onClose,
  successMessage: castSuccessMsg,
  role: castRole,
  onRoleChange: setCastRole,
  tag: castTag,
  onTagChange: setCastTag,
  desire: castDesire,
  onDesireChange: setCastDesire,
  error: castError,
  submitting: castSubmitting,
  onSubmit: handleSubmitCast,
  shadowTags,
}) => {
  if (!isOpen) return null;
  const SHADOW_TAGS = shadowTags;
  return createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '1rem',
            boxSizing: 'border-box',
          }}
          onClick={() => onClose()}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'rgba(24, 8, 32, 0.96)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              borderRadius: 20,
              padding: '1.4rem 1.5rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 51, 119, 0.2)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                <Flame size={18} color="#ff70a6" />
                <span>投掷自白心声</span>
              </div>
              <button
                type="button"
                onClick={() => onClose()}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {castSuccessMsg ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#80f3ff' }}>
                <CheckCircle2 size={36} color="#80f3ff" style={{ margin: '0 auto 0.6rem' }} />
                <div style={{ fontSize: '0.94rem', fontWeight: 700, marginBottom: 4 }}>投掷成功</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)' }}>{castSuccessMsg}</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitCast} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {/* 职业面具 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#ffd180', fontWeight: 700, marginBottom: 4 }}>
                    白天的人前面具 / 职业
                  </label>
                  <input
                    type="text"
                    value={castRole}
                    onChange={(e) => setCastRole(e.target.value)}
                    placeholder="例如：大学讲师、大厂前端、风控法务..."
                    maxLength={30}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.84rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  {/* 预选职业标签 */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {PRESET_ROLE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setCastRole(chip)}
                        style={{
                          fontSize: '0.66rem',
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.6)',
                          cursor: 'pointer',
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 阴影倾向标签选择 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#ff70a6', fontWeight: 700, marginBottom: 4 }}>
                    所属阴影倾向
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {SHADOW_TAGS.filter((t) => t !== '全部').map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCastTag(t)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: 8,
                          background: castTag === t ? 'rgba(255, 112, 166, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${castTag === t ? '#ff70a6' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: castTag === t ? '#ff70a6' : 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.72rem',
                          fontWeight: castTag === t ? 700 : 400,
                          cursor: 'pointer',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 暗面自白内容 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: '0.76rem', color: '#ffd180', fontWeight: 700 }}>
                      隐秘暗面渴望 / 真实自白
                    </label>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {castDesire.length} / 150 字
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={castDesire}
                    onChange={(e) => setCastDesire(e.target.value)}
                    placeholder="写下你在私密场域最渴望的体验、失控或被掌控的瞬间..."
                    maxLength={150}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.84rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.45,
                    }}
                  />
                </div>

                {castError && (
                  <div style={{ fontSize: '0.74rem', color: '#ff70a6', background: 'rgba(255, 112, 166, 0.1)', padding: '6px 10px', borderRadius: 8 }}>
                    {castError}
                  </div>
                )}

                <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.4 }}>
                  🔒 绝不记录任何微信号、手机号或姓名；严禁发布广告或骚扰违规内容。
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => onClose()}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmitCast}
                    disabled={castSubmitting}
                    style={{
                      flex: 2,
                      padding: '0.65rem',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #ff70a6, #e100ff)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: castSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {castSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    <span>确认投掷</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
  );
};
