import React from 'react';
import { User, Flame, Sparkles } from 'lucide-react';
import type { AdminDossier } from '../../adminTypes';
import { formatTime } from '../../adminApi';

function getRadarPolygon(d: AdminDossier) {
  const cx = 100;
  const cy = 100;
  const maxR = 75;
  const points = [
    { x: cx, y: cy - (maxR * Math.min(100, d.dominanceIndex)) / 100 },
    { x: cx + (maxR * Math.min(100, d.restraintIndex)) / 100, y: cy },
    { x: cx, y: cy + (maxR * Math.min(100, d.submissionIndex)) / 100 },
    { x: cx - (maxR * Math.min(100, d.sensoryThreshold)) / 100, y: cy },
  ];
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

interface DossierAnalysisTabProps {
  dossier: AdminDossier;
}

export const DossierAnalysisTab: React.FC<DossierAnalysisTabProps> = ({ dossier }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* 1. 核心原型与雷达图卡片 */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255,51,119,0.08) 0%, rgba(170,38,218,0.05) 100%)',
          border: '1px solid rgba(255,51,119,0.25)',
          borderRadius: '14px',
          padding: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 200 200" style={{ overflow: 'visible', flexShrink: 0 }}>
          <defs>
            <radialGradient id="modal-radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,51,119,0.35)" />
              <stop offset="100%" stopColor="rgba(170,38,218,0)" />
            </radialGradient>
          </defs>
          {[0.33, 0.66, 1.0].map((ratio, i) => (
            <circle key={i} cx="100" cy="100" r={75 * ratio} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          <line x1="100" y1="15" x2="100" y2="185" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="15" y1="100" x2="185" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <polygon points={getRadarPolygon(dossier)} fill="url(#modal-radar-glow)" stroke="#ff3377" strokeWidth="2.2" />
        </svg>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <span style={{ fontSize: '0.72rem', color: '#ff70a6', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            PRIMARY ARCHETYPE
          </span>
          <h3 style={{ fontSize: '1.4rem', color: '#ffffff', margin: '0.2rem 0', fontWeight: 800 }}>
            {dossier.archetypeTitle || '倾向评估中'}
          </h3>
          {dossier.archetypeSubtitle && (
            <p style={{ fontSize: '0.8rem', color: '#8d879e', margin: '0 0 0.8rem 0' }}>
              {dossier.archetypeSubtitle}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem', marginTop: '0.6rem' }}>
            <div style={{ background: 'rgba(255,51,119,0.12)', border: '1px solid rgba(255,51,119,0.2)', padding: '6px 8px', borderRadius: 8 }}>
              <span style={{ fontSize: '0.68rem', color: '#ff70a6', display: 'block' }}>支配指数</span>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.dominanceIndex}</strong>
            </div>
            <div style={{ background: 'rgba(255,209,128,0.12)', border: '1px solid rgba(255,209,128,0.2)', padding: '6px 8px', borderRadius: 8 }}>
              <span style={{ fontSize: '0.68rem', color: '#ffd180', display: 'block' }}>克制指数</span>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.restraintIndex}</strong>
            </div>
            <div style={{ background: 'rgba(170,38,218,0.12)', border: '1px solid rgba(170,38,218,0.2)', padding: '6px 8px', borderRadius: 8 }}>
              <span style={{ fontSize: '0.68rem', color: '#aa26da', display: 'block' }}>臣服指数</span>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.submissionIndex}</strong>
            </div>
            <div style={{ background: 'rgba(128,243,255,0.12)', border: '1px solid rgba(128,243,255,0.2)', padding: '6px 8px', borderRadius: 8 }}>
              <span style={{ fontSize: '0.68rem', color: '#80f3ff', display: 'block' }}>感官阈值</span>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>{dossier.sensoryThreshold}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 深度解构三大篇章 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* 人格面具解构 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1.2rem',
          }}
        >
          <h4 style={{ fontSize: '0.85rem', color: '#80f3ff', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={15} />
            <span>🎭 人格面具深度解构 (Persona Deconstruction)</span>
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#e0dce8', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {dossier.personaDeconstruction || '暂无该维度的深度面具解构数据。'}
          </p>
        </div>

        {/* 潜意识阴暗面解构 */}
        <div
          style={{
            background: 'rgba(255, 51, 119, 0.03)',
            border: '1px solid rgba(255, 51, 119, 0.15)',
            borderRadius: '12px',
            padding: '1.2rem',
          }}
        >
          <h4 style={{ fontSize: '0.85rem', color: '#ff70a6', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Flame size={15} />
            <span>🌑 潜意识阴暗面与隐秘渴望解构 (Shadow Deconstruction)</span>
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#fff', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {dossier.shadowDeconstruction || '暂无该维度的阴暗面解构数据。'}
          </p>
        </div>

        {/* 心理升华与心流指引 */}
        <div
          style={{
            background: 'rgba(170, 38, 218, 0.03)',
            border: '1px solid rgba(170, 38, 218, 0.15)',
            borderRadius: '12px',
            padding: '1.2rem',
          }}
        >
          <h4 style={{ fontSize: '0.85rem', color: '#aa26da', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={15} />
            <span>✨ 心理升华与心流指引 (Psychological Sublimation)</span>
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#e0dce8', lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {dossier.psychologicalSublimation || '暂无心理升华指引数据。'}
          </p>
        </div>
      </div>

      {/* 3. 心理共鸣关键词与暗面标签 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {dossier.resonanceKeywords && dossier.resonanceKeywords.length > 0 && (
          <div>
            <span style={{ fontSize: '0.72rem', color: '#8d879e', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
              🪞 心理共鸣关键词云
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {dossier.resonanceKeywords.map((kw: string, i: number) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(128,243,255,0.08)',
                    color: '#80f3ff',
                    border: '1px solid rgba(128,243,255,0.2)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {dossier.selectedShadowTags && dossier.selectedShadowTags.length > 0 && (
          <div>
            <span style={{ fontSize: '0.72rem', color: '#8d879e', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
              🏷️ 潜意识暗面标签
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {dossier.selectedShadowTags.map((tag: string, i: number) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(255,51,119,0.08)',
                    color: '#ff70a6',
                    border: '1px solid rgba(255,51,119,0.2)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. 🪞 镜像契合度与暗面自白心声 */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.08) 0%, rgba(170, 38, 218, 0.08) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.25)',
          borderRadius: '12px',
          padding: '1.2rem',
        }}
      >
        <h4 style={{ fontSize: '0.85rem', color: '#ff70a6', margin: '0 0 0.6rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={15} />
          <span>🪞 暗面镜像共鸣与用户心声 (Mirror Resonance Feedback)</span>
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: dossier.resonanceText ? '0.8rem' : 0 }}>
          <span style={{ fontSize: '0.74rem', color: '#8d879e' }}>用户共鸣印记：</span>
          {dossier.resonanceLevel === 'exact' && (
            <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,112,166,0.15)', border: '1px solid rgba(255,112,166,0.4)', color: '#ff70a6', fontSize: '0.75rem', fontWeight: 700 }}>
              💎 90% 灵魂被彻底剥离 (精准击中 · 深度共鸣)
            </span>
          )}
          {dossier.resonanceLevel === 'partial' && (
            <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(128,243,255,0.15)', border: '1px solid rgba(128,243,255,0.4)', color: '#80f3ff', fontSize: '0.75rem', fontWeight: 700 }}>
              🪞 60% 隐约触碰到了暗面 (部分触动 · 隐约可见)
            </span>
          )}
          {dossier.resonanceLevel === 'guarded' && (
            <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,209,128,0.15)', border: '1px solid rgba(255,209,128,0.4)', color: '#ffd180', fontSize: '0.75rem', fontWeight: 700 }}>
              🛡️ 尚有防备，未完全敞开 (理性防御 · 留有保留)
            </span>
          )}
          {dossier.resonanceLevel === 'custom' && (
            <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(170,38,218,0.15)', border: '1px solid rgba(170,38,218,0.4)', color: '#d383ff', fontSize: '0.75rem', fontWeight: 700 }}>
              ✍️ 暗面另有隐衷 (手写自白 · 修正定义)
            </span>
          )}
          {!dossier.resonanceLevel && (
            <span style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6e677c', fontSize: '0.75rem' }}>
              访客尚未选择共鸣印记
            </span>
          )}
          {dossier.resonanceAt && (
            <span style={{ fontSize: '0.68rem', color: '#6e677c' }}>
              (标记于 {formatTime(dossier.resonanceAt)})
            </span>
          )}
        </div>

        {dossier.resonanceText && (
          <div
            style={{
              background: 'rgba(10, 4, 15, 0.85)',
              border: '1px solid rgba(255, 112, 166, 0.3)',
              borderRadius: '10px',
              padding: '0.9rem 1.1rem',
              marginTop: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: '#ffd180', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
              💬 作答者手写暗面自白：
            </span>
            <p style={{ fontSize: '0.82rem', color: '#fff', margin: 0, lineHeight: 1.6, fontStyle: 'italic', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              “{dossier.resonanceText}”
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

