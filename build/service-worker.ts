/**
 * Vite-плагин: собирает dist/sw.js из шаблона build/sw-template.js.
 *
 * После сборки обходит dist/, составляет список файлов оболочки приложения
 * и вычисляет версии (хеши), чтобы любое изменение сайта или данных
 * приводило к новой версии Service Worker и обновлению кеша.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function hashFiles(files: string[], root: string): string {
  const h = createHash('sha256');
  for (const f of files) {
    h.update(relative(root, f));
    h.update(readFileSync(f));
  }
  return h.digest('hex').slice(0, 12);
}

/** Какие файлы из dist/ кешируются при установке SW. Экспортируется для тестов. */
export function isShellFile(path: string): boolean {
  if (path === 'sw.js') return false;
  if (path.startsWith('data/')) return path === 'data/index.json';
  return true;
}

export function serviceWorker(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'crossword:service-worker',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    closeBundle: {
      // Должен выполниться после остальных плагинов, которые меняют файлы в dist/.
      order: 'post',
      handler() {
        const dist = join(config.root, config.build.outDir);
        const all = walk(dist)
          .map((f) => ({ full: f, rel: relative(dist, f).split(sep).join('/') }))
          .sort((a, b) => (a.rel < b.rel ? -1 : 1));

        const shell = all.filter((f) => isShellFile(f.rel));
        const data = all.filter((f) => f.rel.startsWith('data/') && f.rel !== 'data/index.json');

        const precache = ['./', ...shell.map((f) => './' + f.rel)];
        const header =
          `var SW_VERSION = ${JSON.stringify(hashFiles(shell.map((f) => f.full), dist))};\n` +
          `var DATA_VERSION = ${JSON.stringify(hashFiles(data.map((f) => f.full), dist))};\n` +
          `var SW_PRECACHE = ${JSON.stringify(precache)};\n`;

        const template = readFileSync(join(import.meta.dirname, 'sw-template.js'), 'utf8');
        writeFileSync(join(dist, 'sw.js'), header + template);
        config.logger.info(`[service-worker] sw.js: ${precache.length} файлов в оболочке, ${data.length} пачек данных`);
      },
    },
  };
}
