/**
 * Генератор кроссвордов свободной формы.
 *
 * Алгоритм (жадный, с элементом случайности):
 *  1. Первое длинное слово кладём по горизонтали в середину поля.
 *  2. На каждом шаге берём случайную выборку слов из словаря и для каждой
 *     буквы ищем на поле такую же букву, через которую слово можно провести
 *     поперёк. Проверяем правила (см. canPlace) и выбираем лучший вариант:
 *     больше пересечений, реже использованное слово, нужный уровень сложности.
 *  3. Повторяем, пока не наберём нужное число слов или варианты не кончатся.
 *  4. Обрезаем поле по рамке и нумеруем слова в порядке чтения.
 *
 * Вся случайность идёт через rng с фиксированным seed — результат воспроизводим.
 */
import type { DictEntry, WordLevel } from './dictionary.ts';
import { type Rng, randInt } from './random.ts';
import type { Difficulty, Direction, Puzzle, PuzzleWord } from './types.ts';

export interface LevelConfig {
  difficulty: Difficulty;
  /** Сколько кроссвордов сделать. */
  count: number;
  maxWidth: number;
  maxHeight: number;
  minWords: number;
  maxWords: number;
  minLength: number;
  maxLength: number;
  /** Насколько охотно брать слова каждого уровня (0 — не брать совсем). */
  levelWeights: Record<WordLevel, number>;
}

/** Настройки уровней (см. docs/SPEC.md, п. 5.1). */
export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: {
    difficulty: 'easy',
    count: 350,
    maxWidth: 9,
    maxHeight: 9,
    minWords: 8,
    maxWords: 10,
    minLength: 3,
    maxLength: 7,
    levelWeights: { 1: 1, 2: 0, 3: 0 },
  },
  medium: {
    difficulty: 'medium',
    count: 350,
    maxWidth: 13,
    maxHeight: 13,
    minWords: 12,
    maxWords: 16,
    minLength: 3,
    maxLength: 10,
    levelWeights: { 1: 1, 2: 3, 3: 0 },
  },
  hard: {
    difficulty: 'hard',
    count: 300,
    maxWidth: 15,
    maxHeight: 15,
    minWords: 18,
    maxWords: 24,
    minLength: 4,
    maxLength: 13,
    levelWeights: { 1: 0, 2: 1, 3: 3 },
  },
};

/** Слово, разложенное на поле (до перенумерации). */
interface Placed {
  entry: DictEntry;
  row: number;
  col: number;
  direction: Direction;
}

/** Рабочее поле фиксированного размера. */
class Board {
  readonly letters: string[];
  readonly across: boolean[];
  readonly down: boolean[];
  /** Где на поле стоит каждая буква — для быстрого поиска пересечений. */
  readonly byLetter = new Map<string, number[]>();
  readonly placed: Placed[] = [];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const n = width * height;
    this.letters = new Array(n).fill('');
    this.across = new Array(n).fill(false);
    this.down = new Array(n).fill(false);
  }

  at(r: number, c: number): string {
    if (r < 0 || c < 0 || r >= this.height || c >= this.width) return '';
    return this.letters[r * this.width + c];
  }

  /**
   * Можно ли положить слово. Возвращает число пересечений или -1.
   *
   * Правила свободного кроссворда:
   *  - слово целиком на поле;
   *  - перед первой и после последней буквы — пусто (слова не «слипаются» торцами);
   *  - в каждой клетке либо пусто, либо та же буква уже стоит в поперечном слове;
   *  - рядом с новыми буквами (сбоку от направления слова) — пусто, иначе
   *    возникнут случайные «слова» из соседних букв;
   *  - хотя бы одно пересечение (кроме самого первого слова).
   */
  canPlace(word: string, row: number, col: number, direction: Direction): number {
    const len = word.length;
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;
    const endR = row + dr * (len - 1);
    const endC = col + dc * (len - 1);
    if (row < 0 || col < 0 || endR >= this.height || endC >= this.width) return -1;
    if (this.at(row - dr, col - dc) !== '' || this.at(endR + dr, endC + dc) !== '') return -1;

    const same = direction === 'across' ? this.across : this.down;
    let crossings = 0;
    for (let i = 0; i < len; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const idx = r * this.width + c;
      const existing = this.letters[idx];
      if (existing !== '') {
        if (existing !== word[i] || same[idx]) return -1;
        crossings++;
      } else if (this.at(r + dc, c + dr) !== '' || this.at(r - dc, c - dr) !== '') {
        return -1;
      }
    }
    if (crossings === len) return -1;
    return crossings;
  }

  place(entry: DictEntry, row: number, col: number, direction: Direction): void {
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;
    const flags = direction === 'across' ? this.across : this.down;
    for (let i = 0; i < entry.word.length; i++) {
      const idx = (row + dr * i) * this.width + (col + dc * i);
      if (this.letters[idx] === '') {
        this.letters[idx] = entry.word[i];
        const list = this.byLetter.get(entry.word[i]);
        if (list) list.push(idx);
        else this.byLetter.set(entry.word[i], [idx]);
      }
      flags[idx] = true;
    }
    this.placed.push({ entry, row, col, direction });
  }
}

