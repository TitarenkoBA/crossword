/**
 * Кнопка — основа всего интерфейса.
 *
 * Правила доступности (docs/ACCESSIBILITY.md):
 *  - не меньше 3rem × 3rem (48 px при обычном масштабе);
 *  - всегда есть текст (значок — только дополнение);
 *  - нажатие — обычный клик (срабатывает при отпускании кнопки мыши над ней,
 *    так что можно «передумать», уведя курсор);
 *  - проходит через защиту от дрожания рук (guard из AppContext).
 */
import type { ReactNode } from 'react';
import { useApp } from '../state/AppContext.tsx';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'plain';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary border-primary',
  secondary: 'bg-secondary text-on-secondary border-line',
  danger: 'bg-danger text-on-danger border-danger',
  plain: 'bg-surface text-text border-line',
};

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  /** Ключ для защиты от дрожания; по умолчанию — текст кнопки. */
  guardKey?: string;
  disabled?: boolean;
  /** Растянуть на всю ширину. */
  block?: boolean;
  /** Крупнее обычного (для главных действий). */
  large?: boolean;
  /** Помельче обычного (для плотных панелей); высота всё равно не меньше 3rem. */
  small?: boolean;
  className?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  testId?: string;
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  guardKey,
  disabled,
  block,
  large,
  small,
  className = '',
  ariaLabel,
  ariaPressed,
  testId,
}: ButtonProps) {
  const { guard } = useApp();
  const key = guardKey ?? (typeof children === 'string' ? children : ariaLabel ?? 'button');
  return (
    <button
      type="button"
      className={
        'inline-flex items-center justify-center min-h-target min-w-target py-2 rounded-lg border-2 ' +
        'font-bold text-center leading-tight ' +
        (large ? 'text-xl py-3 px-4 ' : small ? 'text-base px-2 ' : 'text-lg px-4 ') +
        (block ? 'w-full ' : '') +
        (disabled ? 'opacity-50 ' : '') +
        VARIANTS[variant] +
        ' ' +
        className
      }
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      data-testid={testId}
      onClick={() => guard(key, onClick)}
    >
      {children}
    </button>
  );
}
