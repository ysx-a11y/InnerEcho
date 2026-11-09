import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Smartphone, Download, Sparkles, X } from 'lucide-react';
import { ResultCard3D } from './card3d/ResultCard3D';
import { Card3DControls } from './card3d/Card3DControls';
import { DEFAULT_CARD_IMAGE } from './card3d/presetImages';
import type { Card3DConfig } from './card3d/types';
import type { ChapterOneData } from '../data/chapterStructure';
import type { SessionUser } from '../../shared/apiContracts';
import { getOrCreateDeviceId } from '../utils/deviceId';
import '../styles/card3d.css';

interface CardWorkshopViewProps {
  initialData?: ChapterOneData;
  user?: SessionUser | null;
  onBack: () => void;
}

export const CardWorkshopView: React.FC<CardWorkshopViewProps> = ({
  initialData,
  user,
  onBack,
}) => {
  const chapter1: Partial<ChapterOneData> = initialData || {};
  const [username, setUsername] = useState(
    chapter1.nickname?.trim() || user?.email?.split('@')[0] || '匿名倾诉者'
  );

  const [isExportingCard, setIsExportingCard] = useState(false);
  const [isExportingWallpaper, setIsExportingWallpaper] = useState(false);
  const [exportToast, setExportToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewModal, setPreviewModal] = useState<{ url: string; title: string } | null>(null);

  const card3dExportRef = useRef<HTMLDivElement | null>(null);
  const wallpaperCaptureRef = useRef<HTMLDivElement | null>(null);

  const showExportToast = (type: 'success' | 'error', text: string) => {
    setExportToast({ type, text });
    setTimeout(() => setExportToast(null), 3500);
  };

  const defaultStampWord = (
    chapter1.personaTrait?.replace(/者$|型$/g, '') ||
    chapter1.occupation?.replace(/者$|型$/g, '') ||
    '潜意识封存'
  ).slice(0, 6);

  const [cardConfig, setCardConfig] = useState<Card3DConfig>({
    title: chapter1.personaTrait || chapter1.occupation || '暗光解构者',
    subtitle: chapter1.surfaceTrait || '人设反差 · 专属3D实体角色卡',
    username: username,
    // 工坊允许用户从零捏卡，但默认值必须是"留白"而不是写死的属性，
    // 否则空档案用户会直接拿到一张写着虚构职业/渴望的卡。
    occupation: chapter1.occupation || '未登记',
    personaTrait: chapter1.personaTrait || '未登记',
    surfaceTrait: chapter1.surfaceTrait || '',
    innerDesire: chapter1.innerDesire || '',
    dominanceIndex: 65,
    submissionIndex: 70,
    restraintIndex: 60,
    sensoryThreshold: 75,
    opennessPercent: 80,
    opennessTrait: '深度敞开',
    dossierId: `ECHO-${Math.floor(1000000 + Math.random() * 9000000)}`,
    imageUrl: (chapter1.avatarUrls && chapter1.avatarUrls[0]) || chapter1.avatarUrl || DEFAULT_CARD_IMAGE,
    imageScale: 1.0,
    imageX: 0,
    imageY: 0,
    imageFilter: 'none',
    backImageUrl: (chapter1.avatarUrls && chapter1.avatarUrls[1]) || (chapter1.avatarUrls && chapter1.avatarUrls[0]) || chapter1.avatarUrl || DEFAULT_CARD_IMAGE,
    backImageScale: 1.1,
    backImageX: 0,
    backImageY: 0,
    backImageFilter: 'noir',
    holographic: true,
    isFlipped: false,
    contentMode: 'dimensions',
    stampType: 'ink-circle',
    stampTextTop: '镜界自白 · 实体角色卡',
    stampTextBottom: 'SUB-CONSCIOUS ARCHIVE',
    stampTextCenter: defaultStampWord,
    stampColor: '#8a1515',
    stampClarity: 'medium',
    stampX: 74,
    stampY: 62,
    stampRotation: 345,
    stampScale: 1.05,
    accentColor: '#ff70a6',
  });

  useEffect(() => {
    if (chapter1.nickname?.trim()) {
      setUsername(chapter1.nickname.trim());
      setCardConfig((prev) => ({ ...prev, username: chapter1.nickname!.trim() }));
    }
  }, [chapter1.nickname]);

  const handleResetToDefault = () => {
    setCardConfig((prev) => ({
      ...prev,
      imageUrl: (chapter1.avatarUrls && chapter1.avatarUrls[0]) || chapter1.avatarUrl || DEFAULT_CARD_IMAGE,
      backImageUrl: (chapter1.avatarUrls && chapter1.avatarUrls[1]) || (chapter1.avatarUrls && chapter1.avatarUrls[0]) || chapter1.avatarUrl || DEFAULT_CARD_IMAGE,
      imageScale: 1.0,
      imageX: 0,
      imageY: 0,
      imageFilter: 'none',
      backImageScale: 1.1,
      backImageX: 0,
      backImageY: 0,
      backImageFilter: 'noir',
      stampType: 'ink-circle',
      stampColor: '#8a1515',
      stampTextCenter: defaultStampWord,
      stampX: 74,
      stampY: 62,
      stampRotation: 345,
      stampScale: 1.05,
    }));
  };

  const triggerDownload = async (dataUrl: string, filename: string) => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(objUrl);
      }, 200);
    } catch {
      const a = document.createElement('a');
      a.download = filename;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 200);
    }
  };

  const handleExport3DCard = async () => {
    if (!card3dExportRef.current) return;
    setIsExportingCard(true);

    try {
      const { toPng } = await import('html-to-image');
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(card3dExportRef.current, {
        backgroundColor: 'transparent',
        pixelRatio: 2.5,
        cacheBust: false,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
      });
      if (!dataUrl) throw new Error('卡片生成结果为空');

      const cleanOcc = (cardConfig.occupation || '角色').replace(/[\\/:*?"<>|]/g, '_');
      const cleanTitle = (cardConfig.title || '自白卡').replace(/[\\/:*?"<>|]/g, '_');
      const filename = `镜界自白_3D角色卡_${cleanOcc}_${cleanTitle}.png`;

      triggerDownload(dataUrl, filename);
      setPreviewModal({ url: dataUrl, title: filename });
      showExportToast('success', '3D 实体角色卡已保存');

      try {
        void fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getOrCreateDeviceId(),
          },
          credentials: 'include',
          body: JSON.stringify({
            event: 'export_card',
            dossierId: cardConfig.dossierId,
          }),
        }).catch(() => {});
      } catch {
        // Silent fail
      }
    } catch (err) {
      console.error('3D Card export failed:', err);
      showExportToast('error', '卡片生成失败，请稍后重试');
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleExportWallpaper = async () => {
    if (!wallpaperCaptureRef.current) return;
    setIsExportingWallpaper(true);

    try {
      const { toPng } = await import('html-to-image');
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(wallpaperCaptureRef.current, {
        backgroundColor: '#0a040f',
        pixelRatio: 3.0,
        cacheBust: false,
      });
      if (!dataUrl) throw new Error('壁纸渲染结果为空');

      const cleanOcc = (chapter1.occupation || '角色').replace(/[\\/:*?"<>|]/g, '_');
      const filename = `镜界自白_自白壁纸_${cleanOcc}.png`;

      triggerDownload(dataUrl, filename);
      setPreviewModal({ url: dataUrl, title: filename });
      showExportToast('success', '手机壁纸已保存');
    } catch (err) {
      console.error('Wallpaper render failed:', err);
      showExportToast('error', '壁纸生成失败，请稍后重试');
    } finally {
      setIsExportingWallpaper(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '0.8rem 0.65rem 3rem',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 720,
        margin: '0 auto',
      }}
      className="animate-fade-in"
    >
      {/* Top Action Header Bar */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
          boxSizing: 'border-box',
        }}
      >
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
          <span>返回首页</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="icon-badge">
            <Sparkles size={13} stroke="#ff70a6" />
          </span>
          <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 800 }}>
            3D 实体角色卡 · 定制工坊
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            onClick={handleExportWallpaper}
            disabled={isExportingWallpaper}
            className="btn-secondary"
            style={{ fontSize: '0.76rem', padding: '0.36rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderRadius: 10 }}
          >
            <Smartphone size={13} strokeWidth={1.75} />
            <span>{isExportingWallpaper ? '生成中...' : '保存壁纸'}</span>
          </button>
        </div>
      </div>

      {/* 3D Collectible Card Centerpiece */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.35rem 0 1rem' }}>
        <ResultCard3D
          config={cardConfig}
          onChange={setCardConfig}
          exportRef={card3dExportRef}
          isExporting={isExportingCard}
        />

        <Card3DControls
          config={cardConfig}
          onChange={setCardConfig}
          onExport={handleExport3DCard}
          isExporting={isExportingCard}
          availablePhotos={chapter1.avatarUrls || (chapter1.avatarUrl ? [chapter1.avatarUrl] : [])}
          onResetToDefault={handleResetToDefault}
        />
      </div>

      {/* Off-screen Wallpaper Capture for 16:9 wallpaper export */}
      <div
        ref={wallpaperCaptureRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: -9999, top: 1000, width: 450, height: 800, boxSizing: 'border-box', overflow: 'hidden' }}
      >
        <div
          style={{
            width: 450,
            height: 800,
            boxSizing: 'border-box',
            padding: '2.5rem 2rem',
            background: 'linear-gradient(145deg, #180920 0%, #0a040f 60%, #1c0826 100%)',
            border: '1px solid rgba(255, 112, 166, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: '"Outfit", sans-serif',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#ff70a6', letterSpacing: '0.15em', fontWeight: 800 }}>
              【镜界自白 · 3D 绝密实体卡】
            </span>
            <h1 style={{ fontSize: '2.2rem', color: '#fff', margin: '0.8rem 0 0.3rem 0', fontWeight: 900 }}>
              {cardConfig.title || '暗光解构者'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              “{cardConfig.subtitle || '潜意识自白角色卡'}”
            </p>
          </div>

          <div
            style={{
              width: 220,
              height: 280,
              borderRadius: 16,
              overflow: 'hidden',
              border: '2px solid rgba(255, 112, 166, 0.4)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            }}
          >
            <img
              src={cardConfig.imageUrl}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ width: '100%', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255, 112, 166, 0.25)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: '#fff0f5', fontStyle: 'italic', margin: 0 }}>
              “{cardConfig.innerDesire || '在表里假面之间寻找真实的自洽。'}”
            </p>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
              代号：{cardConfig.username} · 职业：{cardConfig.occupation}
            </span>
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            <span>InnerEcho · Role Card Studio</span>
            <span>STATUS: 256-BIT</span>
          </div>
        </div>
      </div>

      {/* Image Preview & Save Modal */}
      {previewModal && createPortal((
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            boxSizing: 'border-box',
          }}
          onClick={() => setPreviewModal(null)}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              background: '#120a1a',
              border: '1px solid rgba(255, 112, 166, 0.3)',
              borderRadius: 16,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                已生成 3D 实体角色卡
              </span>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '60vh', overflow: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
              <img
                src={previewModal.url}
                alt={previewModal.title}
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 10 }}
              />
            </div>

            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', margin: 0, textAlign: 'center' }}>
              💡 移动端长按上方图片可直接保存至手机相册
            </p>

            <div style={{ width: '100%', display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className="card3d-btn card3d-btn-primary"
                style={{ flex: 1, padding: '9px 12px' }}
                onClick={() => {
                  triggerDownload(previewModal.url, previewModal.title);
                  showExportToast('success', '下载已重新触发');
                }}
              >
                <Download size={14} />
                <span>再次下载文件</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '9px 16px', borderRadius: 10 }}
                onClick={() => setPreviewModal(null)}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Toast Notification */}
      {exportToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            background: exportToast.type === 'success' ? 'rgba(16, 185, 129, 0.92)' : 'rgba(239, 68, 68, 0.92)',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>{exportToast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{exportToast.text}</span>
        </div>
      )}
    </div>
  );
};
