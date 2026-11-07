import { describe, expect, it } from 'vitest';
import {
  PREFIX,
  clearAllProgress,
  createMemoryStore,
  createStore,
  loadLastPuzzle,
  loadProgress,
  loadSettingsRaw,
  progressSummaries,
  removeProgress,
  saveLastPuzzle,
  saveProgress,
  saveSettingsRaw,
} from './storage.ts';
import type { SavedProgress } from '../core/progress.ts';

const progress = (percent: number, solved = false): SavedProgress => ({
  v: 1,
  entries: '...',
  revealed: [],
  wrong: [],
  hintsShown: [],
  cursor: { cell: 0, direction: 'across' },
  stats: { revealedLetters: 0, hintsShown: 0, checks: 0 },
  solved,
  solutionShown: false,
  elapsedMs: 0,
  percent,
  updatedAt: 1,
});

describe('createStore (localStorage)', () => {
  it('пишет с префиксом и читает обратно', () => {
    const store = createStore(window.localStorage);
    store.set('x', '1');
    expect(window.localStorage.getItem(PREFIX + 'x')).toBe('1');
    expect(store.get('x')).toBe('1');
    expect(store.keys()).toEqual(['x']);
    store.remove('x');
    expect(store.get('x')).toBeNull();
    expect(store.isPersistent()).toBe(true);
  });

  it('не видит чужие ключи', () => {
    window.localStorage.setItem('other', '1');
    expect(createStore(window.localStorage).keys()).toEqual([]);
  });

  it('переживает ошибки хранилища (переполнение, запрет)', () => {
    const broken = {
      getItem: () => {
        throw new Error('нет доступа');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('нет доступа');
      },
      key: () => {
        throw new Error('нет доступа');
      },
      length: 1,
      clear: () => {},
    } as unknown as Storage;
    const store = createStore(broken);
    expect(store.set('a', '1')).toBe(false);
    expect(store.isPersistent()).toBe(false);
    expect(store.get('a')).toBeNull();
    expect(store.keys()).toEqual([]);
    expect(() => store.remove('a')).not.toThrow();
  });

  it('без localStorage — хранилище в памяти', () => {
    const store = createStore(null);
    store.set('a', '1');
    expect(store.get('a')).toBe('1');
    expect(store.isPersistent()).toBe(false);
  });
});

describe('прикладные функции', () => {
  it('прогресс: сохранить, прочитать, сводка, удалить', () => {
    const store = createMemoryStore();
    saveProgress(store, 'easy-0001', progress(40));
    saveProgress(store, 'easy-0002', progress(100, true));
    store.set('progress:easy-0003', '{битый json');
    expect(loadProgress(store, 'easy-0001')?.percent).toBe(40);
    expect(loadProgress(store, 'easy-0003')).toBeNull();
    const sum = progressSummaries(store);
    expect(sum.get('easy-0001')).toEqual({ percent: 40, solved: false, solutionShown: false });
    expect(sum.get('easy-0002')?.solved).toBe(true);
    expect(sum.has('easy-0003')).toBe(false);
    removeProgress(store, 'easy-0001');
    expect(loadProgress(store, 'easy-0001')).toBeNull();
  });

  it('последний кроссворд и настройки', () => {
    const store = createMemoryStore();
    expect(loadLastPuzzle(store)).toBeNull();
    saveLastPuzzle(store, 'hard-0005');
    expect(loadLastPuzzle(store)).toBe('hard-0005');
    saveSettingsRaw(store, { scale: 2 });
    expect(loadSettingsRaw(store)).toEqual({ scale: 2 });
  });

  it('clearAllProgress удаляет прогресс, но не настройки', () => {
    const store = createMemoryStore();
    saveProgress(store, 'easy-0001', progress(10));
    saveLastPuzzle(store, 'easy-0001');
    saveSettingsRaw(store, { scale: 2 });
    clearAllProgress(store);
    expect(store.keys()).toEqual(['settings']);
  });
});
