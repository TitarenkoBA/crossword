/**
 * Общий контекст приложения: хранилище, загрузчик данных, настройки
 * и защита от дрожания рук. Подключается один раз в App.tsx.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createStore, loadSettingsRaw, saveSettingsRaw, type Store } from '../storage/storage.ts';
import { createLoader, type PuzzleLoader } from '../data/loader.ts';
import { applySettingsToDocument, sanitizeSettings, type Settings } from './settings.ts';

export interface AppContextValue {
  store: Store;
  loader: PuzzleLoader;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /**
   * Пропускает действие через защиту от дрожания: если включена и та же
   * кнопка (key) нажата повторно быстрее tremorDelayMs — действие игнорируется.
   */
  guard: (key: string, action: () => void) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export interface AppProviderProps {
  children: ReactNode;
  store?: Store;
  loader?: PuzzleLoader;
  /** Источник времени (для тестов). */
  now?: () => number;
}

export function AppProvider({ children, store: storeProp, loader: loaderProp, now = Date.now }: AppProviderProps) {
  const store = useMemo(() => storeProp ?? createStore(), [storeProp]);
  const loader = useMemo(() => loaderProp ?? createLoader(), [loaderProp]);
  const [settings, setSettings] = useState<Settings>(() => sanitizeSettings(loadSettingsRaw(store)));

  useEffect(() => {
    applySettingsToDocument(settings);
  }, [settings]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = sanitizeSettings({ ...prev, ...patch });
        saveSettingsRaw(store, next);
        return next;
      });
    },
    [store],
  );

  const last = useRef<{ key: string; at: number }>({ key: '', at: -Infinity });
  const guard = useCallback(
    (key: string, action: () => void) => {
      const t = now();
      if (settings.tremorGuard && last.current.key === key && t - last.current.at < settings.tremorDelayMs) return;
      last.current = { key, at: t };
      action();
    },
    [settings.tremorGuard, settings.tremorDelayMs, now],
  );

  const value = useMemo(
    () => ({ store, loader, settings, updateSettings, guard }),
    [store, loader, settings, updateSettings, guard],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp() вызван вне <AppProvider>');
  return ctx;
}
