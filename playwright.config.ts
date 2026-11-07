import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-тесты на собранном сайте (как у пользователя).
 * Запуск: `npm run test:e2e` (сначала собирает сайт, потом запускает тесты).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    // Типичный экран компьютера с Windows XP.
    viewport: { width: 1024, height: 768 },
    locale: 'ru-RU',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } }],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
