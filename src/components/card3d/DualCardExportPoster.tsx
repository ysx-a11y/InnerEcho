import React from 'react';
import type { Card3DConfig } from './types';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface DualCardExportPosterProps {
  config: Card3DConfig;
  exportRef: React.RefObject<HTMLDivElement | null>;
}

const formatCleanSerial = (rawId: string): string => {
  if (!rawId) return '8260492';
  const clean = rawId.replace(/^(dos|ie|echo)[-_]*/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (clean.length > 8 ? clean.slice(-8) : clean) || '8260492';
};

export const DualCardExportPoster: React.FC<DualCardExportPosterProps> = ({
  config,
  exportRef,
}) => {
  const cleanSerial = formatCleanSerial(config.dossierId);
  const accent = config.accentColor || '#ff70a6';
  const backPhoto = config.backImageUrl || config.imageUrl;

  return (
    <div
      ref={exportRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: -9999,
        top: 2000,
        width: 1200,
        height: 675,
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #09030e 0%, #13071c 45%, #07020a 100%)',
        padding: '24px 44px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: '"Outfit", system-ui, -apple-system, sans-serif',
        color: '#ffffff',
        zIndex: -1,
      }}
    >
      {/* Decorative Background Lighting Accents */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          left: '20%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 112, 166, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          right: '15%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.13) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Banner Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 112, 166, 0.25)',
          paddingBottom: '12px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 112, 166, 0.15)',
              border: '1px solid rgba(255, 112, 166, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} color={accent} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 900,
                letterSpacing: '0.12em',
                color: '#fff',
                fontFamily: 'var(--font-heading)',
              }}
            >
              深层回响 · 表里双面绝密典藏
            </h1>
            <div
              style={{
                fontSize: '9.5px',
                color: 'rgba(255, 255, 255, 0.55)',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                marginTop: '1px',
              }}
            >
              INNER ECHO · DUAL SOUL COLLECTOR ARCHIVE
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'Consolas, Monaco, monospace',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(255, 112, 166, 0.12)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              color: accent,
            }}
          >
            NO. {cleanSerial}
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'rgba(255, 255, 255, 0.75)',
            }}
          >
            CLASSIFIED LEVEL IV
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
            }}
          >
            256-BIT SECURE
          </span>
        </div>
      </div>

      {/* Main Center Area: Two Cards Side by Side */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '54px',
          flex: 1,
          padding: '10px 0',
          boxSizing: 'border-box',
        }}
      >
        {/* ================= LEFT: FRONT CARD (人前面具) ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: accent,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>【 正面 · 人前面具卡 · MASK 】</span>
          </div>

          <div
            style={{
              width: 320,
              height: 470,
              borderRadius: '16px',
              overflow: 'hidden',
              border: `1.5px solid ${accent}55`,
              boxShadow: `0 14px 40px rgba(0, 0, 0, 0.9), 0 0 25px ${accent}22`,
              background: '#090a0e',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Top capsule */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 10,
                right: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(10, 4, 15, 0.8)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 112, 166, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 14,
                  fontSize: '9.5px',
                  fontWeight: 700,
                }}
              >
                <Sparkles size={9} color={accent} />
                <span>{config.username || '匿名倾诉者'}</span>
              </div>
              <div
                style={{
                  fontSize: '8.5px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '2px 6px',
                  borderRadius: 10,
                  color: 'rgba(255, 255, 255, 0.75)',
                }}
              >
                NO. {cleanSerial}
              </div>
            </div>

            {/* Front Artwork Container */}
            <div
              style={{
                width: '100%',
                height: 310,
                overflow: 'hidden',
                position: 'relative',
                background: '#0a0a0f',
              }}
            >
              {config.imageUrl ? (
                <img
                  src={config.imageUrl}
                  alt="Front Artwork"
                  className={`filter-${config.imageFilter || 'none'}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    // 与 ResultCard3D 正面一致：缩放 + 垂直/水平偏移都要带上，
                    // 否则导出的对开卡与用户在工作室里的预览不一致。
                    transform: `scale(${config.imageScale || 1}) translate(${config.imageX || 0}%, ${config.imageY || 0}%)`,
                    transformOrigin: 'center',
                  }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'rgba(255, 255, 255, 0.4)',
                    gap: 6,
                  }}
                >
                  <ShieldCheck size={36} />
                  <span style={{ fontSize: '11px' }}>绝密骨相立绘</span>
                </div>
              )}

              {/* Front Stamp Seal (Static Preview) */}
              <div
                style={{
                  position: 'absolute',
                  right: 14,
                  bottom: 12,
                  zIndex: 8,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    border: `2px dashed ${config.stampColor || '#8a1515'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: config.stampColor || '#8a1515',
                    transform: 'rotate(-12deg)',
                    background: 'rgba(10, 0, 0, 0.25)',
                    backdropFilter: 'blur(2px)',
                    boxShadow: `0 0 10px ${config.stampColor || '#8a1515'}44`,
                  }}
                >
                  <span style={{ fontSize: '6px', fontWeight: 800, letterSpacing: '0.1em' }}>
                    {config.stampTextTop?.slice(0, 8) || '深层回响'}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 900, margin: '1px 0' }}>
                    {config.stampTextCenter || '潜意识封存'}
                  </span>
                  <span style={{ fontSize: '5px', letterSpacing: '0.05em', opacity: 0.8 }}>
                    CONFIDENTIAL
                  </span>
                </div>
              </div>
            </div>

            {/* Front Card Body */}
            <div
              style={{
                flex: 1,
                padding: '9px 12px 7px 12px',
                background: 'linear-gradient(180deg, rgba(16, 17, 24, 0.98) 0%, rgba(9, 10, 14, 1) 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span>{config.title || '暗光解构者'}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                    {config.occupation || '未登记'}
                  </span>
                </div>
                {config.personaTrait && (
                  <div style={{ fontSize: '9px', color: accent, marginTop: '2px', fontWeight: 600 }}>
                    人前假面：{config.personaTrait}
                  </div>
                )}
              </div>

              {/* 4 Dimensions Grid + QR */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      fontSize: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>DOM 支配</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{config.dominanceIndex ?? 50}%</span>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      fontSize: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>SUB 臣服</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{config.submissionIndex ?? 50}%</span>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      fontSize: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>RES 克制</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{config.restraintIndex ?? 50}%</span>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      fontSize: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>SEN 感官</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{config.sensoryThreshold ?? 50}%</span>
                  </div>
                </div>

                {/* QR mini */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: '#ffffff',
                    borderRadius: 4,
                    padding: 2,
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                >
                  <img src="/ewm-qr.svg" alt="QR" style={{ width: '100%', height: '100%' }} />
                </div>
              </div>

              {/* Bottom tag */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '7px',
                  fontFamily: 'monospace',
                  color: 'rgba(255, 255, 255, 0.35)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: 3,
                }}
              >
                <span>STATUS: MASK ACTIVE</span>
                <span>AUTHENTIC</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT: BACK CARD (绝密暗面) ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#c084fc',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>【 背面 · 绝密暗面卡 · SHADOW 】</span>
          </div>

          <div
            style={{
              width: 320,
              height: 470,
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1.5px solid rgba(192, 132, 252, 0.45)',
              boxShadow: '0 14px 40px rgba(0, 0, 0, 0.9), 0 0 25px rgba(192, 132, 252, 0.2)',
              background: 'radial-gradient(circle at 50% 25%, #1f0b30 0%, #0d0416 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '16px 14px',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Back Artwork Silhouette Backdrop */}
            {backPhoto && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <img
                  src={backPhoto}
                  alt="Back Silhouette"
                  className={`filter-${config.backImageFilter || 'noir'}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.22,
                    // 与 ResultCard3D 背面保持一致，避免导出图与预览错位
                    transform: `scale(${config.backImageScale || 1.1}) translate(${config.backImageX || 0}%, ${config.backImageY || 0}%)`,
                    transformOrigin: 'center',
                  }}
                  crossOrigin="anonymous"
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(14, 5, 20, 0.72) 0%, rgba(10, 4, 15, 0.95) 85%)',
                  }}
                />
              </div>
            )}

            {/* Back Card Content (Positioned over artwork) */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              {/* Back Header */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    letterSpacing: '0.22em',
                    color: '#fff',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  深 层 回 响
                </div>
                <div
                  style={{
                    fontSize: '7.5px',
                    letterSpacing: '0.2em',
                    color: 'rgba(255, 255, 255, 0.45)',
                    textTransform: 'uppercase',
                    marginTop: '2px',
                  }}
                >
                  SUB-CONSCIOUS ARCHIVE · CLASSIFIED
                </div>
              </div>

              {/* Decorative Geometric Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    border: '1px solid rgba(192, 132, 252, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(192, 132, 252, 0.08)',
                  }}
                >
                  <svg width="22" height="22" fill="none" stroke="#c084fc" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.905 0-5.62-.515-8.129-1.458m16.258 0A11.952 11.952 0 0012 20.025a11.952 11.952 0 00-8.129-11.483" />
                  </svg>
                </div>
              </div>

              {/* Detail Rows */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  padding: '10px 11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '9.5px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>卷宗归属</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{config.username || '匿名倾诉者'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>真实职业 / 假面</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>
                    {config.occupation || '未登记'} / {config.personaTrait || '未登记'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>防线状态</span>
                  <span style={{ fontWeight: 700, color: '#c084fc' }}>
                    {config.opennessTrait} (敞开度 {config.opennessPercent}%)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>许可级别</span>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>LEVEL IV · TOP SECRET</span>
                </div>

                {/* Desire quote */}
                {config.innerDesire && (
                  <div
                    style={{
                      borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
                      paddingTop: '6px',
                      marginTop: '2px',
                      fontStyle: 'italic',
                      color: 'rgba(255, 240, 245, 0.92)',
                      fontSize: '9px',
                      lineHeight: 1.45,
                    }}
                  >
                    “{config.innerDesire}”
                  </div>
                )}
              </div>

              {/* Legal & Serial */}
              <div
                style={{
                  fontSize: '7px',
                  color: 'rgba(255, 255, 255, 0.45)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  marginTop: '4px',
                }}
              >
                本档案基于潜意识特征向量与大模型双向心理解构生成 · 严禁未授权篡改或伪造
                <div style={{ fontFamily: 'monospace', opacity: 0.8, marginTop: '2px' }}>
                  NO. {cleanSerial}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '8px',
          fontSize: '9px',
          color: 'rgba(255, 255, 255, 0.45)',
          boxSizing: 'border-box',
        }}
      >
        <span>《深层回响》官方绝密自白档案系统 · 每个人格都有其不可言说的隐秘回声</span>
        <span style={{ fontFamily: 'monospace' }}>CLASSIFIED ARCHIVE · {cleanSerial}</span>
      </div>
    </div>
  );
};
