import { RotateCcw, X } from 'lucide-react';
import type { ToastItem } from '@/types';

interface ToastBarProps {
  toast: ToastItem | null;
  onDismiss: () => void;
}

export function ToastBar({ toast, onDismiss }: ToastBarProps) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="max-w-xl mx-auto flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface border border-lineStrong shadow-lg animate-in">
          <span className="text-xs font-medium text-ink">{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                onDismiss();
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline shrink-0"
            >
              <RotateCcw size={12} />
              {toast.undoLabel || 'Desfazer'}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar aviso"
            className="text-muted hover:text-ink p-0.5 shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
