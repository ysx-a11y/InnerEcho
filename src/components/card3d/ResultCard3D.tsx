import React, { useRef, useState, useEffect } from 'react';
import type { Card3DConfig } from './types';
import { StampLayer } from './StampLayer';
import { EWM_URL } from './presetImages';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface ResultCard3DProps {
  config: Card3DConfig;
  onChange: (config: Card3DConfig) => void;
  exportRef: React.RefObject<HTMLDivElement | null>;
  isExporting?: boolean;
}

// Extract concise clean alphanumeric serial without long verbose prefixes
const formatCleanSerial = (rawId: string): string => {
  if (!rawId) return '8260492';
  // Remove prefixes like dos_, ie_, echo- and non-alphanumerics
  const clean = rawId.replace(/^(dos|ie|echo)[-_]*/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (clean.length > 8 ? clean.slice(-8) : clean) || '8260492';
};

export const ResultCard3D: React.FC<ResultCard3DProps> = ({
  config,
  onChange,
  exportRef,
  isExporting = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [isResetting, setIsResetting] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  // Trigger flipping animation when isFlipped toggles
  useEffect(() => {
    setIsFlipping(true);
    const timer = setTimeout(() => setIsFlipping(false), 750);
    return () => clearTimeout(timer);
  }, [config.isFlipped]);

  // 3D Mouse / Touch Tilt Physics
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (config.isFlipped || isFlipping || isExporting) return;
    if (!cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = Math.max(-0.15, Math.min(1.15, x / rect.width));
    const py = Math.max(-0.15, Math.min(1.15, y / rect.height));
    const rotateX = (0.5 - py) * 38;
    const rotateY = (px - 0.5) * 38;

    const glareX = `${px * 100}%`;
    const glareY = `${py * 100}%`;

    setTiltStyle({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      // @ts-ignore custom CSS variables
      '--glare-x': glareX,
      '--glare-y': glareY,
      '--sheen-x': `${(px + py) * 50}%`,
      '--sheen-y': `${(1.5 - px) * 50}%`,
      '--card-accent': config.accentColor || '#ff70a6',
    });
  };

  const handlePointerLeave = () => {
    if (isExporting) return;
    setIsResetting(true);
    setTiltStyle({
      transform: 'rotateX(0deg) rotateY(0deg)',
      // @ts-ignore custom CSS variables
      '--card-accent': config.accentColor || '#ff70a6',
    });
    setTimeout(() => {
      setIsResetting(false);
    }, 500);
  };

  const cleanSerial = formatCleanSerial(config.dossierId);

  return (
    <div
      className="perspective-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={exportRef}
        style={{
          padding: '12px',
          background: 'transparent',
          display: 'inline-block',
          boxSizing: 'border-box',
        }}
      >
        <div
          ref={cardRef}
          className={`card-3d-wrapper ${isResetting ? 'resetting' : ''} ${isFlipping ? 'flipping' : ''} ${config.isFlipped ? 'is-flipped' : ''} ${isExporting ? 'is-exporting' : ''}`}
          style={tiltStyle}
        >
          {/* ==================== CARD FRONT ==================== */}
          <div className="card-face card-front">
            {/* Top Floating Capsule Bar (Streamlined Nickname + Clean Serial) */}
            <div className="card-top-capsule-bar">
              <div className="card-top-nickname-capsule">
                <Sparkles size={11} style={{ color: config.accentColor || '#ff70a6', flexShrink: 0 }} />
                <span>{config.username || '匿名倾诉者'}</span>
              </div>
              <div className="card-top-serial-badge">
                NO. {cleanSerial}
              </div>
            </div>

            {/* Reflection / Holographic Sheen */}
            <div className="card-glare" />
            {config.holographic && <div className="card-holographic-sheen" />}

            {/* 75%~80% Dominant Cover Artwork */}
            <div className="card-artwork-container">
              {config.imageUrl ? (
                <img
                  src={config.imageUrl}
                  alt="Card Portrait"
                  className={`card-artwork filter-${config.imageFilter || 'none'}`}
                  style={{
                    // @ts-ignore custom CSS variables
                    '--img-scale': config.imageScale,
                    '--img-x': `${config.imageX}%`,
                    '--img-y': `${config.imageY}%`,
                  }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="card-artwork-placeholder">
                  <ShieldCheck size={36} style={{ opacity: 0.4 }} />
                  <p style={{ fontSize: '11px', fontWeight: 600 }}>绝密卷宗立绘</p>
                </div>
              )}
            </div>

            {/* Floating Stamp / Wax Seal Overlay */}
            <StampLayer config={config} onChange={onChange} cardRef={cardRef} />

            {/* Card Body (Bottom 20%~25%) */}
            <div className="card-body">
              {/* Header Title & Persona Info */}
              <div className="card-body-header">
                <div className="card-body-title">{config.title || '暗光解构者'}</div>
                <div className="card-body-meta-row">
                  <span>{config.occupation || '未登记'}</span>
                  {config.personaTrait && (
                    <>
                      <span style={{ opacity: 0.4 }}>|</span>
                      <span className="card-body-meta-tag">{config.personaTrait}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Split Content: 4 Dimensions / Desire + QR Code */}
              <div className="card-split-panel">
                <div className="card-split-left">
                  {config.contentMode === 'dimensions' ? (
                    <div className="card-dim-grid">
                      {config.customDimensions && config.customDimensions.length > 0 ? (
                        config.customDimensions.slice(0, 4).map((dim, idx) => (
                          <div key={dim.key || idx} className="card-dim-pill">
                            <span className="card-dim-label" title={dim.name}>{dim.name}</span>
                            <span className="card-dim-value">{Math.round(dim.value)}%</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="card-dim-pill">
                            <span className="card-dim-label">DOM 支配</span>
                            <span className="card-dim-value">{config.dominanceIndex ?? 50}%</span>
                          </div>
                          <div className="card-dim-pill">
                            <span className="card-dim-label">SUB 臣服</span>
                            <span className="card-dim-value">{config.submissionIndex ?? 50}%</span>
                          </div>
                          <div className="card-dim-pill">
                            <span className="card-dim-label">RES 克制</span>
                            <span className="card-dim-value">{config.restraintIndex ?? 50}%</span>
                          </div>
                          <div className="card-dim-pill">
                            <span className="card-dim-label">SEN 感官</span>
                            <span className="card-dim-value">{config.sensoryThreshold ?? 50}%</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="card-desire-quote">
                      “{config.innerDesire || '未填写的潜意识留白防线'}”
                    </div>
                  )}
                </div>

                {/* QR Code linking to https://secret.neural-node.xyz/ewm */}
                <a
                  href={EWM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-qr-box"
                  title="扫描或点击访问镜界自白"
                >
                  <img
                    src="/ewm-qr.svg"
                    alt="二维码"
                    className="card-qr-img"
                  />
                  <span className="card-qr-label">SYNC SCAN</span>
                </a>
              </div>

              {/* Bottom Footer Bar */}
              <div className="card-footer-bar">
                <span>镜界自白 · 绝密档案</span>
                <span>STATUS: 256-BIT SECURE</span>
              </div>
            </div>
          </div>

          {/* ==================== CARD BACK ==================== */}
          <div className="card-face card-back">
            {/* Back Artwork Silhouette Backdrop */}
            {config.backImageUrl && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                <img
                  src={config.backImageUrl}
                  alt="Back Silhouette"
                  className={`filter-${config.backImageFilter || 'noir'}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.22,
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

            <div className="card-back-header" style={{ position: 'relative', zIndex: 1 }}>
              <div className="card-back-logo">深 层 回 响</div>
              <div className="card-back-sub">SUB-CONSCIOUS ARCHIVE · CLASSIFIED</div>
            </div>

            <div className="card-back-pattern">
              <svg width="36" height="36" fill="none" stroke={config.accentColor || '#ff70a6'} strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.905 0-5.62-.515-8.129-1.458m16.258 0A11.952 11.952 0 0012 20.025a11.952 11.952 0 00-8.129-11.483" />
              </svg>
            </div>

            <div className="card-back-details">
              <div className="card-back-row">
                <span className="card-back-row-label">卷宗归属人</span>
                <span className="card-back-row-val">{config.username || '匿名倾诉者'}</span>
              </div>
              <div className="card-back-row">
                <span className="card-back-row-label">真实职业 / 社交面具</span>
                <span className="card-back-row-val">{config.occupation || '未登记'} / {config.personaTrait || '未登记'}</span>
              </div>
              <div className="card-back-row">
                <span className="card-back-row-label">心理防线状态</span>
                <span className="card-back-row-val" style={{ color: config.accentColor || '#ff70a6' }}>
                  {config.opennessTrait} (敞开度 {config.opennessPercent}%)
                </span>
              </div>
              <div className="card-back-row">
                <span className="card-back-row-label">机密许可等级</span>
                <span className="card-back-row-val">LEVEL IV · SECURE</span>
              </div>

              {config.innerDesire && (
                <div className="card-back-desire-block">
                  “{config.innerDesire}”
                </div>
              )}
            </div>

            <div className="card-back-legal">
              本档案基于潜意识特征向量与大模型心理解构生成。根据绝密自白安全协议，严禁直接复制或伪造。
              <div style={{ marginTop: '3px', opacity: 0.7, fontFamily: 'monospace' }}>
                NO. {cleanSerial}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
