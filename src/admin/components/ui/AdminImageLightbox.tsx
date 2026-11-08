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
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="放大查看照片"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.adminLightbox,
      }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out select-none"
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: Z_LAYER.adminLightboxControl,
        }}
        className="size-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 flex items-center justify-center text-white backdrop-blur-md cursor-pointer transition-colors"
        aria-label="关闭照片预览"
      >
        <X className="size-5" />
      </button>

      <img
        src={imageUrl}
        alt="放大预览"
        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={onClose}
      />
    </div>,
    document.body
  );
};
