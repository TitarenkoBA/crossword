/**
 * Загрузка кроссвордов из public/data/ с кешем в памяти.
 *
 * Пачки загружаются по требованию: открыли кроссворд №17 — загрузилась
 * пачка с №1–50. Service Worker дополнительно кеширует их для офлайна.
 */
import type { Difficulty, Puzzle } from '../core/types.ts';
import { chunkOf, chunkPath, type DataIndex, type PuzzleChunk } from './format.ts';

export type Fetcher = (url: string) => Promise<unknown>;

const defaultFetcher: Fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export interface PuzzleLoader {
  index(): Promise<DataIndex>;
  puzzle(id: string): Promise<Puzzle>;
  /** Загружает все пачки (для работы без интернета). onProgress(готово, всего). */
  downloadAll(onProgress?: (done: number, total: number) => void): Promise<void>;
}

/** Разбирает id вида `easy-0017`. */
export function parsePuzzleId(id: string): { level: Difficulty; index: number } | null {
  const m = /^(easy|medium|hard)-(\d{4})$/.exec(id);
  if (!m) return null;
  const index = Number(m[2]);
  return index >= 1 ? { level: m[1] as Difficulty, index } : null;
}

export function createLoader(base = './data/', fetcher: Fetcher = defaultFetcher): PuzzleLoader {
  let indexPromise: Promise<DataIndex> | null = null;
  const chunks = new Map<string, Promise<PuzzleChunk>>();

  const index = () => {
    if (!indexPromise) {
      indexPromise = (fetcher(base + 'index.json') as Promise<DataIndex>).catch((e) => {
        indexPromise = null; // при ошибке сети попробуем ещё раз в следующий раз
        throw e;
      });
    }
    return indexPromise;
  };

  const chunk = (level: Difficulty, n: number, version: string) => {
    const key = `${level}/${n}`;
    let p = chunks.get(key);
    if (!p) {
      // Версия в адресе не даёт браузеру отдать устаревшую пачку из HTTP-кеша.
      p = (fetcher(`${base}${chunkPath(level, n)}?v=${version}`) as Promise<PuzzleChunk>).catch((e) => {
        chunks.delete(key);
        throw e;
      });
      chunks.set(key, p);
    }
    return p;
  };

  return {
    index,
    async puzzle(id) {
      const parsed = parsePuzzleId(id);
      if (!parsed) throw new Error(`Неверный номер кроссворда: ${id}`);
      const idx = await index();
      if (parsed.index > idx.levels[parsed.level].count) throw new Error(`Кроссворд ${id} не найден`);
      const c = await chunk(parsed.level, chunkOf(parsed.index, idx.chunkSize), idx.version);
      const found = c.puzzles.find((p) => p.id === id);
      if (!found) throw new Error(`Кроссворд ${id} не найден`);
      return found;
    },
    async downloadAll(onProgress) {
      const idx = await index();
      const all: [Difficulty, number][] = [];
      for (const level of Object.keys(idx.levels) as Difficulty[]) {
        for (let n = 0; n < idx.levels[level].chunks; n++) all.push([level, n]);
      }
      let done = 0;
      onProgress?.(0, all.length);
      // По одной пачке за раз — бережно к старым компьютерам и медленной сети.
      for (const [level, n] of all) {
        await chunk(level, n, idx.version);
        onProgress?.(++done, all.length);
      }
    },
  };
}
