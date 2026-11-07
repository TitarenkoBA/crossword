/**
 * Игровая логика: состояние разгадывания и все действия пользователя.
 *
 * Это чистые функции без React — их легко тестировать (game.test.ts).
 * React-слой (src/state/) просто вызывает `reduceGame` из useReducer.
 */
import { type Grid, wordAt, letterCells } from './grid.ts';
import type { Direction } from './types.ts';

export interface Cursor {
  cell: number;
  direction: Direction;
}

export interface GameStats {
  /** Сколько букв открыто кнопками «Открыть букву/слово». */
  revealedLetters: number;
  /** Сколько раз показана текстовая подсказка. */
  hintsShown: number;
  /** Сколько раз нажимали «Проверить». */
  checks: number;
}

export interface GameState {
  /** Введённые буквы по индексу клетки ('' — пусто). */
  entries: string[];
  /** Клетки, открытые подсказкой: их нельзя стереть или изменить. */
  revealed: boolean[];
  /** Клетки, помеченные как неверные после проверки (сбрасывается при изменении клетки). */
  wrong: boolean[];
  /** Индексы слов, для которых показана текстовая подсказка. */
  hintsShown: number[];
  cursor: Cursor;
  stats: GameStats;
  /** Пользователь заполнил всё правильно. */
  solved: boolean;
  /** Пользователь нажал «Показать решение». */
  solutionShown: boolean;
}

/** Настройки, влияющие на поведение (берутся из пользовательских настроек). */
export interface GameOptions {
  /** После заполнения слова переходить к следующему незаполненному. */
  autoNextWord: boolean;
  /** Повторный клик по выделенной клетке меняет направление. */
  toggleOnSameCell: boolean;
}

export const DEFAULT_GAME_OPTIONS: GameOptions = { autoNextWord: true, toggleOnSameCell: true };

export type GameAction =
  | { type: 'selectCell'; cell: number }
  | { type: 'selectWord'; word: number }
  | { type: 'input'; letter: string }
  | { type: 'erase' }
  | { type: 'moveInWord'; delta: 1 | -1 }
  | { type: 'arrow'; dir: 'up' | 'down' | 'left' | 'right' }
  | { type: 'nextWord' }
  | { type: 'prevWord' }
  | { type: 'toggleDirection' }
  | { type: 'revealLetter' }
  | { type: 'revealWord' }
  | { type: 'revealAll' }
  | { type: 'checkWord' }
  | { type: 'checkAll' }
  | { type: 'showHint' }
  | { type: 'reset' };

export function initialGameState(grid: Grid): GameState {
  const size = grid.cells.length;
  const first = grid.order[0];
  return {
    entries: new Array(size).fill(''),
    revealed: new Array(size).fill(false),
    wrong: new Array(size).fill(false),
    hintsShown: [],
    cursor: { cell: grid.wordCells[first][0], direction: grid.words[first].direction },
    stats: { revealedLetters: 0, hintsShown: 0, checks: 0 },
    solved: false,
    solutionShown: false,
  };
}

/** Индекс текущего слова. */
export function currentWord(grid: Grid, state: GameState): number {
  const w = wordAt(grid, state.cursor.cell, state.cursor.direction);
  if (w !== undefined) return w;
  // Курсор всегда стоит в клетке с буквой, так что сюда попадаем только при повреждённых данных.
  const other = wordAt(grid, state.cursor.cell, state.cursor.direction === 'across' ? 'down' : 'across');
  return other ?? grid.order[0];
}

export function isFinished(state: GameState): boolean {
  return state.solved || state.solutionShown;
}

export function isWordFilled(grid: Grid, state: GameState, word: number): boolean {
  return grid.wordCells[word].every((i) => state.entries[i] !== '');
}

export function isWordCorrect(grid: Grid, state: GameState, word: number): boolean {
  return grid.wordCells[word].every((i) => state.entries[i] === grid.cells[i]!.solution);
}

/** Доля заполненных клеток, 0…100. */
export function progressPercent(grid: Grid, state: GameState): number {
  const cells = letterCells(grid);
  const filled = cells.filter((i) => state.entries[i] !== '').length;
  return Math.round((filled / cells.length) * 100);
}

function checkSolved(grid: Grid, entries: string[]): boolean {
  return grid.cells.every((c) => !c || entries[c.index] === c.solution);
}

