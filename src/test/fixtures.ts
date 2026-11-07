import type { Puzzle } from '../core/types.ts';

/**
 * Маленький кроссворд для тестов (5×3):
 *
 *     0 1 2 3 4
 *  0  К О Т . .     1 по горизонтали: КОТ   (клетки 0, 1, 2)
 *  1  . . О . .     2 по вертикали:   ТОК   (клетки 2, 7, 12)
 *  2  . . К И Т     3 по горизонтали: КИТ   (клетки 12, 13, 14)
 */
export const SMALL_PUZZLE: Puzzle = {
  id: 'easy-0001',
  difficulty: 'easy',
  index: 1,
  width: 5,
  height: 3,
  words: [
    { number: 1, direction: 'across', row: 0, col: 0, answer: 'КОТ', clue: 'Мурлыка', hint: 'Ловит мышей' },
    { number: 2, direction: 'down', row: 0, col: 2, answer: 'ТОК', clue: 'Течёт по проводам', hint: 'Электрический…' },
    { number: 3, direction: 'across', row: 2, col: 2, answer: 'КИТ', clue: 'Морской великан', hint: 'Пускает фонтан' },
  ],
};
