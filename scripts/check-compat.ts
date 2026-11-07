/**
 * Проверка собранного сайта (dist/) на совместимость с Chrome 49 (Windows XP).
 * Запуск: `npm run build && npm run check-compat`.
 *
 * Что проверяется:
 *  1. Legacy-бандлы (*-legacy-*.js), Service Worker и inline-скрипты index.html
 *     разбираются парсером в режиме ES5 — если в них есть `=>`, `let`, `class`
 *     и т.п., проверка падает.
 *  2. CSS не содержит свойств и синтаксиса, которых нет в Chrome 49.
 *
 * Правила подробно описаны в docs/COMPATIBILITY.md.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkCss, checkEs5 } from './compat-rules.ts';

const dist = join(import.meta.dirname, '..', 'dist');
if (!existsSync(dist)) {
  console.error('Папка dist/ не найдена. Сначала выполните `npm run build`.');
  process.exit(1);
}

const assets = join(dist, 'assets');
const files = readdirSync(assets);
const problems: string[] = [];

const legacyJs = files.filter((f) => /-legacy-.*\.js$/.test(f));
if (legacyJs.length === 0) problems.push('Не найдено ни одного legacy-бандла (*-legacy-*.js).');
for (const f of legacyJs) {
  problems.push(...checkEs5(readFileSync(join(assets, f), 'utf8'), `assets/${f}`));
}

const sw = join(dist, 'sw.js');
if (existsSync(sw)) problems.push(...checkEs5(readFileSync(sw, 'utf8'), 'sw.js'));
else problems.push('Не найден sw.js.');

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const inline = /<script(?![^>]*\bsrc=)(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/g;
let m: RegExpExecArray | null;
let n = 0;
while ((m = inline.exec(html))) {
  n++;
  problems.push(...checkEs5(m[1], `index.html (inline-скрипт №${n})`));
}

for (const f of files.filter((f) => f.endsWith('.css'))) {
  problems.push(...checkCss(readFileSync(join(assets, f), 'utf8'), `assets/${f}`));
}

if (problems.length) {
  console.error(`Найдены проблемы совместимости (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(
  `Совместимость OK: ${legacyJs.length} legacy JS, sw.js, ${n} inline-скриптов, CSS — без запрещённого синтаксиса.`,
);
