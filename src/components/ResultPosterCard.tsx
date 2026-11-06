import React from 'react';
import { Compass, Edit3, ShieldCheck } from 'lucide-react';
import { RadarChart } from './RadarChart';
import { BdsmDedicatedChart } from './BdsmDedicatedChart';
import { GenericDimensionMatrix } from './GenericDimensionMatrix';
import { PsychologyArchetype } from '../data/psychologyArchetypes';
import { LlmAnalysisJson } from '../utils/calculator';
import { FullDossierData, ChapterOneData } from '../data/chapterStructure';

export interface ThemeConfig {
  id: string;
  name: string;
  bg: string;
  border: string;
  cardBg: string;
  accentColor: string;
  subAccent: string;
  badgeBg: string;
  badgeBorder: string;
  titleGradient: string;
  radarColor: string;
  canvasBg: string;
}

export interface BehaviorInfo {
  filledCount: number;
  totalCount: number;
  opennessPercent: number;
  opennessTrait: string;
}

interface ResultPosterCardProps {
  currentThemeConfig: ThemeConfig;
  activeTheme: string;
  archetype: PsychologyArchetype;
  llmAnalysis: LlmAnalysisJson;
  behavior: BehaviorInfo;
  scoresData: Record<string, number>;
  dossierData: FullDossierData;
  chapter1: ChapterOneData;
  selectedShadowTags: string[];
  hasBdsmScores: boolean;
  username: string;
  isEditing: boolean;
  onEditUsername: (val: boolean) => void;
  onUsernameChange: (val: string) => void;
}

