import { describe, expect, it } from 'vitest';
import { ALPHABET, KEYBOARD_ROWS, letterFromKey, normalizeLetter, normalizeWord } from './letters.ts';

describe('normalizeLetter', () => {
  it('делает заглавными и заменяет Ё на Е', () => {
    expect(normalizeLetter('а')).toBe('А');
    expect(normalizeLetter('ё')).toBe('Е');
    expect(normalizeLetter('Ё')).toBe('Е');
  });
  it('отбрасывает не русские буквы', () => {
    expect(normalizeLetter('a')).toBeNull();
    expect(normalizeLetter('1')).toBeNull();
    expect(normalizeLetter('')).toBeNull();
    expect(normalizeLetter('АБ')).toBeNull();
  });
});

describe('normalizeWord', () => {
  it('убирает пробелы, Ё и делает заглавными', () => {
    expect(normalizeWord(' ёлка ')).toBe('ЕЛКА');
  });
});

describe('letterFromKey', () => {
  it('берёт русскую букву напрямую', () => {
    expect(letterFromKey('ж', 'Semicolon')).toBe('Ж');
  });
  it('переводит латинскую раскладку по коду клавиши', () => {
    expect(letterFromKey('q', 'KeyQ')).toBe('Й');
    expect(letterFromKey('[', 'BracketLeft')).toBe('Х');
    expect(letterFromKey('`', 'Backquote')).toBe('Е');
  });
  it('без code переводит по символу', () => {
    expect(letterFromKey('F')).toBe('А');
    expect(letterFromKey('.')).toBe('Ю');
  });
  it('служебные клавиши — не буквы', () => {
    expect(letterFromKey('Enter', 'Enter')).toBeNull();
    expect(letterFromKey('1', 'Digit1')).toBeNull();
  });
});

describe('экранная клавиатура', () => {
  it('содержит все буквы алфавита ровно по одному разу', () => {
    const keys = KEYBOARD_ROWS.flat();
    expect(keys.slice().sort().join('')).toBe(ALPHABET.split('').sort().join(''));
  });
});
