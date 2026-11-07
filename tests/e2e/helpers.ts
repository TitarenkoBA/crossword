import type { Page } from '@playwright/test';
import type { Puzzle } from '../../src/core/types.ts';
import type { PuzzleChunk } from '../../src/data/format.ts';

/** Загружает кроссворд из данных сайта (чтобы знать правильные ответы). */
export async function fetchPuzzle(page: Page, level: Puzzle['difficulty'], index: number): Promise<Puzzle> {
  const chunk = String(Math.floor((index - 1) / 50)).padStart(2, '0');
  const data = (await page.evaluate((url) => fetch(url).then((r) => r.json()), `./data/${level}/chunk-${chunk}.json`)) as PuzzleChunk;
  return data.puzzles.find((p) => p.index === index)!;
}

/** Клик по клетке сетки (строка, столбец). */
export async function clickCell(page: Page, puzzle: Puzzle, row: number, col: number) {
  await page.locator(`[data-cell="${row * puzzle.width + col}"]`).click();
}

/** Клик по букве экранной клавиатуры. */
export async function clickKey(page: Page, letter: string) {
  await page.getByRole('group', { name: 'Экранная клавиатура' }).getByRole('button', { name: letter, exact: true }).click();
}
