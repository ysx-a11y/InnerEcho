import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Smartphone, Download, RotateCcw, Layers } from 'lucide-react';
import { ResultCard3D } from './ResultCard3D';
import { Card3DControls } from './Card3DControls';
import type { Card3DConfig } from './types';
import { Z_LAYER } from '../../utils/zLayers';

interface Card3DStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Card3DConfig;
  onChange: React.Dispatch<React.SetStateAction<Card3DConfig>>;
  onExportCard: () => void;
  onExportDualCard?: () => void;
  onExportWallpaper: () => void;
  isExportingCard: boolean;
  isExportingDualCard?: boolean;
  isExportingWallpaper: boolean;
  exportRef: React.RefObject<HTMLDivElement | null>;
  availablePhotos?: string[];
  onResetToDefault: () => void;
}

export const Card3DStudioModal: React.FC<Card3DStudioModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onExportCard,
  onExportDualCard,
  onExportWallpaper,
  isExportingCard,
  isExportingDualCard = false,
  isExportingWallpaper,
  exportRef,
  availablePhotos = [],
  onResetToDefault,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.userModal,
        background: 'rgba(10, 4, 15, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: 'clamp(0.75rem, 3vw, 1.5rem) 1rem 3rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header Toolbar */}
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.65rem',
          borderBottom: '1px solid rgba(255, 112, 166, 0.2)',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(10, 4, 15, 0.85)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255, 112, 166, 0.15)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={14} color="#ff70a6" />
          </span>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
              3D 实体自白卡定制工坊
            </h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              自由拖拽角度 · 翻转印记 · 保存壁纸与实体卡
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          aria-label="关闭工坊"
        >
          <X size={16} />
        </button>
      </div>

      {/* 3D Interactive Card Preview */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          margin: '0 auto',
        }}
      >
        <ResultCard3D
          config={config}
          onChange={onChange}
          exportRef={exportRef}
          isExporting={isExportingCard}
        />

        {/* Studio Controls */}
        <Card3DControls
          config={config}
          onChange={onChange}
          onExport={onExportCard}
          isExporting={isExportingCard}
          onExportDualCard={onExportDualCard}
          isExportingDualCard={isExportingDualCard}
          availablePhotos={availablePhotos}
          onResetToDefault={onResetToDefault}
        />

        {/* Additional Quick Actions in Studio */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            gap: '0.6rem',
            justifyContent: 'center',
            marginTop: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {onExportDualCard && (
            <button
              onClick={onExportDualCard}
              disabled={isExportingDualCard}
              className="btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 1rem',
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'rgba(192, 132, 252, 0.4)',
                background: 'rgba(192, 132, 252, 0.08)',
              }}
            >
              <Layers size={14} color="#c084fc" />
              <span>{isExportingDualCard ? '生成双面卡中...' : '保存表里双面对开卡 (16:9)'}</span>
            </button>
          )}

          <button
            onClick={onExportWallpaper}
            disabled={isExportingWallpaper}
            className="btn-secondary"
            style={{
              fontSize: '0.8rem',
              padding: '0.45rem 1rem',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Smartphone size={14} color="#80f3ff" />
            <span>{isExportingWallpaper ? '生成壁纸中...' : '保存手机壁纸 (16:9)'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
