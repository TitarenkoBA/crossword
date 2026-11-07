/**
 * Генерация всех кроссвордов из словаря.
 * Запуск: `npm run generate`. Результат — public/data/ (коммитится в git).
 *
 * Генерация детерминированная: при неизменном словаре и настройках
 * получаются те же самые кроссворды (это проверяет scripts/dataset.test.ts).
 * Чтобы получить другой набор, поменяйте SEED_PREFIX в scripts/dataset.ts.
 */
import { DIFFICULTIES } from '../src/core/types.ts';
import { generateAll, loadDictionary, writeDataset } from './dataset.ts';

const dict = loadDictionary();
if (dict.errors.length) {
  console.error(`Ошибки в словаре (${dict.errors.length}):`);
  for (const e of dict.errors) console.error('  - ' + e);
  process.exit(1);
}
const counts = [1, 2, 3].map((l) => dict.entries.filter((e) => e.level === l).length);
console.log(`Словарь: ${dict.entries.length} слов (уровень 1: ${counts[0]}, 2: ${counts[1]}, 3: ${counts[2]})`);

const started = Date.now();
const { byLevel, usage } = generateAll(dict.entries);
for (const level of DIFFICULTIES) {
  const puzzles = byLevel[level];
  const uses = [...usage[level].values()];
  const words = puzzles.reduce((s, p) => s + p.words.length, 0);
  console.log(
    `${level}: ${puzzles.length} кроссвордов, в среднем ${(words / puzzles.length).toFixed(1)} слов, ` +
      `${usage[level].size} разных слов, слово используется до ${Math.max(...uses)} раз`,
  );
}
const used = new Set(DIFFICULTIES.flatMap((l) => [...usage[l].keys()]));
const index = writeDataset(byLevel);
console.log(`Не использовано ни разу: ${dict.entries.length - used.size} слов`);
console.log(`Готово за ${((Date.now() - started) / 1000).toFixed(1)} с: public/data/, версия данных ${index.version}`);
