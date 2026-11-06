import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2, UploadCloud, Sparkles, CheckCircle2 } from 'lucide-react';
import { MAX_DOSSIER_IMAGES } from '../../shared/dossierLimits';

interface ImageUploaderProps {
  avatarUrls: string[];
  activeImageIndex: number;
  isCompressing: boolean;
  isLocked?: boolean;
  maxImages?: number;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onSelectIndex: (index: number) => void;
  onSwitch: (dir: 'prev' | 'next') => void;
}

const SLOT_SUGGESTIONS = [
  { label: '人前面具', desc: '日常工作/生活照 (卡片正面)', icon: '🎭' },
  { label: '暗面私房', desc: '独处/反差私房 (卡片背面)', icon: '🔒' },
  { label: '眼神微表情', desc: '眼部特写/情绪防御解析', icon: '👁️' },
  { label: '侧颜轮廓', desc: '下颌角/3D景深构建', icon: '📐' },
  { label: '体态气场', desc: '全身穿搭/支配与臣服', icon: '✨' },
  { label: '暗夜切片', desc: '深夜情绪/独处侧面', icon: '🌙' },
  { label: '情绪留白', desc: '未设防的瞬间', icon: '💫' },
  { label: '反差私藏', desc: '不为人知的隐秘细节', icon: '🗝️' },
  { label: '灵魂原相', desc: '骨相九宫格封顶', icon: '👑' },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  avatarUrls,
  activeImageIndex,
  isCompressing,
  isLocked = false,
  maxImages = MAX_DOSSIER_IMAGES,
  onUpload,
  onRemove,
  onSelectIndex,
  onSwitch,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (!isLocked && !isCompressing) {
      fileInputRef.current?.click();
    }
  };

  const count = avatarUrls.length;
  // Calculate bone structure fidelity & milestone reward
  let fidelity = 0;
  let rewardText = '尚未录入 · 录入 2 张即可解锁【表里双面卡】';
  let badgeLevel = '基础骨相';

  if (count === 1) {
    fidelity = 35;
    rewardText = '已建立正面轮廓 · 建议再传 1 张暗面私房解锁【表里双面卡】';
    badgeLevel = '人面初建';
  } else if (count === 2) {
    fidelity = 55;
    rewardText = '🎉 已解锁【表里双面卡】· 正面人前面具 + 背面暗面私房就绪';
    badgeLevel = '表里双面';
  } else if (count >= 3 && count < 6) {
    fidelity = 70 + (count - 3) * 5;
    rewardText = '✨ 已激活【3D 全息镭射流光】· 实体卡金属立体光泽加成';
    badgeLevel = '全息共鸣';
  } else if (count >= 6 && count < 9) {
    fidelity = 85 + (count - 6) * 4;
    rewardText = '💎 已激活【SSR 骨相专属暗金徽标】· 深度潜意识建模';
    badgeLevel = 'SSR 深度模组';
  } else if (count >= 9) {
    fidelity = 100;
    rewardText = '👑 九宫骨相完美达成 · 解锁【极夜金箔火漆专属封印】';
    badgeLevel = 'UR 极夜典藏';
  }

  return (
    <div style={{ marginBottom: '1.6rem', boxSizing: 'border-box' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={onUpload}
        disabled={isLocked || isCompressing}
        style={{ display: 'none' }}
      />

      {/* 骨相拟真度实时进度栏 */}
      <div
        style={{
          background: 'rgba(255, 112, 166, 0.08)',
          border: '1px solid rgba(255, 112, 166, 0.25)',
          borderRadius: 12,
          padding: '9px 12px',
          marginBottom: '10px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} color="#ff70a6" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              骨相录入进度：{count}/{maxImages} 张
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: 10,
                background: count >= 2 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: count >= 2 ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: count >= 2 ? '#c084fc' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: 600,
              }}
            >
              {badgeLevel}
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#ff70a6', fontFamily: 'Consolas, monospace', fontWeight: 700 }}>
            拟真度 {fidelity}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div
          style={{
            width: '100%',
            height: 5,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
        >
          <div
            style={{
              width: `${fidelity}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #aa26da 0%, #ff70a6 60%, #ffd166 100%)',
              transition: 'width 0.4s ease',
              borderRadius: 3,
            }}
          />
        </div>

        {/* Incentive Text */}
        <div style={{ fontSize: '0.72rem', color: count >= 2 ? '#fdf4ff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{rewardText}</span>
        </div>
      </div>

      {avatarUrls.length > 0 ? (
        <>
          {/* Main preview section */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 220,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(255, 112, 166, 0.4)',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)',
              background: 'rgba(0, 0, 0, 0.3)',
              boxSizing: 'border-box',
            }}
          >
            <img
              src={avatarUrls[activeImageIndex]}
              alt={`照片 ${activeImageIndex + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Top Badge indicating role in 3D Card */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 10,
                background: 'rgba(10, 4, 15, 0.78)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 112, 166, 0.4)',
                borderRadius: 20,
                padding: '2px 8px',
                fontSize: '0.72rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
              }}
            >
              <span>{SLOT_SUGGESTIONS[activeImageIndex]?.icon || '📷'}</span>
              <span>
                切片 #{activeImageIndex + 1} · {SLOT_SUGGESTIONS[activeImageIndex]?.label || '骨相切片'}
              </span>
            </div>

            {/* Left/right slider arrows */}
            {avatarUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onSwitch('prev')}
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => onSwitch('next')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Bottom info banner */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '0.75rem',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>
                {activeImageIndex + 1} / {avatarUrls.length} · {SLOT_SUGGESTIONS[activeImageIndex]?.desc || ''}
              </span>
            </div>
          </div>

          {/* Thumbnail list with slot tags */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', overflowX: 'auto', paddingBottom: '0.3rem', boxSizing: 'border-box' }}>
            {avatarUrls.map((url, i) => (
              <div
                key={i}
                onClick={() => onSelectIndex(i)}
                style={{
                  position: 'relative',
                  width: 58,
                  height: 58,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: i === activeImageIndex ? '2px solid #ff70a6' : '2px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  opacity: i === activeImageIndex ? 1 : 0.65,
                  transition: 'opacity 0.2s, border-color 0.2s',
                  boxSizing: 'border-box',
                }}
              >
                <img src={url} alt={`缩略图 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Role tag on thumbnail */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    fontSize: '8px',
                    textAlign: 'center',
                    color: '#fff',
                    padding: '1px 0',
                    lineHeight: 1.2,
                  }}
                >
                  {i === 0 ? '正面' : i === 1 ? '背面' : `#${i + 1}`}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(i);
                  }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    background: 'rgba(255, 51, 119, 0.85)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    padding: 0,
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Thumbnail Add More box */}
            {avatarUrls.length < maxImages && (
              <button
                type="button"
                disabled={isLocked || isCompressing}
                onClick={handleUploadClick}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 10,
                  border: '2px dashed rgba(255, 112, 166, 0.45)',
                  background: 'rgba(255, 112, 166, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  color: '#ff70a6',
                  boxSizing: 'border-box',
                  gap: 2,
                }}
                title={`添加第 ${avatarUrls.length + 1} 张照片`}
              >
                {isCompressing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span style={{ fontSize: '9px', fontWeight: 600 }}>+切片</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Quick Slot Suggestions Carousel / Chips */}
          <div style={{ marginTop: '0.45rem', display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {SLOT_SUGGESTIONS.slice(0, 5).map((slot, idx) => {
              const isFilled = idx < avatarUrls.length;
              return (
                <div
                  key={idx}
                  onClick={!isFilled ? handleUploadClick : () => onSelectIndex(idx)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 8,
                    fontSize: '0.68rem',
                    background: isFilled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isFilled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px dashed rgba(255, 255, 255, 0.15)',
                    color: isFilled ? '#34d399' : 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <span>{slot.icon}</span>
                  <span>{slot.label}</span>
                  {isFilled && <CheckCircle2 size={10} />}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Empty Uploader State Box with Psychological Prompt */
        <div
          onClick={handleUploadClick}
          style={{
            width: '100%',
            height: 190,
            borderRadius: 16,
            border: '2px dashed rgba(255, 112, 166, 0.35)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLocked || isCompressing ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            padding: '1.2rem',
            boxSizing: 'border-box',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {isCompressing ? (
            <>
              <Loader2 size={28} color="#ff70a6" className="animate-spin" style={{ marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.82rem', color: '#ff70a6', fontWeight: 600 }}>正在压缩处理骨相切片...</span>
            </>
          ) : (
            <>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 112, 166, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.6rem',
                }}
              >
                <UploadCloud size={24} color="#ff70a6" />
              </div>
              <span style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 700, marginBottom: '0.35rem' }}>
                点击录入面具骨相 (支持 1~{maxImages} 张)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.45, maxWidth: '340px' }}>
                建议组合：日常人前面具 + 暗面私房/独处照 + 眼神微表情
              </span>
              <div
                style={{
                  marginTop: '0.6rem',
                  fontSize: '0.68rem',
                  color: '#ff70a6',
                  background: 'rgba(255, 112, 166, 0.1)',
                  padding: '3px 10px',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 112, 166, 0.25)',
                  fontWeight: 600,
                }}
              >
                传 2 张即自动激活【表里双面自白卡】· 独家对开展卷海报
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
