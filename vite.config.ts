import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import pkg from './package.json' with { type: 'json' };

// Подробности о совместимости со старыми браузерами — docs/COMPATIBILITY.md.
export default defineConfig({
  // Относительный путь: сайт работает из любой подпапки (например, GitHub Pages /crossword/).
  base: './',
  plugins: [
    react(),
    // Собирает второй, legacy-бандл (ES5 + SystemJS + полифилы core-js).
    // Браузеры без поддержки ES-модулей (Chrome 49 на Windows XP) загружают именно его.
    legacy({
      targets: pkg.browserslist,
      modernPolyfills: true,
    }),
  ],
  build: {
    // Минификатор CSS не должен превращать top/right/bottom/left в `inset`
    // и использовать другой синтаксис, неизвестный Chrome 49.
    cssTarget: ['chrome49'],
    sourcemap: false,
  },
});