/** Первая пустая клетка слова (или первая клетка, если пустых нет). */
function firstEmpty(grid: Grid, entries: string[], word: number): number {
  const cells = grid.wordCells[word];
  for (const i of cells) if (entries[i] === '') return i;
  return cells[0];
}

function selectWord(grid: Grid, state: GameState, word: number): GameState {
  return {
    ...state,
    cursor: { cell: firstEmpty(grid, state.entries, word), direction: grid.words[word].direction },
  };
}

/** Следующее (или предыдущее) слово в порядке списка вопросов; при onlyIncomplete — пропуская заполненные. */
function neighbourWord(grid: Grid, state: GameState, step: 1 | -1, onlyIncomplete: boolean): number | null {
  const n = grid.order.length;
  const pos = grid.order.indexOf(currentWord(grid, state));
  for (let k = 1; k <= n; k++) {
    const w = grid.order[(((pos + step * k) % n) + n) % n];
    if (!onlyIncomplete || !isWordFilled(grid, state, w)) return w;
  }
  return null;
}

/** Куда поставить курсор после ввода буквы в клетку. */
function advanceAfterInput(grid: Grid, state: GameState, options: GameOptions): GameState {
  const word = currentWord(grid, state);
  const cells = grid.wordCells[word];
  const pos = cells.indexOf(state.cursor.cell);

  // 1) следующая пустая клетка после текущей;
  for (let k = pos + 1; k < cells.length; k++) {
    if (state.entries[cells[k]] === '') return { ...state, cursor: { ...state.cursor, cell: cells[k] } };
  }
  // 2) пустая клетка в начале слова (если начинали с середины);
  for (let k = 0; k < pos; k++) {
    if (state.entries[cells[k]] === '') return { ...state, cursor: { ...state.cursor, cell: cells[k] } };
  }
  // 3) слово заполнено — к следующему незаполненному слову;
  if (options.autoNextWord) {
    const next = neighbourWord(grid, state, 1, true);
    if (next !== null) return selectWord(grid, state, next);
  }
  // 4) иначе просто на клетку вперёд, если она есть.
  if (pos + 1 < cells.length) return { ...state, cursor: { ...state.cursor, cell: cells[pos + 1] } };
  return state;
}

function setCell(state: GameState, cell: number, letter: string): GameState {
  if (state.entries[cell] === letter && !state.wrong[cell]) return state;
  const entries = state.entries.slice();
  const wrong = state.wrong.slice();
  entries[cell] = letter;
  wrong[cell] = false;
  return { ...state, entries, wrong };
}

function reveal(grid: Grid, state: GameState, cells: number[]): GameState {
  const entries = state.entries.slice();
  const revealed = state.revealed.slice();
  const wrong = state.wrong.slice();
  let count = 0;
  for (const i of cells) {
    if (revealed[i]) continue;
    const solution = grid.cells[i]!.solution;
    // Букву, которую пользователь уже вписал правильно, не считаем подсказкой.
    if (entries[i] !== solution) count++;
    entries[i] = solution;
    revealed[i] = true;
    wrong[i] = false;
  }
  return {
    ...state,
    entries,
    revealed,
    wrong,
    stats: { ...state.stats, revealedLetters: state.stats.revealedLetters + count },
  };
}

function check(grid: Grid, state: GameState, cells: number[]): GameState {
  const wrong = state.wrong.slice();
  for (const i of cells) {
    wrong[i] = state.entries[i] !== '' && state.entries[i] !== grid.cells[i]!.solution;
  }
  return { ...state, wrong, stats: { ...state.stats, checks: state.stats.checks + 1 } };
}

const ARROWS = {
  up: { dr: -1, dc: 0, direction: 'down' },
  down: { dr: 1, dc: 0, direction: 'down' },
  left: { dr: 0, dc: -1, direction: 'across' },
  right: { dr: 0, dc: 1, direction: 'across' },
} as const;

function withSolvedFlag(grid: Grid, prev: GameState, next: GameState): GameState {
  if (next.entries === prev.entries || next.solutionShown) return next;
  const solved = checkSolved(grid, next.entries);
  return solved === next.solved ? next : { ...next, solved };
}

/**
 * Главная функция: новое состояние по действию.
 * Если кроссворд закончен (решён или показано решение), изменения сетки игнорируются.
 */
