import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Z_LAYER } from '../../../utils/zLayers';

export interface AdminImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * 管理端全屏大图预览 Lightbox。
 * 强制挂载至 document.body 并赋予最高 z-index (1000000)，
 * 彻底解决被卷宗详情、填写人全景等各级高 z-index 弹窗遮罩遮挡的问题。
 */
export const AdminImageLightbox: React.FC<AdminImageLightboxProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    if (!imageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return createPortal(
    <div
      className="admin-zoomed-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="放大查看照片"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.adminLightbox,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '50%',
          width: '2.5rem',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          zIndex: Z_LAYER.adminLightboxControl,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        aria-label="关闭照片预览"
      >
        <X size={18} />
      </button>

      <img
        src={imageUrl}
        alt="放大预览"
        className="admin-zoomed-img"
        onClick={onClose}
      />
    </div>,
    document.body
  );
};
