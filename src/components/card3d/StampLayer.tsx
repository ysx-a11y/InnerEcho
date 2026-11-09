import React, { useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import type { Card3DConfig } from './types';

interface StampLayerProps {
  config: Card3DConfig;
  onChange: (config: Card3DConfig) => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

export const StampLayer: React.FC<StampLayerProps> = ({ config, onChange, cardRef }) => {
  const stampRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ pointerId: number; startX: number; startY: number; stampX: number; stampY: number } | null>(null);
  const rotateStartRef = useRef<{ pointerId: number; centerX: number; centerY: number; startAngle: number } | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Dragging start
  const handleStampPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.stamp-rotate-handle')) return;
    if (!cardRef.current || !stampRef.current) return;

    e.stopPropagation();
    const stampEl = stampRef.current;
    stampEl.setPointerCapture(e.pointerId);

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      stampX: config.stampX,
      stampY: config.stampY,
    };
    setIsDragging(true);
  };

  // Dragging move
  const handleStampPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;
    if (!cardRef.current) return;

    e.stopPropagation();
    const cardRect = cardRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const pctDeltaX = (deltaX / cardRect.width) * 100;
    const pctDeltaY = (deltaY / cardRect.height) * 100;

    let newX = dragStartRef.current.stampX + pctDeltaX;
    let newY = dragStartRef.current.stampY + pctDeltaY;

    // Allow natural stamp overflow on edges
    newX = Math.max(-5, Math.min(105, newX));
    newY = Math.max(-5, Math.min(105, newY));

    onChange({
      ...config,
      stampX: Math.round(newX * 10) / 10,
      stampY: Math.round(newY * 10) / 10,
    });
  };

  // Dragging end
  const handleStampPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.pointerId === e.pointerId) {
      e.stopPropagation();
      if (stampRef.current) {
        stampRef.current.releasePointerCapture(e.pointerId);
      }
      dragStartRef.current = null;
      setIsDragging(false);
    }
  };

  // Rotate start
  const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stampRef.current) return;
    e.stopPropagation();

    const handleEl = e.currentTarget;
    handleEl.setPointerCapture(e.pointerId);

    const stampRect = stampRef.current.getBoundingClientRect();
    const centerX = stampRect.left + stampRect.width / 2;
    const centerY = stampRect.top + stampRect.height / 2;

    const dy = e.clientY - centerY;
    const dx = e.clientX - centerX;
    const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    rotateStartRef.current = {
      pointerId: e.pointerId,
      centerX,
      centerY,
      startAngle: startAngle - config.stampRotation,
    };
    setIsRotating(true);
  };

  // Rotate move
  const handleRotatePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRotating || !rotateStartRef.current || rotateStartRef.current.pointerId !== e.pointerId) return;

    e.stopPropagation();
    const { centerX, centerY, startAngle } = rotateStartRef.current;
    const dy = e.clientY - centerY;
    const dx = e.clientX - centerX;
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    let newRotation = (currentAngle - startAngle) % 360;
    if (newRotation < 0) newRotation += 360;

    onChange({
      ...config,
      stampRotation: Math.round(newRotation),
    });
  };

  // Rotate end
  const handleRotatePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rotateStartRef.current?.pointerId === e.pointerId) {
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);
      rotateStartRef.current = null;
      setIsRotating(false);
    }
  };

  // SVG circular text stamp renderer
  const renderCircularStamp = () => {
    const radius = 45;
    const size = 110;
    const center = size / 2;

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ color: config.stampColor, ...distressFilterStyle }}
        className="stamp-ink stamp-ink-circular"
      >
        <defs>
          <path
            id="innerEchoTextArc"
            d={`M ${center - radius},${center} A ${radius},${radius} 0 1,1 ${center + radius},${center} A ${radius},${radius} 0 1,1 ${center - radius},${center}`}
            fill="none"
          />
        </defs>

        {/* Outer and Inner Double Rings */}
        <circle cx={center} cy={center} r={radius + 4} fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx={center} cy={center} r={radius - 2} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3, 3" />

        {/* Circular Outer Text */}
        <text fill="currentColor" fontSize="7.5" fontWeight="800" letterSpacing="0.8">
          <textPath href="#innerEchoTextArc" startOffset="50%" textAnchor="middle">
            {config.stampTextTop || '镜界自白 · 绝密卷宗'} • {config.stampTextBottom || 'SUB-CONSCIOUS ARCHIVE'}
          </textPath>
        </text>

        {/* Center Assessment Text (LLM evaluation words) */}
        <text
          x={center}
          y={center + 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fill="currentColor"
          style={{ fontStyle: 'italic', letterSpacing: '0.05em' }}
        >
          {config.stampTextCenter || '潜意识认证'}
        </text>
      </svg>
    );
  };

  const distressClarity = config.stampClarity || 'medium';
  const distressFilterStyle = config.stampType !== 'wax' && distressClarity !== 'high' ? {
    filter: `url(#stamp-distress-${distressClarity})`,
  } : undefined;

  return (
    <>
      {/* SVG Distress Noise filter for rubber stamps */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="stamp-distress-medium">
            <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="4" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 2.2 -0.9" result="distressed-noise" />
            <feComposite operator="out" in="SourceGraphic" in2="distressed-noise" result="stamp" />
          </filter>
          <filter id="stamp-distress-low">
            <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="4" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3.2 -1.2" result="distressed-noise" />
            <feComposite operator="out" in="SourceGraphic" in2="distressed-noise" result="stamp" />
          </filter>
        </defs>
      </svg>

      <div
        ref={stampRef}
        className={`stamp-container ${isDragging ? 'is-dragging' : ''} ${isRotating ? 'is-rotating' : ''}`}
        style={{
          left: `${config.stampX}%`,
          top: `${config.stampY}%`,
          transform: `translate(-50%, -50%) translateZ(60px) rotate(${config.stampRotation}deg) scale(${config.stampScale})`,
        }}
        onPointerDown={handleStampPointerDown}
        onPointerMove={handleStampPointerMove}
        onPointerUp={handleStampPointerUp}
      >
        {/* Rotate Handle */}
        <div
          className="stamp-rotate-handle"
          onPointerDown={handleRotatePointerDown}
          onPointerMove={handleRotatePointerMove}
          onPointerUp={handleRotatePointerUp}
          title="按住旋转印章"
        >
          <RotateCw size={10} style={{ color: config.accentColor || '#ff70a6' }} />
          <div className="stamp-rotate-line" />
        </div>

        {/* Circular Rubber Stamp */}
        {config.stampType === 'ink-circle' && renderCircularStamp()}

        {/* Rectangular Rubber Stamp */}
        {config.stampType === 'ink-rect' && (
          <div
            className="stamp-ink stamp-ink-rectangular"
            style={{ color: config.stampColor, ...distressFilterStyle }}
          >
            <div style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '1px' }}>
              {config.stampTextTop || '机密安全许可'}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 900, margin: '2px 0', letterSpacing: '1.2px' }}>
              {config.stampTextCenter || '潜意识已封存'}
            </div>
            <div style={{ fontSize: '7.5px', opacity: 0.85, fontWeight: 600 }}>
              {config.stampTextBottom || 'CLASSIFIED SEAL'}
            </div>
          </div>
        )}

        {/* 3D Wax Seal */}
        {config.stampType === 'wax' && (
          <div
            className="stamp-wax-seal"
            style={{ backgroundColor: config.stampColor }}
          >
            <div className="stamp-wax-inner">
              <div style={{ fontSize: '6.5px', letterSpacing: '0.5px', marginBottom: '2px', fontWeight: 700 }}>
                {config.stampTextTop || '镜界自白'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.6px', lineHeight: 1.1 }}>
                {config.stampTextCenter || '绝密封存'}
              </div>
              <div style={{ fontSize: '6.5px', opacity: 0.8, marginTop: '2px', fontWeight: 600 }}>
                {config.stampTextBottom || 'ECHO SEAL'}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
