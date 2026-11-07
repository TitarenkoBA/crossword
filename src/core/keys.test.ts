import { describe, expect, it } from 'vitest';
import { keyCommand, keyName } from './keys.ts';

describe('keyName', () => {
  it('современные и старые названия', () => {
    expect(keyName({ key: 'ArrowUp' })).toBe('ArrowUp');
    expect(keyName({ key: 'Up' })).toBe('ArrowUp');
    expect(keyName({ key: 'Spacebar' })).toBe(' ');
    expect(keyName({ key: 'Unidentified', keyCode: 8 })).toBe('Backspace');
    // Chrome 49: key нет вообще
    expect(keyName({ keyCode: 37 })).toBe('ArrowLeft');
    expect(keyName({ keyCode: 13 })).toBe('');
  });
});

describe('keyCommand', () => {
  it('стирание и стрелки', () => {
    expect(keyCommand({ key: 'Backspace' }, false)).toEqual({ type: 'erase' });
    expect(keyCommand({ keyCode: 46 }, false)).toEqual({ type: 'erase' });
    expect(keyCommand({ keyCode: 38 }, false)).toEqual({ type: 'arrow', dir: 'up' });
    expect(keyCommand({ key: 'ArrowDown' }, false)).toEqual({ type: 'arrow', dir: 'down' });
    expect(keyCommand({ key: 'ArrowLeft' }, false)).toEqual({ type: 'arrow', dir: 'left' });
    expect(keyCommand({ key: 'ArrowRight' }, false)).toEqual({ type: 'arrow', dir: 'right' });
  });

  it('Пробел и Tab работают только на сетке', () => {
    expect(keyCommand({ key: ' ' }, true)).toEqual({ type: 'toggleDirection' });
    expect(keyCommand({ key: ' ' }, false)).toBeNull();
    expect(keyCommand({ key: 'Tab' }, true)).toEqual({ type: 'nextWord' });
    expect(keyCommand({ key: 'Tab', shiftKey: true }, true)).toEqual({ type: 'prevWord' });
    expect(keyCommand({ keyCode: 9 }, false)).toBeNull();
  });

  it('буквы: русская раскладка, латинская, только code, только keyCode', () => {
    expect(keyCommand({ key: 'ё' }, false)).toEqual({ type: 'letter', letter: 'Е' });
    expect(keyCommand({ key: 'q', code: 'KeyQ' }, false)).toEqual({ type: 'letter', letter: 'Й' });
    expect(keyCommand({ code: 'KeyF' }, false)).toEqual({ type: 'letter', letter: 'А' });
    expect(keyCommand({ keyCode: 70 }, false)).toEqual({ type: 'letter', letter: 'А' });
    expect(keyCommand({ keyCode: 186 }, false)).toEqual({ type: 'letter', letter: 'Ж' });
    expect(keyCommand({ key: 'Enter', keyCode: 13 }, false)).toBeNull();
    expect(keyCommand({ key: '5', code: 'Digit5', keyCode: 53 }, false)).toBeNull();
  });
});
