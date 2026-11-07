/**
 * Все тексты интерфейса и словаря должны отображаться шрифтами Windows XP.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { nonWgl4Chars } from './compat-rules.ts';
import { ROOT } from './dataset.ts';

function walk(dir: string, exts: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full, exts) : exts.test(name) ? [full] : [];
  });
}

describe('символы для Windows XP', () => {
  it('nonWgl4Chars', () => {
    expect(nonWgl4Chars('Привет, «мир» — ← → ▲ ▼ √ × •')).toEqual([]);
    expect(nonWgl4Chars('✓ ✕ 💡 ⌫')).toEqual(['✓', '✕', '💡', '⌫']);
  });

  const files = [
    ...walk(join(ROOT, 'src'), /\.(ts|tsx|css)$/),
    ...walk(join(ROOT, 'data-src'), /\.txt$/),
    join(ROOT, 'index.html'),
  ];
  it.each(files.map((f) => [relative(ROOT, f), f]))('%s', (_name, file) => {
    expect(nonWgl4Chars(readFileSync(file, 'utf8'))).toEqual([]);
  });
});
