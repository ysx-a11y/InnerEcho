import React, { useState, useRef } from 'react';
import { ChapterOneData } from '../data/chapterStructure';
import { OCCUPATIONS } from '../data/personaOptions';
import { User, Briefcase, Camera, ArrowRight, ChevronDown, Check, Calendar, Heart, ChevronLeft, AlertCircle } from 'lucide-react';
import { telemetryTracker } from '../utils/telemetryTracker';
import { compressImages } from '../utils/imageCompress';
import { ImageUploader } from './ImageUploader';
import { normalizeAge } from '../utils/age';
import { MAX_DOSSIER_IMAGES } from '../../shared/dossierLimits';
import { validateNickname } from '../utils/nickname';

interface ChapterOneViewProps {
  initialData: ChapterOneData;
  onNext: (data: ChapterOneData) => void | Promise<void>;
  onBack?: () => void;
}

export const ChapterOneView: React.FC<ChapterOneViewProps> = ({ initialData, onNext, onBack }) => {
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [occupation, setOccupation] = useState(initialData?.occupation || '');
  const [avatarUrls, setAvatarUrls] = useState<string[]>(
    initialData?.avatarUrls ?? (initialData?.avatarUrl ? [initialData.avatarUrl] : [])
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [age, setAge] = useState(initialData?.age || '');
  const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus || '未婚');
  const [hasBoyfriend, setHasBoyfriend] = useState<string | undefined>(
    initialData?.maritalStatus === '已婚' ? undefined : (initialData?.hasBoyfriend || '单身')
  );
  const [surfaceTrait, setSurfaceTrait] = useState(initialData?.surfaceTrait || '');
  const [innerDesire, setInnerDesire] = useState(initialData?.innerDesire || '');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAgeDropdownOpen, setIsAgeDropdownOpen] = useState(false);
  const [formError, setFormError] = useState('');
  // 昵称走字段级内联校验；图片/保存类错误仍用顶部提示。
  const [nicknameTouched, setNicknameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // ChapterOneView is a single-page form — fields are always editable (no lock state).
  // Kept as a constant to satisfy existing disabled={isLocked} references.
  const isLocked = false;

  const MAX_IMAGES = MAX_DOSSIER_IMAGES;

  // 字段级校验：与服务端 nicknameSchema 一致（min 2 且禁止 aa/11 全重复字符）
  const nicknameError = validateNickname(nickname);
  const showNicknameError = Boolean(nicknameError) && (nicknameTouched || submitAttempted);

  // 多图上传 + 浏览器压缩
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (avatarUrls.length + files.length > MAX_IMAGES) {
      setFormError(`最多上传 ${MAX_IMAGES} 张照片`);
      return;
    }

    setIsCompressing(true);
    setFormError('');
    try {
      const compressed = await compressImages(files);
      // 先算出新索引再分别更新：避免在 setState updater 内部调用另一个 setState
      // （StrictMode 下 updater 会执行两次，嵌套副作用会重复触发）。
      const nextIndex = avatarUrls.length + compressed.length - 1;
      setAvatarUrls((prev) => [...prev, ...compressed]);
      setActiveImageIndex(Math.max(0, nextIndex));
    } catch (err) {
      setFormError('图片处理失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = avatarUrls.filter((_, i) => i !== index);
    setAvatarUrls(updated);
    setActiveImageIndex((prevIdx) => {
      if (updated.length === 0) return 0;
      if (index <= prevIdx) return Math.max(0, prevIdx - 1);
      return prevIdx;
    });
  };

  const handleSwitchImage = (dir: 'prev' | 'next') => {
    setActiveImageIndex((prev) => {
      if (dir === 'prev') return (prev - 1 + avatarUrls.length) % avatarUrls.length;
      return (prev + 1) % avatarUrls.length;
    });
  };

  // 行为遥测：按输入前后长度差估算击键/退格次数，供后端脱敏聚合（犹豫度/修改率）
  const trackFieldChange = (fieldId: string, label: string, prev: string, next: string) => {
    telemetryTracker.setActiveField(fieldId, label);
    const deleted = Math.max(0, prev.length - next.length);
    const added = Math.max(0, next.length - prev.length);
    for (let i = 0; i < deleted; i++) {
      telemetryTracker.recordKeystroke('Backspace', fieldId, label);
    }
    for (let i = 0; i < added; i++) {
      telemetryTracker.recordKeystroke('input', fieldId, label);
    }
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;

    setSubmitAttempted(true);
    // 字段级校验：就地提示 + 聚焦，不再把原因丢到顶部横幅让用户自己找
    if (nicknameError) {
      nicknameInputRef.current?.focus();
      return;
    }

    setFormError('');
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      await onNext({
        nickname: nickname.trim(),
        gender: gender.trim(),
        occupation: occupation.trim(),
        avatarUrls,
        avatarUrl: avatarUrls[0] || '',
        personaTrait: surfaceTrait.trim(),
        age: normalizeAge(age),
        maritalStatus,
        hasBoyfriend: maritalStatus === '已婚' ? undefined : hasBoyfriend,
        surfaceTrait: surfaceTrait.trim(),
        innerDesire: innerDesire.trim(),
        durationSeconds,
      });
    } catch (err) {
      setFormError('保存失败，请稍后重试');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 860,
        margin: '0 auto',
        padding: '1.25rem 0.85rem',
        position: 'relative',
        zIndex: 1,
      }}
      className="animate-fade-in"
    >
      <div className="glass-card glass-card-glow" style={{ padding: '1.85rem 1.4rem', boxSizing: 'border-box', overflow: 'hidden' }}>
        {/* Top Back Navigation */}
        {onBack && (
          <div style={{ marginBottom: '0.85rem' }}>
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
              <span>返回</span>
            </button>
          </div>
        )}

        {/* Chapter Badge Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem', flexWrap: 'nowrap' }}>
          <span className="badge" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>假面档案 · 表里设定</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            个人属性与身份档案
          </span>
        </div>

        {/* 主标题更名为：表里假面档案 */}
        <h2 style={{ fontSize: '1.55rem', fontWeight: 800, marginBottom: '0.35rem' }} className="text-gradient">
          表里假面档案
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.6rem', lineHeight: 1.5 }}>
          登记你的身份档案与人前形象。名称或代号为必填项，其余均可选填。
        </p>

        {formError && (
          <div
            style={{
              background: 'rgba(255, 51, 119, 0.15)',
              border: '1px solid rgba(255, 51, 119, 0.4)',
              borderRadius: 10,
              padding: '0.6rem 0.9rem',
              color: '#ff70a6',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
            }}
          >
            ⚠️ {formError}
          </div>
        )}

        {/* 1. 最上方：名称或昵称 (必填 - 永远保持可编辑解锁状态) */}
        <div style={{ marginBottom: '1.6rem', zIndex: 10, position: 'relative' }}>
          <label htmlFor="chapter1-nickname" style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <User size={17} color="#ff70a6" />
            <span>名称或昵称：</span>
            <span style={{ fontSize: '0.78rem', color: '#ff3377', fontWeight: 700 }}>(必填 · 优先填写以解锁后文)</span>
          </label>

          <input
            id="chapter1-nickname"
            ref={nicknameInputRef}
            type="text"
            placeholder="请输入你的名称或代号 (必填项)"
            maxLength={20}
            value={nickname}
            aria-invalid={showNicknameError}
            aria-describedby={showNicknameError ? 'chapter1-nickname-error' : undefined}
            onBlur={() => setNicknameTouched(true)}
            onChange={(e) => {
              trackFieldChange('nickname', '名称或昵称', nickname, e.target.value);
              setNickname(e.target.value);
            }}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: `1.5px solid ${showNicknameError ? 'rgba(239, 68, 68, 0.85)' : 'rgba(255, 112, 166, 0.6)'}`,
              borderRadius: 12,
              padding: '0.75rem 1rem',
              color: '#ffffff',
              fontSize: '0.92rem',
              outline: 'none',
              boxShadow: showNicknameError
                ? '0 0 15px rgba(239, 68, 68, 0.25)'
                : (!nickname.trim() ? '0 0 15px rgba(255, 112, 166, 0.25)' : 'none'),
              transition: 'all 0.3s ease',
            }}
          />
          {showNicknameError && (
            <div
              id="chapter1-nickname-error"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '0.4rem',
                fontSize: '0.78rem',
                color: '#fca5a5',
                lineHeight: 1.35,
              }}
            >
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>{nicknameError}</span>
            </div>
          )}
        </div>

        {/* 下半部分表单区域 */}
        <div style={{ position: 'relative', width: '100%' }}>
          <div>
            {/* 2. 职业 (可选) */}
            <div style={{ marginBottom: '1.4rem', position: 'relative' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                <Briefcase size={16} color="#ff70a6" />
                <span>职业：</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(可选)</span>
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  placeholder="手填或点击右侧选择（如：教师、学生、设计师）"
                  maxLength={40}
                  value={occupation}
                  onChange={(e) => {
                    trackFieldChange('occupation', '职业', occupation, e.target.value);
                    setOccupation(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    padding: '0.85rem 7.2rem 0.85rem 0.9rem', // 增大高度与右边距防重叠
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />

                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)', // 垂直居中对齐
                    background: 'rgba(255, 51, 119, 0.18)',
                    border: '1px solid rgba(255, 112, 166, 0.3)',
                    borderRadius: 8,
                    padding: '0.55rem 0.85rem', // 增大触控尺寸
                    color: '#ff70a6',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <span>快捷选择</span>
                  <ChevronDown size={12} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              </div>

              {/* 下拉浮层 */}
              {isDropdownOpen && !isLocked && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '100%',
                    maxWidth: 360,
                    background: 'rgba(20, 7, 26, 0.98)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 112, 166, 0.4)',
                    borderRadius: 14,
                    padding: '0.4rem',
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8)',
                    zIndex: 100,
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}
                  className="animate-fade-in"
                >
                  {OCCUPATIONS.map((occ) => {
                    const isSelected = occupation === occ.label;
                    return (
                      <div
                        key={occ.id}
                        onClick={() => {
                          telemetryTracker.recordOptionChange('职业', occupation, occ.label);
                          setOccupation(occ.label);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          padding: '0.7rem 0.95rem', // 增大触控项高度，防止误触
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          color: isSelected ? '#ff70a6' : 'var(--text-primary)',
                          background: isSelected ? 'rgba(255, 51, 119, 0.2)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <span style={{ fontWeight: isSelected ? 600 : 400 }}>{occ.label}</span>
                        {isSelected && <Check size={13} color="#ff70a6" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. 性别 (可选) */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                <User size={16} color="#ff70a6" />
                <span>性别：</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(可选)</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                {[
                  { label: '女', value: '女' },
                  { label: '男', value: '男' },
                  { label: '保密', value: '保密' },
                ].map((opt) => {
                  const isSelected = gender === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const nextVal = isSelected ? '' : opt.value;
                        trackFieldChange('gender', '性别', gender, nextVal);
                        setGender(nextVal);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.8rem 0.5rem',
                        background: isSelected ? 'rgba(255, 51, 119, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 12,
                        color: isSelected ? '#ff70a6' : 'var(--text-primary)',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 年龄 & 感情状态 (可选) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              gap: '1.2rem',
              marginBottom: '1.4rem'
            }}>
              {/* 年龄 */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <Calendar size={16} color="#ff70a6" />
                  <span>年龄：</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(可选)</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    type="text"
                    readOnly
                    placeholder="点击选择年龄"
                    value={age ? `${age} 岁` : ''}
                    onClick={() => setIsAgeDropdownOpen(!isAgeDropdownOpen)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 12,
                      padding: '0.85rem 5.5rem 0.85rem 0.9rem',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsAgeDropdownOpen(!isAgeDropdownOpen)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255, 51, 119, 0.18)',
                      border: '1px solid rgba(255, 112, 166, 0.3)',
                      borderRadius: 8,
                      padding: '0.55rem 0.85rem',
                      color: '#ff70a6',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <span>选择</span>
                    <ChevronDown size={12} style={{ transform: isAgeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                </div>

                {/* 年龄下拉浮层 */}
                {isAgeDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      width: '100%',
                      background: 'rgba(20, 7, 26, 0.98)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(255, 112, 166, 0.4)',
                      borderRadius: 14,
                      padding: '0.4rem',
                      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8)',
                      zIndex: 100,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                    className="animate-fade-in"
                  >
                    {Array.from({ length: 53 }, (_, i) => 18 + i).map((a) => {
                      const isSelected = age === String(a);
                      return (
                        <div
                          key={a}
                          onClick={() => {
                            trackFieldChange('age', '年龄', age, String(a));
                            setAge(String(a));
                            setIsAgeDropdownOpen(false);
                          }}
                          style={{
                            padding: '0.7rem 0.95rem',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            color: isSelected ? '#ff70a6' : 'var(--text-primary)',
                            background: isSelected ? 'rgba(255, 51, 119, 0.2)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <span style={{ fontWeight: isSelected ? 600 : 400 }}>{a} 岁</span>
                          {isSelected && <Check size={13} color="#ff70a6" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 感情状态 */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <Heart size={16} color="#ff70a6" />
                  <span>感情状态：</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(可选)</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  {[
                    { label: '单身', marital: '未婚', boyfriend: '单身' },
                    { label: '恋爱中', marital: '未婚', boyfriend: '恋爱中' },
                    { label: '已婚', marital: '已婚', boyfriend: undefined }
                  ].map((opt) => {
                    const isSelected = maritalStatus === opt.marital && (opt.marital === '已婚' || hasBoyfriend === opt.boyfriend);
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          trackFieldChange('relationshipStatus', '感情状态', `${maritalStatus}-${hasBoyfriend}`, `${opt.marital}-${opt.boyfriend}`);
                          setMaritalStatus(opt.marital);
                          setHasBoyfriend(opt.boyfriend);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.8rem 0.5rem',
                          background: isSelected ? 'rgba(255, 51, 119, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 12,
                          color: isSelected ? '#ff70a6' : 'var(--text-primary)',
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. 在职业下方：上传照片（多张 + 浏览器压缩 + 自由切换） */}
            <div style={{ marginBottom: '1.6rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.55rem' }}>
                <Camera size={16} color="#ff70a6" />
                <span>面具骨相录入：</span>
                <span style={{ fontSize: '0.75rem', color: '#ff70a6', fontWeight: 600 }}>
                  (用于生成 3D 绝密灵魂卡 · 支持 1~{MAX_IMAGES} 张)
                </span>
              </label>

              <ImageUploader
                avatarUrls={avatarUrls}
                activeImageIndex={activeImageIndex}
                isCompressing={isCompressing}
                isLocked={isLocked}
                maxImages={MAX_IMAGES}
                onUpload={handleImageUpload}
                onRemove={handleRemoveImage}
                onSelectIndex={setActiveImageIndex}
                onSwitch={handleSwitchImage}
              />
            </div>

            {/* 4. 其他可选个人特质区 */}
            <div style={{ background: 'rgba(20, 8, 26, 0.6)', border: '1px solid rgba(255, 105, 180, 0.18)', borderRadius: 14, padding: '1.2rem', marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ff70a6', marginBottom: '0.85rem' }}>
                表里反差与性格观察 (可选填)：
              </div>

              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                  “大家眼中的我（人前社交形象）”：
                </label>
                <input
                  type="text"
                  placeholder="例如：乖乖女、端庄淑女、高冷精英、严谨规矩"
                  maxLength={120}
                  value={surfaceTrait}
                  onChange={(e) => {
                    trackFieldChange('surfaceTrait', '人前社交形象', surfaceTrait, e.target.value);
                    setSurfaceTrait(e.target.value);
                  }}
                  disabled={isLocked}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 10,
                    padding: '0.65rem 0.85rem',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: '#ff70a6', marginBottom: '0.35rem', display: 'block' }}>
                  “独立一人时我内心的潜意识渴望”：
                </label>
                <textarea
                  placeholder="例如：渴望打破日常规则枷锁，体验一次被动臣服与信任反差..."
                  maxLength={500}
                  value={innerDesire}
                  onChange={(e) => {
                    trackFieldChange('innerDesire', '潜意识渴望', innerDesire, e.target.value);
                    setInnerDesire(e.target.value);
                  }}
                  disabled={isLocked}
                  style={{
                    width: '100%',
                    minHeight: '110px',
                    background: 'rgba(255, 51, 119, 0.06)',
                    border: '1px solid rgba(255, 51, 119, 0.3)',
                    borderRadius: 12,
                    padding: '0.85rem 1rem',
                    color: '#fff0f5',
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    outline: 'none',
                    resize: 'vertical',
                    overflowY: 'auto',
                  }}
                />
              </div>
            </div>

            {/* 提交按钮 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="btn-glow"
                style={{
                  padding: '0.75rem 2.2rem',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <span>{isSubmitting ? '正在保存...' : '保存并前往题库'}</span>
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
