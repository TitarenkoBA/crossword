/**
 * Модель сетки: из списка слов строим клетки и связи «клетка ↔ слово».
 *
 * Клетки хранятся плоским массивом: индекс = row * width + col.
 * Пустые места (где нет букв) — null.
 */
import type { Direction, Puzzle, PuzzleWord } from './types.ts';

export interface Cell {
  index: number;
  row: number;
  col: number;
  /** Правильная буква. */
  solution: string;
  /** Номер слова, если с этой клетки начинается слово. */
  number?: number;
  /** Индекс слова по горизонтали, проходящего через клетку. */
  across?: number;
  /** Индекс слова по вертикали, проходящего через клетку. */
  down?: number;
}

export interface Grid {
  width: number;
  height: number;
  cells: (Cell | null)[];
  words: PuzzleWord[];
  /** Для каждого слова — индексы его клеток по порядку букв. */
  wordCells: number[][];
  /** Порядок слов для списка вопросов и кнопок «след./пред. слово»: сначала по горизонтали, потом по вертикали. */
  order: number[];
}

export function cellIndexes(word: PuzzleWord, width: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < word.answer.length; i++) {
    const r = word.direction === 'down' ? word.row + i : word.row;
    const c = word.direction === 'across' ? word.col + i : word.col;
    out.push(r * width + c);
  }
  return out;
}

/** Строит сетку. Бросает ошибку, если слова противоречат друг другу или выходят за границы. */
export function buildGrid(puzzle: Puzzle): Grid {
  const { width, height, words } = puzzle;
  const cells: (Cell | null)[] = new Array(width * height).fill(null);
  const wordCells: number[][] = [];

  words.forEach((word, wi) => {
    const endRow = word.direction === 'down' ? word.row + word.answer.length - 1 : word.row;
    const endCol = word.direction === 'across' ? word.col + word.answer.length - 1 : word.col;
    if (word.row < 0 || word.col < 0 || endRow >= height || endCol >= width) {
      throw new Error(`Слово ${word.answer} выходит за пределы сетки ${width}×${height}`);
    }
    const idxs = cellIndexes(word, width);
    idxs.forEach((idx, li) => {
      const letter = word.answer[li];
      let cell = cells[idx];
      if (!cell) {
        cell = { index: idx, row: Math.floor(idx / width), col: idx % width, solution: letter };
        cells[idx] = cell;
      } else if (cell.solution !== letter) {
        throw new Error(`Конфликт букв в клетке ${cell.row}:${cell.col} (${cell.solution} / ${letter})`);
      }
      if (cell[word.direction] !== undefined) {
        throw new Error(`Два слова одного направления в клетке ${cell.row}:${cell.col}`);
      }
      cell[word.direction] = wi;
      if (li === 0) cell.number = word.number;
    });
    wordCells.push(idxs);
  });

  const byDir = (d: Direction) =>
    words
      .map((w, i) => ({ w, i }))
      .filter((x) => x.w.direction === d)
      .sort((a, b) => a.w.number - b.w.number)
      .map((x) => x.i);

  return { width, height, cells, words, wordCells, order: [...byDir('across'), ...byDir('down')] };
}

/** Индекс слова, проходящего через клетку в заданном направлении. */
export function wordAt(grid: Grid, cell: number, direction: Direction): number | undefined {
  const c = grid.cells[cell];
  return c ? c[direction] : undefined;
}

/** Все клетки с буквами. */
export function letterCells(grid: Grid): number[] {
  const out: number[] = [];
  grid.cells.forEach((c) => c && out.push(c.index));
  return out;
}

/** Подпись слова, например «5 по горизонтали». */
export function wordLabel(word: PuzzleWord): string {
  return `${word.number} ${word.direction === 'across' ? 'по горизонтали' : 'по вертикали'}`;
}

/** Склонение: 1 буква, 2 буквы, 5 букв. */
export function lettersCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  let w = 'букв';
  if (mod10 === 1 && mod100 !== 11) w = 'буква';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) w = 'буквы';
  return `${n} ${w}`;
}
