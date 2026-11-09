import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import {
  INSTALL_SNOOZE_MS,
  isStandalone,
  listenForInstallPrompt,
  onInstallAvailable,
  promptInstall,
} from './install.ts';
import { InstallButton, InstallPrompt } from './InstallPrompt.tsx';
import { renderWithApp } from '../test/render.tsx';
import { createMemoryStore } from '../storage/storage.ts';

/** Имитирует событие beforeinstallprompt от браузера. */
function fireInstallable(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: string }>;
  };
  e.prompt = vi.fn(() => Promise.resolve());
  e.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(e);
  });
  return e;
}

// Слушатели на window вешаем один раз на весь файл.
listenForInstallPrompt();

afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });
});

describe('install', () => {
  it('без события установка недоступна', async () => {
    let available = true;
    const off = onInstallAvailable((a) => (available = a));
    expect(available).toBe(false);
    expect(await promptInstall()).toBe('unavailable');
    off();
  });

  it('сохраняет событие, отменяет плашку браузера и вызывает системный диалог', async () => {
    const seen: boolean[] = [];
    const off = onInstallAvailable((a) => seen.push(a));
    const e = fireInstallable('accepted');
    expect(e.defaultPrevented).toBe(true);
    expect(seen).toEqual([false, true]);
    expect(await promptInstall()).toBe('accepted');
    expect(e.prompt).toHaveBeenCalledTimes(1);
    // событие одноразовое
    expect(seen[seen.length - 1]).toBe(false);
    expect(await promptInstall()).toBe('unavailable');
    off();
  });

  it('после установки предложение исчезает', () => {
    let available = false;
    const off = onInstallAvailable((a) => (available = a));
    fireInstallable();
    expect(available).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(available).toBe(false);
    off();
  });

  it('isStandalone', () => {
    const win = (standalone: boolean, media: boolean) =>
      ({ navigator: { standalone }, matchMedia: () => ({ matches: media }) }) as unknown as Window;
    expect(isStandalone(win(false, false))).toBe(false);
    expect(isStandalone(win(true, false))).toBe(true);
    expect(isStandalone(win(false, true))).toBe(true);
  });
});

describe('InstallPrompt', () => {
  it('появляется, только когда браузер разрешает установку', () => {
    renderWithApp(<InstallPrompt />);
    expect(screen.queryByTestId('install-prompt')).toBeNull();
    const e = fireInstallable();
    expect(screen.getByTestId('install-prompt')).toHaveTextContent('Установить «Кроссворды»?');
    fireEvent.click(screen.getByRole('button', { name: 'Установить' }));
    expect(e.prompt).toHaveBeenCalled();
    expect(screen.queryByTestId('install-prompt')).toBeNull();
  });

  it('«Не сейчас» прячет окно на 14 дней', () => {
    const store = createMemoryStore();
    let t = 1_000_000;
    const first = renderWithApp(<InstallPrompt now={() => t} />, { store });
    fireInstallable();
    fireEvent.click(screen.getByRole('button', { name: 'Не сейчас' }));
    expect(screen.queryByTestId('install-prompt')).toBeNull();
    first.unmount();

    t += INSTALL_SNOOZE_MS - 1;
    const second = renderWithApp(<InstallPrompt now={() => t} />, { store });
    expect(screen.queryByTestId('install-prompt')).toBeNull();
    second.unmount();

    t += 2;
    renderWithApp(<InstallPrompt now={() => t} />, { store });
    expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
  });

  it('кнопка в настройках', () => {
    renderWithApp(<InstallButton />);
    expect(screen.queryByRole('button', { name: 'Установить приложение' })).toBeNull();
    const e = fireInstallable();
    fireEvent.click(screen.getByRole('button', { name: 'Установить приложение' }));
    expect(e.prompt).toHaveBeenCalled();
  });
});
