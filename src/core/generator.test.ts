import { describe, expect, it } from 'vitest';
import { type LevelConfig, generateLevel, generatePuzzle, puzzleId, LEVELS } from './generator.ts';
import type { DictEntry } from './dictionary.ts';
import { createRng, randInt, seedFrom, shuffle } from './random.ts';
import { validatePuzzle } from './validate.ts';
import { SMALL_PUZZLE } from '../test/fixtures.ts';
import type { Puzzle } from './types.ts';

// Небольшой синтетический словарь: настоящие русские слова, вопросы-заглушки.
const WORDS =
  'КОТ КИТ ТОК ЛЕС СОК НОС РОТ МАК ЛУК ДОМ САД МОРЕ РЕКА ГОРА НЕБО ЛУНА ЗИМА ЛЕТО ОСЕНЬ ВЕСНА ' +
  'КОРОВА СОБАКА ЛОШАДЬ ЯБЛОКО ГРУША СЛИВА ВИШНЯ МАЛИНА КАРТА ПАРТА ШКОЛА КНИГА ТЕТРАДЬ РУЧКА ' +
  'КАРАНДАШ ОКНО ДВЕРЬ СТЕНА КРЫША ПЕЧКА ЛАМПА СТОЛ СТУЛ КРОВАТЬ ДИВАН ПОДУШКА ОДЕЯЛО ТАРЕЛКА ' +
  'ЛОЖКА ВИЛКА КАСТРЮЛЯ ЧАЙНИК САХАР СОЛЬ ПЕРЕЦ МАСЛО ХЛЕБ МОЛОКО СЫР КАША СУП ОБЕД УЖИН ' +
  'ЗАВТРАК РАДУГА ОБЛАКО ТУЧА ДОЖДЬ СНЕГ ВЕТЕР ГРОЗА МОЛНИЯ ПОЛЕ ТРАВА ЦВЕТОК РОМАШКА ТЮЛЬПАН ' +
  'РОЗА БЕРЕЗА ДУБ КЛЕН ОСИНА СОСНА ЕЛКА ГРИБ ОРЕХ ШИШКА ЖЕЛУДЬ ЗАЯЦ ВОЛК ЛИСА МЕДВЕДЬ ЕЖ БЕЛКА';
const dict: DictEntry[] = WORDS.split(' ')
  .filter((w) => w.length >= 3)
  .map((word, i) => ({ word, level: (i % 3 === 0 ? 2 : 1) as 1 | 2, clue: `Вопрос ${i}`, hint: `Подсказка ${i}`, topic: 'тест' }));

const SMALL_CFG: LevelConfig = {
  ...LEVELS.easy,
  count: 20,
  minWords: 5,
  maxWords: 8,
  levelWeights: { 1: 1, 2: 1, 3: 0 },
};

describe('random', () => {
  it('одинаковый seed — одинаковая последовательность', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seedFrom('easy')).toBe(seedFrom('easy'));
    expect(seedFrom('easy')).not.toBe(seedFrom('hard'));
  });
  it('randInt в границах, shuffle — перестановка', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = randInt(rng, 3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
    expect(shuffle(rng, [1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('generatePuzzle', () => {
  it('строит корректный кроссворд в рамках настроек', () => {
    const rng = createRng(7);
    let made = 0;
    for (let i = 0; i < 30; i++) {
      const p = generatePuzzle(dict, SMALL_CFG, rng, new Map());
      if (!p) continue;
      made++;
      const puzzle: Puzzle = { ...p, id: 't', index: 1 };
      expect(validatePuzzle(puzzle, SMALL_CFG)).toEqual([]);
    }
    expect(made).toBeGreaterThan(15);
  });

  it('возвращает null, если подходящих слов нет', () => {
    const cfg = { ...SMALL_CFG, levelWeights: { 1: 0, 2: 0, 3: 1 } as const };
    expect(generatePuzzle(dict, cfg, createRng(1), new Map())).toBeNull();
  });
});

describe('generateLevel', () => {
  it('детерминирован и выдаёт уникальные кроссворды', () => {
    const a = generateLevel(dict, SMALL_CFG, createRng(seedFrom('x')));
    const b = generateLevel(dict, SMALL_CFG, createRng(seedFrom('x')));
    expect(a.puzzles).toEqual(b.puzzles);
    expect(a.puzzles).toHaveLength(20);
    expect(a.puzzles[0].id).toBe('easy-0001');
    expect(a.puzzles[19].index).toBe(20);
    const sigs = new Set(a.puzzles.map((p) => p.words.map((w) => w.answer).sort().join()));
    expect(sigs.size).toBe(20);
    for (const p of a.puzzles) expect(validatePuzzle(p, SMALL_CFG)).toEqual([]);
  });

  it('бросает понятную ошибку, если словаря мало', () => {
    const tiny = dict.slice(0, 4);
    expect(() => generateLevel(tiny, { ...SMALL_CFG, count: 3 }, createRng(1))).toThrow(/Добавьте слов/);
  });

  it('puzzleId', () => {
    expect(puzzleId('hard', 7)).toBe('hard-0007');
  });
});

describe('validatePuzzle', () => {
  it('принимает корректный кроссворд', () => {
    expect(validatePuzzle(SMALL_PUZZLE)).toEqual([]);
  });

  it('находит слипшиеся слова', () => {
    // «КОТ» и «ЛЕС» в соседних строках образуют вертикальные пары букв.
    const p: Puzzle = {
      ...SMALL_PUZZLE,
      width: 3,
      height: 2,
      words: [
        { ...SMALL_PUZZLE.words[0] },
        { number: 2, direction: 'across', row: 1, col: 0, answer: 'ЛЕС', clue: 'в', hint: 'п' },
      ],
    };
    const errors = validatePuzzle(p);
    expect(errors.some((e) => e.includes('лишнее'))).toBe(true);
    expect(errors.some((e) => e.includes('связаны'))).toBe(true);
  });

  it('находит повторы, пустые тексты, неверную нумерацию и края', () => {
    const p: Puzzle = {
      ...SMALL_PUZZLE,
      width: 6,
      words: SMALL_PUZZLE.words.map((w, i) => ({
        ...w,
        number: i === 2 ? 5 : w.number,
        clue: i === 0 ? ' ' : w.clue,
        hint: i === 1 ? '' : w.hint,
      })),
    };
    const errors = validatePuzzle(p).join('\n');
    expect(errors).toMatch(/нет вопроса/);
    expect(errors).toMatch(/нет подсказки/);
    expect(errors).toMatch(/нумерация/);
    expect(errors).toMatch(/пустые края/);
  });

  it('проверяет ограничения уровня', () => {
    const errors = validatePuzzle(SMALL_PUZZLE, { ...LEVELS.hard }).join('\n');
    expect(errors).toMatch(/уровень easy/);
    expect(errors).toMatch(/вне диапазона/);
  });

  it('сообщает об ошибке построения сетки и пустом кроссворде', () => {
    expect(validatePuzzle({ ...SMALL_PUZZLE, width: 2 })[0]).toMatch(/за пределы/);
    expect(validatePuzzle({ ...SMALL_PUZZLE, words: [] })[0]).toMatch(/нет слов/);
    const dup: Puzzle = { ...SMALL_PUZZLE, words: [...SMALL_PUZZLE.words, { ...SMALL_PUZZLE.words[0], number: 9, row: 2, col: 2, answer: 'КИТ' }] };
    expect(validatePuzzle(dup).join()).toMatch(/одного направления|повторяется/);
  });
});
