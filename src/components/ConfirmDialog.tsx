/**
 * Окно подтверждения с двумя большими кнопками.
 * Фокус по умолчанию на безопасной кнопке «Нет»; Escape — тоже «Нет».
 */
import { useEffect, useRef } from 'react';
import { Button } from './Button.tsx';

export interface ConfirmDialogProps {
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel = 'Да',
  cancelLabel = 'Нет',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cancel = box.current?.querySelector<HTMLButtonElement>('[data-cancel] button');
    cancel?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    // top/right/bottom/left вместо `inset` — для Chrome 49.
    <div className="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center p-4 dialog-backdrop">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="card shadow-pop w-full max-w-lg text-text rounded-3xl p-6"
      >
        <h2 id="dialog-title" className="text-2xl font-bold mb-2">
          {title}
        </h2>
        {text && <p className="text-lg text-muted mb-6">{text}</p>}
        <div className="flex flex-wrap -m-2">
          <div className="flex-1 p-2" style={{ minWidth: '10rem' }} data-cancel>
            <Button block large onClick={onCancel} variant="primary" guardKey="dialog-cancel">
              {cancelLabel}
            </Button>
          </div>
          <div className="flex-1 p-2" style={{ minWidth: '10rem' }}>
            <Button block large onClick={onConfirm} variant={danger ? 'danger' : 'secondary'} guardKey="dialog-confirm">
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
