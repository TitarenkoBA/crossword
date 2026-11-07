/**
 * Проверка корректности кроссворда. Используется в тестах данных
 * (src/data/dataset.test.ts) и в `npm run validate-data`.
 */
import { buildGrid, type Grid } from './grid.ts';
import { ALPHABET } from './letters.ts';
import type { LevelConfig } from './generator.ts';
import type { Puzzle } from './types.ts';

/** Возвращает список проблем (пустой — всё в порядке). */
export function validatePuzzle(puzzle: Puzzle, cfg?: LevelConfig): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(`${puzzle.id}: ${m}`);

  if (puzzle.words.length === 0) {
    err('нет слов');
    return errors;
  }

  let grid: Grid;
  try {
    grid = buildGrid(puzzle);
  } catch (e) {
    err((e as Error).message);
    return errors;
  }

  // Слова и тексты.
  const answers = new Set<string>();
  for (const w of puzzle.words) {
    if (!w.answer.split('').every((ch) => ALPHABET.indexOf(ch) !== -1)) err(`недопустимые буквы в «${w.answer}»`);
    if (answers.has(w.answer)) err(`слово «${w.answer}» повторяется`);
    answers.add(w.answer);
    if (!w.clue.trim()) err(`нет вопроса к «${w.answer}»`);
    if (!w.hint.trim()) err(`нет подсказки к «${w.answer}»`);
  }

  // Каждая непрерывная полоска из 2+ букв по горизонтали/вертикали должна быть словом
  // кроссворда — значит, нет «слипшихся» слов и случайных сочетаний букв.
  const starts = new Set(puzzle.words.map((w) => `${w.direction}:${w.row}:${w.col}:${w.answer.length}`));
  const scan = (direction: 'across' | 'down') => {
    const outer = direction === 'across' ? grid.height : grid.width;
    const inner = direction === 'across' ? grid.width : grid.height;
    for (let a = 0; a < outer; a++) {
      let start = -1;
      for (let b = 0; b <= inner; b++) {
        const r = direction === 'across' ? a : b;
        const c = direction === 'across' ? b : a;
        const filled = b < inner && grid.cells[r * grid.width + c] !== null;
        if (filled && start === -1) start = b;
        if (!filled && start !== -1) {
          const len = b - start;
          if (len >= 2) {
            const key =
              direction === 'across' ? `across:${a}:${start}:${len}` : `down:${start}:${a}:${len}`;
            if (!starts.has(key)) err(`лишнее сочетание букв (${direction}) в ряду ${a} с позиции ${start}`);
          }
          start = -1;
        }
      }
    }
  };
  scan('across');
  scan('down');

  // Связность: от первого слова можно дойти до всех через пересечения.
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length) {
    const w = queue.shift()!;
    for (const idx of grid.wordCells[w]) {
      const cell = grid.cells[idx]!;
      for (const other of [cell.across, cell.down]) {
        if (other !== undefined && !seen.has(other)) {
          seen.add(other);
          queue.push(other);
        }
      }
    }
  }
  if (seen.size !== puzzle.words.length) err('не все слова связаны между собой');

  // Нумерация: 1, 2, 3… в порядке чтения.
  const numbered = grid.cells.filter((c) => c && c.number !== undefined).map((c) => c!.number);
  if (numbered.some((n, i) => n !== i + 1)) err('нарушена нумерация');

  // Рамка без пустых краёв.
  const rowsUsed = new Set(grid.cells.filter(Boolean).map((c) => c!.row));
  const colsUsed = new Set(grid.cells.filter(Boolean).map((c) => c!.col));
  if (!rowsUsed.has(0) || !rowsUsed.has(grid.height - 1) || !colsUsed.has(0) || !colsUsed.has(grid.width - 1)) {
    err('у сетки пустые края');
  }

  if (cfg) {
    if (puzzle.difficulty !== cfg.difficulty) err(`уровень ${puzzle.difficulty}, ожидался ${cfg.difficulty}`);
    if (puzzle.width > cfg.maxWidth || puzzle.height > cfg.maxHeight) err(`сетка ${puzzle.width}×${puzzle.height} больше допустимой`);
    if (puzzle.words.length < cfg.minWords || puzzle.words.length > cfg.maxWords) err(`${puzzle.words.length} слов — вне диапазона`);
    for (const w of puzzle.words) {
      if (w.answer.length < cfg.minLength || w.answer.length > cfg.maxLength) err(`длина «${w.answer}» вне диапазона`);
    }
  }
  return errors;
}
