/**
 * Vite-плагин: гарантирует, что legacy-чанки — чистый ES5.
 *
 * @vitejs/plugin-legacy транспилирует наш код через Babel, но в Vite 8 (rolldown)
 * в чанк полифилов попадает служебная обёртка со стрелочными функциями
 * (`var e=(e,t)=>()=>...`), а terser не понижает синтаксис. Chrome 49 стрелки
 * понимает, но более старые движки (и любой будущий синтаксис, который может
 * сюда попасть) — нет, а ошибка синтаксиса в полифилах = сайт не запускается
 * вообще. Поэтому после сборки каждый legacy-чанк, который не разбирается
 * как ES5, ещё раз прогоняется через Babel с целью ES5 (`ie 11`).
 *
 * Результат проверяет scripts/check-compat.ts.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';
import { transformSync } from '@babel/core';
import type { Plugin, ResolvedConfig } from 'vite';

function isEs5(code: string): boolean {
  try {
    parse(code, { ecmaVersion: 5, sourceType: 'script' });
    return true;
  } catch {
    return false;
  }
}

export function es5LegacyChunks(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'crossword:es5-legacy-chunks',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    closeBundle() {
      const dir = join(config.root, config.build.outDir, config.build.assetsDir);
      for (const file of readdirSync(dir)) {
        if (!/-legacy-.*\.js$/.test(file)) continue;
        const path = join(dir, file);
        const code = readFileSync(path, 'utf8');
        if (isEs5(code)) continue;
        const out = transformSync(code, {
          babelrc: false,
          configFile: false,
          compact: true,
          comments: false,
          sourceType: 'script',
          presets: [['@babel/preset-env', { targets: 'ie 11', modules: false, useBuiltIns: false }]],
        });
        if (!out?.code) throw new Error(`Не удалось транспилировать ${file}`);
        writeFileSync(path, out.code);
        config.logger.info(`[es5-legacy-chunks] ${file} → ES5`);
      }
    },
  };
}
