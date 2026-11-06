import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight, Briefcase, UserCheck, Camera, X, AlertCircle } from 'lucide-react';
import type { ChapterOneData } from '../data/chapterStructure';
import { ImageUploader } from './ImageUploader';
import { compressImages } from '../utils/imageCompress';
import { normalizeAge } from '../utils/age';
import { validateNickname } from '../utils/nickname';
import { MAX_DOSSIER_IMAGES } from '../../shared/dossierLimits';
import { Z_LAYER } from '../utils/zLayers';

interface DossierSealModalProps {
  isOpen: boolean;
  initialData?: Partial<ChapterOneData>;
  onConfirm: (data: ChapterOneData) => void;
  onCancel: () => void;
}

const OCCUPATION_PRESETS = ['教师', '医师', '金融', '程序员', '设计师', '学生', '自由职业'];
const PERSONA_PRESETS = ['乖乖女', '端庄淑女', '高冷精英', '温柔体面', '严谨规矩'];

export const DossierSealModal: React.FC<DossierSealModalProps> = ({
  isOpen,
  initialData,
  onConfirm,
  onCancel,
}) => {
  // 不给"匿名倾诉者"这类占位兜底：署名必须由用户自己给出，
  // 否则管理端会收到一堆无法分辨的匿名卷宗。
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [occupation, setOccupation] = useState(initialData?.occupation || '');
  const [personaTrait, setPersonaTrait] = useState(initialData?.personaTrait || '');
  const [innerDesire, setInnerDesire] = useState(initialData?.innerDesire || '');
  const [avatarUrls, setAvatarUrls] = useState<string[]>(
    initialData?.avatarUrls ?? (initialData?.avatarUrl ? [initialData.avatarUrl] : [])
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  // 昵称走字段级内联校验；图片相关错误（数量超限 / 压缩失败）仍用顶部提示。
  const [nicknameTouched, setNicknameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = MAX_DOSSIER_IMAGES;

  const nicknameError = validateNickname(nickname);
  const showNicknameError = Boolean(nicknameError) && (nicknameTouched || submitAttempted);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 跳过补充也要先有合法署名：这条路同样会直接提交卷宗。
  const handleSkip = () => {
    setSubmitAttempted(true);
    if (nicknameError) {
      nicknameInputRef.current?.focus();
      return;
    }
    onCancel();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (avatarUrls.length + files.length > MAX_IMAGES) {
      setMediaError(`最多上传 ${MAX_IMAGES} 张照片`);
      return;
    }

    setIsCompressing(true);
    setMediaError('');
    try {
      const compressed = await compressImages(files);
      // 先算出新索引，再分别更新：避免在一个 setState updater 内部调用另一个 setState
      // （StrictMode 下 updater 会被调用两次，嵌套副作用会重复执行）。
      const nextIndex = avatarUrls.length + compressed.length - 1;
      setAvatarUrls((prev) => [...prev, ...compressed]);
      setActiveImageIndex(Math.max(0, nextIndex));
    } catch (err) {
      setMediaError('图片处理失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = avatarUrls.filter((_, i) => i !== index);
    setAvatarUrls(updated);
    setActiveImageIndex((cur) => Math.min(cur, Math.max(0, updated.length - 1)));
  };

  const handleSwitchImage = (dir: 'prev' | 'next') => {
    if (avatarUrls.length <= 1) return;
    setActiveImageIndex((prev) => {
      if (dir === 'prev') return (prev - 1 + avatarUrls.length) % avatarUrls.length;
      return (prev + 1) % avatarUrls.length;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // 与服务端 nicknameSchema 完全一致（min 2 且禁止 aa/11 这类全重复字符）。
    // 之前这里只判空，导致 "夜" / "aa" 能通过前端却被服务端 400 拒收、卷宗静默不入库。
    // 现在由字段内联提示 + 聚焦接管，不再走顶部横幅。
    if (nicknameError) {
      nicknameInputRef.current?.focus();
      return;
    }

    const payload: ChapterOneData = {
      ...initialData,
      nickname: nickname.trim(),
      gender: initialData?.gender || '女',
      // 年龄统一归一化为纯数字；未填写就保持空（服务端 age 为可选）。
      // 这里曾经硬编码区间兜底 '23-28岁'，会让整个提交被服务端 400 拒绝。
      age: normalizeAge(initialData?.age),
      // 只提交用户真实填写的内容：留白就是留白。
      // 曾经用 '自由职业' / '未设定' / 写死的渴望文案兜底，等于凭空造属性，
      // 违反 .agents/AGENTS.md 第 3、6 条（留白算隐私防御区，不得展示虚假写死属性）。
      occupation: occupation.trim(),
      personaTrait: personaTrait.trim(),
      surfaceTrait: personaTrait.trim() || initialData?.surfaceTrait || '',
      innerDesire: innerDesire.trim(),
      avatarUrls,
      avatarUrl: avatarUrls[0] || '',
    };

    onConfirm(payload);
  };

  return createPortal(
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.userModal,
        background: 'rgba(8, 3, 12, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '1.2rem 1rem 3rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="glass-card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'linear-gradient(150deg, rgba(26, 10, 36, 0.96) 0%, rgba(10, 4, 15, 0.98) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.4)',
          borderRadius: 22,
          padding: '1.5rem 1.25rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 112, 166, 0.2)',
          boxSizing: 'border-box',
          position: 'relative',
          margin: 'auto 0',
        }}
      >
        {/* Top Right Close Button */}
        <button
          type="button"
          onClick={handleSkip}
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
          title="跳过并直接生成"
        >
          <X size={14} />
        </button>
        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(255, 112, 166, 0.12)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              color: '#ff70a6',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              marginBottom: '0.6rem',
            }}
          >
            <Sparkles size={12} />
            <span>潜意识特征向量已锁定 · 绝密封印仪式</span>
          </div>

          <h2
            style={{
              margin: '0 0 0.35rem 0',
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#fff',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.02em',
            }}
          >
            印铸你的 3D 表里双面灵魂卡
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45 }}>
            测试题目已完成！登记真实人设与骨相切片，立即解锁 3D 实体卡与全景自白长图
          </p>
        </div>

        {mediaError && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 10,
              padding: '0.5rem 0.8rem',
              color: '#fca5a5',
              fontSize: '0.76rem',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            {mediaError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* 1. Nickname（字段级校验） */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="seal-nickname" style={{ display: 'block', fontSize: '0.8rem', color: '#fff', fontWeight: 700, marginBottom: '0.35rem' }}>
              自白代号 / 昵称：
            </label>
            <input
              id="seal-nickname"
              ref={nicknameInputRef}
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onBlur={() => setNicknameTouched(true)}
              aria-invalid={showNicknameError}
              aria-describedby={showNicknameError ? 'seal-nickname-error' : undefined}
              placeholder="例如：夜樱、克制者、林小姐"
              maxLength={20}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                border: showNicknameError ? '1.5px solid rgba(239, 68, 68, 0.75)' : '1px solid rgba(255, 255, 255, 0.15)',
                background: showNicknameError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '0.84rem',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            />
            {showNicknameError && (
              <div
                id="seal-nickname-error"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '0.35rem',
                  fontSize: '0.72rem',
                  color: '#fca5a5',
                  lineHeight: 1.35,
                }}
              >
                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                <span>{nicknameError}</span>
              </div>
            )}
          </div>

          {/* 2. Occupation */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Briefcase size={13} color="#ff70a6" />
                <span>真实社会职业：</span>
              </label>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>（用于解构表里反差）</span>
            </div>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="例如：教师、金融精英、医师、程序员..."
              maxLength={30}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '0.84rem',
                boxSizing: 'border-box',
                marginBottom: '0.4rem',
              }}
            />
            {/* Quick chips */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {OCCUPATION_PRESETS.map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setOccupation(occ)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                    background: occupation === occ ? 'rgba(255, 112, 166, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: occupation === occ ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: occupation === occ ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                    cursor: 'pointer',
                  }}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Persona Trait */}
          <div style={{ marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserCheck size={13} color="#c084fc" />
                <span>人前社交假面形象：</span>
              </label>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>（大家眼中的你）</span>
            </div>
            <input
              type="text"
              value={personaTrait}
              onChange={(e) => setPersonaTrait(e.target.value)}
              placeholder="例如：乖乖女、端庄淑女、高冷精英..."
              maxLength={40}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                fontSize: '0.84rem',
                boxSizing: 'border-box',
                marginBottom: '0.4rem',
              }}
            />
            {/* Quick chips */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {PERSONA_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersonaTrait(p)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                    background: personaTrait === p ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: personaTrait === p ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: personaTrait === p ? '#fff' : 'rgba(255, 255, 255, 0.65)',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Bone Structure Photo Entry (ImageUploader) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#fff', fontWeight: 700, marginBottom: '0.45rem' }}>
              <Camera size={13} color="#ff70a6" />
              <span>面具骨相录入 (1~{MAX_IMAGES} 张)：</span>
            </label>
            <ImageUploader
              avatarUrls={avatarUrls}
              activeImageIndex={activeImageIndex}
              isCompressing={isCompressing}
              maxImages={MAX_IMAGES}
              onUpload={handleImageUpload}
              onRemove={handleRemoveImage}
              onSelectIndex={setActiveImageIndex}
              onSwitch={handleSwitchImage}
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isCompressing}
            className="btn-glow"
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: 14,
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: 'none',
              cursor: isCompressing ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 25px rgba(225, 0, 255, 0.35)',
            }}
          >
            <span>签署封印 · 印铸 3D 自白卡与报告</span>
            <ArrowRight size={16} />
          </button>

          {/* Skip link */}
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleSkip}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '0.74rem',
                cursor: 'pointer',
                padding: '0.3rem 0.6rem',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                transition: 'color 0.2s',
              }}
            >
              跳过补充，直接生成潜意识诊断报告 →
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
