/*
 * Service Worker кроссвордов. ТОЛЬКО ES5 (должен работать в Chrome 49).
 *
 * Этот файл — шаблон. При сборке (build/service-worker.ts) в начало
 * дописываются три переменные и результат кладётся в dist/sw.js:
 *   SW_VERSION   — хеш всех файлов оболочки приложения;
 *   SW_PRECACHE  — список файлов оболочки (HTML, JS, CSS, иконки, data/index.json);
 *   DATA_VERSION — хеш всех файлов с кроссвордами.
 *
 * Стратегия:
 *  - оболочка кешируется целиком при установке; новая версия сайта = новый SW,
 *    который ждёт, пока пользователь нажмёт «Обновить» (сообщение SKIP_WAITING);
 *  - пачки кроссвордов (data/...) кешируются при первом обращении (cache-first);
 *  - переходы по страницам (navigate) всегда получают index.html из кеша —
 *    поэтому сайт открывается без интернета.
 *
 * Важно для Chrome 49: не используем опции cache.match({ ignoreSearch }) (Chrome 54+),
 * стрелочные функции, let/const и т.п.
 */
/* global SW_VERSION, SW_PRECACHE, DATA_VERSION */

var PREFIX = 'crossword-';
var SHELL_CACHE = PREFIX + 'shell-' + SW_VERSION;
var DATA_CACHE = PREFIX + 'data-' + DATA_VERSION;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(SW_PRECACHE);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.indexOf(PREFIX) === 0 && key !== SHELL_CACHE && key !== DATA_CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isNavigation(request) {
  if (request.mode === 'navigate') return true;
  var accept = request.headers.get('accept') || '';
  return request.method === 'GET' && accept.indexOf('text/html') !== -1;
}

function stripQuery(url) {
  var i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

// key — адрес без ?v=…; запрос в сеть идёт с исходным адресом (минуя HTTP-кеш старой версии).
function cacheFirst(cacheName, key, request) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(key).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (response) {
        if (response && response.ok) cache.put(key, response.clone());
        return response;
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = stripQuery(request.url);
  var scope = self.registration.scope;
  if (url.indexOf(scope) !== 0) return; // чужие адреса не трогаем

  if (isNavigation(request)) {
    event.respondWith(
      caches.match(scope + 'index.html').then(function (hit) {
        return hit || fetch(request);
      })
    );
    return;
  }

  // data/index.json входит в оболочку; пачки кроссвордов кешируются по запросу.
  if (url.indexOf(scope + 'data/') === 0 && url !== scope + 'data/index.json') {
    event.respondWith(cacheFirst(DATA_CACHE, url, request));
    return;
  }

  event.respondWith(
    caches.match(url).then(function (hit) {
      return hit || fetch(request);
    })
  );
});
