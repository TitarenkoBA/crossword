/** Уровень сложности кроссворда. */
export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Направление слова: по горизонтали или по вертикали. */
export type Direction = 'across' | 'down';

/** Слово в кроссворде (так оно хранится в public/data/.../chunk-NN.json). */
export interface PuzzleWord {
  /** Номер, который показывается в первой клетке слова и в списке вопросов. */
  number: number;
  direction: Direction;
  /** Строка и столбец первой буквы (с нуля). */
  row: number;
  col: number;
  /** Ответ заглавными русскими буквами, без Ё. */
  answer: string;
  /** Вопрос. */
  clue: string;
  /** Дополнительная подсказка (показывается по кнопке «Подсказка»). */
  hint: string;
}

/** Кроссворд. */
export interface Puzzle {
  /** Например, `easy-0001`. */
  id: string;
  difficulty: Difficulty;
  /** Порядковый номер внутри уровня, с 1. */
  index: number;
  width: number;
  height: number;
  words: PuzzleWord[];
}
