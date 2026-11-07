/**
 * Сетка кроссворда.
 *
 * Без CSS Grid (его нет в Chrome 49): строки — flex-ряды клеток фиксированного
 * размера в пикселях. Размер клетки вычисляется из доступного места
 * (cellSize от родителя).
 *
 * Состояния клетки различаются не только цветом:
 *  - текущая клетка — жёлтая + толстая рамка;
 *  - клетки текущего слова — голубые + рамка потолще;
 *  - ошибка после проверки — красная буква, перечёркнутая, и значок «×»;
 *  - открытая подсказкой — значок «•» в углу.
 */
import { memo } from 'react';
import type { Grid } from '../core/grid.ts';
import type { GameState } from '../core/game.ts';
import { currentWord } from '../core/game.ts';
import { useApp } from '../state/AppContext.tsx';

export interface CrosswordGridProps {
  grid: Grid;
  state: GameState;
  cellSize: number;
  onCellClick: (cell: number) => void;
}

interface CellProps {
  index: number;
  size: number;
  letter: string;
  number?: number;
  active: boolean;
  inWord: boolean;
  wrong: boolean;
  revealed: boolean;
  label: string;
  onClick: (cell: number) => void;
}

const Cell = memo(function Cell({ index, size, letter, number, active, inWord, wrong, revealed, label, onClick }: CellProps) {
  const { guard } = useApp();
  const border = active ? 4 : inWord ? 3 : 1;
  return (
    <button
      type="button"
      data-cell={index}
      aria-label={label}
      aria-pressed={active}
      className={
        'grid-cell relative flex-none p-0 font-bold leading-none ' +
        (active ? 'bg-cell-active text-cell-active-text ' : inWord ? 'bg-cell-word text-cell-text ' : 'bg-cell text-cell-text ') +
        (wrong ? 'cell-wrong ' : '')
      }
      style={{
        width: size,
        height: size,
        borderWidth: border,
        borderStyle: 'solid',
        fontSize: Math.round(size * 0.55),
        // Соседние клетки делят рамку: сдвигаем на 1px внутрь.
        marginRight: -1,
        marginBottom: -1,
        zIndex: active ? 3 : inWord ? 2 : 1,
      }}
      onClick={() => guard('cell-' + index, () => onClick(index))}
    >
      {number !== undefined && (
        <span className="absolute top-0 left-0 font-normal" style={{ fontSize: Math.max(9, Math.round(size * 0.26)), padding: 1 }}>
          {number}
        </span>
      )}
      {wrong && (
        <span className="absolute top-0 right-0 text-error" aria-hidden="true" style={{ fontSize: Math.max(9, Math.round(size * 0.28)), padding: 1 }}>
          ×
        </span>
      )}
      {revealed && (
        <span className="absolute bottom-0 right-0" aria-hidden="true" style={{ fontSize: Math.max(9, Math.round(size * 0.3)), padding: 1 }}>
          •
        </span>
      )}
      <span className={wrong ? 'text-error line-through' : ''}>{letter}</span>
    </button>
  );
});

export function CrosswordGrid({ grid, state, cellSize, onCellClick }: CrosswordGridProps) {
  const word = currentWord(grid, state);
  const wordCells = new Set(grid.wordCells[word]);
  const rows = [];
  for (let r = 0; r < grid.height; r++) {
    const cells = [];
    for (let c = 0; c < grid.width; c++) {
      const i = r * grid.width + c;
      const cell = grid.cells[i];
      if (!cell) {
        cells.push(<div key={i} className="flex-none" style={{ width: cellSize, height: cellSize, marginRight: -1, marginBottom: -1 }} />);
        continue;
      }
      const words = [cell.across, cell.down].filter((w) => w !== undefined).map((w) => grid.words[w!]);
      const where = words.map((w) => `${w.number} ${w.direction === 'across' ? 'по горизонтали' : 'по вертикали'}`).join(', ');
      const letter = state.entries[i];
      cells.push(
        <Cell
          key={i}
          index={i}
          size={cellSize}
          letter={letter}
          number={cell.number}
          active={state.cursor.cell === i}
          inWord={wordCells.has(i)}
          wrong={state.wrong[i]}
          revealed={state.revealed[i]}
          label={`Клетка: ${where}. ${letter ? 'Буква ' + letter : 'Пусто'}${state.wrong[i] ? ', ошибка' : ''}`}
          onClick={onCellClick}
        />,
      );
    }
    rows.push(
      <div key={r} className="flex">
        {cells}
      </div>,
    );
  }
  return (
    <div
      className="crossword-grid inline-block"
      role="grid"
      aria-label="Сетка кроссворда"
      style={{ paddingRight: 1, paddingBottom: 1 }}
    >
      {rows}
    </div>
  );
}

/** Размер клетки, чтобы сетка поместилась в заданную область. */
export function fitCellSize(grid: { width: number; height: number }, width: number, height: number, min = 24, max = 72): number {
  const size = Math.floor(Math.min(width / grid.width, height / grid.height));
  return Math.max(min, Math.min(max, size));
}
