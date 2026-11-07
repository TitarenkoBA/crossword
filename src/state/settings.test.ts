import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, applySettingsToDocument, sanitizeSettings } from './settings.ts';

describe('sanitizeSettings', () => {
  it('без данных — значения по умолчанию', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('мусор')).toEqual(DEFAULT_SETTINGS);
  });

  it('берёт корректные значения и отбрасывает неверные', () => {
    const s = sanitizeSettings({
      scale: 3,
      theme: 'contrast',
      showKeyboard: false,
      tremorGuard: true,
      tremorDelayMs: 500,
      showTimer: 'да',
      autoNextWord: 0,
      unknown: 1,
    });
    expect(s).toEqual({
      ...DEFAULT_SETTINGS,
      scale: 3,
      theme: 'contrast',
      showKeyboard: false,
      tremorGuard: true,
      tremorDelayMs: 500,
    });
    expect(sanitizeSettings({ scale: 7, theme: 'pink', tremorDelayMs: 1 })).toEqual(DEFAULT_SETTINGS);
  });
});

describe('applySettingsToDocument', () => {
  it('ставит классы темы и масштаба, сохраняя чужие классы', () => {
    const el = document.createElement('html');
    el.className = 'foo theme-dark scale-2';
    applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: 'contrast', scale: 3 }, el);
    expect(el.className).toBe('foo theme-contrast scale-3');
    applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: 'light', scale: 0 }, el);
    expect(el.className).toBe('foo theme-light');
  });
});
