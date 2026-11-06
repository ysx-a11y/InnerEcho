import React from 'react';
import { createPortal } from 'react-dom';
import { Siren, X } from 'lucide-react';
import { Z_LAYER } from '../utils/zLayers';

interface InterrogationClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 审讯室暂时关闭时的提示弹窗。
 *
 * 只承担「现在不能进」这一件事，不放任何说明性文案；
 * 重新开放时把 App 里的入口改回 navigateTo('interrogation') 即可。
 */
export const InterrogationClosedModal: React.FC<InterrogationClosedModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="animate-fade-in"
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_LAYER.userModal,
        background: 'rgba(8, 3, 12, 0.86)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.2rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="暂未开启"
        className="glass-card animate-scale-up"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 300,
          background: 'linear-gradient(150deg, rgba(26, 10, 36, 0.97) 0%, rgba(10, 4, 15, 0.99) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.35)',
          borderRadius: 20,
          padding: '1.7rem 1.25rem 1.35rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 26px rgba(255, 112, 166, 0.16)',
          boxSizing: 'border-box',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={13} />
        </button>

        <Siren size={24} color="#ff70a6" />
        <div style={{ fontWeight: 800, fontSize: '1.02rem', marginTop: '0.65rem', color: '#f5e9f2' }}>
          暂未开启
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '1.15rem',
            width: '100%',
            padding: '0.6rem 1rem',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #ff70a6, #e100ff)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
          }}
        >
          知道了
        </button>
      </div>
    </div>,
    document.body
  );
};
