import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  content: string;
}

interface AdminToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const AdminToast: React.FC<AdminToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-in"
          style={{
            pointerEvents: 'auto',
            minWidth: 240,
            maxWidth: 360,
            padding: '0.65rem 0.95rem',
            borderRadius: 12,
            background: 'linear-gradient(145deg, rgba(28, 14, 38, 0.96) 0%, rgba(16, 8, 22, 0.98) 100%)',
            border: `1px solid ${
              toast.type === 'success'
                ? 'rgba(79, 209, 161, 0.4)'
                : toast.type === 'error'
                ? 'rgba(239, 68, 68, 0.4)'
                : 'rgba(255, 112, 166, 0.4)'
            }`,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 112, 166, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#fff0f5' }}>
            {toast.type === 'success' && <CheckCircle2 size={15} color="#4fd1a1" />}
            {toast.type === 'error' && <AlertCircle size={15} color="#ef4444" />}
            {toast.type === 'info' && <Info size={15} color="#ff70a6" />}
            <span style={{ fontWeight: 600 }}>{toast.content}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--admin-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: 2,
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
};
