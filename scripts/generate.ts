/**
 * Генерация всех кроссвордов из словаря.
 * Запуск: `npm run generate`. Результат — public/data/ (коммитится в git).
 *
 * Генерация детерминированная: при неизменном словаре и настройках
 * получаются те же самые кроссворды. Чтобы получить другой набор,
 * поменяйте SEED_PREFIX.
 */
import { LEVELS, generateLevel } from '../src/core/generator.ts';
import { createRng, seedFrom } from '../src/core/random.ts';
import { validatePuzzle } from '../src/core/validate.ts';
import { DIFFICULTIES, type Difficulty, type Puzzle } from '../src/core/types.ts';
import { loadDictionary, writeDataset } from './dataset.ts';

const SEED_PREFIX = 'crossword-v1';

const dict = loadDictionary();
if (dict.errors.length) {
  console.error(`Ошибки в словаре (${dict.errors.length}):`);
  for (const e of dict.errors) console.error('  - ' + e);
  process.exit(1);
}
const counts = [1, 2, 3].map((l) => dict.entries.filter((e) => e.level === l).length);
console.log(`Словарь: ${dict.entries.length} слов (уровень 1: ${counts[0]}, 2: ${counts[1]}, 3: ${counts[2]})`);

const byLevel = {} as Record<Difficulty, Puzzle[]>;
const usedAnywhere = new Set<string>();
for (const level of DIFFICULTIES) {
  const started = Date.now();
  const cfg = LEVELS[level];
  const { puzzles, usage } = generateLevel(dict.entries, cfg, createRng(seedFrom(`${SEED_PREFIX}-${level}`)));
  const errors = puzzles.flatMap((p) => validatePuzzle(p, cfg));
  if (errors.length) {
    console.error(`Сгенерированы некорректные кроссворды:\n  ${errors.slice(0, 20).join('\n  ')}`);
    process.exit(1);
  }
  byLevel[level] = puzzles;
  for (const w of usage.keys()) usedAnywhere.add(w);
  const uses = [...usage.values()];
  const words = puzzles.reduce((s, p) => s + p.words.length, 0);
  console.log(
    `${level}: ${puzzles.length} кроссвордов, в среднем ${(words / puzzles.length).toFixed(1)} слов, ` +
      `${usage.size} разных слов, слово используется до ${Math.max(...uses)} раз ` +
      `(${((Date.now() - started) / 1000).toFixed(1)} с)`,
  );
}

const index = writeDataset(byLevel);
console.log(`Не использовано ни разу: ${dict.entries.length - usedAnywhere.size} слов`);
console.log(`Готово: public/data/, версия данных ${index.version}`);
