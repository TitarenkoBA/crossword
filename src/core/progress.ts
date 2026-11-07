/**
 * Сохранение прогресса: компактный формат для localStorage и обратное чтение.
 *
 * Буквы хранятся одной строкой (пустая клетка — точка), булевы массивы —
 * списками индексов. Так прогресс одного кроссворда занимает ~0.5 КБ.
 */
import type { Grid } from './grid.ts';
import { type GameState, initialGameState } from './game.ts';

export interface SavedProgress {
  /** Версия формата. */
  v: 1;
  entries: string;
  revealed: number[];
  wrong: number[];
  hintsShown: number[];
  cursor: GameState['cursor'];
  stats: GameState['stats'];
  solved: boolean;
  solutionShown: boolean;
  /** Время разгадывания, мс. */
  elapsedMs: number;
  /** Доля заполненных клеток (для списка кроссвордов, чтобы не грузить сами кроссворды). */
  percent: number;
  updatedAt: number;
}

const EMPTY = '.';

function indexes(flags: boolean[]): number[] {
  const out: number[] = [];
  flags.forEach((f, i) => f && out.push(i));
  return out;
}

export function serializeProgress(
  state: GameState,
  extra: { elapsedMs: number; percent: number; now?: number },
): SavedProgress {
  return {
    v: 1,
    entries: state.entries.map((e) => e || EMPTY).join(''),
    revealed: indexes(state.revealed),
    wrong: indexes(state.wrong),
    hintsShown: state.hintsShown.slice(),
    cursor: state.cursor,
    stats: state.stats,
    solved: state.solved,
    solutionShown: state.solutionShown,
    elapsedMs: extra.elapsedMs,
    percent: extra.percent,
    updatedAt: extra.now ?? Date.now(),
  };
}

/**
 * Восстанавливает состояние. Если сохранение не подходит к сетке (повреждено
 * или кроссворд изменился после перегенерации) — возвращает null.
 */
export function deserializeProgress(grid: Grid, saved: unknown): GameState | null {
  if (!saved || typeof saved !== 'object') return null;
  const s = saved as Partial<SavedProgress>;
  const size = grid.cells.length;
  if (s.v !== 1 || typeof s.entries !== 'string' || s.entries.length !== size) return null;

  const base = initialGameState(grid);
  const entries = s.entries.split('').map((ch) => (ch === EMPTY ? '' : ch));
  // Буквы могут стоять только в клетках сетки.
  if (entries.some((e, i) => e !== '' && !grid.cells[i])) return null;

  const toFlags = (list: unknown): boolean[] => {
    const flags = new Array(size).fill(false);
    if (Array.isArray(list)) for (const i of list) if (typeof i === 'number' && grid.cells[i]) flags[i] = true;
    return flags;
  };

  const cursor =
    s.cursor && grid.cells[s.cursor.cell]?.[s.cursor.direction] !== undefined ? s.cursor : base.cursor;

  return {
    entries,
    revealed: toFlags(s.revealed),
    wrong: toFlags(s.wrong),
    hintsShown: Array.isArray(s.hintsShown)
      ? s.hintsShown.filter((w) => typeof w === 'number' && w >= 0 && w < grid.words.length)
      : [],
    cursor,
    stats: { ...base.stats, ...(s.stats || {}) },
    solved: !!s.solved,
    solutionShown: !!s.solutionShown,
  };
}
