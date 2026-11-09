import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Download } from 'lucide-react';
import { LuxuryButton } from '../ui/button';
import { RadarChart } from '../RadarChart';
import { BdsmDedicatedChart } from '../BdsmDedicatedChart';
import { MirrorResonanceFeedback, type ResonanceLevel } from '../MirrorResonanceFeedback';

interface ResultModalsProps {
  isFullscreenModal: boolean;
  onCloseFullscreen: () => void;
  previewModal: { url: string; title: string } | null;
  onClosePreviewModal: () => void;
  onReDownload: (url: string, title: string) => void;
  exportToast: { type: 'success' | 'error'; text: string } | null;
  onExport3DCard: () => void;
  isExporting3DCard: boolean;
  archetypeTitle: string;
  archetypeMotto?: string;
  personaDeconstruction?: string;
  shadowDeconstruction?: string;
  psychologicalSublimation?: string;
  hasBdsmScores: boolean;
  scoresData: Record<string, number>;
  aggregatedScores?: Record<string, number>;
  completedBankDimensions?: { name: string; key: string }[];
  accentColor: string;
  dossierId: string;
  resonanceLevel?: ResonanceLevel | null;
  resonanceText?: string | null;
}

export const ResultModals: React.FC<ResultModalsProps> = ({
  isFullscreenModal,
  onCloseFullscreen,
  previewModal,
  onClosePreviewModal,
  onReDownload,
  exportToast,
  onExport3DCard,
  isExporting3DCard,
  archetypeTitle,
  archetypeMotto,
  personaDeconstruction,
  shadowDeconstruction,
  psychologicalSublimation,
  hasBdsmScores,
  scoresData,
  aggregatedScores,
  completedBankDimensions,
  accentColor,
  dossierId,
  resonanceLevel,
  resonanceText,
}) => {
  return (
    <>
      {/* 沉浸式全屏卷宗阅读器 */}
      {isFullscreenModal &&
        createPortal(
          <div className="fixed inset-0 z-[1000] bg-[rgba(12,5,18,0.98)] backdrop-blur-[25px] flex flex-col overflow-y-auto p-2 sm:p-4 box-border animate-fade-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-2.5 sm:px-4 bg-[rgba(24,9,30,0.92)] border border-[rgba(255,112,166,0.35)] rounded-xl mb-3.5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.7)] w-full box-border">
              <div className="flex items-center gap-2">
                <Sparkles size={14} stroke={accentColor} />
                <span className="font-bold text-sm text-white">
                  深层回响 · 卷宗报告
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <LuxuryButton
                  onClick={onExport3DCard}
                  disabled={isExporting3DCard}
                  variant="glow"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg"
                >
                  <Download size={13} strokeWidth={1.75} />
                  <span>{isExporting3DCard ? '生成中...' : '保存卡片'}</span>
                </LuxuryButton>
                <LuxuryButton
                  onClick={onCloseFullscreen}
                  variant="secondary"
                  size="sm"
                  className="text-xs h-8 px-2.5 rounded-lg"
                >
                  <X size={15} strokeWidth={1.75} />
                  <span>关闭</span>
                </LuxuryButton>
              </div>
            </div>

            <div className="w-full max-w-[720px] mx-auto flex flex-col gap-4">
              <div className="text-center py-4">
                <span className="text-xs tracking-[0.15em] font-extrabold text-[#ff70a6]">
                  【深层回响 · 潜意识深度解构报告】
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 mb-1">
                  {archetypeTitle}
                </h1>
                {archetypeMotto && (
                  <p className="text-sm italic text-[var(--text-secondary)]">
                    “{archetypeMotto}”
                  </p>
                )}
              </div>

              <div className="glass-card p-4 sm:p-5 rounded-2xl border-[rgba(255,112,166,0.2)] bg-white/[0.03]">
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">✦ 表象社交人格</h3>
                <p className="text-sm text-white/85 leading-relaxed">{personaDeconstruction}</p>
              </div>

              <div className="glass-card p-4 sm:p-5 rounded-2xl border-[rgba(255,112,166,0.35)] bg-[rgba(255,112,166,0.05)]">
                <h3 className="text-sm sm:text-base font-bold text-[#ff70a6] mb-1.5">✦ 潜意识暗面渴望</h3>
                <p className="text-sm text-white/90 leading-relaxed">{shadowDeconstruction}</p>
              </div>

              <div className="flex justify-center py-2">
                {hasBdsmScores ? (
                  <BdsmDedicatedChart scores={aggregatedScores} />
                ) : (
                  <RadarChart
                    normalized={scoresData as any}
                    customAxes={completedBankDimensions}
                    scores={aggregatedScores}
                    accentColor={accentColor}
                    size={240}
                  />
                )}
              </div>

              <div className="glass-card p-4 sm:p-5 rounded-2xl border-white/10 bg-white/[0.03]">
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">✦ 心理升华与接纳指引</h3>
                <p className="text-sm text-white/85 leading-relaxed">{psychologicalSublimation}</p>
              </div>

              <div className="w-full mt-4">
                <MirrorResonanceFeedback
                  dossierId={dossierId}
                  initialLevel={resonanceLevel}
                  initialText={resonanceText}
                  accentColor={accentColor}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 图片保存与长按模态框 */}
      {previewModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 box-border animate-fade-in"
            onClick={onClosePreviewModal}
          >
            <div
              className="max-w-[420px] w-full bg-[#120a1a] border border-[rgba(255,112,166,0.3)] rounded-2xl p-4 flex flex-col items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] box-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex justify-between items-center">
                <span className="text-sm font-bold text-white">已生成自白图片</span>
                <button
                  type="button"
                  onClick={onClosePreviewModal}
                  className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-auto rounded-xl border border-white/10 w-full">
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  className="w-full h-auto block rounded-xl"
                />
              </div>

              <p className="text-xs text-white/65 m-0 text-center">
                💡 移动端长按上方图片可直接保存至手机相册
              </p>

              <div className="w-full flex gap-2 mt-1">
                <LuxuryButton
                  type="button"
                  variant="glow"
                  className="flex-1 py-2 text-xs"
                  onClick={() => onReDownload(previewModal.url, previewModal.title)}
                >
                  <Download size={14} />
                  <span>再次下载文件</span>
                </LuxuryButton>
                <LuxuryButton
                  type="button"
                  variant="secondary"
                  className="px-4 py-2 text-xs"
                  onClick={onClosePreviewModal}
                >
                  完成
                </LuxuryButton>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 轻量 Toast 浮层 */}
      {exportToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md pointer-events-none flex items-center gap-2 animate-fade-in bg-black/80 border border-[rgba(255,112,166,0.4)]">
          <span>{exportToast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{exportToast.text}</span>
        </div>
      )}
    </>
  );
};

