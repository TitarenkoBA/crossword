/**
 * Обёртка над localStorage.
 *
 * localStorage может быть недоступен (режим инкогнито в старых браузерах,
 * запрет cookies, переполнение). Тогда приложение продолжает работать,
 * просто ничего не сохраняет, а `isPersistent()` возвращает false —
 * интерфейс показывает предупреждение.
 *
 * Все ключи начинаются с PREFIX; версия в префиксе позволит в будущем
 * мигрировать формат (см. docs/ARCHITECTURE.md).
 */
import type { SavedProgress } from '../core/progress.ts';

export const PREFIX = 'crossword:v1:';

export interface Store {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
  keys(): string[];
  /** Можно ли реально сохранять данные. */
  isPersistent(): boolean;
}

/** Хранилище в памяти — запасной вариант и для тестов. */
export function createMemoryStore(): Store {
  const map = new Map<string, string>();
  return {
    get: (k) => (map.has(k) ? map.get(k)! : null),
    set: (k, v) => {
      map.set(k, v);
      return true;
    },
    remove: (k) => {
      map.delete(k);
    },
    keys: () => [...map.keys()],
    isPersistent: () => false,
  };
}

export function createStore(backend: Storage | null = safeLocalStorage()): Store {
  if (!backend) return createMemoryStore();
  let persistent = true;
  return {
    get(key) {
      try {
        return backend.getItem(PREFIX + key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        backend.setItem(PREFIX + key, value);
        persistent = true;
        return true;
      } catch {
        persistent = false;
        return false;
      }
    },
    remove(key) {
      try {
        backend.removeItem(PREFIX + key);
      } catch {
        /* ничего не делаем */
      }
    },
    keys() {
      const out: string[] = [];
      try {
        for (let i = 0; i < backend.length; i++) {
          const k = backend.key(i);
          if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
        }
      } catch {
        /* ничего не делаем */
      }
      return out;
    },
    isPersistent: () => persistent,
  };
}

/** localStorage, если он есть и в него можно писать. */
function safeLocalStorage(): Storage | null {
  try {
    const ls = window.localStorage;
    const probe = PREFIX + '__probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

function readJson<T>(store: Store, key: string): T | null {
  const raw = store.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ——— Прикладные функции ———

const PROGRESS = 'progress:';

export function loadProgress(store: Store, id: string): SavedProgress | null {
  return readJson<SavedProgress>(store, PROGRESS + id);
}

export function saveProgress(store: Store, id: string, progress: SavedProgress): boolean {
  return store.set(PROGRESS + id, JSON.stringify(progress));
}

export function removeProgress(store: Store, id: string): void {
  store.remove(PROGRESS + id);
}

export interface ProgressSummary {
  percent: number;
  solved: boolean;
  solutionShown: boolean;
}

/** Краткая сводка по всем начатым кроссвордам (для списка и главной). */
export function progressSummaries(store: Store): Map<string, ProgressSummary> {
  const out = new Map<string, ProgressSummary>();
  for (const key of store.keys()) {
    if (key.indexOf(PROGRESS) !== 0) continue;
    const p = readJson<SavedProgress>(store, key);
    if (!p) continue;
    out.set(key.slice(PROGRESS.length), {
      percent: typeof p.percent === 'number' ? p.percent : 0,
      solved: !!p.solved,
      solutionShown: !!p.solutionShown,
    });
  }
  return out;
}

export function loadLastPuzzle(store: Store): string | null {
  return store.get('last');
}

export function saveLastPuzzle(store: Store, id: string): void {
  store.set('last', id);
}

export function loadSettingsRaw(store: Store): unknown {
  return readJson<unknown>(store, 'settings');
}

export function saveSettingsRaw(store: Store, settings: unknown): void {
  store.set('settings', JSON.stringify(settings));
}

/** Удаляет весь прогресс (настройки сохраняются). */
export function clearAllProgress(store: Store): void {
  for (const key of store.keys()) {
    if (key.indexOf(PROGRESS) === 0 || key === 'last') store.remove(key);
  }
}
