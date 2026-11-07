import { describe, expect, it } from 'vitest';
import { buildGrid } from './grid.ts';
import {
  type GameAction,
  type GameOptions,
  type GameState,
  DEFAULT_GAME_OPTIONS,
  currentWord,
  initialGameState,
  isFinished,
  isWordCorrect,
  isWordFilled,
  progressPercent,
  reduceGame,
} from './game.ts';
import { SMALL_PUZZLE } from '../test/fixtures.ts';

const grid = buildGrid(SMALL_PUZZLE);

function run(actions: GameAction[], options: GameOptions = DEFAULT_GAME_OPTIONS, from?: GameState): GameState {
  return actions.reduce((s, a) => reduceGame(grid, s, a, options), from ?? initialGameState(grid));
}
const type = (word: string): GameAction[] => word.split('').map((letter) => ({ type: 'input', letter }));
const text = (s: GameState) => s.entries.map((e, i) => (grid.cells[i] ? e || '_' : '.')).join('');

describe('начальное состояние', () => {
  it('курсор в начале первого слова по горизонтали', () => {
    const s = initialGameState(grid);
    expect(s.cursor).toEqual({ cell: 0, direction: 'across' });
    expect(text(s)).toBe('___...._....___');
    expect(s.entries.every((e) => e === '')).toBe(true);
    expect(progressPercent(grid, s)).toBe(0);
  });
});

describe('выбор клеток', () => {
  it('клик по пустому месту ничего не делает', () => {
    const s = initialGameState(grid);
    expect(run([{ type: 'selectCell', cell: 3 }])).toEqual(s);
  });

  it('клик по другой клетке сохраняет направление, если возможно', () => {
    const s = run([{ type: 'selectCell', cell: 13 }]);
    expect(s.cursor).toEqual({ cell: 13, direction: 'across' });
  });

  it('клик по клетке только с вертикальным словом меняет направление', () => {
    const s = run([{ type: 'selectCell', cell: 7 }]);
    expect(s.cursor).toEqual({ cell: 7, direction: 'down' });
  });

  it('повторный клик по пересечению меняет направление', () => {
    const s = run([
      { type: 'selectCell', cell: 2 },
      { type: 'selectCell', cell: 2 },
    ]);
    expect(s.cursor).toEqual({ cell: 2, direction: 'down' });
    expect(currentWord(grid, s)).toBe(1);
  });

  it('повторный клик не меняет направление, если это выключено', () => {
    const s = run(
      [
        { type: 'selectCell', cell: 2 },
        { type: 'selectCell', cell: 2 },
      ],
      { ...DEFAULT_GAME_OPTIONS, toggleOnSameCell: false },
    );
    expect(s.cursor.direction).toBe('across');
  });

  it('повторный клик по клетке без пересечения ничего не меняет', () => {
    const s = run([{ type: 'selectCell', cell: 0 }]);
    expect(s.cursor).toEqual({ cell: 0, direction: 'across' });
  });

  it('выбор слова ставит курсор на первую пустую клетку', () => {
    const s = run([...type('К'), { type: 'selectWord', word: 0 }]);
    expect(s.cursor).toEqual({ cell: 1, direction: 'across' });
    expect(run([{ type: 'selectWord', word: 1 }]).cursor).toEqual({ cell: 2, direction: 'down' });
    expect(run([{ type: 'selectWord', word: 99 }])).toEqual(initialGameState(grid));
  });

  it('смена направления работает только на пересечении', () => {
    expect(run([{ type: 'toggleDirection' }]).cursor.direction).toBe('across');
    const s = run([{ type: 'selectCell', cell: 12 }, { type: 'toggleDirection' }]);
    expect(s.cursor).toEqual({ cell: 12, direction: 'down' });
  });
});

