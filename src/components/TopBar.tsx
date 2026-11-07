import type { ReactNode } from 'react';
import { Button } from './Button.tsx';

export interface TopBarProps {
  title: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Верхняя строка экрана: «назад», заголовок, кнопки справа. */
export function TopBar({ title, backLabel = '← Назад', onBack, right }: TopBarProps) {
  return (
    <header className="flex items-center justify-between flex-wrap bg-surface border-b border-line px-3 py-1 shadow-bar">
      <div className="mr-3 my-1">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            {backLabel}
          </Button>
        )}
      </div>
      <h1 className="flex-1 text-xl font-bold text-center my-1" style={{ minWidth: '10rem' }}>
        {title}
      </h1>
      <div className="ml-3 my-1 flex flex-wrap justify-end">{right}</div>
    </header>
  );
}
