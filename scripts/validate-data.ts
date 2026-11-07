/**
 * Проверка всех кроссвордов в public/data/.
 * Запуск: `npm run validate-data`. Проверки те же, что в тестах (src/core/validate.ts),
 * плюс соответствие оглавлению и словарю.
 */
import { LEVELS } from '../src/core/generator.ts';
import { DIFFICULTIES } from '../src/core/types.ts';
import { validateDataset } from './validate-dataset.ts';
import { loadDictionary, readDataset } from './dataset.ts';

const { index, byLevel } = readDataset();
const errors = validateDataset(index, byLevel, loadDictionary().entries);

if (errors.length) {
  console.error(`Найдено проблем: ${errors.length}`);
  for (const e of errors.slice(0, 50)) console.error('  - ' + e);
  if (errors.length > 50) console.error(`  … и ещё ${errors.length - 50}`);
  process.exit(1);
}
const total = DIFFICULTIES.reduce((s, l) => s + byLevel[l].length, 0);
console.log(
  `Данные в порядке: ${total} кроссвордов (` +
    DIFFICULTIES.map((l) => `${l}: ${byLevel[l].length}/${LEVELS[l].count}`).join(', ') +
    `), версия ${index.version}`,
);
