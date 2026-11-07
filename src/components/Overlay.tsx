/**
 * Панель поверх экрана (список вопросов, меню «Ещё», поздравление).
 * Открывается и закрывается обычным кликом; Escape — закрыть.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button.tsx';

export interface OverlayProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}

export function Overlay({ title, children, onClose, closeLabel = 'Закрыть' }: OverlayProps) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 z-40 flex items-start justify-center p-3 overflow-y-auto dialog-backdrop">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card shadow-pop w-full max-w-2xl text-text rounded-3xl p-5 my-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold mr-3">{title}</h2>
          <Button onClick={onClose} variant="soft" guardKey="overlay-close">
            × {closeLabel}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
