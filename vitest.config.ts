import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Отдельный конфиг для тестов: без plugin-legacy, он нужен только для сборки.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'build/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      thresholds: {
        'src/core/**': { statements: 90, branches: 85, functions: 90, lines: 90 },
      },
    },
  },
});
