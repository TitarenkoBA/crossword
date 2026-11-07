import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  applySettingsToDocument,
  effectiveScale,
  effectiveTheme,
  sanitizeSettings,
} from './settings.ts';

describe('sanitizeSettings', () => {
  it('без данных — значения по умолчанию, спецвозможности выключены', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('мусор')).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.visualAids).toBe(false);
  });

  it('берёт корректные значения и отбрасывает неверные', () => {
    const s = sanitizeSettings({
      scale: 3,
      theme: 'dark',
      visualAids: true,
      highContrast: true,
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
      theme: 'dark',
      visualAids: true,
      highContrast: true,
      showKeyboard: false,
      tremorGuard: true,
      tremorDelayMs: 500,
    });
    expect(sanitizeSettings({ scale: 7, theme: 'pink', tremorDelayMs: 1 })).toEqual(DEFAULT_SETTINGS);
  });

  it('переносит старую тему «contrast» в новый формат', () => {
    const s = sanitizeSettings({ theme: 'contrast' });
    expect(s).toMatchObject({ theme: 'light', highContrast: true, visualAids: true });
  });
});

describe('применение спецвозможностей', () => {
  it('пока переключатель выключен, размер и контраст не применяются', () => {
    const s = { ...DEFAULT_SETTINGS, scale: 3 as const, highContrast: true, theme: 'dark' as const };
    expect(effectiveScale(s)).toBe(0);
    expect(effectiveTheme(s)).toBe('dark');
    expect(effectiveScale({ ...s, visualAids: true })).toBe(3);
    expect(effectiveTheme({ ...s, visualAids: true })).toBe('contrast');
  });

  it('ставит классы темы и масштаба, сохраняя чужие классы', () => {
    const el = document.createElement('html');
    el.className = 'foo theme-dark scale-2';
    applySettingsToDocument({ ...DEFAULT_SETTINGS, visualAids: true, highContrast: true, scale: 3 }, el);
    expect(el.className).toBe('foo theme-contrast scale-3');
    applySettingsToDocument({ ...DEFAULT_SETTINGS, scale: 3 }, el);
    expect(el.className).toBe('foo theme-light');
  });
});
