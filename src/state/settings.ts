/**
 * Пользовательские настройки (экран «Настройки», docs/SPEC.md п. 3.2).
 * Чтобы добавить настройку: поле в Settings, значение в DEFAULT_SETTINGS,
 * проверку в sanitizeSettings и элемент на экране SettingsScreen.
 *
 * Зрительные специальные возможности (крупный текст, высокий контраст)
 * по умолчанию выключены и включаются одним переключателем `visualAids`.
 * Пока он выключен, выбранные размер и контраст запоминаются, но не применяются.
 */

export type Theme = 'light' | 'dark';
export type Scale = 0 | 1 | 2 | 3;

export interface Settings {
  theme: Theme;
  /** Включены зрительные специальные возможности. */
  visualAids: boolean;
  /** Размер интерфейса при включённых спецвозможностях: 0 — обычный … 3 — максимальный. */
  scale: Scale;
  /** Высокий контраст при включённых спецвозможностях. */
  highContrast: boolean;
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
  theme: 'light',
  visualAids: false,
  scale: 1,
  highContrast: false,
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
};
export const TREMOR_DELAYS = [200, 300, 500, 800];

/** Размер шрифта <html> в пикселях для каждого масштаба (см. src/styles/index.css). */
export const ROOT_FONT_PX = [16, 20, 24, 28];

/** Масштаб, который реально применяется. */
export function effectiveScale(s: Settings): Scale {
  return s.visualAids ? s.scale : 0;
}

/** Тема оформления, которая реально применяется. */
export function effectiveTheme(s: Settings): Theme | 'contrast' {
  return s.visualAids && s.highContrast ? 'contrast' : s.theme;
}

/** Берёт из сохранённых данных только корректные значения, остальное — по умолчанию. */
export function sanitizeSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (r.scale === 0 || r.scale === 1 || r.scale === 2 || r.scale === 3) s.scale = r.scale;
  if (r.theme === 'light' || r.theme === 'dark') s.theme = r.theme;
  if (typeof r.tremorDelayMs === 'number' && TREMOR_DELAYS.indexOf(r.tremorDelayMs) !== -1) {
    s.tremorDelayMs = r.tremorDelayMs;
  }
  const flags = [
    'visualAids',
    'highContrast',
    'showKeyboard',
    'toggleOnSameCell',
    'autoNextWord',
    'tremorGuard',
    'showTimer',
    'confirmActions',
  ] as const;
  for (const f of flags) if (typeof r[f] === 'boolean') s[f] = r[f] as boolean;
  // Старый формат (до появления переключателя): тема «contrast».
  if (r.theme === 'contrast' && typeof r.highContrast !== 'boolean') {
    s.highContrast = true;
    if (typeof r.visualAids !== 'boolean') s.visualAids = true;
  }
  return s;
}

/** Применяет тему и масштаб к <html> (классы описаны в src/styles/index.css). */
export function applySettingsToDocument(settings: Settings, root: HTMLElement = document.documentElement): void {
  const keep = root.className
    .split(/\s+/)
    .filter((c) => c && c.indexOf('theme-') !== 0 && c.indexOf('scale-') !== 0);
  keep.push('theme-' + effectiveTheme(settings));
  const scale = effectiveScale(settings);
  if (scale > 0) keep.push('scale-' + scale);
  root.className = keep.join(' ');
}
