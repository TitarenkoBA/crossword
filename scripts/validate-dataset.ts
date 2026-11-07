import { LEVELS, puzzleId } from '../src/core/generator.ts';
import type { DictEntry } from '../src/core/dictionary.ts';
import { validatePuzzle } from '../src/core/validate.ts';
import { DIFFICULTIES, type Difficulty, type Puzzle } from '../src/core/types.ts';
import type { DataIndex } from '../src/data/format.ts';

/** Полная проверка набора кроссвордов. Возвращает список проблем. */
export function validateDataset(
  index: DataIndex,
  byLevel: Record<Difficulty, Puzzle[]>,
  dictionary: DictEntry[],
): string[] {
  const errors: string[] = [];
  const dict = new Map(dictionary.map((e) => [e.word, e]));
  const ids = new Set<string>();

  for (const level of DIFFICULTIES) {
    const cfg = LEVELS[level];
    const puzzles = byLevel[level];
    if (index.levels[level].count !== puzzles.length) {
      errors.push(`${level}: в index.json ${index.levels[level].count}, а в файлах ${puzzles.length}`);
    }
    if (puzzles.length !== cfg.count) errors.push(`${level}: ${puzzles.length} кроссвордов вместо ${cfg.count}`);

    const signatures = new Set<string>();
    puzzles.forEach((p, i) => {
      if (p.index !== i + 1 || p.id !== puzzleId(level, i + 1)) errors.push(`${level}: неверный id/номер у №${i + 1} (${p.id})`);
      if (ids.has(p.id)) errors.push(`повторяется id ${p.id}`);
      ids.add(p.id);
      const sig = p.words.map((w) => w.answer).sort().join();
      if (signatures.has(sig)) errors.push(`${p.id}: такой же набор слов уже есть`);
      signatures.add(sig);
      errors.push(...validatePuzzle(p, cfg));
      for (const w of p.words) {
        const entry = dict.get(w.answer);
        if (!entry) errors.push(`${p.id}: слова «${w.answer}» нет в словаре (перегенерируйте данные)`);
        else if (entry.clue !== w.clue || entry.hint !== w.hint) {
          errors.push(`${p.id}: вопрос к «${w.answer}» отличается от словаря (перегенерируйте данные)`);
        }
      }
    });
  }
  return errors;
}
