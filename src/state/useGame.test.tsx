import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { formatTime, useGame } from './useGame.ts';
import { DEFAULT_GAME_OPTIONS } from '../core/game.ts';
import { createMemoryStore, loadLastPuzzle, loadProgress } from '../storage/storage.ts';
import { SMALL_PUZZLE } from '../test/fixtures.ts';

describe('useGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('не создаёт сохранение, пока ничего не сделано', () => {
    const store = createMemoryStore();
    renderHook(() => useGame(SMALL_PUZZLE, store, DEFAULT_GAME_OPTIONS));
    expect(loadProgress(store, SMALL_PUZZLE.id)).toBeNull();
    expect(loadLastPuzzle(store)).toBe(SMALL_PUZZLE.id);
  });

  it('сохраняет ход и восстанавливает его при новом открытии', () => {
    const store = createMemoryStore();
    const first = renderHook(() => useGame(SMALL_PUZZLE, store, DEFAULT_GAME_OPTIONS));
    act(() => first.result.current.dispatch({ type: 'input', letter: 'К' }));
    expect(loadProgress(store, SMALL_PUZZLE.id)?.entries[0]).toBe('К');
    first.unmount();

    const second = renderHook(() => useGame(SMALL_PUZZLE, store, DEFAULT_GAME_OPTIONS));
    expect(second.result.current.state.entries[0]).toBe('К');
    expect(second.result.current.state.cursor.cell).toBe(1);
  });

  it('считает время и сохраняет его', () => {
    const store = createMemoryStore();
    const { result } = renderHook(() => useGame(SMALL_PUZZLE, store, DEFAULT_GAME_OPTIONS));
    act(() => result.current.dispatch({ type: 'input', letter: 'К' }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.elapsedMs).toBe(10_000);
    expect(loadProgress(store, SMALL_PUZZLE.id)?.elapsedMs).toBe(10_000);
  });

  it('таймер останавливается после окончания', () => {
    const store = createMemoryStore();
    const { result } = renderHook(() => useGame(SMALL_PUZZLE, store, DEFAULT_GAME_OPTIONS));
    act(() => result.current.dispatch({ type: 'revealAll' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedMs).toBe(0);
    expect(loadProgress(store, SMALL_PUZZLE.id)?.solutionShown).toBe(true);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5000, '0:05'],
    [65_000, '1:05'],
    [3_723_000, '1:02:03'],
  ])('%i мс = %s', (ms, s) => {
    expect(formatTime(ms)).toBe(s);
  });
});
