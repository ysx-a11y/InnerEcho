import React, { useEffect, useState, useRef } from 'react';
import type { FullDossierResult } from '../utils/calculator';
import { Card3DStudioModal } from './card3d/Card3DStudioModal';
import { DEFAULT_CARD_IMAGE } from './card3d/presetImages';
import type { Card3DConfig } from './card3d/types';
import { getOrCreateDeviceId } from '../utils/deviceId';
import '../styles/card3d.css';

// 子模块拆解组件
import { ResultActionHeader } from './result/ResultActionHeader';
import { ResultSocialShare } from './result/ResultSocialShare';
import { ResultDeconstructionSection } from './result/ResultDeconstructionSection';
import { ResultExportLayers } from './result/ResultExportLayers';
import { ResultModals } from './result/ResultModals';

interface ResultViewProps {
  result: FullDossierResult;
  onExit?: () => void;
}

// 暗夜极光高奢品牌主题
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

  // 长图/海报上的「代号」必须来自用户本人在第一章填写的昵称，不得硬编码。
  const username = ((chapter1.nickname || '') as string).trim() || '匿名倾诉者';
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
  const shareText = `我在《镜界自白》测出了我的灵魂原型：【${shareTitle}】\n“${shareMotto}”\n来看看你未曾揭露的暗面与人设反差：`;

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

  const defaultStampWord = (
    llmAnalysis.archetypeTitle?.replace(/者$|型$/g, '') ||
    (llmAnalysis.resonanceKeywords && llmAnalysis.resonanceKeywords[0]) ||
    archetype.name?.replace(/者$|型$/g, '') ||
    '潜意识封存'
  ).slice(0, 6);

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

  const [cardConfig, setCardConfig] = useState<Card3DConfig>({
    title: llmAnalysis.archetypeTitle || archetype.name || '暗光解构者',
    subtitle: llmAnalysis.archetypeSubtitle || archetype.motto || '潜意识深度解构',
    username: username,
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
    stampTextTop: '镜界自白 · 绝密卷宗',
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
      const filename = `镜界自白_自白卡_${cleanOcc}_${cleanTitle}.png`;

      triggerDownload(dataUrl, filename);
      setPreviewModal({ url: dataUrl, title: filename });
      showExportToast('success', '自白卡片已保存');
      
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
      const filename = `镜界自白_表里双面自白卡_${cleanOcc}_${cleanTitle}.png`;

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
      const filename = `镜界自白_自白卷宗_${cleanOcc}_${THEME.name}.png`;

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
      const filename = `镜界自白_自白壁纸_${cleanOcc}_${THEME.name}.png`;

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
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-start px-2 py-3 pb-12 box-border">
      {/* 顶部操作导航栏 */}
      <ResultActionHeader
        onExit={onExit}
        onOpenCardStudio={() => setIsCardStudioOpen(true)}
        onExportFullReport={handleExportFullReport}
        isExportingFull={isExportingFull}
        onOpenFullscreen={() => setIsFullscreenModal(true)}
        accentColor={THEME.accentColor}
      />

      {/* 契约分享条 */}
      <ResultSocialShare
        onShareTwitter={handleShareTwitter}
        onShareTelegram={handleShareTelegram}
        onCopyLink={handleCopyLink}
      />

      {/* 深度解构移动端卷宗主体 */}
      <ResultDeconstructionSection
        dossierId={cardConfig.dossierId}
        archetypeTitle={llmAnalysis.archetypeTitle || archetype.name || '暗光解构者'}
        archetypeSubtitle={llmAnalysis.archetypeSubtitle || archetype.motto}
        selectedShadowTags={selectedShadowTags}
        personaDeconstruction={llmAnalysis.personaDeconstruction || archetype.personaAnalysis}
        shadowDeconstruction={llmAnalysis.shadowDeconstruction || archetype.shadowAnalysis}
        psychologicalSublimation={llmAnalysis.psychologicalSublimation || archetype.healingAdvice}
        hasBdsmScores={hasBdsmScores}
        scoresData={scoresData as Record<string, number>}
        aggregatedScores={dossierData?.aggregatedScores}
        completedBankDimensions={completedBank?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
        accentColor={THEME.accentColor}
        resonanceLevel={result?.resonanceLevel}
        resonanceText={result?.resonanceText}
        onOpenCardStudio={() => setIsCardStudioOpen(true)}
      />

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

      {/* 离屏图片导出捕获图层 */}
      <ResultExportLayers
        cardConfig={cardConfig}
        dualCardCaptureRef={dualCardCaptureRef}
        fullscreenCaptureRef={fullscreenCaptureRef}
        wallpaperCaptureRef={wallpaperCaptureRef}
        theme={THEME}
        archetypeTitle={llmAnalysis.archetypeTitle || archetype.name || '暗光解构者'}
        archetypeMotto={archetype.motto}
        personaDeconstruction={llmAnalysis.personaDeconstruction}
        shadowDeconstruction={llmAnalysis.shadowDeconstruction}
        hasBdsmScores={hasBdsmScores}
        scoresData={scoresData as Record<string, number>}
        aggregatedScores={dossierData?.aggregatedScores}
        completedBankDimensions={completedBank?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
        chapter1={chapter1}
        username={username}
      />

      {/* 全屏阅读模态框与保存提示 */}
      <ResultModals
        isFullscreenModal={isFullscreenModal}
        onCloseFullscreen={() => setIsFullscreenModal(false)}
        previewModal={previewModal}
        onClosePreviewModal={() => setPreviewModal(null)}
        onReDownload={triggerDownload}
        exportToast={exportToast}
        onExport3DCard={handleExport3DCard}
        isExporting3DCard={isExporting3DCard}
        archetypeTitle={llmAnalysis.archetypeTitle || archetype.name || '暗光解构者'}
        archetypeMotto={archetype.motto}
        personaDeconstruction={llmAnalysis.personaDeconstruction}
        shadowDeconstruction={llmAnalysis.shadowDeconstruction}
        psychologicalSublimation={llmAnalysis.psychologicalSublimation || archetype.healingAdvice}
        hasBdsmScores={hasBdsmScores}
        scoresData={scoresData as Record<string, number>}
        aggregatedScores={dossierData?.aggregatedScores}
        completedBankDimensions={completedBank?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
        accentColor={THEME.accentColor}
        dossierId={cardConfig.dossierId}
        resonanceLevel={result?.resonanceLevel}
        resonanceText={result?.resonanceText}
      />
    </div>
  );
};

export default ResultView;