/** Сколько раз слово уже использовано во всём наборе (для равномерности). */
export type Usage = Map<string, number>;

function eligible(entry: DictEntry, cfg: LevelConfig): boolean {
  return (
    cfg.levelWeights[entry.level] > 0 && entry.word.length >= cfg.minLength && entry.word.length <= cfg.maxLength
  );
}

/** Вес слова при выборе: нужный уровень и редко использованные слова — охотнее. */
function weight(entry: DictEntry, cfg: LevelConfig, usage: Usage): number {
  return cfg.levelWeights[entry.level] / (1 + (usage.get(entry.word) || 0)) ** 2;
}

/** Случайная взвешенная выборка кандидатов. */
function sample(pool: DictEntry[], cfg: LevelConfig, usage: Usage, used: Set<string>, rng: Rng, size: number) {
  const maxW = Math.max(...[1, 2, 3].map((l) => cfg.levelWeights[l as WordLevel]));
  const out: DictEntry[] = [];
  if (pool.length === 0) return out;
  for (let tries = 0; tries < size * 8 && out.length < size; tries++) {
    const e = pool[Math.floor(rng() * pool.length)];
    if (used.has(e.word)) continue;
    if (rng() * maxW < weight(e, cfg, usage)) out.push(e);
  }
  return out;
}

/** Перенумерация слов в порядке чтения и обрезка поля по рамке. */
function finalize(board: Board, cfg: LevelConfig): Omit<Puzzle, 'id' | 'index'> {
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -1;
  let maxC = -1;
  for (const p of board.placed) {
    const len = p.entry.word.length;
    minR = Math.min(minR, p.row);
    minC = Math.min(minC, p.col);
    maxR = Math.max(maxR, p.direction === 'down' ? p.row + len - 1 : p.row);
    maxC = Math.max(maxC, p.direction === 'across' ? p.col + len - 1 : p.col);
  }
  const shifted = board.placed.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }));
  const width = maxC - minC + 1;
  const height = maxR - minR + 1;

  const starts = [...new Set(shifted.map((p) => p.row * width + p.col))].sort((a, b) => a - b);
  const numberOf = new Map(starts.map((s, i) => [s, i + 1]));

  const words: PuzzleWord[] = shifted
    .map((p) => ({
      number: numberOf.get(p.row * width + p.col)!,
      direction: p.direction,
      row: p.row,
      col: p.col,
      answer: p.entry.word,
      clue: p.entry.clue,
      hint: p.entry.hint,
    }))
    .sort((a, b) => a.number - b.number || (a.direction === 'across' ? -1 : 1));

  return { difficulty: cfg.difficulty, width, height, words };
}

export interface GenerateOptions {
  /** Сколько слов-кандидатов рассматривать на каждом шаге. */
  sampleSize?: number;
}

/**
 * Пытается построить один кроссворд. Возвращает null, если не удалось
 * набрать минимальное число слов (тогда вызывающий код пробует ещё раз).
 */
