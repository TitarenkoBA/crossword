/**
 * Пользовательские настройки (экран «Настройки», docs/SPEC.md п. 3.2).
 * Чтобы добавить настройку: поле в Settings, значение в DEFAULT_SETTINGS,
 * проверку в sanitizeSettings и элемент на экране SettingsScreen.
 */

export type Theme = 'light' | 'dark' | 'contrast';
export type Scale = 0 | 1 | 2 | 3;

export interface Settings {
  /** Размер интерфейса: 0 — обычный … 3 — максимальный. */
  scale: Scale;
  theme: Theme;
  /** Показывать экранную клавиатуру на экране кроссворда. */
  showKeyboard: boolean;
  /** Повторный клик по выделенной клетке меняет направление. */
  toggleOnSameCell: boolean;
  /** После заполнения слова переходить к следующему. */
  autoNextWord: boolean;
  /** Защита от дрожания рук: игнорировать повторное нажатие той же кнопки. */
  tremorGuard: boolean;
  /** Сколько миллисекунд игнорировать повтор. */
  tremorDelayMs: number;
  /** Показывать таймер. */
  showTimer: boolean;
  /** Спрашивать подтверждение перед «Показать решение» и «Начать заново». */
  confirmActions: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  scale: 1,
  theme: 'light',
  showKeyboard: true,
  toggleOnSameCell: true,
  autoNextWord: true,
  tremorGuard: false,
  tremorDelayMs: 300,
  showTimer: false,
  confirmActions: true,
};

export const SCALE_LABELS = ['Обычный', 'Крупный', 'Очень крупный', 'Максимальный'];
export const THEME_LABELS: Record<Theme, string> = {
  light: 'Светлая',
  dark: 'Тёмная',
  contrast: 'Высокий контраст',
};
export const TREMOR_DELAYS = [200, 300, 500, 800];

/** Берёт из сохранённых данных только корректные значения, остальное — по умолчанию. */
export function sanitizeSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (r.scale === 0 || r.scale === 1 || r.scale === 2 || r.scale === 3) s.scale = r.scale;
  if (r.theme === 'light' || r.theme === 'dark' || r.theme === 'contrast') s.theme = r.theme;
  if (typeof r.tremorDelayMs === 'number' && TREMOR_DELAYS.indexOf(r.tremorDelayMs) !== -1) {
    s.tremorDelayMs = r.tremorDelayMs;
  }
  const flags = ['showKeyboard', 'toggleOnSameCell', 'autoNextWord', 'tremorGuard', 'showTimer', 'confirmActions'] as const;
  for (const f of flags) if (typeof r[f] === 'boolean') s[f] = r[f] as boolean;
  return s;
}

/** Применяет тему и масштаб к <html> (классы описаны в src/styles/index.css). */
export function applySettingsToDocument(settings: Settings, root: HTMLElement = document.documentElement): void {
  const keep = root.className
    .split(/\s+/)
    .filter((c) => c && c.indexOf('theme-') !== 0 && c.indexOf('scale-') !== 0);
  keep.push('theme-' + settings.theme);
  if (settings.scale > 0) keep.push('scale-' + settings.scale);
  root.className = keep.join(' ');
}
