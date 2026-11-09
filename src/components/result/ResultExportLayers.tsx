import React from 'react';
import { DualCardExportPoster } from '../card3d/DualCardExportPoster';
import { RadarChart } from '../RadarChart';
import { BdsmDedicatedChart } from '../BdsmDedicatedChart';
import type { Card3DConfig } from '../card3d/types';

interface ResultExportLayersProps {
  cardConfig: Card3DConfig;
  dualCardCaptureRef: React.RefObject<HTMLDivElement | null>;
  fullscreenCaptureRef: React.RefObject<HTMLDivElement | null>;
  wallpaperCaptureRef: React.RefObject<HTMLDivElement | null>;
  theme: {
    bg: string;
    border: string;
    accentColor: string;
    canvasBg: string;
  };
  archetypeTitle: string;
  archetypeMotto?: string;
  personaDeconstruction?: string;
  shadowDeconstruction?: string;
  hasBdsmScores: boolean;
  scoresData: Record<string, number>;
  aggregatedScores?: Record<string, number>;
  completedBankDimensions?: { name: string; key: string }[];
  chapter1: {
    occupation?: string;
    innerDesire?: string;
  };
  username: string;
}

export const ResultExportLayers: React.FC<ResultExportLayersProps> = ({
  cardConfig,
  dualCardCaptureRef,
  fullscreenCaptureRef,
  wallpaperCaptureRef,
  theme,
  archetypeTitle,
  archetypeMotto,
  personaDeconstruction,
  shadowDeconstruction,
  hasBdsmScores,
  scoresData,
  aggregatedScores,
  completedBankDimensions,
  chapter1,
  username,
}) => {
  return (
    <>
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
          background: theme.canvasBg,
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: theme.accentColor, letterSpacing: '0.15em', fontWeight: 800 }}>
              【深层回响 · 潜意识深度解构报告】
            </span>
            <h1 style={{ fontSize: '2.4rem', color: '#fff', margin: '0.6rem 0 0.2rem 0', fontWeight: 900 }}>
              {archetypeTitle}
            </h1>
            {archetypeMotto && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                “{archetypeMotto}”
              </p>
            )}
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.2rem', borderRadius: 14, border: '1px solid rgba(255, 112, 166, 0.2)' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.4rem' }}>✦ 表象社交人格</h3>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', lineHeight: 1.6 }}>{personaDeconstruction}</p>
          </div>

          <div style={{ background: 'rgba(255, 112, 166, 0.05)', padding: '1.2rem', borderRadius: 14, border: '1px solid rgba(255, 112, 166, 0.35)' }}>
            <h3 style={{ color: theme.accentColor, fontSize: '1rem', marginBottom: '0.4rem' }}>✦ 潜意识暗面渴望</h3>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem', lineHeight: 1.6 }}>{shadowDeconstruction}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {hasBdsmScores ? (
              <BdsmDedicatedChart scores={aggregatedScores} />
            ) : (
              <RadarChart
                normalized={scoresData as any}
                customAxes={completedBankDimensions}
                scores={aggregatedScores}
                accentColor={theme.accentColor}
                size={220}
              />
            )}
          </div>
        </div>
      </div>

      {/* 离屏壁纸捕获层 */}
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
            background: theme.bg,
            border: theme.border,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: '"Outfit", sans-serif',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: theme.accentColor, letterSpacing: '0.15em', fontWeight: 800 }}>
              【深层回响 · 绝密卷宗】
            </span>
            <h1 style={{ fontSize: '2.2rem', color: '#fff', margin: '0.8rem 0 0.3rem 0', fontWeight: 900 }}>
              {archetypeTitle}
            </h1>
            {archetypeMotto && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                “{archetypeMotto}”
              </p>
            )}
          </div>

          <div style={{ width: 220, height: 220, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {hasBdsmScores ? (
              <BdsmDedicatedChart scores={aggregatedScores} variant="simple" />
            ) : (
              <RadarChart
                normalized={scoresData as any}
                customAxes={completedBankDimensions}
                scores={aggregatedScores}
                accentColor={theme.accentColor}
                size={200}
              />
            )}
          </div>

          <div style={{ width: '100%', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: 12, border: `1px solid ${theme.accentColor}30`, textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: '#fff0f5', fontStyle: 'italic', margin: 0 }}>
              “{chapter1.innerDesire || '留白防线'}”
            </p>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
              代号：{username} · 职业：{chapter1.occupation || '未登记'}
            </span>
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            <span>InnerEcho · Shadow Archive</span>
            <span>STATUS: 256-BIT</span>
          </div>
        </div>
      </div>
    </>
  );
};

