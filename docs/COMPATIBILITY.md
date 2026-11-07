# Совместимость со старыми браузерами

Минимальная цель — **Google Chrome 49** (последняя версия для Windows XP). Также поддерживаются
Firefox 52+, Safari 10+, Edge 15+, iOS 10+, Android 5+ (список — `browserslist` в `package.json`).

## Как это обеспечено

| Проблема | Решение |
|---|---|
| Нет ES-модулей, `async/await` и др. | `@vitejs/plugin-legacy` собирает второй бандл (SystemJS + Babel + полифилы core-js). Chrome 49 загружает его через `<script nomodule>`. |
| В legacy-чанки Vite 8 попадает код со стрелочными функциями | `build/es5-legacy-chunks.ts` после сборки транспилирует такие чанки в ES5 |
| Tailwind v4 требует Chrome 111+ | Используется **Tailwind 3.4** |
| Preflight Tailwind использует `:where()`: Chrome 49 отбрасывает такие правила целиком | PostCSS-плагин `unwrapWhere` в `postcss.config.js` |
| Утилиты прозрачности дают `rgb(r g b / a)` | Отключены в `tailwind.config.js` (`textOpacity: false` и т. д.) |
| Нет CSS Grid, `gap` у flex, `aspect-ratio`, `inset` | Отключены в `tailwind.config.js`; `grid`/`filter` в `blocklist` (Tailwind создаёт их из похожих слов в коде) |
| Минификатор мог бы превратить `top/right/bottom/left` в `inset` | `build.cssTarget: ['chrome49']` в `vite.config.ts` |
| `KeyboardEvent.key` появился только в Chrome 51 | `core/keys.ts` читает `key`, потом `code`, потом `keyCode` |
| Backspace в старом Chrome = «Назад» в истории | На экране кроссворда `preventDefault()` для Backspace |
| Workbox генерирует современный JS | Service Worker написан вручную на ES5 (`build/sw-template.js`) |
| В шрифтах XP нет эмодзи и многих значков | Только символы набора WGL4; тест `scripts/glyphs.test.ts` |
| Нет `ResizeObserver`, `IntersectionObserver`, Pointer Events | Не используются; ESLint запрещает (`eslint.config.js`) |

## Запрещено

**CSS:**
- `display: grid`
- `gap` (в том числе у flex)
- `aspect-ratio`
- `inset`
- `position: sticky`
- `rgb(… / …)`, `color-mix()`
- `@layer`, `@property`, `@container`
- `:is()`, `:where()`, `:has()`, `:focus-visible`, `:focus-within`
- `clamp()`, `min()`, `max()`
- логические свойства (`margin-inline` и т. п.)
- `dvh`/`svh`
- вложенность (`&`)

**Tailwind-утилиты:**
- `grid*`, `gap-*`
- `*-opacity-*`
- `ring-*`, `shadow-*`, `filter`/`blur`/…, `backdrop-*`
- `inset-*`
- `sticky`
- `aspect-*`

Вместо них — `flex`, отступы `m-*`/`p-*` и `space-x-*`, сплошные цвета.

**JavaScript (в коде приложения):**
- `onPointer*`, `ResizeObserver`, `IntersectionObserver`
- `event.key` без запасного варианта
- `cache.match(…, { ignoreSearch })` в SW

Современный синтаксис (`async`, `?.`, `??`, классы, spread) можно: его переводит Babel.
Новые методы (`Array.prototype.flat`, `Object.entries` и т. п.) тоже можно: полифилы подключаются
автоматически по факту использования.

**Символы в интерфейсе и словаре:** только из шрифтов XP:
- кириллица, латиница;
- `« » — – … № • √ × ← → ↑ ↓ ↔ ↕ ▲ ▼ ◄ ►`.

Нельзя: эмодзи, `✓ ✕ ⌫ ✎`.

## Автоматические проверки

```bash
npm run build && npm run check-compat
```

`scripts/check-compat.ts` проверяет `dist/`:
- legacy-чанки, `sw.js` и встроенные скрипты в `index.html` разбираются парсером в режиме **ES5**;
- CSS не содержит конструкций из списка выше и не использует пустые CSS-переменные Tailwind.

Плюс `npm test`:
- `scripts/compat-rules.test.ts` — правила проверки;
- `scripts/glyphs.test.ts` — символы во всех исходниках и словаре.

## Ручная проверка на настоящей Windows XP

Автоматически запустить Chrome 49 не получится, поэтому перед крупными выпусками стоит проверить вручную.

1. Виртуальная машина (VirtualBox) с Windows XP SP3 и Google Chrome 49 (офлайн-установщик `49.0.2623.112`).
2. Сайт должен открываться по HTTPS (Service Worker работает только по HTTPS или на `localhost`).
   Варианты:
   - опубликованный сайт на GitHub Pages (см. [DEPLOY.md](DEPLOY.md));
   - `npm run build`, затем `npx vite preview --host` на основной машине и `http://<IP>:4173` в XP.
     Всё, кроме офлайн-режима, проверить можно.
3. Пройдите сценарий:
   - [ ] главная открывается, шрифты кириллические, нет «квадратиков»;
   - [ ] выбор уровня, список, переход по страницам;
   - [ ] кроссворд: клик по клетке, повторный клик (поворот), ввод с экранной клавиатуры, «Стереть»;
   - [ ] ввод с физической клавиатуры (в русской и английской раскладке), Backspace не уводит со страницы;
   - [ ] «Подсказка», «Открыть букву», «Проверить слово/всё», «Все вопросы», «Ещё…» → «Начать заново» с подтверждением;
   - [ ] решить кроссворд целиком, появляется поздравление;
   - [ ] настройки: размер текста, темы, защита от дрожания;
   - [ ] закрыть и открыть браузер, прогресс на месте;
   - [ ] (по HTTPS) отключить сеть, обновить страницу, сайт работает.

### HTTPS на Windows XP

Chrome 49 на XP проверяет сертификаты через хранилище Windows. В XP нет многих современных корневых
сертификатов, поэтому некоторые сайты открываются с ошибкой сертификата. Если сайт на GitHub Pages
не открывается:
- проверьте, что в XP установлены последние обновления корневых сертификатов;
- либо разместите сайт на хостинге, сертификат которого принимает XP.

Это свойство системы, кодом сайта его не исправить.
