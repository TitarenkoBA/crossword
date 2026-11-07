/**
 * Хук игры: связывает чистую логику (core/game.ts) с React, сохранением
 * прогресса и таймером.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { buildGrid, type Grid } from '../core/grid.ts';
import {
  type GameAction,
  type GameOptions,
  type GameState,
  initialGameState,
  isFinished,
  progressPercent,
  reduceGame,
} from '../core/game.ts';
import { deserializeProgress, serializeProgress } from '../core/progress.ts';
import type { Puzzle } from '../core/types.ts';
import { loadProgress, saveLastPuzzle, saveProgress, type Store } from '../storage/storage.ts';

export interface UseGameResult {
  grid: Grid;
  state: GameState;
  dispatch: (action: GameAction) => void;
  /** Время разгадывания, мс. */
  elapsedMs: number;
}

interface Holder {
  grid: Grid;
  options: GameOptions;
}

export function useGame(puzzle: Puzzle, store: Store, options: GameOptions): UseGameResult {
  const grid = useMemo(() => buildGrid(puzzle), [puzzle]);

  // Опции и сетку редьюсер берёт из ref, чтобы смена настроек не сбрасывала игру.
  const holder = useRef<Holder>({ grid, options });
  holder.current = { grid, options };

  const saved = useMemo(() => loadProgress(store, puzzle.id), [store, puzzle.id]);
  const [state, dispatch] = useReducer(
    (s: GameState, a: GameAction) => reduceGame(holder.current.grid, s, a, holder.current.options),
    null,
    () => deserializeProgress(grid, saved) ?? initialGameState(grid),
  );
  const [elapsedMs, setElapsed] = useState(() => (saved && typeof saved.elapsedMs === 'number' ? saved.elapsedMs : 0));

  const finished = isFinished(state);

  // Таймер: идёт, пока страница видна и кроссворд не закончен.
  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setElapsed((e) => e + 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  // Сохраняем при любом изменении состояния. Время — не чаще раза в 10 секунд.
  const elapsedRef = useRef(elapsedMs);
  elapsedRef.current = elapsedMs;
  const started = useRef(!!saved);
  useEffect(() => {
    // Не создаём запись, пока пользователь ничего не сделал (просто открыл и закрыл).
    if (!started.current && state.entries.every((e) => e === '') && state.hintsShown.length === 0) return;
    started.current = true;
    saveProgress(
      store,
      puzzle.id,
      serializeProgress(state, { elapsedMs: elapsedRef.current, percent: progressPercent(grid, state) }),
    );
  }, [state, store, puzzle.id, grid]);

  useEffect(() => {
    if (!started.current || elapsedMs % 10000 !== 0) return;
    saveProgress(store, puzzle.id, serializeProgress(state, { elapsedMs, percent: progressPercent(grid, state) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сохраняем только по тику таймера
  }, [elapsedMs]);

  useEffect(() => {
    saveLastPuzzle(store, puzzle.id);
  }, [store, puzzle.id]);

  const stableDispatch = useCallback((a: GameAction) => dispatch(a), []);
  return { grid, state, dispatch: stableDispatch, elapsedMs };
}

/** «12:05» или «1:02:03». */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => (n < 10 ? '0' + n : String(n));
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}