export function generatePuzzle(
  pool: DictEntry[],
  cfg: LevelConfig,
  rng: Rng,
  usage: Usage,
  options: GenerateOptions = {},
): Omit<Puzzle, 'id' | 'index'> | null {
  const sampleSize = options.sampleSize ?? 250;
  const candidates = pool.filter((e) => eligible(e, cfg));
  if (candidates.length === 0) return null;

  const board = new Board(cfg.maxWidth, cfg.maxHeight);
  const used = new Set<string>();
  const target = randInt(rng, cfg.minWords, cfg.maxWords);

  // Первое слово — достаточно длинное, по горизонтали, ближе к середине.
  const minFirst = Math.min(cfg.maxLength, Math.ceil(cfg.maxWidth * 0.6));
  const firsts = sample(
    candidates.filter((e) => e.word.length >= minFirst && e.word.length <= cfg.maxWidth),
    cfg,
    usage,
    used,
    rng,
    1,
  );
  if (firsts.length === 0) return null;
  const first = firsts[0];
  const row = Math.floor(cfg.maxHeight / 2) + randInt(rng, -1, 1);
  const col = randInt(rng, 0, cfg.maxWidth - first.word.length);
  board.place(first, row, col, 'across');
  used.add(first.word);

  let misses = 0;
  while (board.placed.length < target && misses < 4) {
    let best: { entry: DictEntry; row: number; col: number; direction: Direction; score: number } | null = null;
    for (const entry of sample(candidates, cfg, usage, used, rng, sampleSize)) {
      const word = entry.word;
      for (let i = 0; i < word.length; i++) {
        const cells = board.byLetter.get(word[i]);
        if (!cells) continue;
        for (const idx of cells) {
          // Новое слово идёт поперёк уже стоящего в этой клетке.
          if (board.across[idx] && board.down[idx]) continue;
          const direction: Direction = board.across[idx] ? 'down' : 'across';
          const r = Math.floor(idx / board.width) - (direction === 'down' ? i : 0);
          const c = (idx % board.width) - (direction === 'across' ? i : 0);
          const crossings = board.canPlace(word, r, c, direction);
          if (crossings < 1) continue;
          const score = crossings * 2 + weight(entry, cfg, usage) * 2 + rng();
          if (!best || score > best.score) best = { entry, row: r, col: c, direction, score };
        }
      }
    }
    if (!best) {
      misses++;
      continue;
    }
    board.place(best.entry, best.row, best.col, best.direction);
    used.add(best.entry.word);
  }

  if (board.placed.length < cfg.minWords) return null;
  return finalize(board, cfg);
}

/** Подпись набора слов — чтобы не было двух кроссвордов из одних и тех же слов. */
function signature(p: Omit<Puzzle, 'id' | 'index'>): string {
  return p.words
    .map((w) => w.answer)
    .sort()
    .join(',');
}

export function puzzleId(difficulty: Difficulty, index: number): string {
  return `${difficulty}-${String(index).padStart(4, '0')}`;
}

/** Генерирует все кроссворды уровня. Бросает ошибку, если словаря не хватает. */
export function generateLevel(
  pool: DictEntry[],
  cfg: LevelConfig,
  rng: Rng,
  options: GenerateOptions = {},
): { puzzles: Puzzle[]; usage: Usage } {
  const usage: Usage = new Map();
  const seen = new Set<string>();
  const puzzles: Puzzle[] = [];
  const maxAttempts = cfg.count * 30;
  let attempts = 0;
  while (puzzles.length < cfg.count) {
    if (++attempts > maxAttempts) {
      throw new Error(
        `Не удалось сгенерировать ${cfg.count} кроссвордов уровня ${cfg.difficulty} ` +
          `(получилось ${puzzles.length}). Добавьте слов в словарь.`,
      );
    }
    const p = generatePuzzle(pool, cfg, rng, usage, options);
    if (!p) continue;
    const sig = signature(p);
    if (seen.has(sig)) continue;
    seen.add(sig);
    for (const w of p.words) usage.set(w.answer, (usage.get(w.answer) || 0) + 1);
    const index = puzzles.length + 1;
    puzzles.push({ id: puzzleId(cfg.difficulty, index), index, ...p });
  }
  return { puzzles, usage };
}