describe('ввод букв', () => {
  it('буква заполняет клетку и курсор идёт дальше', () => {
    const s = run(type('К'));
    expect(s.entries[0]).toBe('К');
    expect(s.cursor.cell).toBe(1);
  });

  it('после заполнения слова курсор переходит к следующему незаполненному', () => {
    const s = run(type('КОТ'));
    expect(currentWord(grid, s)).toBe(2); // КИТ
    expect(s.cursor).toEqual({ cell: 12, direction: 'across' });
    expect(isWordFilled(grid, s, 0)).toBe(true);
    expect(isWordCorrect(grid, s, 0)).toBe(true);
  });

  it('без автоперехода курсор остаётся в слове', () => {
    const s = run(type('КОТ'), { ...DEFAULT_GAME_OPTIONS, autoNextWord: false });
    expect(s.cursor).toEqual({ cell: 2, direction: 'across' });
  });

  it('пропускает уже заполненные клетки и возвращается к пустым в начале', () => {
    const s = run([{ type: 'selectCell', cell: 1 }, ...type('О'), ...type('Т')]);
    // после «О» в клетке 1 курсор на 2, после «Т» — на пустую клетку 0 в начале слова
    expect(s.cursor.cell).toBe(0);
  });

  it('распознаёт решение', () => {
    const s = run([...type('КОТ'), ...type('КИТ'), { type: 'selectWord', word: 1 }, ...type('О')]);
    expect(s.solved).toBe(true);
    expect(isFinished(s)).toBe(true);
    expect(progressPercent(grid, s)).toBe(100);
  });

  it('после решения ввод и стирание игнорируются', () => {
    const solved = run([...type('КОТ'), ...type('КИТ'), { type: 'selectWord', word: 1 }, ...type('О')]);
    expect(run([{ type: 'erase' }, ...type('Я')], DEFAULT_GAME_OPTIONS, solved).entries).toEqual(solved.entries);
  });

  it('неверные буквы не дают решения', () => {
    const s = run([...type('КОТ'), ...type('КИТ'), { type: 'selectWord', word: 1 }, ...type('А')]);
    expect(s.solved).toBe(false);
    expect(progressPercent(grid, s)).toBe(100);
  });

  it('на последней клетке последнего незаполненного слова курсор остаётся на месте', () => {
    const s = run([{ type: 'selectWord', word: 1 }, ...type('ТОК')], { ...DEFAULT_GAME_OPTIONS, autoNextWord: false });
    expect(s.cursor).toEqual({ cell: 12, direction: 'down' });
  });
});

describe('стирание', () => {
  it('стирает букву в текущей клетке', () => {
    const s = run([...type('К'), { type: 'moveInWord', delta: -1 }, { type: 'erase' }]);
    expect(s.entries[0]).toBe('');
    expect(s.cursor.cell).toBe(0);
  });

  it('в пустой клетке — шаг назад и стирание', () => {
    const s = run([...type('КО'), { type: 'erase' }]);
    expect(s.entries[1]).toBe('');
    expect(s.cursor.cell).toBe(1);
  });

  it('в начале слова ничего не делает', () => {
    expect(run([{ type: 'erase' }])).toEqual(initialGameState(grid));
  });

  it('не стирает открытые подсказкой буквы', () => {
    const s = run([{ type: 'revealLetter' }, { type: 'moveInWord', delta: -1 }, { type: 'erase' }]);
    expect(s.entries[0]).toBe('К');
    const back = run([{ type: 'revealLetter' }, { type: 'erase' }]);
    expect(back.entries[0]).toBe('К');
    expect(back.cursor.cell).toBe(0);
  });
});

describe('перемещение', () => {
  it('вперёд/назад внутри слова с ограничением по краям', () => {
    let s = run([{ type: 'moveInWord', delta: -1 }]);
    expect(s.cursor.cell).toBe(0);
    s = run([{ type: 'moveInWord', delta: 1 }, { type: 'moveInWord', delta: 1 }, { type: 'moveInWord', delta: 1 }]);
    expect(s.cursor.cell).toBe(2);
  });

  it('следующее/предыдущее слово по кругу в порядке списка', () => {
    let s = run([{ type: 'nextWord' }]);
    expect(currentWord(grid, s)).toBe(2);
    s = run([{ type: 'nextWord' }], DEFAULT_GAME_OPTIONS, s);
    expect(currentWord(grid, s)).toBe(1);
    s = run([{ type: 'nextWord' }], DEFAULT_GAME_OPTIONS, s);
    expect(currentWord(grid, s)).toBe(0);
    s = run([{ type: 'prevWord' }], DEFAULT_GAME_OPTIONS, s);
    expect(currentWord(grid, s)).toBe(1);
  });

  it('стрелки двигают по клеткам и перескакивают пустоты', () => {
    let s = run([{ type: 'arrow', dir: 'right' }, { type: 'arrow', dir: 'right' }]);
    expect(s.cursor).toEqual({ cell: 2, direction: 'across' });
    // стрелка вниз поперёк направления — сначала поворот
    s = run([{ type: 'arrow', dir: 'down' }], DEFAULT_GAME_OPTIONS, s);
    expect(s.cursor).toEqual({ cell: 2, direction: 'down' });
    s = run([{ type: 'arrow', dir: 'down' }, { type: 'arrow', dir: 'down' }], DEFAULT_GAME_OPTIONS, s);
    expect(s.cursor).toEqual({ cell: 12, direction: 'down' });
    // край сетки
    expect(run([{ type: 'arrow', dir: 'down' }], DEFAULT_GAME_OPTIONS, s).cursor.cell).toBe(12);
    s = run([{ type: 'arrow', dir: 'right' }, { type: 'arrow', dir: 'right' }], DEFAULT_GAME_OPTIONS, s);
    expect(s.cursor).toEqual({ cell: 13, direction: 'across' });
    s = run([{ type: 'arrow', dir: 'up' }], DEFAULT_GAME_OPTIONS, s);
    // над клеткой 13 по вертикали — пусто: курсор не двигается, направление «вниз» здесь недоступно
    expect(s.cursor.cell).toBe(13);
  });

  it('стрелка влево из клетки без горизонтального слова переходит в соседнюю', () => {
    const s = run([{ type: 'selectCell', cell: 7 }, { type: 'arrow', dir: 'up' }]);
    expect(s.cursor).toEqual({ cell: 2, direction: 'down' });
    const left = run([{ type: 'arrow', dir: 'left' }], DEFAULT_GAME_OPTIONS, s);
    expect(left.cursor).toEqual({ cell: 2, direction: 'across' });
    const moved = run([{ type: 'arrow', dir: 'left' }], DEFAULT_GAME_OPTIONS, left);
    expect(moved.cursor).toEqual({ cell: 1, direction: 'across' });
  });
});

