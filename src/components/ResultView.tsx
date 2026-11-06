import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FullDossierResult } from '../utils/calculator';
import { RadarChart } from './RadarChart';
import { BdsmDedicatedChart } from './BdsmDedicatedChart';
import { Download, Sparkles, Heart, Maximize2, X, Smartphone, Layers, Share2, Copy, Send, ChevronLeft } from 'lucide-react';
import { MirrorResonanceFeedback } from './MirrorResonanceFeedback';
import { Card3DStudioModal } from './card3d/Card3DStudioModal';
import { DualCardExportPoster } from './card3d/DualCardExportPoster';
import { DEFAULT_CARD_IMAGE } from './card3d/presetImages';
import type { Card3DConfig } from './card3d/types';
import { getOrCreateDeviceId } from '../utils/deviceId';
import '../styles/card3d.css';

interface ResultViewProps {
  result: FullDossierResult;
  onExit?: () => void;
}

// Single high-end dark luxury theme style
const THEME = {
  name: '暗夜极光',
  bg: 'linear-gradient(145deg, #180920 0%, #0a040f 60%, #1c0826 100%)',
  border: '1px solid rgba(255, 112, 166, 0.35)',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  accentColor: '#ff70a6',
  subAccent: '#c084fc',
  badgeBg: 'rgba(255, 112, 166, 0.15)',
  badgeBorder: 'rgba(255, 112, 166, 0.35)',
  titleGradient: 'linear-gradient(135deg, #ffffff 0%, #ff70a6 50%, #c084fc 100%)',
  radarColor: '#ff3377',
  canvasBg: '#0a040f',
};

