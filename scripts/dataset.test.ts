/**
 * Тесты набора данных (public/data): все 1000 кроссвордов корректны
 * и совпадают с тем, что выдаёт генератор из текущего словаря.
 */
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../src/core/types.ts';
import { LEVELS } from '../src/core/generator.ts';
import { generateAll, loadDictionary, readDataset } from './dataset.ts';
import { validateDataset } from './validate-dataset.ts';

const dict = loadDictionary();
const { index, byLevel } = readDataset();

describe('словарь', () => {
  it('без ошибок и достаточного размера', () => {
    expect(dict.errors).toEqual([]);
    expect(dict.entries.length).toBeGreaterThanOrEqual(2500);
  });
});

describe('кроссворды в public/data', () => {
  it('всего 1000, по уровням 350 / 350 / 300', () => {
    expect(DIFFICULTIES.map((l) => byLevel[l].length)).toEqual([350, 350, 300]);
    expect(DIFFICULTIES.map((l) => LEVELS[l].count)).toEqual([350, 350, 300]);
  });

  it('проходят все проверки', () => {
    expect(validateDataset(index, byLevel, dict.entries)).toEqual([]);
  });

  it('совпадают с результатом генератора (данные не устарели)', () => {
    const fresh = generateAll(dict.entries).byLevel;
    for (const level of DIFFICULTIES) {
      expect(fresh[level], `перегенерируйте данные: npm run generate`).toEqual(byLevel[level]);
    }
  }, 60_000);
});
