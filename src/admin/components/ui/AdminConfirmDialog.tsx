import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, Loader2, Info } from 'lucide-react';

export interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = '确认执行',
  cancelText = '取消',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        background: 'rgba(5, 2, 8, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxSizing: 'border-box',
      }}
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'linear-gradient(145deg, #1c0c24 0%, #120617 100%)',
          border: danger ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 112, 166, 0.35)',
          borderRadius: 20,
          padding: '1.5rem',
          boxShadow: danger
            ? '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 30px rgba(239, 68, 68, 0.2)'
            : '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 112, 166, 0.15)',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 112, 166, 0.15)',
              border: danger ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 112, 166, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {danger ? <Trash2 size={20} color="#ef4444" /> : <AlertTriangle size={20} color="#ff70a6" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: '0 0 0.35rem 0',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#fff0f5',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                color: 'rgba(255, 240, 245, 0.7)',
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1.3,
              padding: '0.65rem',
              borderRadius: 10,
              background: danger
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #ff70a6 0%, #aa26da 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: danger ? '0 0 15px rgba(239, 68, 68, 0.4)' : '0 0 15px rgba(255, 112, 166, 0.3)',
            }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
