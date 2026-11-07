import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { __resetForTests, applyUpdate, onUpdateAvailable, registerServiceWorker } from './register.ts';
import { UpdateBanner } from './UpdateBanner.tsx';
import { AppProvider } from '../state/AppContext.tsx';
import { createMemoryStore } from '../storage/storage.ts';

/** Имитация navigator.serviceWorker. */
function fakeNavigator(opts: { controller: boolean; waiting?: boolean }) {
  const regListeners: Record<string, () => void> = {};
  const swListeners: Record<string, () => void> = {};
  const worker = (state: string) => {
    const l: Record<string, () => void> = {};
    return {
      state,
      postMessage: vi.fn(),
      addEventListener: (t: string, fn: () => void) => (l[t] = fn),
      fire: (t: string) => l[t](),
    };
  };
  const waiting = opts.waiting ? worker('installed') : null;
  const installing = worker('installing');
  const reg = {
    waiting,
    installing,
    update: vi.fn(() => Promise.resolve()),
    addEventListener: (t: string, fn: () => void) => (regListeners[t] = fn),
  };
  const sw = {
    controller: opts.controller ? {} : null,
    register: vi.fn(() => Promise.resolve(reg)),
    addEventListener: (t: string, fn: () => void) => (swListeners[t] = fn),
  };
  return { nav: { serviceWorker: sw } as unknown as Navigator, reg, installing, waiting, regListeners, swListeners };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  __resetForTests();
});

describe('registerServiceWorker', () => {
  it('ничего не делает без поддержки Service Worker', () => {
    expect(() => registerServiceWorker({} as Navigator)).not.toThrow();
  });

  it('регистрирует ./sw.js и сообщает об ожидающем обновлении', async () => {
    const f = fakeNavigator({ controller: true, waiting: true });
    const seen: boolean[] = [];
    onUpdateAvailable((a) => seen.push(a));
    registerServiceWorker(f.nav);
    await flush();
    expect(f.nav.serviceWorker.register).toHaveBeenCalledWith('./sw.js');
    expect(seen).toEqual([false, true]);
  });

  it('новая версия, установленная во время работы, — тоже обновление', async () => {
    const f = fakeNavigator({ controller: true });
    let available = false;
    onUpdateAvailable((a) => (available = a));
    registerServiceWorker(f.nav);
    await flush();
    f.regListeners.updatefound();
    f.installing.state = 'installed';
    f.installing.fire('statechange');
    expect(available).toBe(true);
  });

  it('первая установка (без controller) — не обновление и без перезагрузки', async () => {
    const f = fakeNavigator({ controller: false });
    let available = false;
    onUpdateAvailable((a) => (available = a));
    registerServiceWorker(f.nav);
    await flush();
    f.regListeners.updatefound();
    f.installing.state = 'installed';
    f.installing.fire('statechange');
    expect(available).toBe(false);
    expect(() => f.swListeners.controllerchange()).not.toThrow();
  });

  it('applyUpdate отправляет SKIP_WAITING', async () => {
    const f = fakeNavigator({ controller: true, waiting: true });
    registerServiceWorker(f.nav);
    await flush();
    applyUpdate();
    expect(f.waiting!.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});

describe('UpdateBanner', () => {
  it('появляется, когда есть обновление, и кнопка его применяет', async () => {
    const f = fakeNavigator({ controller: true, waiting: true });
    render(
      <AppProvider store={createMemoryStore()}>
        <UpdateBanner />
      </AppProvider>,
    );
    expect(screen.queryByText(/новая версия/)).toBeNull();
    registerServiceWorker(f.nav);
    expect(await screen.findByText('Доступна новая версия сайта.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Обновить' }));
    expect(f.waiting!.postMessage).toHaveBeenCalled();
  });
});
