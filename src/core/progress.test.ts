import { describe, expect, it } from 'vitest';
import { buildGrid } from './grid.ts';
import { initialGameState, reduceGame, type GameState } from './game.ts';
import { deserializeProgress, serializeProgress } from './progress.ts';
import { SMALL_PUZZLE } from '../test/fixtures.ts';

const grid = buildGrid(SMALL_PUZZLE);

function played(): GameState {
  let s = initialGameState(grid);
  s = reduceGame(grid, s, { type: 'input', letter: 'К' });
  s = reduceGame(grid, s, { type: 'input', letter: 'А' });
  s = reduceGame(grid, s, { type: 'checkAll' });
  s = reduceGame(grid, s, { type: 'showHint' });
  s = reduceGame(grid, s, { type: 'selectCell', cell: 13 });
  s = reduceGame(grid, s, { type: 'revealLetter' });
  return s;
}

describe('progress', () => {
  it('сохраняет и восстанавливает состояние без потерь', () => {
    const s = played();
    const saved = serializeProgress(s, { elapsedMs: 1234, percent: 43, now: 1 });
    expect(saved.entries).toBe('КА' + '.'.repeat(11) + 'И.');
    expect(saved.revealed).toEqual([13]);
    expect(saved.wrong).toEqual([1]);
    const json = JSON.parse(JSON.stringify(saved));
    expect(deserializeProgress(grid, json)).toEqual(s);
  });

  it('отвергает повреждённые и чужие данные', () => {
    expect(deserializeProgress(grid, null)).toBeNull();
    expect(deserializeProgress(grid, 'строка')).toBeNull();
    expect(deserializeProgress(grid, { v: 2, entries: '' })).toBeNull();
    expect(deserializeProgress(grid, { v: 1, entries: 'КОТ' })).toBeNull();
    // буква в клетке, где её быть не может
    expect(deserializeProgress(grid, { v: 1, entries: '...Ж...........' })).toBeNull();
  });

  it('чинит частично испорченные поля', () => {
    const s = deserializeProgress(grid, {
      v: 1,
      entries: 'К..............',
      revealed: [3, 0, 'x'],
      wrong: 'нет',
      hintsShown: [0, 5, -1],
      cursor: { cell: 3, direction: 'across' },
    });
    expect(s).not.toBeNull();
    expect(s!.revealed[0]).toBe(true);
    expect(s!.revealed[3]).toBe(false);
    expect(s!.wrong.some(Boolean)).toBe(false);
    expect(s!.hintsShown).toEqual([0]);
    expect(s!.cursor).toEqual(initialGameState(grid).cursor);
    expect(s!.stats).toEqual(initialGameState(grid).stats);
  });
});
