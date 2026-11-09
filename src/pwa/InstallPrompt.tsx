/**
 * Всплывающее окно «Установить приложение».
 *
 * Показывается на главной, только если браузер разрешает установку
 * (см. install.ts). «Не сейчас» прячет окно на 14 дней; кнопка установки
 * остаётся доступна в «Настройках» (InstallButton).
 */
import { useEffect, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { useApp } from '../state/AppContext.tsx';
import { INSTALL_SNOOZE_MS, isStandalone, onInstallAvailable, promptInstall } from './install.ts';

const SNOOZE_KEY = 'install-snoozed-at';

/** Можно ли сейчас установить приложение. */
export function useInstallAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => onInstallAvailable(setAvailable), []);
  return available && !isStandalone();
}

export function InstallPrompt({ now = Date.now }: { now?: () => number }) {
  const { store } = useApp();
  const available = useInstallAvailable();
  const [hidden, setHidden] = useState(() => {
    const at = Number(store.get(SNOOZE_KEY));
    return at > 0 && now() - at < INSTALL_SNOOZE_MS;
  });

  if (!available || hidden) return null;

  const later = () => {
    store.set(SNOOZE_KEY, String(now()));
    setHidden(true);
  };

  return (
    <>
      {/* Место под окном, чтобы оно не закрывало низ страницы. */}
      <div style={{ height: '15rem' }} aria-hidden="true" />
      {/* Не модальное окно внизу экрана: не мешает пользоваться страницей. */}
      <div className="fixed left-0 right-0 bottom-0 z-30 flex justify-center p-3" style={{ pointerEvents: 'none' }}>
        <section
          role="dialog"
          aria-labelledby="install-title"
          className="card shadow-pop w-full max-w-lg rounded-3xl p-5"
          style={{ pointerEvents: 'auto' }}
          data-testid="install-prompt"
        >
          <div className="flex items-start">
            <img src="./icons/icon-192.png" alt="" width={56} height={56} className="flex-none rounded-2xl mr-4" />
            <div className="flex-1" style={{ minWidth: 0 }}>
              <h2 id="install-title" className="text-xl font-bold">
                Установить «Кроссворды»?
              </h2>
              <p className="text-base text-muted mt-1">
                Значок появится на рабочем столе, а кроссворды будут открываться в отдельном окне и работать без интернета.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap -m-1 mt-4">
            <div className="w-1/2 p-1">
              <Button block variant="secondary" onClick={later} guardKey="install-later">
                Не сейчас
              </Button>
            </div>
            <div className="w-1/2 p-1">
              <Button block variant="primary" onClick={() => void promptInstall()} guardKey="install-now">
                Установить
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/** Кнопка установки для «Настроек»; если установка недоступна — ничего не рисует. */
export function InstallButton() {
  const available = useInstallAvailable();
  if (!available) return null;
  return (
    <Button block variant="primary" onClick={() => void promptInstall()} guardKey="install-settings">
      Установить приложение
    </Button>
  );
}
