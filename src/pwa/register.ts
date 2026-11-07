/**
 * Регистрация Service Worker и уведомление о новой версии сайта.
 * Сам Service Worker — build/sw-template.js (собирается в dist/sw.js).
 */

type Listener = (available: boolean) => void;

let waiting: ServiceWorker | null = null;
let updating = false;
const listeners = new Set<Listener>();

function setWaiting(w: ServiceWorker | null) {
  waiting = w;
  listeners.forEach((l) => l(!!w));
}

/** Подписка на «доступно обновление». Возвращает функцию отписки. */
export function onUpdateAvailable(listener: Listener): () => void {
  listeners.add(listener);
  listener(!!waiting);
  return () => {
    listeners.delete(listener);
  };
}

/** Применить обновление: новый SW активируется, страница перезагрузится. */
export function applyUpdate(): void {
  if (!waiting) return;
  updating = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker(nav: Navigator = navigator): void {
  if (!('serviceWorker' in nav)) return;
  const sw = nav.serviceWorker;
  const start = () => {
    sw.register('./sw.js')
      .then((reg) => {
        if (reg.waiting && sw.controller) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // controller есть — значит, это обновление, а не первая установка.
            if (installing.state === 'installed' && sw.controller) setWaiting(installing);
          });
        });
        // Сайт может быть открыт днями — проверяем обновления раз в час.
        window.setInterval(() => reg.update().catch(() => undefined), 60 * 60 * 1000);
      })
      .catch(() => undefined);
    // Перезагружаемся только после нажатия «Обновить» (при первой установке
    // controllerchange тоже приходит — тогда перезагрузка не нужна).
    sw.addEventListener('controllerchange', () => {
      if (updating) window.location.reload();
    });
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
}

/** Только для тестов. */
export function __resetForTests(): void {
  waiting = null;
  updating = false;
  listeners.clear();
}