describe('подсказки и проверка', () => {
  it('«Открыть букву» вписывает правильную букву и считает её', () => {
    const s = run([{ type: 'revealLetter' }]);
    expect(s.entries[0]).toBe('К');
    expect(s.revealed[0]).toBe(true);
    expect(s.stats.revealedLetters).toBe(1);
    expect(s.cursor.cell).toBe(1);
  });

  it('открытие уже правильной буквы не считается', () => {
    const s = run([...type('К'), { type: 'moveInWord', delta: -1 }, { type: 'revealLetter' }]);
    expect(s.stats.revealedLetters).toBe(0);
  });

  it('открытую букву нельзя перезаписать', () => {
    const s = run([{ type: 'revealLetter' }, { type: 'moveInWord', delta: -1 }, ...type('Я')]);
    expect(s.entries[0]).toBe('К');
    expect(s.cursor.cell).toBe(1);
  });

  it('«Открыть слово»', () => {
    const s = run([...type('К'), { type: 'revealWord' }]);
    expect(s.entries.slice(0, 3).join('')).toBe('КОТ');
    expect(s.stats.revealedLetters).toBe(2);
    expect(currentWord(grid, s)).toBe(2);
  });

  it('«Показать решение» заполняет всё, но не засчитывает как решённый', () => {
    const s = run([{ type: 'revealAll' }]);
    expect(text(s)).toBe('КОТ....О....КИТ');
    expect(s.solutionShown).toBe(true);
    expect(s.solved).toBe(false);
    expect(isFinished(s)).toBe(true);
    expect(run([{ type: 'revealAll' }, { type: 'revealLetter' }, { type: 'revealWord' }, { type: 'revealAll' }]).stats.revealedLetters).toBe(7);
  });

  it('«Проверить слово» помечает только неверные буквы', () => {
    const s = run([...type('КАТ'), { type: 'selectWord', word: 0 }, { type: 'checkWord' }]);
    expect(s.wrong.slice(0, 3)).toEqual([false, true, false]);
    expect(s.stats.checks).toBe(1);
  });

  it('исправление буквы снимает пометку', () => {
    const s = run([...type('КАТ'), { type: 'checkAll' }, { type: 'selectCell', cell: 1 }, ...type('О')]);
    expect(s.wrong[1]).toBe(false);
  });

  it('стирание помеченной буквы снимает пометку', () => {
    const s = run([...type('КАТ'), { type: 'checkAll' }, { type: 'selectCell', cell: 1 }, { type: 'erase' }]);
    expect(s.wrong[1]).toBe(false);
    expect(s.entries[1]).toBe('');
  });

  it('«Проверить всё» не помечает пустые клетки', () => {
    const s = run([{ type: 'checkAll' }]);
    expect(s.wrong.some(Boolean)).toBe(false);
  });

  it('после окончания проверка и подсказки по буквам не работают', () => {
    const done = run([{ type: 'revealAll' }]);
    expect(run([{ type: 'checkAll' }, { type: 'checkWord' }], DEFAULT_GAME_OPTIONS, done)).toEqual(done);
  });

  it('текстовая подсказка показывается и считается один раз', () => {
    const s = run([{ type: 'showHint' }, { type: 'showHint' }]);
    expect(s.hintsShown).toEqual([0]);
    expect(s.stats.hintsShown).toBe(1);
  });

  it('«Начать заново» возвращает начальное состояние', () => {
    expect(run([...type('КОТ'), { type: 'showHint' }, { type: 'reset' }])).toEqual(initialGameState(grid));
  });
});
