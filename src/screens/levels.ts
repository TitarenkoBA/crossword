import type { Difficulty } from '../core/types.ts';

/** Подписи уровней для интерфейса. Настройки генерации — src/core/generator.ts (LEVELS). */
export const LEVEL_INFO: Record<Difficulty, { title: string; singular: string; description: string; accent: string }> = {
  easy: { title: 'Лёгкие', singular: 'лёгкий', description: 'Небольшая сетка, 8–10 простых слов', accent: '#22a06b' },
  medium: { title: 'Средние', singular: 'средний', description: 'Сетка побольше, 12–16 слов', accent: '#e59a0b' },
  hard: { title: 'Сложные', singular: 'сложный', description: 'Большая сетка, 18–24 слова, редкие слова', accent: '#e0455c' },
};
