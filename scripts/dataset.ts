/**
 * Общие функции для работы с файлами данных в Node (генерация, проверка, тесты).
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { mergeDictionaries, parseDictionary, type DictEntry, type ParseResult } from '../src/core/dictionary.ts';
import { LEVELS, generateLevel, type Usage } from '../src/core/generator.ts';
import { createRng, seedFrom } from '../src/core/random.ts';
import { validatePuzzle } from '../src/core/validate.ts';
import { DIFFICULTIES, type Difficulty, type Puzzle } from '../src/core/types.ts';
import { CHUNK_SIZE, chunkPath, type DataIndex, type PuzzleChunk } from '../src/data/format.ts';

export const ROOT = join(import.meta.dirname, '..');
export const DICTIONARY_DIR = join(ROOT, 'data-src', 'dictionary');
export const DATA_DIR = join(ROOT, 'public', 'data');

/** Меняйте, чтобы получить совсем другой набор кроссвордов из того же словаря. */
export const SEED_PREFIX = 'crossword-v1';

/** Читает все data-src/dictionary/*.txt. Имя файла без расширения — тема. */
export function loadDictionary(dir = DICTIONARY_DIR): ParseResult {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort();
  return mergeDictionaries(files.map((f) => parseDictionary(readFileSync(join(dir, f), 'utf8'), f.replace(/\.txt$/, ''))));
}

/** Записывает кроссворды: index.json и пачки по CHUNK_SIZE. Старые файлы удаляются. */
export function writeDataset(byLevel: Record<Difficulty, Puzzle[]>, dir = DATA_DIR): DataIndex {
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  const hash = createHash('sha256');
  const index: DataIndex = { version: '', chunkSize: CHUNK_SIZE, levels: {} as DataIndex['levels'] };

  for (const level of DIFFICULTIES) {
    const puzzles = byLevel[level];
    const chunks = Math.ceil(puzzles.length / CHUNK_SIZE);
    mkdirSync(join(dir, level), { recursive: true });
    for (let c = 0; c < chunks; c++) {
      const part = puzzles.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      // Один кроссворд на строку — чтобы изменения были читаемы в git diff.
      const body = `{"level":"${level}","chunk":${c},"puzzles":[\n${part.map((p) => JSON.stringify(p)).join(',\n')}\n]}\n`;
      hash.update(body);
      writeFileSync(join(dir, chunkPath(level, c)), body);
    }
    index.levels[level] = { count: puzzles.length, chunks };
  }
  index.version = hash.digest('hex').slice(0, 12);
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  return index;
}

/** Читает все кроссворды из public/data. */
export function readDataset(dir = DATA_DIR): { index: DataIndex; byLevel: Record<Difficulty, Puzzle[]> } {
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as DataIndex;
  const byLevel = {} as Record<Difficulty, Puzzle[]>;
  for (const level of DIFFICULTIES) {
    byLevel[level] = [];
    for (let c = 0; c < index.levels[level].chunks; c++) {
      const chunk = JSON.parse(readFileSync(join(dir, chunkPath(level, c)), 'utf8')) as PuzzleChunk;
      byLevel[level].push(...chunk.puzzles);
    }
  }
  return { index, byLevel };
}

/** Генерирует все уровни. Бросает ошибку, если какой-то кроссворд не прошёл проверку. */
export function generateAll(entries: DictEntry[]): {
  byLevel: Record<Difficulty, Puzzle[]>;
  usage: Record<Difficulty, Usage>;
} {
  const byLevel = {} as Record<Difficulty, Puzzle[]>;
  const usage = {} as Record<Difficulty, Usage>;
  for (const level of DIFFICULTIES) {
    const cfg = LEVELS[level];
    const result = generateLevel(entries, cfg, createRng(seedFrom(`${SEED_PREFIX}-${level}`)));
    const errors = result.puzzles.flatMap((p) => validatePuzzle(p, cfg));
    if (errors.length) throw new Error(`Сгенерированы некорректные кроссворды:\n  ${errors.slice(0, 20).join('\n  ')}`);
    byLevel[level] = result.puzzles;
    usage[level] = result.usage;
  }
  return { byLevel, usage };
}
