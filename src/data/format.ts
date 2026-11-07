/**
 * Формат файлов с кроссвордами в public/data/ (подробно — docs/DATA.md).
 *
 *   data/index.json              — оглавление (DataIndex)
 *   data/<уровень>/chunk-00.json — пачка из CHUNK_SIZE кроссвордов (PuzzleChunk)
 */
import type { Difficulty, Puzzle } from '../core/types.ts';

export const CHUNK_SIZE = 50;

export interface DataIndex {
  /** Хеш содержимого — меняется при каждой перегенерации. */
  version: string;
  chunkSize: number;
  levels: Record<Difficulty, { count: number; chunks: number }>;
}

export interface PuzzleChunk {
  level: Difficulty;
  chunk: number;
  puzzles: Puzzle[];
}

/** Путь пачки относительно папки data/. */
export function chunkPath(level: Difficulty, chunk: number): string {
  return `${level}/chunk-${String(chunk).padStart(2, '0')}.json`;
}

/** В какой пачке лежит кроссворд с номером index (с 1). */
export function chunkOf(index: number, chunkSize = CHUNK_SIZE): number {
  return Math.floor((index - 1) / chunkSize);
}