export const ResultView: React.FC<ResultViewProps> = ({ result, onExit }) => {
  const dossierData = result?.dossierData || {};
  const archetype = result?.archetype || {};
  const llmAnalysis = result?.llmAnalysis || {
    archetypeTitle: '心理解构中...',
    personaDeconstruction: '心理解构计算中...',
    shadowDeconstruction: '潜意识暗面分析中...',
    psychologicalSublimation: '心理建议...',
    resonanceKeywords: [],
  };
  const behavior = result?.behavior || { filledCount: 0, totalCount: 12, opennessPercent: 50, opennessTrait: '适度防备' };
  const normalized = result?.normalized || { awareness: 50, chaos: 50, intuition: 50, structure: 50 };
  const scoresData = (dossierData?.aggregatedScores && Object.keys(dossierData.aggregatedScores).length > 0)
    ? dossierData.aggregatedScores
    : normalized;

  const chapter1 = dossierData.chapter1 || {};
  const selectedShadowTags = dossierData.selectedShadowTags || ['角色互换', '反差情绪'];

  const hasBdsmScores = !!(
    dossierData?.aggregatedScores &&
    Object.keys(dossierData.aggregatedScores).some(key =>
      ['dominance', 'submission', 'restraint', 'sensory', 'dom', 'sub', 's', 'm', 'binding', 'bondage', 'dominant', 'submissive'].includes(key.toLowerCase())
    )
  );

  const [username, setUsername] = useState('匿名倾诉者');
  const [isExportingFull, setIsExportingFull] = useState(false);
  const [isExporting3DCard, setIsExporting3DCard] = useState(false);
  const [isExportingDualCard, setIsExportingDualCard] = useState(false);
  const [isExportingWallpaper, setIsExportingWallpaper] = useState(false);
  const [isCardStudioOpen, setIsCardStudioOpen] = useState(false);
  const [exportToast, setExportToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewModal, setPreviewModal] = useState<{ url: string; title: string } | null>(null);
  
  const wallpaperCaptureRef = useRef<HTMLDivElement | null>(null);
  const card3dExportRef = useRef<HTMLDivElement | null>(null);
  const dualCardCaptureRef = useRef<HTMLDivElement | null>(null);
  const fullscreenCaptureRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);

  const showExportToast = (type: 'success' | 'error', text: string) => {
    setExportToast({ type, text });
    setTimeout(() => setExportToast(null), 3500);
  };

  const shareTitle = llmAnalysis.archetypeTitle || archetype.name || '暗光解构者';
  const shareMotto = llmAnalysis.archetypeSubtitle || archetype.motto || '';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?src=share`
    : '';
  const shareText = `我在《深层回响》测出了我的灵魂原型：【${shareTitle}】\n“${shareMotto}”\n来看看你未曾揭露的暗面与人设反差：`;

  const handleShareTwitter = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showExportToast('success', '自白契约与分享链接已复制到剪贴板！');
    } catch {
      showExportToast('error', '复制失败，请手动复制浏览器地址栏');
    }
  };

  useEffect(() => {
    if (!isFullscreenModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreenModal]);

  // Extract concise assessment words for the stamp center text
  const defaultStampWord = (
    llmAnalysis.archetypeTitle?.replace(/者$|型$/g, '') ||
    (llmAnalysis.resonanceKeywords && llmAnalysis.resonanceKeywords[0]) ||
    archetype.name?.replace(/者$|型$/g, '') ||
    '潜意识封存'
  ).slice(0, 6);

  // Extract completed bank dimensions (if available) for dynamic dimensional mapping
  const completedBank = dossierData.completedBanks?.[0];
  const customDimensions = completedBank?.dimensions && completedBank.dimensions.length > 0
    ? completedBank.dimensions.map((dim: any) => ({
        key: dim.key,
        name: dim.name,
        value: typeof dossierData?.aggregatedScores?.[dim.key] === 'number'
          ? Math.round(dossierData.aggregatedScores[dim.key])
          : 50,
      }))
    : undefined;

  const userUploadedPhotos = chapter1.avatarUrls && chapter1.avatarUrls.length > 0
    ? chapter1.avatarUrls
    : (chapter1.avatarUrl ? [chapter1.avatarUrl] : []);

  // 3D Card Studio State
  const [cardConfig, setCardConfig] = useState<Card3DConfig>({
    title: llmAnalysis.archetypeTitle || archetype.name || '暗光解构者',
    subtitle: llmAnalysis.archetypeSubtitle || archetype.motto || '潜意识深度解构',
    username: username,
    // 未登记就是未登记：不拿"自由职业"这类写死属性冒充用户真实录入。
    occupation: chapter1.occupation || '未登记',
    personaTrait: chapter1.personaTrait || '未登记',
    surfaceTrait: chapter1.surfaceTrait,
    innerDesire: chapter1.innerDesire,
    dominanceIndex: llmAnalysis.dominanceIndex ?? 50,
    submissionIndex: llmAnalysis.submissionIndex ?? 50,
    restraintIndex: llmAnalysis.restraintIndex ?? 50,
    sensoryThreshold: llmAnalysis.sensoryThreshold ?? 50,
    customDimensions,
    opennessPercent: behavior.opennessPercent ?? 50,
    opennessTrait: behavior.opennessTrait ?? '适度防备',
    dossierId: result?.dossierId || (dossierData as any)?.id || 'ECHO-8260492',
    imageUrl: userUploadedPhotos[0] || DEFAULT_CARD_IMAGE,
    imageScale: 1.0,
    imageX: 0,
    imageY: 0,
    imageFilter: 'none',
    backImageUrl: userUploadedPhotos[1] || userUploadedPhotos[0] || DEFAULT_CARD_IMAGE,
    backImageScale: 1.1,
    backImageX: 0,
    backImageY: 0,
    backImageFilter: 'noir',
    holographic: true,
    isFlipped: false,
    contentMode: 'dimensions',
    stampType: 'ink-circle',
    stampTextTop: '深层回响 · 绝密卷宗',
    stampTextBottom: 'SUB-CONSCIOUS ARCHIVE',
    stampTextCenter: defaultStampWord,
    stampColor: '#8a1515',
    stampClarity: 'medium',
    stampX: 74,
    stampY: 62,
    stampRotation: 345,
    stampScale: 1.05,
    accentColor: THEME.accentColor,
  });

  // 用户名变化时同步到 3D 卡配置（防止初始化快照过期）
  useEffect(() => {
    setCardConfig(prev => (prev.username === username ? prev : { ...prev, username }));
  }, [username]);

  const handleResetToDefault = () => {
    setCardConfig(prev => ({
      ...prev,
      imageUrl: userUploadedPhotos[0] || DEFAULT_CARD_IMAGE,
      backImageUrl: userUploadedPhotos[1] || userUploadedPhotos[0] || DEFAULT_CARD_IMAGE,
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

  // Pure client-side download: data URL → typed Blob → ObjectURL → <a download>
  const triggerDownload = async (dataUrl: string, filename: string) => {
    try {
      // fetch(dataUrl) correctly converts a data:image/png;base64,... to a typed Blob
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
      // Last-resort fallback: direct data URL (may truncate filename in some browsers)
      const a = document.createElement('a');
      a.download = filename;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 200);
    }
  };

  // Export 3D Collectible Card PNG
  const handleExport3DCard = async () => {
    if (!card3dExportRef.current) return;
    setIsExporting3DCard(true);

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

      const cleanOcc = (cardConfig.occupation || '匿名').replace(/[\\/:*?"<>|]/g, '_');
      const cleanTitle = (cardConfig.title || '暗光解构者').replace(/[\\/:*?"<>|]/g, '_');
      const filename = `深层回响_自白卡_${cleanOcc}_${cleanTitle}.png`;

      triggerDownload(dataUrl, filename);
      setPreviewModal({ url: dataUrl, title: filename });
      showExportToast('success', '自白卡片已保存');
      // 轻量埋点：记录「导出角色卡」行为，供管理端统计分享裂变转化（失败不影响主流程）。
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
            ...(result?.dossierId ? { dossierId: result.dossierId } : {}),
          }),
        }).catch(() => {});
      } catch {
        // 埋点静默失败
      }
    } catch (err) {
      console.error('3D Card export failed:', err);
      showExportToast('error', '卡片生成失败，请稍后重试');
    } finally {
      setIsExporting3DCard(false);
    }
  };

  // Export Double-Sided Collector Dual Card (16:9 Poster)
  const handleExportDualCard = async () => {
    if (!dualCardCaptureRef.current) return;
    setIsExportingDualCard(true);

    try {
      const { toPng } = await import('html-to-image');
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(dualCardCaptureRef.current, {
        backgroundColor: '#09030e',
        pixelRatio: 2.0,
        cacheBust: false,
      });
      if (!dataUrl) throw new Error('双面卡生成结果为空');

      const cleanOcc = (cardConfig.occupation || '匿名').replace(/[\\/:*?"<>|]/g, '_');
      const cleanTitle = (cardConfig.title || '暗光解构者').replace(/[\\/:*?"<>|]/g, '_');
      const filename = `深层回响_表里双面自白卡_${cleanOcc}_${cleanTitle}.png`;

      triggerDownload(dataUrl, filename);
      setPreviewModal({ url: dataUrl, title: filename });
      showExportToast('success', '表里双面典藏卡已保存');
    } catch (err) {
      console.error('Dual Card export failed:', err);
      showExportToast('error', '双面卡生成失败，请稍后重试');
    } finally {
      setIsExportingDualCard(false);
    }
  };

  // Export Full Report Long Image
  const handleExportFullReport = async () => {
    if (!fullscreenCaptureRef.current) return;
    setIsExportingFull(true);

    try {
      const { toPng } = await import('html-to-image');
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(fullscreenCaptureRef.current, {
        backgroundColor: THEME.canvasBg,
        pixelRatio: 2.0,
        cacheBust: false,
      });
      if (!dataUrl) throw new Error('海报渲染结果为空');

      const cleanOcc = (chapter1.occupation || '匿名').replace(/[\\/:*?"<>|]/g, '_');
      const filename = `深层回响_自白卷宗_${cleanOcc}_${THEME.name}.png`;

      triggerDownload(dataUrl, filename);
      setPreviewModal({ url: dataUrl, title: filename });
      showExportToast('success', '自白长图已保存');
    } catch (err) {
      console.error('Full poster render failed:', err);
      showExportToast('error', '海报生成失败，请稍后重试');
    } finally {
      setIsExportingFull(false);
    }
  };

  // Export Wallpaper
  const handleExportWallpaper = async () => {
    if (!wallpaperCaptureRef.current) return;
    setIsExportingWallpaper(true);

    try {
      const { toPng } = await import('html-to-image');
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(wallpaperCaptureRef.current, {
        backgroundColor: THEME.canvasBg,
        pixelRatio: 3.0,
        cacheBust: false,
      });
      if (!dataUrl) throw new Error('壁纸渲染结果为空');

      const cleanOcc = (chapter1.occupation || '匿名').replace(/[\\/:*?"<>|]/g, '_');
      const filename = `深层回响_自白壁纸_${cleanOcc}_${THEME.name}.png`;

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
        padding: '0.8rem 0.5rem 3rem 0.5rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Top Action Header Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          <span className="icon-badge">
            <Sparkles size={13} strokeWidth={1.5} stroke={THEME.accentColor} className="animate-icon-pulse" />
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            深层回响 · 深度自白诊断卷宗
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {onExit && (
            <button
              onClick={onExit}
              className="btn-secondary"
              style={{ fontSize: '0.76rem', padding: '0.36rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', borderRadius: 10 }}
            >
              <ChevronLeft size={13} />
              <span>返回主页</span>
            </button>
          )}
          <button
            onClick={() => setIsCardStudioOpen(true)}
            className="btn-glow"
            style={{ fontSize: '0.76rem', padding: '0.36rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', borderRadius: 10 }}
          >
            <Layers size={13} />
            <span>3D 实体卡工坊</span>
          </button>
          <button
            onClick={handleExportFullReport}
            disabled={isExportingFull}
            className="btn-secondary"
            style={{ fontSize: '0.76rem', padding: '0.36rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', borderRadius: 10 }}
          >
            <Download size={13} strokeWidth={1.75} />
            <span>{isExportingFull ? '生成中...' : '保存长图'}</span>
          </button>
          <button
            onClick={() => setIsFullscreenModal(true)}
            className="btn-secondary"
            style={{ fontSize: '0.76rem', padding: '0.36rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', borderRadius: 10 }}
          >
            <Maximize2 size={13} strokeWidth={1.75} stroke={THEME.accentColor} />
            <span>全屏阅读</span>
          </button>
        </div>
      </div>

      {/* Social Sharing Ribbon */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '640px',
          padding: '0.45rem 0.85rem',
          borderRadius: 14,
          marginBottom: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          flexWrap: 'wrap',
          gap: '0.4rem',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          <Share2 size={12} color="#ff70a6" />
          <span>契约自白分享：</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={handleShareTwitter}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              padding: '0.22rem 0.55rem',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title="分享到 X (Twitter)"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>X 分享</span>
          </button>

          <button
            type="button"
            onClick={handleShareTelegram}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'rgba(36, 161, 222, 0.12)',
              border: '1px solid rgba(36, 161, 222, 0.35)',
              borderRadius: 8,
              padding: '0.22rem 0.55rem',
              color: '#64d2ff',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title="分享到 Telegram"
          >
            <Send size={11} />
            <span>TG 分享</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'rgba(255, 112, 166, 0.1)',
              border: '1px solid rgba(255, 112, 166, 0.3)',
              borderRadius: 8,
              padding: '0.22rem 0.55rem',
              color: '#ff70a6',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title="复制自白链接"
          >
            <Copy size={11} />
            <span>复制契约</span>
          </button>
        </div>
      </div>

      {/* ================= MOBILE-FIRST READING REPORT (DOSSIER-FIRST) ================= */}
      <article
        className="result-mobile-report"
        style={{ '--result-accent': THEME.accentColor } as React.CSSProperties}
      >
        <header className="result-mobile-hero">
          <div className="result-mobile-kicker">
            <Sparkles size={14} strokeWidth={1.6} />
            <span>潜意识深度解构报告 · 卷宗 ID: {cardConfig.dossierId}</span>
          </div>

          <h1>{llmAnalysis.archetypeTitle || archetype.name || '暗光解构者'}</h1>
          <p className="result-mobile-subtitle">
            {llmAnalysis.archetypeSubtitle || archetype.motto}
          </p>

          <div className="result-mobile-tags">
            {selectedShadowTags.map((tag: string, index: number) => (
              <span key={index} className="result-mobile-tag">
                {tag}
              </span>
            ))}
          </div>

          {/* 3D 实体卡全息展台卡片 (点击打开 3D 定制工坊) */}
          <div
            className="glass-card"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.12) 0%, rgba(192, 132, 252, 0.08) 50%, rgba(16, 8, 22, 0.85) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              margin: '1rem 0 0.5rem 0',
              boxSizing: 'border-box',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #aa26da, #ff70a6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 14px rgba(255, 112, 166, 0.4)',
                  flexShrink: 0,
                }}
              >
                <Layers size={18} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  3D 实体绝密自白角色卡
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  全息质感 · 自由翻转 · 保存手机壁纸
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCardStudioOpen(true)}
              className="btn-glow"
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '0.4rem 0.8rem',
                borderRadius: 10,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>展开 3D 工坊</span>
              <Sparkles size={12} />
            </button>
          </div>
        </header>

        {/* 五维潜意识心相雷达图 (首屏直接呈现) */}
        <section className="result-mobile-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="result-mobile-card-title" style={{ alignSelf: 'flex-start' }}>
            <Sparkles size={15} strokeWidth={1.7} />
            <h2>五维潜意识心相图谱</h2>
          </div>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            {hasBdsmScores ? (
              <BdsmDedicatedChart scores={dossierData?.aggregatedScores} />
            ) : (
              <RadarChart
                normalized={scoresData as any}
                customAxes={completedBank?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
                scores={dossierData?.aggregatedScores}
                accentColor={THEME.accentColor}
                size={230}
              />
            )}
          </div>
        </section>

        <section className="result-mobile-card">
          <div className="result-mobile-card-title">
            <Sparkles size={15} strokeWidth={1.7} />
            <h2>表象社交人格</h2>
          </div>
          <p>{llmAnalysis.personaDeconstruction || archetype.personaAnalysis}</p>
        </section>

        <section className="result-mobile-card result-mobile-card-highlight">
          <div className="result-mobile-card-title">
            <Heart size={15} strokeWidth={1.7} />
            <h2>潜意识暗面与隐秘渴望</h2>
          </div>
          <p>{llmAnalysis.shadowDeconstruction || archetype.shadowAnalysis}</p>
        </section>

        <section className="result-mobile-card">
          <div className="result-mobile-card-title">
            <Sparkles size={15} strokeWidth={1.7} />
            <h2>心理升华与接纳指引</h2>
          </div>
          <p>{llmAnalysis.psychologicalSublimation || archetype.healingAdvice}</p>
        </section>
      </article>

      {/* 🪞 镜像共鸣印记与暗面心声 */}
      <div style={{ width: '100%', maxWidth: '640px', marginTop: '1.5rem' }}>
        <MirrorResonanceFeedback
          dossierId={result?.dossierId || (dossierData as any)?.id}
          initialLevel={result?.resonanceLevel}
          initialText={result?.resonanceText}
          accentColor={THEME.accentColor}
        />
      </div>

      {/* 3D 实体卡定制工坊 Modal */}
      <Card3DStudioModal
        isOpen={isCardStudioOpen}
        onClose={() => setIsCardStudioOpen(false)}
        config={cardConfig}
        onChange={setCardConfig}
        onExportCard={handleExport3DCard}
        onExportDualCard={handleExportDualCard}
        onExportWallpaper={handleExportWallpaper}
        isExportingCard={isExporting3DCard}
        isExportingDualCard={isExportingDualCard}
        isExportingWallpaper={isExportingWallpaper}
        exportRef={card3dExportRef}
        availablePhotos={userUploadedPhotos}
        onResetToDefault={handleResetToDefault}
      />

      {/* 导出捕获层：供 html-to-image 生成表里双面对开典藏卡 */}
      <DualCardExportPoster config={cardConfig} exportRef={dualCardCaptureRef} />

      {/* 导出捕获层：供 html-to-image 生成全屏长图 */}
      <div
        ref={fullscreenCaptureRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 720,
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: THEME.canvasBg,
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: THEME.accentColor, letterSpacing: '0.15em', fontWeight: 800 }}>
              【深层回响 · 潜意识深度解构报告】
            </span>
            <h1 style={{ fontSize: '2.4rem', color: '#fff', margin: '0.6rem 0 0.2rem 0', fontWeight: 900 }}>
              {llmAnalysis.archetypeTitle || archetype.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              “{archetype.motto}”
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.2rem', borderRadius: 14, border: '1px solid rgba(255, 112, 166, 0.2)' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.4rem' }}>✦ 表象社交人格</h3>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', lineHeight: 1.6 }}>{llmAnalysis.personaDeconstruction}</p>
          </div>

          <div style={{ background: 'rgba(255, 112, 166, 0.05)', padding: '1.2rem', borderRadius: 14, border: '1px solid rgba(255, 112, 166, 0.35)' }}>
            <h3 style={{ color: THEME.accentColor, fontSize: '1rem', marginBottom: '0.4rem' }}>✦ 潜意识暗面渴望</h3>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem', lineHeight: 1.6 }}>{llmAnalysis.shadowDeconstruction}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {hasBdsmScores ? (
              <BdsmDedicatedChart scores={dossierData?.aggregatedScores} />
            ) : (
              <RadarChart
                normalized={scoresData as any}
                customAxes={completedBank?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
                scores={dossierData?.aggregatedScores}
                accentColor={THEME.accentColor}
                size={220}
              />
            )}
          </div>
        </div>
      </div>

      {/* Off-screen Wallpaper Capture */}
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
            background: THEME.bg,
            border: THEME.border,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: '"Outfit", sans-serif',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: THEME.accentColor, letterSpacing: '0.15em', fontWeight: 800 }}>
              【深层回响 · 绝密卷宗】
            </span>
            <h1 style={{ fontSize: '2.2rem', color: '#fff', margin: '0.8rem 0 0.3rem 0', fontWeight: 900 }}>
              {llmAnalysis.archetypeTitle || archetype.name || '暗光解构者'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              “{archetype.motto}”
            </p>
          </div>

          <div style={{ width: 220, height: 220, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {hasBdsmScores ? (
              <BdsmDedicatedChart scores={dossierData?.aggregatedScores} variant="simple" />
            ) : (
              <RadarChart
                normalized={scoresData as any}
                customAxes={completedBank?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
                scores={dossierData?.aggregatedScores}
                accentColor={THEME.accentColor}
                size={200}
              />
            )}
          </div>

          <div style={{ width: '100%', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: 12, border: `1px solid ${THEME.accentColor}30`, textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: '#fff0f5', fontStyle: 'italic', margin: 0 }}>
              “{chapter1.innerDesire || '留白防线'}”
            </p>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
              代号：{username} · 职业：{chapter1.occupation}
            </span>
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            <span>InnerEcho · Shadow Archive</span>
            <span>STATUS: 256-BIT</span>
          </div>
        </div>
      </div>

      {/* Full-Screen Modal Overlay */}
      {isFullscreenModal && createPortal((
        <div
          className="result-fullscreen-overlay animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(12, 5, 18, 0.98)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 'clamp(0.4rem, 2vw, 1rem)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 1rem',
              background: 'rgba(24, 9, 30, 0.92)',
              border: `1px solid ${THEME.accentColor}40`,
              borderRadius: 14,
              marginBottom: '0.85rem',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={13} stroke={THEME.accentColor} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                深层回响 · 卷宗报告
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={handleExport3DCard}
                disabled={isExporting3DCard}
                className="btn-glow"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', background: 'linear-gradient(90deg, #aa26da 0%, #ff70a6 100%)' }}
              >
                <Download size={13} strokeWidth={1.75} />
                <span>{isExporting3DCard ? '生成中...' : '保存卡片'}</span>
              </button>
              <button
                onClick={onExit || (() => setIsFullscreenModal(false))}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.7rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <X size={15} strokeWidth={1.75} />
                <span>关闭</span>
              </button>
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <span style={{ fontSize: '0.8rem', color: THEME.accentColor, letterSpacing: '0.15em', fontWeight: 800 }}>
                【深层回响 · 潜意识深度解构报告】
              </span>
              <h1 style={{ fontSize: '2rem', color: '#fff', margin: '0.6rem 0 0.2rem 0', fontWeight: 900 }}>
                {llmAnalysis.archetypeTitle || archetype.name}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                “{archetype.motto}”
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.2rem', borderRadius: 14, border: '1px solid rgba(255, 112, 166, 0.2)' }}>
              <h3 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.4rem' }}>✦ 表象社交人格</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.6 }}>{llmAnalysis.personaDeconstruction}</p>
            </div>

            <div style={{ background: 'rgba(255, 112, 166, 0.05)', padding: '1.2rem', borderRadius: 14, border: '1px solid rgba(255, 112, 166, 0.35)' }}>
              <h3 style={{ color: THEME.accentColor, fontSize: '0.95rem', marginBottom: '0.4rem' }}>✦ 潜意识暗面渴望</h3>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', lineHeight: 1.6 }}>{llmAnalysis.shadowDeconstruction}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {hasBdsmScores ? (
                <BdsmDedicatedChart scores={dossierData?.aggregatedScores} />
              ) : (
                <RadarChart
                  normalized={scoresData as any}
                  customAxes={completedBank?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
                  scores={dossierData?.aggregatedScores}
                  accentColor={THEME.accentColor}
                  size={240}
                />
              )}
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.2rem', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h3 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.4rem' }}>✦ 心理升华与接纳指引</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.6 }}>{llmAnalysis.psychologicalSublimation || archetype.healingAdvice}</p>
            </div>

            <div style={{ width: '100%', marginTop: '1rem' }}>
              <MirrorResonanceFeedback
                dossierId={result?.dossierId || (dossierData as any)?.id}
                initialLevel={result?.resonanceLevel}
                initialText={result?.resonanceText}
                accentColor={THEME.accentColor}
              />
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Image Preview & Save Modal (Dual support for Mobile Long-press and Desktop direct save) */}
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
                已生成自白图片
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
