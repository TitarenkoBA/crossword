/**
 * Тесты Service Worker: шаблон build/sw-template.js выполняется в имитации
 * окружения воркера (self, caches, fetch).
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isShellFile } from './service-worker.ts';

const SCOPE = 'https://example.org/crossword/';

class FakeResponse {
  body: string;
  ok: boolean;
  constructor(body: string, ok = true) {
    this.body = body;
    this.ok = ok;
  }
  clone() {
    return new FakeResponse(this.body, this.ok);
  }
}

function setup() {
  const stores = new Map<string, Map<string, FakeResponse>>();
  const openStore = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };
  const keyOf = (req: string | { url: string }) => (typeof req === 'string' ? new URL(req, SCOPE).href : req.url);
  const network = vi.fn((req: string | { url: string }) => Promise.resolve(new FakeResponse('net:' + keyOf(req))));

  const caches = {
    open: (name: string) => {
      const s = openStore(name);
      return Promise.resolve({
        addAll: (urls: string[]) => {
          urls.forEach((u) => s.set(keyOf(u), new FakeResponse('pre:' + u)));
          return Promise.resolve();
        },
        match: (req: string | { url: string }) => Promise.resolve(s.get(keyOf(req))),
        put: (req: string | { url: string }, res: FakeResponse) => {
          s.set(keyOf(req), res);
          return Promise.resolve();
        },
      });
    },
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name: string) => Promise.resolve(stores.delete(name)),
    match: (req: string | { url: string }) => {
      for (const s of stores.values()) {
        const hit = s.get(keyOf(req));
        if (hit) return Promise.resolve(hit);
      }
      return Promise.resolve(undefined);
    },
  };

  const listeners: Record<string, (e: unknown) => void> = {};
  const self = {
    registration: { scope: SCOPE },
    clients: { claim: vi.fn(() => Promise.resolve()) },
    skipWaiting: vi.fn(),
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners[type] = fn;
    },
  };

  const header =
    'var SW_VERSION = "v1"; var DATA_VERSION = "d1"; var SW_PRECACHE = ["./", "./index.html", "./data/index.json"];\n';
  const code = header + readFileSync(join(import.meta.dirname, 'sw-template.js'), 'utf8');
  new Function('self', 'caches', 'fetch', code)(self, caches, network);

  /** Вызывает обработчик события и ждёт промисы, которые он передал. */
  const fire = async (type: string, extra: object = {}) => {
    let waited: Promise<unknown> | undefined;
    let responded: Promise<FakeResponse> | undefined;
    listeners[type]({
      ...extra,
      waitUntil: (p: Promise<unknown>) => (waited = p),
      respondWith: (p: Promise<FakeResponse>) => (responded = p),
    });
    await waited;
    return responded ? await responded : undefined;
  };

  const request = (path: string, opts: { mode?: string; accept?: string; method?: string } = {}) => ({
    url: new URL(path, SCOPE).href,
    method: opts.method ?? 'GET',
    mode: opts.mode ?? 'cors',
    headers: { get: (h: string) => (h === 'accept' ? (opts.accept ?? '*/*') : null) },
  });

  return { stores, network, self, fire, request };
}

describe('Service Worker', () => {
  it('при установке кеширует оболочку', async () => {
    const { stores, fire } = setup();
    await fire('install');
    expect([...stores.get('crossword-shell-v1')!.keys()]).toEqual([
      SCOPE,
      SCOPE + 'index.html',
      SCOPE + 'data/index.json',
    ]);
  });

  it('при активации удаляет старые кеши и берёт управление', async () => {
    const { stores, fire, self } = setup();
    stores.set('crossword-shell-old', new Map());
    stores.set('crossword-data-old', new Map());
    stores.set('чужой-кеш', new Map());
    await fire('install');
    await fire('activate');
    expect([...stores.keys()].sort()).toEqual(['crossword-shell-v1', 'чужой-кеш']);
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it('переходы по страницам получают index.html из кеша (офлайн)', async () => {
    const { fire, request, network } = setup();
    await fire('install');
    const res = await fire('fetch', { request: request('./#/puzzle/easy-0001', { mode: 'navigate' }) });
    expect(res!.body).toBe('pre:./index.html');
    const res2 = await fire('fetch', { request: request('./', { accept: 'text/html,*/*' }) });
    expect(res2!.body).toBe('pre:./index.html');
    expect(network).not.toHaveBeenCalled();
  });

  it('пачки кроссвордов: из сети один раз, потом из кеша (адрес без ?v=)', async () => {
    const { fire, request, network, stores } = setup();
    const first = await fire('fetch', { request: request('./data/easy/chunk-00.json?v=abc') });
    expect(first!.body).toBe('net:' + SCOPE + 'data/easy/chunk-00.json?v=abc');
    expect(stores.get('crossword-data-d1')!.has(SCOPE + 'data/easy/chunk-00.json')).toBe(true);
    const second = await fire('fetch', { request: request('./data/easy/chunk-00.json?v=xyz') });
    expect(second!.body).toBe(first!.body);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it('неудачный ответ сети не кешируется', async () => {
    const { fire, request, network, stores } = setup();
    network.mockImplementationOnce(() => Promise.resolve(new FakeResponse('404', false)));
    await fire('fetch', { request: request('./data/hard/chunk-01.json') });
    expect(stores.get('crossword-data-d1')?.size ?? 0).toBe(0);
  });

  it('остальные файлы — из кеша, иначе из сети; чужие адреса и POST не трогает', async () => {
    const { fire, request } = setup();
    await fire('install');
    expect((await fire('fetch', { request: request('./data/index.json') }))!.body).toBe('pre:./data/index.json');
    expect((await fire('fetch', { request: request('./assets/new.js') }))!.body).toBe('net:' + SCOPE + 'assets/new.js');
    expect(await fire('fetch', { request: { ...request('./x'), url: 'https://other.org/x' } })).toBeUndefined();
    expect(await fire('fetch', { request: request('./x', { method: 'POST' }) })).toBeUndefined();
  });

  it('SKIP_WAITING активирует новую версию', async () => {
    const { fire, self } = setup();
    await fire('message', { data: { type: 'SKIP_WAITING' } });
    expect(self.skipWaiting).toHaveBeenCalled();
    await fire('message', { data: null });
    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });
});

describe('isShellFile', () => {
  it('оболочка — всё, кроме sw.js и пачек данных', () => {
    expect(isShellFile('index.html')).toBe(true);
    expect(isShellFile('assets/index-abc.js')).toBe(true);
    expect(isShellFile('data/index.json')).toBe(true);
    expect(isShellFile('data/easy/chunk-00.json')).toBe(false);
    expect(isShellFile('sw.js')).toBe(false);
  });
});
