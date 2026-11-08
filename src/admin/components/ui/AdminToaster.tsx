import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { adminNotify, type ToastItem } from './adminNotify';

export const AdminToaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = adminNotify.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.type === 'error' ? 4500 : 3000);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto min-w-[280px] max-w-[400px] p-3 rounded-lg border border-border bg-background/95 backdrop-blur-xs text-foreground shadow-lg flex items-start justify-between gap-3 text-xs animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-2.5 min-w-0 pt-0.5">
            {toast.type === 'success' && (
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="size-4 text-primary shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              {toast.title && <div className="font-semibold text-foreground">{toast.title}</div>}
              <div className="text-muted-foreground leading-relaxed">{toast.message}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AdminToaster;

