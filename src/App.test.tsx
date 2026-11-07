/**
 * Интеграционные тесты экранов: весь путь пользователя мышью.
 */
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.tsx';
import { fakeLoader } from './test/render.tsx';
import { createMemoryStore, loadProgress, saveProgress, saveLastPuzzle } from './storage/storage.ts';
import { buildGrid } from './core/grid.ts';
import { initialGameState } from './core/game.ts';
import { serializeProgress } from './core/progress.ts';
import { SMALL_PUZZLE } from './test/fixtures.ts';

function go(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function renderApp(store = createMemoryStore()) {
  render(<App store={store} loader={fakeLoader()} />);
  return store;
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('главная', () => {
  it('показывает уровни и счётчики решённых', async () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Кроссворды', level: 1 })).toBeInTheDocument();
    expect(await screen.findAllByText('Решено 0 из 3')).toHaveLength(3);
    expect(screen.queryByTestId('continue')).toBeNull();
  });

  it('кнопка «Продолжить» ведёт к незаконченному кроссворду', async () => {
    const store = createMemoryStore();
    const grid = buildGrid(SMALL_PUZZLE);
    saveProgress(store, 'easy-0002', serializeProgress(initialGameState(grid), { elapsedMs: 0, percent: 30 }));
    saveLastPuzzle(store, 'easy-0002');
    renderApp(store);
    const btn = screen.getByTestId('continue');
    expect(btn).toHaveTextContent('лёгкий кроссворд №2 (30%)');
    fireEvent.click(btn);
    await waitFor(() => expect(window.location.hash).toBe('#/puzzle/easy-0002'));
  });

  it('предупреждает, если прогресс не сохраняется', () => {
    renderApp();
    expect(screen.getByRole('alert')).toHaveTextContent(/не разрешает сохранять/);
  });
});

describe('список уровня', () => {
  it('плитки со статусами и переход к кроссворду', async () => {
    const store = createMemoryStore();
    saveProgress(store, 'easy-0001', { ...serializeProgress(initialGameState(buildGrid(SMALL_PUZZLE)), { elapsedMs: 0, percent: 100 }), solved: true });
    renderApp(store);
    fireEvent.click(screen.getByTestId('level-easy'));
    expect(await screen.findByTestId('tile-easy-0001')).toHaveTextContent('√ Решён');
    expect(screen.getByTestId('tile-easy-0002')).toHaveTextContent('Не начат');
    expect(screen.getByText('Страница 1 из 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Предыдущая/ })).toBeDisabled();
    fireEvent.click(screen.getByTestId('tile-easy-0003'));
    expect(await screen.findByTestId('current-clue')).toHaveTextContent('Мурлыка');
  });
});

describe('решение кроссворда только мышью', () => {
  it('от выбора клетки до поздравления', async () => {
    const store = renderApp();
    go('#/puzzle/easy-0001');
    expect(await screen.findByTestId('current-clue')).toHaveTextContent('Мурлыка');
    const kb = screen.getByRole('group', { name: 'Экранная клавиатура' });
    const key = (l: string) => fireEvent.click(within(kb).getByRole('button', { name: l }));

    // КОТ по горизонтали
    key('К');
    key('О');
    key('Т');
    // слово заполнено — курсор сам перешёл к «КИТ»
    expect(screen.getByTestId('current-clue')).toHaveTextContent('Морской великан');
    key('К');
    key('И');
    key('Т');
    // осталось «ТОК»: пустая только средняя клетка
    expect(screen.getByTestId('current-clue')).toHaveTextContent('Течёт по проводам');
    key('О');

    expect(await screen.findByRole('dialog', { name: 'Поздравляем!' })).toBeInTheDocument();
    expect(loadProgress(store, 'easy-0001')?.solved).toBe(true);
    click(/К списку кроссвордов/);
    await waitFor(() => expect(window.location.hash).toBe('#/level/easy'));
  });

  it('подсказка, проверка, стирание и «Начать заново» с подтверждением', async () => {
    renderApp();
    go('#/puzzle/easy-0001');
    await screen.findByTestId('current-clue');
    const kb = screen.getByRole('group', { name: 'Экранная клавиатура' });
    click('Подсказка');
    expect(screen.getByTestId('current-hint')).toHaveTextContent('Ловит мышей');

    fireEvent.click(within(kb).getByRole('button', { name: 'Я' }));
    click('Проверить слово');
    const first = document.querySelector('[data-cell="0"]')!;
    expect(first).toHaveTextContent('×');

    fireEvent.click(first);
    fireEvent.click(within(kb).getByRole('button', { name: 'Стереть' }));
    expect(first).not.toHaveTextContent('Я');

    click('Открыть букву');
    expect(first).toHaveTextContent('К');

    click('Ещё…');
    click('Начать заново');
    expect(screen.getByRole('dialog', { name: 'Начать заново?' })).toBeInTheDocument();
    click('Нет, оставить');
    expect(first).toHaveTextContent('К');
    click('Ещё…');
    click('Начать заново');
    click('Да, стереть всё');
    expect(first).not.toHaveTextContent('К');
  });

  it('список вопросов и показ решения', async () => {
    renderApp();
    go('#/puzzle/easy-0001');
    await screen.findByTestId('current-clue');
    click('Все вопросы');
    const dlg = screen.getByRole('dialog', { name: 'Все вопросы' });
    fireEvent.click(within(dlg).getByRole('button', { name: /Морской великан/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('current-clue')).toHaveTextContent('Морской великан');

    click('Ещё…');
    click('Показать всё решение');
    click('Да, показать');
    expect(screen.getByTestId('finished-banner')).toHaveTextContent('Показано решение');
    expect(screen.queryByRole('group', { name: 'Экранная клавиатура' })).toBeNull();
  });

  it('физическая клавиатура: латиница, Backspace, Chrome 49 без key', async () => {
    renderApp();
    go('#/puzzle/easy-0001');
    await screen.findByTestId('current-clue');
    const first = document.querySelector('[data-cell="0"]')!;
    fireEvent.keyDown(window, { key: 'r', code: 'KeyR' }); // К
    expect(first).toHaveTextContent('К');
    fireEvent.keyDown(window, { key: 'Backspace' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(first).not.toHaveTextContent('К');
    // как в Chrome 49: только code и keyCode
    fireEvent.keyDown(window, { code: 'KeyR', keyCode: 82 });
    expect(first).toHaveTextContent('К');
  });

  it('ошибка загрузки и повтор', async () => {
    let fail = true;
    const ok = fakeLoader();
    const loader = { ...ok, puzzle: (id: string) => (fail ? Promise.reject(new Error('offline')) : ok.puzzle(id)) };
    render(<App store={createMemoryStore()} loader={loader} />);
    go('#/puzzle/easy-0001');
    expect(await screen.findByText(/Не удалось открыть кроссворд/)).toBeInTheDocument();
    fail = false;
    click('Попробовать ещё раз');
    expect(await screen.findByTestId('current-clue')).toBeInTheDocument();
  });
});

describe('настройки', () => {
  it('применяются сразу и сохраняются', async () => {
    const store = renderApp();
    go('#/settings');
    fireEvent.click(screen.getAllByRole('button', { name: /Максимальный/ })[0]);
    expect(document.documentElement.className).toMatch(/scale-3/);
    fireEvent.click(screen.getByRole('button', { name: /Высокий контраст/ }));
    expect(document.documentElement.className).toMatch(/theme-contrast/);
    expect(JSON.parse(store.get('settings')!)).toMatchObject({ scale: 3, theme: 'contrast' });
    click('Вернуть настройки по умолчанию');
    expect(document.documentElement.className).toMatch(/theme-light/);
  });

  it('скрытие клавиатуры', async () => {
    renderApp();
    go('#/settings');
    const section = screen.getByRole('heading', { name: 'Экранная клавиатура' }).parentElement!;
    fireEvent.click(within(section).getByRole('button', { name: /Нет/ }));
    go('#/puzzle/easy-0001');
    await screen.findByTestId('current-clue');
    expect(screen.queryByRole('group', { name: 'Экранная клавиатура' })).toBeNull();
  });

  it('удаление прогресса — с двумя подтверждениями', async () => {
    const store = renderApp();
    saveProgress(store, 'easy-0001', serializeProgress(initialGameState(buildGrid(SMALL_PUZZLE)), { elapsedMs: 0, percent: 1 }));
    go('#/settings');
    click('Удалить весь прогресс');
    click('Да, удалить');
    click('Да, точно удалить');
    expect(loadProgress(store, 'easy-0001')).toBeNull();
    expect(screen.getByText('Прогресс удалён.')).toBeInTheDocument();
  });

  it('скачивание всех кроссвордов', async () => {
    renderApp();
    go('#/settings');
    click('Скачать все кроссворды');
    expect(await screen.findByText(/Готово: все кроссворды сохранены/)).toBeInTheDocument();
  });
});

describe('помощь', () => {
  it('открывается', () => {
    renderApp();
    go('#/help');
    expect(screen.getByRole('heading', { name: 'Как играть' })).toBeInTheDocument();
  });
});
