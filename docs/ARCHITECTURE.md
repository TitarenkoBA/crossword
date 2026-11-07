# Архитектура

## Слои

```
 screens/      экраны (Home, Level, Puzzle, Settings, Help)
    │
 components/   переиспользуемые элементы (Button, CrosswordGrid, ScreenKeyboard…)
    │
 state/        AppContext (настройки, хранилище, загрузчик, защита от дрожания), useGame
    │
 data/ storage/ router/   загрузка кроссвордов, localStorage, адреса
    │
 core/         чистая логика без React и браузера: сетка, игра, буквы, клавиши,
               генератор, словарь, проверка, сохранение прогресса
```

Правило: **нижние слои не импортируют верхние.** `core/` не знает ни о React, ни о `window`,
поэтому его используют и браузер, и Node-скрипты (`scripts/generate.ts`), и тесты.

## Поток данных на экране кроссворда

1. `router/router.ts` разбирает `#/puzzle/easy-0017` и показывает `PuzzleScreen`.
2. `PuzzleScreen` просит у `loader.puzzle(id)` кроссворд. Загрузчик берёт `data/index.json`
   и нужную пачку `data/easy/chunk-00.json`, кеширует их в памяти.
3. `useGame(puzzle, store, options)`:
   - строит модель сетки `buildGrid` (`core/grid.ts`);
   - восстанавливает прогресс из `localStorage` (`core/progress.ts` + `storage/storage.ts`);
   - держит состояние через `useReducer` с `reduceGame` (`core/game.ts`);
   - после каждого изменения сохраняет прогресс; ведёт таймер.
4. Компоненты получают `grid` и `state` и вызывают `dispatch({ type: ... })`:
   клик по клетке — `selectCell`, буква на экранной клавиатуре — `input`, и т. д.
5. Физическая клавиатура: `keydown` → `keyCommand` (`core/keys.ts`) → то же `dispatch`.

Вся логика игры — в одной функции `reduceGame(grid, state, action, options)`.
Её проще всего читать и тестировать (`core/game.test.ts`).

## Основные файлы

| Файл | Что внутри |
|---|---|
| `src/core/types.ts` | Типы `Puzzle`, `PuzzleWord`, `Difficulty`, `Direction` |
| `src/core/grid.ts` | Модель сетки: клетки, связи «клетка ↔ слово», порядок слов |
| `src/core/game.ts` | Состояние игры и все действия (ввод, стирание, переходы, подсказки, проверка) |
| `src/core/progress.ts` | Сохранение и восстановление прогресса |
| `src/core/letters.ts` | Алфавит, Ё→Е, раскладка ЙЦУКЕН, латиница → кириллица |
| `src/core/keys.ts` | Нажатия физической клавиатуры → команды (с поддержкой Chrome 49) |
| `src/core/dictionary.ts` | Разбор файлов словаря |
| `src/core/generator.ts` | Генератор кроссвордов и настройки уровней (`LEVELS`) |
| `src/core/validate.ts` | Проверка корректности кроссворда |
| `src/data/loader.ts` | Загрузка `index.json` и пачек, «скачать всё» |
| `src/storage/storage.ts` | Безопасная обёртка localStorage, ключи `crossword:v1:*` |
| `src/state/settings.ts` | Настройки: типы, значения по умолчанию, проверка, применение темы |
| `src/state/AppContext.tsx` | Общий контекст и защита от дрожания (`guard`) |
| `src/state/useGame.ts` | Хук игры: редьюсер + сохранение + таймер |
| `src/screens/PuzzleScreen.tsx` | Главный экран: раскладка, клавиатура, панели, диалоги |
| `build/es5-legacy-chunks.ts` | Плагин сборки: доводит legacy-чанки до ES5 |
| `build/service-worker.ts`, `build/sw-template.js` | Генерация `dist/sw.js` |

## Как сделать типичные изменения

### Добавить настройку

1. `src/state/settings.ts`: поле в `Settings`, значение в `DEFAULT_SETTINGS`, проверка в `sanitizeSettings`.
2. `src/screens/SettingsScreen.tsx`: если это «да/нет», достаточно добавить строку в массив `FLAGS`.
3. Использовать через `const { settings } = useApp()`.
4. Тест в `src/state/settings.test.ts`.

### Добавить действие в игре (например, «Очистить слово»)

1. `src/core/game.ts`: новый вариант в `GameAction` и `case` в `reduceGame`.
2. Тесты в `src/core/game.test.ts`.
3. Кнопка: `onClick={() => act({ type: 'clearWord' })}` в `PuzzleScreen` (например, в меню «Ещё…»).

### Добавить экран

1. `src/router/router.ts`: вариант в `Route`, разбор в `parseRoute`, адрес в `routeToHash`.
2. Компонент в `src/screens/`, ветка в `switch` в `src/App.tsx`.
3. Тесты маршрута (`router.test.ts`) и экрана (`App.test.tsx`).

### Поменять цвета или темы

Все цвета и тени — CSS-переменные в `src/styles/index.css` (`.theme-light`, `.theme-dark`, `.theme-contrast`).
Карточки — класс `card`, кнопки — компонент `Button` (варианты `primary`, `secondary`, `soft`, `ghost`, `danger`).
Тема `contrast` включается только вместе со спецвозможностями: см. `effectiveTheme` в `src/state/settings.ts`.
Tailwind ссылается на них (`tailwind.config.js` → `colors`). Проверяйте контраст: текст не ниже 7:1.

### Добавить уровень сложности или поменять количество кроссвордов

См. [DATA.md](DATA.md), раздел «Настройки уровней».

## Сборка

`vite.config.ts`:

1. `@vitejs/plugin-react`: JSX.
2. `@vitejs/plugin-legacy`: второй бандл для браузеров без ES-модулей (Chrome 49) с полифилами core-js.
3. `build/es5-legacy-chunks.ts`: после сборки прогоняет legacy-чанки через Babel до ES5
   (в Vite 8 в чанк полифилов попадает служебный код со стрелочными функциями).
4. `build/service-worker.ts`: собирает `dist/sw.js` со списком файлов и версиями кешей.

PostCSS (`postcss.config.js`): Tailwind 3 → разворачивание `:where()` → Autoprefixer.

Подробно о совместимости — [COMPATIBILITY.md](COMPATIBILITY.md).

## Хранение данных пользователя

`localStorage`, префикс `crossword:v1:`:

| Ключ | Что |
|---|---|
| `crossword:v1:settings` | Настройки (JSON) |
| `crossword:v1:progress:<id>` | Прогресс кроссворда (`SavedProgress` в `core/progress.ts`) |
| `crossword:v1:last` | id последнего открытого кроссворда |

Если формат прогресса придётся поменять несовместимо:
- увеличьте `v` в `SavedProgress`;
- в `deserializeProgress` добавьте преобразование старого формата.

Если сохранение не подходит к сетке (например, кроссворд перегенерирован), оно просто игнорируется,
и кроссворд начинается заново.

## Service Worker и обновления

- При первом посещении SW кеширует «оболочку»: HTML, JS, CSS, иконки, `data/index.json`.
- Пачки кроссвордов кешируются при первом открытии. Кнопка «Скачать все кроссворды» в настройках кеширует сразу все.
- Новая версия сайта означает новый `sw.js`. Пользователь видит плашку «Доступна новая версия» с кнопкой «Обновить».
  Сами по себе страницы не перезагружаются, чтобы не прервать человека посреди кроссворда.