export const ResultPosterCard: React.FC<ResultPosterCardProps> = ({
  currentThemeConfig,
  activeTheme,
  archetype,
  llmAnalysis,
  behavior,
  scoresData,
  dossierData,
  chapter1,
  selectedShadowTags,
  hasBdsmScores,
  username,
  isEditing,
  onEditUsername,
  onUsernameChange,
}) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* ==================== 1. CARD FRONT PANEL (The Printable Confessional Poster) ==================== */}
      <div
        className="result-poster-card glass-card"
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: 'clamp(1.2rem, 4vw, 2.2rem) clamp(0.75rem, 3vw, 1.6rem)',
            background: currentThemeConfig.bg,
            border: currentThemeConfig.border,
            boxShadow: `0 24px 50px rgba(0,0,0,0.7)`,
            borderRadius: 20,
            position: 'relative',
            overflow: 'hidden',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {/* Subtle Blueprint Grid Pattern */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none', transform: 'translateZ(0px)' }} aria-hidden="true">
            <pattern id={`blueprint-grid-${activeTheme}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={currentThemeConfig.accentColor} strokeWidth="0.75" />
            </pattern>
            <rect width="100%" height="100%" fill={`url(#blueprint-grid-${activeTheme})`} />
          </svg>

          {/* Retro-futurism Classified Corners */}
          <div style={{ position: 'absolute', top: 16, left: 16, width: 16, height: 16, borderTop: `2px solid ${currentThemeConfig.accentColor}`, borderLeft: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />
          <div style={{ position: 'absolute', top: 16, right: 16, width: 16, height: 16, borderTop: `2px solid ${currentThemeConfig.accentColor}`, borderRight: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, width: 16, height: 16, borderBottom: `2px solid ${currentThemeConfig.accentColor}`, borderLeft: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />
          <div style={{ position: 'absolute', bottom: 16, right: 16, width: 16, height: 16, borderBottom: `2px solid ${currentThemeConfig.accentColor}`, borderRight: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />

          {/* Glow Ambient Blob */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: 350,
              height: 350,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${archetype.glowColor || 'rgba(255, 112, 166, 0.35)'} 0%, transparent 70%)`,
              pointerEvents: 'none',
              transform: 'translateZ(-5px)',
            }}
          />


          {/* Decorative Stamp Badge */}
          <div
            style={{
              position: 'absolute',
              top: 15,
              right: 15,
              transform: 'rotate(-10deg) translateZ(30px)',
              border: '2px double rgba(255, 112, 166, 0.5)',
              borderRadius: 8,
              padding: '0.15rem 0.5rem',
              color: '#ff70a6',
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              background: 'rgba(255, 51, 119, 0.08)',
              pointerEvents: 'none',
              zIndex: 2,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            【绝密自白卷宗】
          </div>

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 105, 180, 0.16)',
              paddingBottom: '0.9rem',
              marginBottom: '1.4rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
              width: '100%',
              boxSizing: 'border-box',
              transform: 'translateZ(30px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <span className="icon-badge" style={{ width: 34, height: 34, border: `1px solid ${archetype.accentColor || '#ff70a6'}40`, background: 'rgba(255, 255, 255, 0.03)' }}>
                <Compass size={18} strokeWidth={1.5} stroke={archetype.accentColor || '#ff70a6'} style={{ flexShrink: 0 }} />
              </span>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 800, letterSpacing: '0.04em', fontSize: '0.98rem', color: '#ffffff', textShadow: `0 0 10px ${currentThemeConfig.accentColor}50`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  镜界自白 · Shadow Archives
                </span>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>镜界自白 · 潜意识与多维倾向剖析报告</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 3, flexShrink: 0 }}>
              {isEditing ? (
                <input
                  type="text"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  onBlur={() => onEditUsername(false)}
                  autoFocus
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid #ff70a6',
                    color: '#fff',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    outline: 'none',
                    textAlign: 'right',
                    maxWidth: 120,
                  }}
                />
              ) : (
                <div
                  onClick={() => onEditUsername(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  title="点击修改代号"
                >
                  <span>卷宗代号: <strong style={{ color: '#fff' }}>{username}</strong></span>
                  <Edit3 size={11} strokeWidth={1.75} stroke="#ff70a6" />
                </div>
              )}
            </div>
          </div>

          {/* Title & Archetype Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
            {/* Uploaded Avatar */}
            {chapter1.avatarUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem', transform: 'translateZ(10px)' }}>
                <img
                  src={chapter1.avatarUrl}
                  alt="头像照片"
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #ff70a6',
                    boxShadow: '0 0 20px rgba(255, 112, 166, 0.5)',
                  }}
                />
              </div>
            )}

            {/* User properties badge row */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.8rem',
              padding: '0.45rem 1.2rem',
              borderRadius: '30px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              maxWidth: '100%',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transform: 'translateZ(5px)',
            }}>
              <span>代号 <strong style={{ color: '#ffffff' }}>{username}</strong></span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
              <span>社会面具 <strong style={{ color: currentThemeConfig.accentColor }}>{chapter1.occupation || '自由人'}</strong></span>
              {chapter1.personaTrait && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                  <span>人前形象 <strong style={{ color: currentThemeConfig.accentColor }}>{chapter1.personaTrait}</strong></span>
                </>
              )}
            </div>

            {/* Archetype Name */}
            <h1 style={{
              fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
              fontWeight: 900,
              letterSpacing: '0.06em',
              color: '#ffffff',
              textShadow: `0 0 18px ${currentThemeConfig.accentColor}`,
              marginBottom: '0.4rem',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {llmAnalysis.archetypeTitle || archetype.name || '暗光解构者'}
            </h1>

            {/* Archetype Motto */}
            {archetype.motto && (
              <p style={{
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: 'var(--text-secondary)',
                opacity: 0.9,
                marginTop: '0.3rem',
                marginBottom: '1.1rem',
                textAlign: 'center',
                lineHeight: 1.4,
              }}>
                {archetype.motto}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', flexWrap: 'wrap', transform: 'translateZ(5px)' }}>
              <span style={{ background: archetype.glowColor || 'rgba(255, 112, 166, 0.3)', border: `1px solid ${archetype.accentColor || '#ff70a6'}`, color: archetype.accentColor || '#ff70a6', padding: '0.2rem 0.7rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {archetype.depthRatingLabel || '中度沉浸'}
              </span>
              <span style={{ background: 'rgba(255, 51, 119, 0.12)', border: '1px solid rgba(255, 112, 166, 0.35)', color: '#ff70a6', padding: '0.2rem 0.7rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {behavior.opennessTrait}
              </span>
              <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '0.2rem 0.7rem', borderRadius: 12, fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                敞开度 {behavior.opennessPercent}%
              </span>
            </div>
          </div>

          {/* Hidden desires card */}
          {chapter1.innerDesire && (
            <div style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 112, 166, 0.2)', borderRadius: 14, padding: '0.9rem 1.1rem', marginBottom: '1.25rem', width: '100%', boxSizing: 'border-box', overflow: 'hidden', transform: 'translateZ(30px)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                表里对立与无人时的潜意识渴望：
              </div>
              <div style={{ color: '#fff0f5', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(255, 51, 119, 0.05)', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid rgba(255, 51, 119, 0.15)', boxSizing: 'border-box', overflow: 'hidden' }}>
                “{chapter1.innerDesire}”
              </div>
            </div>
          )}

          {/* Deconstruction text */}
          {(llmAnalysis.personaDeconstruction || llmAnalysis.shadowDeconstruction) && (
            <div style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 14,
              padding: '1.2rem 1.4rem',
              marginBottom: '1.25rem',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'left',
              overflow: 'hidden',
              transform: 'translateZ(35px)',
            }}>
              <h4 style={{
                fontSize: '0.75rem',
                color: currentThemeConfig.accentColor,
                fontWeight: 700,
                marginBottom: '0.75rem',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span>表里对立与潜意识特征解构 // DECONSTRUCTION</span>
              </h4>
              {llmAnalysis.personaDeconstruction && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginBottom: '0.65rem', textIndent: '1.5em', letterSpacing: '0.015em', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {llmAnalysis.personaDeconstruction}
                </p>
              )}
              {llmAnalysis.shadowDeconstruction && (
                <p style={{ color: '#fff0f5', fontSize: '0.78rem', lineHeight: 1.7, textIndent: '1.5em', letterSpacing: '0.015em', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {llmAnalysis.shadowDeconstruction}
                </p>
              )}
              {llmAnalysis.psychologicalSublimation && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.65, marginTop: '0.65rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.65rem', letterSpacing: '0.01em', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  💡 灵魂共鸣建议：{llmAnalysis.psychologicalSublimation}
                </p>
              )}
            </div>
          )}

          {/* Radar Profile Chart */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 14,
            padding: '1.2rem 1.4rem',
            marginBottom: '1.25rem',
            width: '100%',
            boxSizing: 'border-box',
            textAlign: 'center',
            overflow: 'hidden',
            transform: 'translateZ(30px)',
          }}>
            <h4 style={{
              fontSize: '0.78rem',
              color: currentThemeConfig.accentColor,
              fontWeight: 700,
              marginBottom: '1.2rem',
              letterSpacing: '0.08em',
              textAlign: 'left'
            }}>
              📊 多维心理倾向图谱 // PROFILE CHART
            </h4>
            {hasBdsmScores ? (
              <BdsmDedicatedChart scores={dossierData?.aggregatedScores} />
            ) : (
              <RadarChart
                normalized={scoresData as any}
                customAxes={dossierData?.completedBanks?.[0]?.dimensions?.map((d: any) => ({ name: d.name, key: d.key }))}
                scores={dossierData?.aggregatedScores}
                accentColor={currentThemeConfig.accentColor}
                size={290}
              />
            )}
          </div>

          {/* Tags Footer */}
          <div style={{ paddingTop: '1.1rem', borderTop: '1px solid rgba(255, 105, 180, 0.14)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', width: '100%', boxSizing: 'border-box', transform: 'translateZ(25px)' }}>
            {selectedShadowTags.map((tag: string, idx: number) => (
              <span key={idx} style={{ background: archetype.glowColor || 'rgba(255, 112, 166, 0.3)', border: `1px solid ${archetype.accentColor || '#ff70a6'}`, color: archetype.accentColor || '#ff70a6', padding: '0.22rem 0.65rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                #{tag}
              </span>
            ))}
            {(llmAnalysis.resonanceKeywords || []).map((kw: string, idx: number) => (
              <span key={`kw-${idx}`} style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.16)', color: '#fff', padding: '0.22rem 0.65rem', borderRadius: 12, fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                #{kw}
              </span>
            ))}
          </div>

          {/* Watermark Footer info */}
          <div style={{ marginTop: '1.1rem', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transform: 'translateZ(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldCheck size={12} strokeWidth={1.75} stroke="url(#rose-magenta-gradient)" className="icon-glow-rose" />
              <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>镜界自白 Dossier Archive · 加密自白卷宗</span>
            </div>
            <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            <div style={{ fontFamily: 'Consolas, Monaco, monospace', color: currentThemeConfig.accentColor, opacity: 0.75, letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
              NO. IE-8260492
            </div>
            <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              STATUS: SECURE 256-BIT
            </div>
          </div>
        </div>

        {/* ==================== 2. CARD BACK PANEL (The Detailed Analysis Matrix) ==================== */}
        <div
          className="result-poster-card glass-card"
          style={{
            position: 'relative',
            marginTop: '1.25rem',
            boxSizing: 'border-box',
            padding: 'clamp(1.2rem, 4vw, 2.2rem) clamp(0.75rem, 3vw, 1.6rem)',
            background: currentThemeConfig.bg,
            border: currentThemeConfig.border,
            boxShadow: `0 24px 50px rgba(0,0,0,0.7)`,
            borderRadius: 20,
            overflow: 'hidden',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {/* Blueprint Grid Pattern */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none', transform: 'translateZ(0px)' }} aria-hidden="true">
            <pattern id={`blueprint-grid-back-${activeTheme}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={currentThemeConfig.accentColor} strokeWidth="0.75" />
            </pattern>
            <rect width="100%" height="100%" fill={`url(#blueprint-grid-back-${activeTheme})`} />
          </svg>

          {/* Classified Corners */}
          <div style={{ position: 'absolute', top: 16, left: 16, width: 16, height: 16, borderTop: `2px solid ${currentThemeConfig.accentColor}`, borderLeft: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />
          <div style={{ position: 'absolute', top: 16, right: 16, width: 16, height: 16, borderTop: `2px solid ${currentThemeConfig.accentColor}`, borderRight: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, width: 16, height: 16, borderBottom: `2px solid ${currentThemeConfig.accentColor}`, borderLeft: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />
          <div style={{ position: 'absolute', bottom: 16, right: 16, width: 16, height: 16, borderBottom: `2px solid ${currentThemeConfig.accentColor}`, borderRight: `2px solid ${currentThemeConfig.accentColor}`, opacity: 0.75, pointerEvents: 'none', transform: 'translateZ(20px)' }} />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 105, 180, 0.16)',
              paddingBottom: '0.9rem',
              marginBottom: '1.2rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
              width: '100%',
              boxSizing: 'border-box',
              transform: 'translateZ(30px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <span className="icon-badge" style={{ width: 34, height: 34, border: `1px solid ${currentThemeConfig.accentColor}40`, background: 'rgba(255, 255, 255, 0.03)' }}>
                <Compass size={18} strokeWidth={1.5} stroke={currentThemeConfig.accentColor} style={{ flexShrink: 0 }} />
              </span>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 800, letterSpacing: '0.04em', fontSize: '0.98rem', color: '#ffffff', textShadow: `0 0 10px ${currentThemeConfig.accentColor}50`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  潜意识暗面数据剖析 // ANALYSIS
                </span>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>卷宗代号：{username}</div>
              </div>
            </div>
            <span style={{ fontSize: '0.62rem', border: `1px solid ${currentThemeConfig.accentColor}50`, color: currentThemeConfig.accentColor, padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(255, 255, 255, 0.03)', fontWeight: 700, transform: 'translateZ(10px)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              DETAILED STATS
            </span>
          </div>

          {/* Matrix and Suggestions on Back */}
          <div>
            <GenericDimensionMatrix scores={scoresData} />
            
            {/* Extended Suggestion Block */}
            {llmAnalysis.psychologicalSublimation && (
              <div style={{ 
                marginTop: '1.2rem', 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid rgba(255, 255, 255, 0.06)', 
                borderRadius: 14, 
                padding: '1rem',
                boxSizing: 'border-box',
                transform: 'translateZ(10px)',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: currentThemeConfig.accentColor, marginBottom: '0.4rem', letterSpacing: '0.08em' }}>
                  💡 灵魂升华共鸣指引 // SUBLIMATION
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {llmAnalysis.psychologicalSublimation}
                </p>
              </div>
            )}
          </div>

          {/* Watermark Footer info */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transform: 'translateZ(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldCheck size={12} strokeWidth={1.75} stroke={currentThemeConfig.accentColor} />
              <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>镜界自白 Dossier Archive · 深度数据卷宗</span>
            </div>
            <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              STATUS: DECRYPTED
            </div>
          </div>
        </div>
    </div>
  );
};
