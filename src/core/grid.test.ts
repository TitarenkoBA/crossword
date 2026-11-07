import { describe, expect, it } from 'vitest';
import { buildGrid, letterCells, lettersCount, wordAt, wordLabel } from './grid.ts';
import { SMALL_PUZZLE } from '../test/fixtures.ts';
import type { Puzzle } from './types.ts';

describe('buildGrid', () => {
  const grid = buildGrid(SMALL_PUZZLE);

  it('раскладывает буквы по клеткам', () => {
    expect(grid.cells.map((c) => (c ? c.solution : '.')).join('')).toBe('КОТ....О....КИТ');
  });

  it('проставляет номера и связи клетка → слово', () => {
    expect(grid.cells[0]!.number).toBe(1);
    expect(grid.cells[2]!.number).toBe(2);
    expect(grid.cells[12]!.number).toBe(3);
    expect(grid.cells[2]).toMatchObject({ across: 0, down: 1 });
    expect(grid.cells[12]).toMatchObject({ across: 2, down: 1 });
    expect(wordAt(grid, 7, 'down')).toBe(1);
    expect(wordAt(grid, 7, 'across')).toBeUndefined();
    expect(wordAt(grid, 3, 'across')).toBeUndefined();
  });

  it('хранит клетки слов и порядок: сначала по горизонтали', () => {
    expect(grid.wordCells).toEqual([
      [0, 1, 2],
      [2, 7, 12],
      [12, 13, 14],
    ]);
    expect(grid.order).toEqual([0, 2, 1]);
    expect(letterCells(grid)).toEqual([0, 1, 2, 7, 12, 13, 14]);
  });

  it('падает при конфликте букв', () => {
    const bad: Puzzle = {
      ...SMALL_PUZZLE,
      words: [SMALL_PUZZLE.words[0], { ...SMALL_PUZZLE.words[1], answer: 'СОК' }],
    };
    expect(() => buildGrid(bad)).toThrow(/Конфликт/);
  });

  it('падает, если слово выходит за границы', () => {
    const bad: Puzzle = { ...SMALL_PUZZLE, width: 2 };
    expect(() => buildGrid(bad)).toThrow(/за пределы/);
  });

  it('падает, если два слова одного направления делят клетку', () => {
    const bad: Puzzle = {
      ...SMALL_PUZZLE,
      words: [SMALL_PUZZLE.words[0], { ...SMALL_PUZZLE.words[0], number: 9, col: 0, answer: 'КО' }],
    };
    expect(() => buildGrid(bad)).toThrow(/одного направления/);
  });
});

describe('подписи', () => {
  it('wordLabel', () => {
    expect(wordLabel(SMALL_PUZZLE.words[0])).toBe('1 по горизонтали');
    expect(wordLabel(SMALL_PUZZLE.words[1])).toBe('2 по вертикали');
  });

  it.each([
    [1, '1 буква'],
    [2, '2 буквы'],
    [4, '4 буквы'],
    [5, '5 букв'],
    [11, '11 букв'],
    [12, '12 букв'],
    [21, '21 буква'],
    [22, '22 буквы'],
  ])('lettersCount(%i) = %s', (n, s) => {
    expect(lettersCount(n)).toBe(s);
  });
});
