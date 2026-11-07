/**
 * Экранная клавиатура: ввод букв только мышью (или пальцем).
 *
 * Три ряда ЙЦУКЕН; во втором ряду — «Повернуть», в третьем — «Назад»,
 * «Вперёд» и «Стереть», чтобы клавиатура была компактной по высоте
 * и помещалась под сеткой на экране 1024×768. На узких экранах (compact)
 * управляющие клавиши вынесены в два отдельных ряда.
 * Клавиши растягиваются по ширине (flex), высота — не меньше 3rem.
 */
import type { ReactNode } from 'react';
import { KEYBOARD_ROWS } from '../core/letters.ts';
import { useApp } from '../state/AppContext.tsx';

export interface ScreenKeyboardProps {
  onLetter: (letter: string) => void;
  onErase: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleDirection: () => void;
  canToggle: boolean;
  disabled?: boolean;
  /** Узкий экран: управляющие клавиши — отдельными рядами. */
  compact?: boolean;
}

interface KeyProps {
  label: ReactNode;
  ariaLabel?: string;
  guardKey: string;
  onPress: () => void;
  disabled?: boolean;
  /** Во сколько раз шире обычной клавиши. */
  grow?: number;
  small?: boolean;
}

function Key({ label, ariaLabel, guardKey, onPress, disabled, grow = 1, small }: KeyProps) {
  const { guard } = useApp();
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      className={
        'kb-key min-h-target mx-px px-1 rounded-md border-2 border-line bg-surface text-text font-bold leading-tight ' +
        (small ? 'text-base ' : 'text-xl ') +
        (disabled ? 'opacity-50' : '')
      }
      style={{ flexGrow: grow, flexShrink: 1, flexBasis: 0, minWidth: 0, overflow: 'hidden', wordWrap: 'break-word' }}
      onClick={() => guard(guardKey, onPress)}
    >
      {label}
    </button>
  );
}

export function ScreenKeyboard({ onLetter, onErase, onPrev, onNext, onToggleDirection, canToggle, disabled, compact }: ScreenKeyboardProps) {
  const letters = (row: string[]) =>
    row.map((l) => <Key key={l} label={l} guardKey={'key-' + l} onPress={() => onLetter(l)} disabled={disabled} />);
  const toggle = <Key label="↔↕ Повернуть" guardKey="toggle" onPress={onToggleDirection} disabled={!canToggle} grow={2} small />;
  const prev = <Key label="← Назад" guardKey="prev-cell" onPress={onPrev} grow={1.5} small />;
  const next = <Key label="Вперёд →" guardKey="next-cell" onPress={onNext} grow={1.5} small />;
  const erase = <Key label="Стереть" guardKey="erase" onPress={onErase} disabled={disabled} grow={2} small />;
  return (
    <div className="select-none" role="group" aria-label="Экранная клавиатура">
      <div className="flex mb-1">{letters(KEYBOARD_ROWS[0])}</div>
      <div className="flex mb-1">
        {letters(KEYBOARD_ROWS[1])}
        {!compact && toggle}
      </div>
      <div className="flex">
        {!compact && prev}
        {letters(KEYBOARD_ROWS[2])}
        {!compact && next}
        {!compact && erase}
      </div>
      {compact && (
        <>
          <div className="flex mt-1">
            {prev}
            {next}
          </div>
          <div className="flex mt-1">
            {toggle}
            {erase}
          </div>
        </>
      )}
    </div>
  );
}
