/**
 * Перевод нажатий физической клавиатуры в команды игры.
 *
 * Важно для Chrome 49: свойство KeyboardEvent.key появилось только в Chrome 51.
 * Поэтому смотрим по очереди на key, code (есть с Chrome 48) и keyCode.
 */
import { letterFromKey } from './letters.ts';

export interface KeyLike {
  key?: string;
  code?: string;
  keyCode?: number;
  shiftKey?: boolean;
}

export type KeyCommand =
  | { type: 'letter'; letter: string }
  | { type: 'erase' }
  | { type: 'arrow'; dir: 'up' | 'down' | 'left' | 'right' }
  | { type: 'toggleDirection' }
  | { type: 'nextWord' }
  | { type: 'prevWord' };

const KEYCODE_NAMES: Record<number, string> = {
  8: 'Backspace',
  9: 'Tab',
  32: ' ',
  37: 'ArrowLeft',
  38: 'ArrowUp',
  39: 'ArrowRight',
  40: 'ArrowDown',
  46: 'Delete',
};

/** keyCode → символ латинской раскладки (для самых старых браузеров без code). */
const KEYCODE_LATIN: Record<number, string> = {
  186: ';', 59: ';', 222: "'", 219: '[', 221: ']', 188: ',', 190: '.', 192: '`',
};

/** Название клавиши с учётом старых браузеров ('Up' в IE/Edge — тоже стрелка). */
export function keyName(e: KeyLike): string {
  if (e.key && e.key !== 'Unidentified') {
    const legacy: Record<string, string> = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', Del: 'Delete', Spacebar: ' ' };
    return legacy[e.key] || e.key;
  }
  return (e.keyCode !== undefined && KEYCODE_NAMES[e.keyCode]) || '';
}

/**
 * Команда для нажатия. onGrid — фокус стоит на клетке сетки: только тогда
 * Пробел и Tab управляют кроссвордом (иначе они нужны для обычной навигации).
 */
export function keyCommand(e: KeyLike, onGrid: boolean): KeyCommand | null {
  const name = keyName(e);
  switch (name) {
    case 'Backspace':
    case 'Delete':
      return { type: 'erase' };
    case 'ArrowUp':
      return { type: 'arrow', dir: 'up' };
    case 'ArrowDown':
      return { type: 'arrow', dir: 'down' };
    case 'ArrowLeft':
      return { type: 'arrow', dir: 'left' };
    case 'ArrowRight':
      return { type: 'arrow', dir: 'right' };
    case ' ':
      return onGrid ? { type: 'toggleDirection' } : null;
    case 'Tab':
      return onGrid ? { type: e.shiftKey ? 'prevWord' : 'nextWord' } : null;
  }
  let letter = letterFromKey(name, e.code);
  if (!letter && e.keyCode !== undefined) {
    if (e.keyCode >= 65 && e.keyCode <= 90) letter = letterFromKey(String.fromCharCode(e.keyCode).toLowerCase());
    else if (KEYCODE_LATIN[e.keyCode]) letter = letterFromKey(KEYCODE_LATIN[e.keyCode]);
  }
  return letter ? { type: 'letter', letter } : null;
}
