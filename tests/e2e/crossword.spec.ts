/**
 * Сценарии пользователя в настоящем браузере.
 * Главный — решение кроссворда ТОЛЬКО мышью: ни одного нажатия клавиш.
 */
import { expect, test } from '@playwright/test';
import { clickCell, clickKey, fetchPuzzle } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  // Следим, чтобы на странице не было ошибок JavaScript.
  page.on('pageerror', (e) => {
    throw e;
  });
});

test('решение кроссворда только мышью', async ({ page }) => {
  // Запрещаем любые нажатия клавиш в этом тесте.
  page.keyboard.press = async () => {
    throw new Error('Клавиатура не должна использоваться');
  };
  page.keyboard.type = page.keyboard.press;

  await page.goto('./');
  await page.getByTestId('level-easy').click();
  await page.getByTestId('tile-easy-0001').click();
  await expect(page.getByTestId('current-clue')).toBeVisible();

  const puzzle = await fetchPuzzle(page, 'easy', 1);
  for (const word of puzzle.words) {
    // Выбираем слово кликом по вопросу в списке «Все вопросы».
    await page.getByRole('button', { name: 'Все вопросы' }).click();
    await page
      .getByRole('dialog', { name: 'Все вопросы' })
      .getByRole('button', { name: new RegExp(`^${word.number}\\. `) })
      .filter({ hasText: word.clue })
      .click();
    await expect(page.getByTestId('current-clue')).toHaveText(word.clue);
    // Вписываем буквы в пустые клетки этого слова, щёлкая по каждой клетке.
    for (let i = 0; i < word.answer.length; i++) {
      const r = word.direction === 'down' ? word.row + i : word.row;
      const c = word.direction === 'across' ? word.col + i : word.col;
      const cell = page.locator(`[data-cell="${r * puzzle.width + c}"]`);
      if ((await cell.innerText()).replace(/\d/g, '').trim() !== '') continue;
      await clickCell(page, puzzle, r, c);
      if ((await page.getByTestId('current-clue').innerText()) !== word.clue) {
        // Клетка на пересечении выбрала другое слово — повторный клик поворачивает.
        await clickCell(page, puzzle, r, c);
      }
      await clickKey(page, word.answer[i]);
    }
  }

  await expect(page.getByRole('dialog', { name: 'Поздравляем!' })).toBeVisible();
  await page.getByRole('button', { name: /К списку кроссвордов/ }).click();
  await expect(page.getByTestId('tile-easy-0001')).toContainText('Решён');
});

test('прогресс сохраняется после перезагрузки', async ({ page }) => {
  await page.goto('./#/puzzle/medium-0002');
  await expect(page.getByTestId('current-clue')).toBeVisible();
  const puzzle = await fetchPuzzle(page, 'medium', 2);
  const first = puzzle.words.find((w) => w.number === 1)!;
  await clickCell(page, puzzle, first.row, first.col);
  await clickKey(page, first.answer[0]);
  await page.reload();
  await expect(page.locator(`[data-cell="${first.row * puzzle.width + first.col}"]`)).toContainText(first.answer[0]);

  await page.goto('./');
  await expect(page.getByTestId('continue')).toContainText('средний кроссворд №2');
});

test('ввод с физической клавиатуры в латинской раскладке', async ({ page }) => {
  await page.goto('./#/puzzle/easy-0003');
  await expect(page.getByTestId('current-clue')).toBeVisible();
  const puzzle = await fetchPuzzle(page, 'easy', 3);
  const word = puzzle.words[0];
  await clickCell(page, puzzle, word.row, word.col);
  // ЙЦУКЕН → QWERTY
  const ruToLatin: Record<string, string> = Object.fromEntries(
    'ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ'.split('').map((ch, i) => [ch, "qwertyuiop[]asdfghjkl;'zxcvbnm,."[i]]),
  );
  await page.keyboard.type(ruToLatin[word.answer[0]]);
  await expect(page.locator(`[data-cell="${word.row * puzzle.width + word.col}"]`)).toContainText(word.answer[0]);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(page.locator(`[data-cell="${word.row * puzzle.width + word.col}"]`)).not.toContainText(word.answer[0]);
  // Backspace не должен уводить со страницы.
  await expect(page).toHaveURL(/#\/puzzle\/easy-0003/);
});

test('кнопки не меньше 48×48 и без горизонтальной прокрутки', async ({ page }) => {
  for (const url of ['./', './#/level/hard', './#/puzzle/hard-0010', './#/settings', './#/help']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const small = await page.$$eval('button', (buttons) =>
      buttons
        .filter((b) => !b.hasAttribute('data-cell') && b.offsetParent !== null)
        .map((b) => ({ text: (b.textContent || '').trim(), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }))
        .filter((b) => b.w < 47.5 || b.h < 47.5),
    );
    expect(small, `маленькие кнопки на ${url}`).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `горизонтальная прокрутка на ${url}`).toBeLessThanOrEqual(0);
  }
});

test('на 1024×768 экран кроссворда помещается без прокрутки', async ({ page }) => {
  for (const id of ['easy-0001', 'medium-0001', 'hard-0001']) {
    await page.goto('./#/puzzle/' + id);
    await expect(page.getByTestId('current-clue')).toBeVisible();
    await page.getByRole('button', { name: 'Подсказка', exact: true }).click();
    const scroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(scroll, id).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: 'Проверить всё' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Стереть' })).toBeInViewport();
  }
});

test('работает без интернета после первого посещения', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  // Открываем кроссворд, чтобы его пачка попала в кеш.
  await page.goto('./#/puzzle/hard-0004');
  await expect(page.getByTestId('current-clue')).toBeVisible();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('current-clue')).toBeVisible();
  await page.goto('./#/');
  await expect(page.getByText('Выберите сложность')).toBeVisible();
  await expect(page.getByText('Решено 0 из 300')).toBeVisible();
  await context.setOffline(false);
});

test('скачивание всех кроссвордов для офлайна', async ({ page, context }) => {
  await page.goto('./#/settings');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole('button', { name: 'Скачать все кроссворды' }).click();
  await expect(page.getByText(/Готово: все кроссворды сохранены/)).toBeVisible({ timeout: 30_000 });

  await context.setOffline(true);
  await page.goto('./#/puzzle/medium-0349');
  await expect(page.getByTestId('current-clue')).toBeVisible();
  await context.setOffline(false);
});