export function reduceGame(
  grid: Grid,
  state: GameState,
  action: GameAction,
  options: GameOptions = DEFAULT_GAME_OPTIONS,
): GameState {
  const finished = isFinished(state);
  const cur = state.cursor.cell;

  switch (action.type) {
    case 'selectCell': {
      const cell = grid.cells[action.cell];
      if (!cell) return state;
      const other: Direction = state.cursor.direction === 'across' ? 'down' : 'across';
      if (action.cell === cur) {
        if (options.toggleOnSameCell && cell[other] !== undefined) {
          return { ...state, cursor: { cell: action.cell, direction: other } };
        }
        return state;
      }
      const direction = cell[state.cursor.direction] !== undefined ? state.cursor.direction : other;
      return { ...state, cursor: { cell: action.cell, direction } };
    }

    case 'selectWord':
      if (!grid.words[action.word]) return state;
      return selectWord(grid, state, action.word);

    case 'toggleDirection': {
      const other: Direction = state.cursor.direction === 'across' ? 'down' : 'across';
      if (wordAt(grid, cur, other) === undefined) return state;
      return { ...state, cursor: { cell: cur, direction: other } };
    }

    case 'nextWord':
    case 'prevWord': {
      const w = neighbourWord(grid, state, action.type === 'nextWord' ? 1 : -1, false);
      return w === null ? state : selectWord(grid, state, w);
    }

    case 'moveInWord': {
      const cells = grid.wordCells[currentWord(grid, state)];
      const pos = cells.indexOf(cur) + action.delta;
      if (pos < 0 || pos >= cells.length) return state;
      return { ...state, cursor: { ...state.cursor, cell: cells[pos] } };
    }

    case 'arrow': {
      const a = ARROWS[action.dir];
      // Стрелка поперёк текущего направления сначала просто поворачивает курсор.
      if (state.cursor.direction !== a.direction && wordAt(grid, cur, a.direction) !== undefined) {
        return { ...state, cursor: { cell: cur, direction: a.direction } };
      }
      let r = Math.floor(cur / grid.width) + a.dr;
      let c = (cur % grid.width) + a.dc;
      while (r >= 0 && r < grid.height && c >= 0 && c < grid.width) {
        const target = grid.cells[r * grid.width + c];
        if (target) {
          const direction = target[a.direction] !== undefined ? a.direction : state.cursor.direction;
          const fixed = target[direction] !== undefined ? direction : a.direction === 'across' ? 'down' : 'across';
          return { ...state, cursor: { cell: target.index, direction: fixed } };
        }
        r += a.dr;
        c += a.dc;
      }
      return state;
    }

    case 'input': {
      if (finished) return state;
      if (state.revealed[cur]) return advanceAfterInput(grid, state, options);
      const next = setCell(state, cur, action.letter);
      return withSolvedFlag(grid, state, advanceAfterInput(grid, next, options));
    }

    case 'erase': {
      if (finished) return state;
      // Если в клетке есть буква — стираем её; иначе шаг назад и стираем там.
      if (state.entries[cur] !== '' && !state.revealed[cur]) {
        return withSolvedFlag(grid, state, setCell(state, cur, ''));
      }
      const cells = grid.wordCells[currentWord(grid, state)];
      const pos = cells.indexOf(cur);
      if (pos <= 0) return state;
      const prev = cells[pos - 1];
      const moved = { ...state, cursor: { ...state.cursor, cell: prev } };
      if (state.revealed[prev]) return moved;
      return withSolvedFlag(grid, state, setCell(moved, prev, ''));
    }

    case 'revealLetter': {
      if (finished) return state;
      const next = reveal(grid, state, [cur]);
      return withSolvedFlag(grid, state, advanceAfterInput(grid, next, options));
    }

    case 'revealWord': {
      if (finished) return state;
      const next = reveal(grid, state, grid.wordCells[currentWord(grid, state)]);
      return withSolvedFlag(grid, state, advanceAfterInput(grid, next, options));
    }

    case 'revealAll': {
      if (finished) return state;
      return { ...reveal(grid, state, letterCells(grid)), solutionShown: true };
    }

    case 'checkWord':
      if (finished) return state;
      return check(grid, state, grid.wordCells[currentWord(grid, state)]);

    case 'checkAll':
      if (finished) return state;
      return check(grid, state, letterCells(grid));

    case 'showHint': {
      const w = currentWord(grid, state);
      if (state.hintsShown.indexOf(w) !== -1) return state;
      return {
        ...state,
        hintsShown: [...state.hintsShown, w],
        stats: { ...state.stats, hintsShown: state.stats.hintsShown + 1 },
      };
    }

    case 'reset':
      return initialGameState(grid);
  }
}
