/**
 * Словарь — исходные слова для генератора (data-src/dictionary/*.txt).
 *
 * Формат файла — одна строка на слово, поля через «|»:
 *
 *     # комментарий
 *     КОТ | 1 | Домашний зверь, ловит мышей | Мяукает и мурлычет
 *
 *   1) слово (регистр и Ё не важны — приводятся к заглавным и Е);
 *   2) уровень: 1 — простое слово (лёгкие кроссворды), 2 — среднее, 3 — сложное;
 *   3) вопрос;
 *   4) подсказка — другая формулировка или ассоциация, показывается по кнопке «Подсказка».
 *
 * Подробнее — docs/DATA.md.
 */
import { ALPHABET, normalizeWord } from './letters.ts';

export type WordLevel = 1 | 2 | 3;

export interface DictEntry {
  word: string;
  level: WordLevel;
  clue: string;
  hint: string;
  topic: string;
}

export interface ParseResult {
  entries: DictEntry[];
  errors: string[];
}

export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 15;

/** Текст содержит слово, начинающееся с ответа (например, «лесной» для ЛЕС)? */
export function givesAway(text: string, word: string): boolean {
  const t = normalizeWord(text);
  let i = t.indexOf(word);
  while (i !== -1) {
    if (i === 0 || ALPHABET.indexOf(t[i - 1]) === -1) return true;
    i = t.indexOf(word, i + 1);
  }
  return false;
}

export function parseDictionary(text: string, topic: string): ParseResult {
  const entries: DictEntry[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const where = `${topic}:${i + 1}`;
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length !== 4) {
      errors.push(`${where}: ожидается 4 поля через «|», найдено ${parts.length}`);
      return;
    }
    const [rawWord, rawLevel, clue, hint] = parts;
    const word = normalizeWord(rawWord);
    const level = Number(rawLevel);
    if (!word.split('').every((ch) => ALPHABET.indexOf(ch) !== -1)) {
      errors.push(`${where}: слово «${rawWord}» должно состоять только из русских букв`);
      return;
    }
    if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) {
      errors.push(`${where}: длина слова «${word}» должна быть от ${MIN_WORD_LENGTH} до ${MAX_WORD_LENGTH}`);
      return;
    }
    if (level !== 1 && level !== 2 && level !== 3) {
      errors.push(`${where}: уровень должен быть 1, 2 или 3, а не «${rawLevel}»`);
      return;
    }
    if (!clue || !hint) {
      errors.push(`${where}: у слова «${word}» нет вопроса или подсказки`);
      return;
    }
    if (givesAway(clue, word) || givesAway(hint, word)) {
      errors.push(`${where}: вопрос или подсказка к слову «${word}» содержит само слово`);
      return;
    }
    entries.push({ word, level, clue, hint, topic });
  });
  return { entries, errors };
}

/** Объединяет словари; дубликаты слов — ошибка (чтобы у слова был один вопрос). */
export function mergeDictionaries(results: ParseResult[]): ParseResult {
  const seen = new Map<string, DictEntry>();
  const errors: string[] = [];
  for (const r of results) {
    errors.push(...r.errors);
    for (const e of r.entries) {
      const prev = seen.get(e.word);
      if (prev) errors.push(`Слово «${e.word}» повторяется: темы «${prev.topic}» и «${e.topic}»`);
      else seen.set(e.word, e);
    }
  }
  const entries = [...seen.values()].sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
  return { entries, errors };
}
