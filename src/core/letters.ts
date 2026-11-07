/**
 * Работа с буквами: нормализация ввода и раскладка экранной клавиатуры.
 */

/** Допустимые буквы ответа. Ё не используется: она всегда заменяется на Е. */
export const ALPHABET = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

/** Ряды экранной клавиатуры (ЙЦУКЕН). */
export const KEYBOARD_ROWS: string[][] = [
  ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
  ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
  ['Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю'],
];

/**
 * Физические клавиши → русские буквы по раскладке ЙЦУКЕН.
 * Нужно, чтобы можно было печатать, не переключая раскладку на русскую.
 */
const CODE_TO_RU: Record<string, string> = {
  KeyQ: 'Й', KeyW: 'Ц', KeyE: 'У', KeyR: 'К', KeyT: 'Е', KeyY: 'Н', KeyU: 'Г', KeyI: 'Ш',
  KeyO: 'Щ', KeyP: 'З', BracketLeft: 'Х', BracketRight: 'Ъ',
  KeyA: 'Ф', KeyS: 'Ы', KeyD: 'В', KeyF: 'А', KeyG: 'П', KeyH: 'Р', KeyJ: 'О', KeyK: 'Л',
  KeyL: 'Д', Semicolon: 'Ж', Quote: 'Э',
  KeyZ: 'Я', KeyX: 'Ч', KeyC: 'С', KeyV: 'М', KeyB: 'И', KeyN: 'Т', KeyM: 'Ь',
  Comma: 'Б', Period: 'Ю', Backquote: 'Е',
};

/** То же по символу — для браузеров, где у события нет `code`. */
const LATIN_TO_RU: Record<string, string> = {
  q: 'Й', w: 'Ц', e: 'У', r: 'К', t: 'Е', y: 'Н', u: 'Г', i: 'Ш', o: 'Щ', p: 'З', '[': 'Х', ']': 'Ъ',
  a: 'Ф', s: 'Ы', d: 'В', f: 'А', g: 'П', h: 'Р', j: 'О', k: 'Л', l: 'Д', ';': 'Ж', "'": 'Э',
  z: 'Я', x: 'Ч', c: 'С', v: 'М', b: 'И', n: 'Т', m: 'Ь', ',': 'Б', '.': 'Ю', '`': 'Е',
};

/** Приводит символ к букве ответа: заглавная, Ё→Е. Возвращает null, если это не русская буква. */
export function normalizeLetter(ch: string): string | null {
  if (ch.length !== 1) return null;
  let up = ch.toUpperCase();
  if (up === 'Ё') up = 'Е';
  return ALPHABET.indexOf(up) === -1 ? null : up;
}

/** Нормализует целое слово (для генератора и проверки данных). */
export function normalizeWord(word: string): string {
  return word.trim().toUpperCase().replace(/Ё/g, 'Е');
}

/**
 * Определяет букву по событию клавиатуры.
 * Сначала смотрим на сам символ (русская раскладка), потом — на физическую клавишу.
 */
export function letterFromKey(key: string, code?: string): string | null {
  const direct = normalizeLetter(key);
  if (direct) return direct;
  if (code && CODE_TO_RU[code]) return CODE_TO_RU[code];
  const lower = key.toLowerCase();
  return LATIN_TO_RU[lower] || null;
}
