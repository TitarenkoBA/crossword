import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { AppProvider } from '../state/AppContext.tsx';
import { createMemoryStore, saveSettingsRaw, type Store } from '../storage/storage.ts';
import { createLoader, type PuzzleLoader } from '../data/loader.ts';
import type { Settings } from '../state/settings.ts';
import type { DataIndex } from '../data/format.ts';
import type { Puzzle } from '../core/types.ts';
import { SMALL_PUZZLE } from './fixtures.ts';

/** Загрузчик с тремя маленькими кроссвордами на каждом уровне. */
export function fakeLoader(puzzle: Puzzle = SMALL_PUZZLE): PuzzleLoader {
  const index: DataIndex = {
    version: 't',
    chunkSize: 50,
    levels: { easy: { count: 3, chunks: 1 }, medium: { count: 3, chunks: 1 }, hard: { count: 3, chunks: 1 } },
  };
  return createLoader('data/', (url) => {
    if (url === 'data/index.json') return Promise.resolve(index);
    const level = /data\/(\w+)\//.exec(url)![1] as Puzzle['difficulty'];
    const puzzles = [1, 2, 3].map((i) => ({ ...puzzle, difficulty: level, index: i, id: `${level}-000${i}` }));
    return Promise.resolve({ level, chunk: 0, puzzles });
  });
}

export interface RenderOptions {
  store?: Store;
  loader?: PuzzleLoader;
  settings?: Partial<Settings>;
  now?: () => number;
}

export function renderWithApp(ui: ReactElement, opts: RenderOptions = {}) {
  const store = opts.store ?? createMemoryStore();
  if (opts.settings) saveSettingsRaw(store, opts.settings);
  const loader = opts.loader ?? fakeLoader();
  const result = render(
    <AppProvider store={store} loader={loader} now={opts.now}>
      {ui}
    </AppProvider>,
  );
  return { ...result, store, loader };
}
