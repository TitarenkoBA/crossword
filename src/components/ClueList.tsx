/**
 * Список всех вопросов: по горизонтали и по вертикали.
 * Клик по вопросу — переход к слову. Решённые слова отмечены галочкой и словом «готово».
 */
import type { Grid } from '../core/grid.ts';
import { currentWord, isWordCorrect, isWordFilled, type GameState } from '../core/game.ts';
import { useApp } from '../state/AppContext.tsx';

export interface ClueListProps {
  grid: Grid;
  state: GameState;
  onSelect: (word: number) => void;
}

export function ClueList({ grid, state, onSelect }: ClueListProps) {
  const { guard } = useApp();
  const active = currentWord(grid, state);
  const section = (title: string, dir: 'across' | 'down') => {
    const items = grid.order.filter((w) => grid.words[w].direction === dir);
    return (
      <div className="mb-3">
        <h3 className="text-xl font-bold px-3 pt-2">{title}</h3>
        <ul>
          {items.map((w) => {
            const word = grid.words[w];
            const filled = isWordFilled(grid, state, w);
            const done = filled && (state.solved || state.solutionShown || isWordCorrect(grid, state, w));
            return (
              <li key={w}>
                <button
                  type="button"
                  className={
                    'w-full text-left min-h-target px-3 py-2 text-lg border-b border-line ' +
                    (w === active ? 'bg-cell-active text-cell-active-text font-bold' : 'bg-surface text-text')
                  }
                  aria-current={w === active ? 'true' : undefined}
                  onClick={() => guard('clue-' + w, () => onSelect(w))}
                >
                  <span className="font-bold">{word.number}.</span>{' '}
                  <span className={filled ? 'line-through' : ''}>{word.clue}</span>
                  {filled && <span className="font-bold">{done ? ' √ готово' : ' — заполнено'}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };
  return (
    <div>
      {section('По горизонтали', 'across')}
      {section('По вертикали', 'down')}
    </div>
  );
}
