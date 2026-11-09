/**
 * Предложение установить сайт как приложение (PWA).
 *
 * Браузер сам решает, можно ли установить сайт, и тогда присылает событие
 * `beforeinstallprompt` (Chrome, Edge, Яндекс Браузер, Samsung Internet и др.).
 * Мы его сохраняем, а интерфейс показывает собственное окно с кнопкой «Установить».
 * Если события нет (сайт уже установлен, iOS/Firefox, старый браузер) — окно не показывается.
 *
 * Слушатель нужно повесить как можно раньше — до отрисовки приложения
 * (вызов `listenForInstallPrompt()` в main.tsx), иначе событие можно пропустить.
 */

/** Событие beforeinstallprompt (нет в стандартных типах DOM). */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void> | void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Listener = (available: boolean) => void;

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<Listener>();

function setDeferred(e: InstallPromptEvent | null) {
  deferred = e;
  listeners.forEach((l) => l(!!e));
}

/** Подписка на «можно установить». Возвращает функцию отписки. */
export function onInstallAvailable(listener: Listener): () => void {
  listeners.add(listener);
  listener(!!deferred);
  return () => {
    listeners.delete(listener);
  };
}

export function listenForInstallPrompt(win: Window = window): void {
  win.addEventListener('beforeinstallprompt', (e) => {
    // Не даём браузеру показать свою мини-плашку — покажем своё окно.
    e.preventDefault();
    setDeferred(e as InstallPromptEvent);
  });
  win.addEventListener('appinstalled', () => setDeferred(null));
}

/** Показывает системный диалог установки. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred;
  if (!e) return 'unavailable';
  // Событие одноразовое: второй раз prompt() вызвать нельзя.
  setDeferred(null);
  try {
    await e.prompt();
    const choice = await e.userChoice;
    return choice.outcome;
  } catch {
    return 'dismissed';
  }
}

/** Сайт уже открыт как установленное приложение. */
export function isStandalone(win: Window = window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  return typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches;
}

/** Через сколько снова предлагать установку после «Не сейчас». */
export const INSTALL_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
