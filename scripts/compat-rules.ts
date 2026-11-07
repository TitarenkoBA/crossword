/**
 * Правила совместимости с Chrome 49. Используются в check-compat.ts и в тестах.
 */
import { parse } from 'acorn';

/** Возвращает список ошибок, если код — не ES5. */
export function checkEs5(code: string, name: string): string[] {
  try {
    parse(code, { ecmaVersion: 5, sourceType: 'script' });
    return [];
  } catch (e) {
    return [`${name}: не ES5 — ${(e as Error).message}`];
  }
}

interface CssRule {
  re: RegExp;
  message: string;
}

/** Запрещённые конструкции в CSS (нет поддержки в Chrome 49). */
export const CSS_RULES: CssRule[] = [
  { re: /display\s*:\s*(-webkit-|-ms-)?(inline-)?grid/, message: 'CSS Grid (Chrome 57+) — используйте flex' },
  { re: /[;{]\s*(row-|column-)?gap\s*:/, message: 'gap (для flex — Chrome 84+) — используйте margin' },
  { re: /[;{]\s*aspect-ratio\s*:/, message: 'aspect-ratio (Chrome 88+)' },
  { re: /[;{]\s*inset(-inline|-block)?(-start|-end)?\s*:/, message: 'inset (Chrome 87+) — используйте top/right/bottom/left' },
  { re: /position\s*:\s*(-webkit-)?sticky/, message: 'position: sticky (Chrome 56+)' },
  { re: /rgba?\(\s*[\d.]+%?\s+[\d.]+%?\s+[\d.]+%?/, message: 'цвет вида rgb(r g b / a) (Chrome 65+)' },
  { re: /color-mix\(/, message: 'color-mix() (Chrome 111+)' },
  { re: /@layer\b/, message: '@layer (Chrome 99+)' },
  { re: /@property\b/, message: '@property (Chrome 85+)' },
  { re: /@container\b/, message: '@container (Chrome 105+)' },
  { re: /:(where|is|has)\(/, message: ':where()/:is()/:has() — правило целиком игнорируется' },
  { re: /:focus-visible/, message: ':focus-visible (Chrome 86+) — используйте :focus' },
  { re: /:focus-within/, message: ':focus-within (Chrome 60+)' },
  { re: /\b(clamp|min|max)\(/, message: 'clamp()/min()/max() (Chrome 79+)' },
  { re: /[;{]\s*(margin|padding)-(inline|block)/, message: 'логические свойства margin-inline и т.п. (Chrome 87+)' },
  { re: /\b\d+(\.\d+)?(dvh|svh|lvh|dvw)\b/, message: 'единицы dvh/svh (Chrome 108+)' },
  { re: /&/, message: 'вложенность CSS (&) (Chrome 112+)' },
];

/** Возвращает список ошибок совместимости в CSS. */
export function checkCss(css: string, name: string): string[] {
  const problems: string[] = [];
  // Строки и url() могут содержать что угодно — убираем перед проверкой.
  const code = css.replace(/url\([^)]*\)/g, 'url()').replace(/"[^"]*"|'[^']*'/g, '""');

  for (const rule of CSS_RULES) {
    const found = code.match(rule.re);
    if (found) problems.push(`${name}: ${rule.message} — «${found[0]}»`);
  }

  // Пустые custom properties (`--x: ;`) в Chrome 49 недействительны, и всё,
  // что ссылается на них через var(), перестаёт работать. Tailwind объявляет так,
  // например, --tw-ring-inset — значит, ring/shadow/filter-утилиты использовать нельзя.
  const empty = new Set<string>();
  for (const d of code.matchAll(/(--[\w-]+)\s*:\s*(?=[;}])/g)) empty.add(d[1]);
  for (const v of empty) {
    const usage = new RegExp(`(^|[;{])\\s*(?!--)[\\w-]+\\s*:[^;}]*var\\(${v}[,)]`);
    const used = code.match(usage);
    if (used) problems.push(`${name}: используется пустая переменная ${v} — «${used[0].trim()}»`);
  }
  return problems;
}

/**
 * Символы, которые точно есть в стандартных шрифтах Windows XP
 * (набор WGL4: Arial, Verdana, Tahoma). Эмодзи и многие значки (✓, ✕, ⌫)
 * там отображаются квадратиками.
 */
const WGL4_RANGES: [number, number][] = [
  [0x20, 0x7e], [0xa0, 0x17f], [0x384, 0x3ce], [0x400, 0x45f], [0x490, 0x491],
  [0x2013, 0x2015], [0x2017, 0x201e], [0x2020, 0x2022], [0x2026, 0x2026], [0x2030, 0x2030],
  [0x2032, 0x2033], [0x2039, 0x203a], [0x203c, 0x203c], [0x20ac, 0x20ac], [0x2116, 0x2116],
  [0x2122, 0x2122], [0x2190, 0x2195], [0x2212, 0x2212], [0x2219, 0x221a], [0x221e, 0x221e],
  [0x2248, 0x2248], [0x2260, 0x2261], [0x2264, 0x2265], [0x25a0, 0x25a1], [0x25b2, 0x25b2],
  [0x25ba, 0x25ba], [0x25bc, 0x25bc], [0x25c4, 0x25c4], [0x25cb, 0x25cb], [0x25cf, 0x25cf],
  [0x263a, 0x263c], [0x2660, 0x2666],
];

/** Возвращает символы текста, которых нет в WGL4 (перевод строки и табуляция допустимы). */
export function nonWgl4Chars(text: string): string[] {
  const bad = new Set<string>();
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code === 0x0a || code === 0x0d || code === 0x09) continue;
    if (!WGL4_RANGES.some(([a, b]) => code >= a && code <= b)) bad.add(ch);
  }
  return [...bad];
}
