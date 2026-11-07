/**
 * Экранная клавиатура: ввод букв только мышью (или пальцем).
 * Клавиши растягиваются по ширине (flex), но не бывают ниже 3rem.
 */
import { KEYBOARD_ROWS } from '../core/letters.ts';
import { useApp } from '../state/AppContext.tsx';
import { Button } from './Button.tsx';

export interface ScreenKeyboardProps {
  onLetter: (letter: string) => void;
  onErase: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleDirection: () => void;
  canToggle: boolean;
  disabled?: boolean;
}

export function ScreenKeyboard({ onLetter, onErase, onPrev, onNext, onToggleDirection, canToggle, disabled }: ScreenKeyboardProps) {
  const { guard } = useApp();
  return (
    <div className="select-none" role="group" aria-label="Экранная клавиатура">
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} className="flex justify-center mb-1">
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              className={
                'kb-key flex-1 min-h-target mx-px rounded-md border-2 border-line bg-surface text-text ' +
                'text-xl font-bold ' +
                (disabled ? 'opacity-50' : '')
              }
              onClick={() => guard('key-' + letter, () => onLetter(letter))}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap -mx-1 mt-1">
        <div className="w-1/2 p-1">
          <Button block onClick={onErase} disabled={disabled} guardKey="erase">
            Стереть
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block onClick={onToggleDirection} disabled={!canToggle} guardKey="toggle">
            ↔↕ Повернуть
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block onClick={onPrev} guardKey="prev-cell">
            ← Назад
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block onClick={onNext} guardKey="next-cell">
            Вперёд →
          </Button>
        </div>
      </div>
    </div>
  );
}
