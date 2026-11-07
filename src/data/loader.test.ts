import { describe, expect, it, vi } from 'vitest';
import { createLoader, parsePuzzleId } from './loader.ts';
import { chunkOf, chunkPath, type DataIndex } from './format.ts';
import { SMALL_PUZZLE } from '../test/fixtures.ts';

const INDEX: DataIndex = {
  version: 'v1',
  chunkSize: 2,
  levels: { easy: { count: 3, chunks: 2 }, medium: { count: 0, chunks: 0 }, hard: { count: 0, chunks: 0 } },
};

function fakeFetcher() {
  const p = (index: number) => ({ ...SMALL_PUZZLE, index, id: `easy-000${index}` });
  const files: Record<string, unknown> = {
    'data/index.json': INDEX,
    'data/easy/chunk-00.json?v=v1': { level: 'easy', chunk: 0, puzzles: [p(1), p(2)] },
    'data/easy/chunk-01.json?v=v1': { level: 'easy', chunk: 1, puzzles: [p(3)] },
  };
  return vi.fn((url: string) => (url in files ? Promise.resolve(files[url]) : Promise.reject(new Error('404 ' + url))));
}

describe('format', () => {
  it('chunkPath и chunkOf', () => {
    expect(chunkPath('hard', 3)).toBe('hard/chunk-03.json');
    expect(chunkOf(1)).toBe(0);
    expect(chunkOf(50)).toBe(0);
    expect(chunkOf(51)).toBe(1);
  });
});

describe('parsePuzzleId', () => {
  it('разбирает id', () => {
    expect(parsePuzzleId('medium-0017')).toEqual({ level: 'medium', index: 17 });
    expect(parsePuzzleId('medium-0000')).toBeNull();
    expect(parsePuzzleId('x-0001')).toBeNull();
  });
});

describe('createLoader', () => {
  it('загружает кроссворд из нужной пачки и кеширует', async () => {
    const fetcher = fakeFetcher();
    const loader = createLoader('data/', fetcher);
    expect((await loader.puzzle('easy-0003')).index).toBe(3);
    expect((await loader.puzzle('easy-0001')).index).toBe(1);
    expect((await loader.puzzle('easy-0002')).index).toBe(2);
    // index.json + две пачки, каждая по одному разу
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('сообщает о несуществующих кроссвордах', async () => {
    const loader = createLoader('data/', fakeFetcher());
    await expect(loader.puzzle('easy-0009')).rejects.toThrow(/не найден/);
    await expect(loader.puzzle('bad')).rejects.toThrow(/Неверный/);
  });

  it('после ошибки сети повторяет запрос', async () => {
    let fail = true;
    const fetcher = vi.fn((url: string) => {
      if (fail) return Promise.reject(new Error('offline'));
      return fakeFetcher()(url);
    });
    const loader = createLoader('data/', fetcher);
    await expect(loader.index()).rejects.toThrow('offline');
    fail = false;
    expect((await loader.index()).version).toBe('v1');
  });

  it('downloadAll загружает все пачки с прогрессом', async () => {
    const fetcher = fakeFetcher();
    const progress: string[] = [];
    await createLoader('data/', fetcher).downloadAll((d, t) => progress.push(`${d}/${t}`));
    expect(progress).toEqual(['0/2', '1/2', '2/2']);
  });
});
