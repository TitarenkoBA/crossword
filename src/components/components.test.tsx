import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithApp } from '../test/render.tsx';
import { Button } from './Button.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { ScreenKeyboard } from './ScreenKeyboard.tsx';
import { CrosswordGrid, fitCellSize } from './CrosswordGrid.tsx';
import { ClueList } from './ClueList.tsx';
import { CluePanel } from './CluePanel.tsx';
import { ScrollBox } from './ScrollBox.tsx';
import { buildGrid } from '../core/grid.ts';
import { initialGameState, reduceGame, type GameAction, type GameState } from '../core/game.ts';
import { SMALL_PUZZLE } from '../test/fixtures.ts';
import { KEYBOARD_ROWS } from '../core/letters.ts';

const grid = buildGrid(SMALL_PUZZLE);
const play = (...actions: GameAction[]): GameState =>
  actions.reduce((s, a) => reduceGame(grid, s, a), initialGameState(grid));

describe('Button', () => {
  it('вызывает onClick', () => {
    const onClick = vi.fn();
    renderWithApp(<Button onClick={onClick}>Нажми</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Нажми' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('защита от дрожания игнорирует быстрый повтор той же кнопки', () => {
    let t = 1000;
    const onClick = vi.fn();
    renderWithApp(<Button onClick={onClick}>Нажми</Button>, {
      settings: { tremorGuard: true, tremorDelayMs: 300 },
      now: () => t,
    });
    const btn = screen.getByRole('button', { name: 'Нажми' });
    fireEvent.click(btn);
    t += 100;
    fireEvent.click(btn); // слишком быстро — игнор
    t += 400;
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('без защиты повтор срабатывает', () => {
    const onClick = vi.fn();
    renderWithApp(<Button onClick={onClick}>Нажми</Button>, { now: () => 1 });
    const btn = screen.getByRole('button', { name: 'Нажми' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('ConfirmDialog', () => {
  it('фокус на «Нет», Escape отменяет, «Да» подтверждает', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithApp(<ConfirmDialog title="Точно?" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('dialog', { name: 'Точно?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Нет' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Да' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('ScreenKeyboard', () => {
  it('все буквы и управляющие кнопки работают', () => {
    const handlers = {
      onLetter: vi.fn(),
      onErase: vi.fn(),
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onToggleDirection: vi.fn(),
    };
    renderWithApp(<ScreenKeyboard {...handlers} canToggle />);
    for (const letter of KEYBOARD_ROWS.flat()) fireEvent.click(screen.getByRole('button', { name: letter }));
    expect(handlers.onLetter).toHaveBeenCalledTimes(32);
    expect(handlers.onLetter).toHaveBeenLastCalledWith('Ю');
    fireEvent.click(screen.getByRole('button', { name: 'Стереть' }));
    fireEvent.click(screen.getByRole('button', { name: /Повернуть/ }));
    fireEvent.click(screen.getByRole('button', { name: /Назад/ }));
    fireEvent.click(screen.getByRole('button', { name: /Вперёд/ }));
    expect(handlers.onErase).toHaveBeenCalled();
    expect(handlers.onToggleDirection).toHaveBeenCalled();
    expect(handlers.onPrev).toHaveBeenCalled();
    expect(handlers.onNext).toHaveBeenCalled();
  });

  it('«Повернуть» недоступна, если в клетке одно слово', () => {
    renderWithApp(
      <ScreenKeyboard onLetter={vi.fn()} onErase={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} onToggleDirection={vi.fn()} canToggle={false} />,
    );
    expect(screen.getByRole('button', { name: /Повернуть/ })).toBeDisabled();
  });
});

describe('CrosswordGrid', () => {
  it('рисует клетки с номерами и обрабатывает клик', () => {
    const onCellClick = vi.fn();
    const { container } = renderWithApp(
      <CrosswordGrid grid={grid} state={play({ type: 'input', letter: 'К' })} cellSize={40} onCellClick={onCellClick} />,
    );
    const cells = container.querySelectorAll('[data-cell]');
    expect(cells).toHaveLength(7);
    expect(cells[0]).toHaveTextContent('1К');
    expect(cells[0]).toHaveAttribute('aria-label', 'Клетка: 1 по горизонтали. Буква К');
    expect(cells[1]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(cells[2]);
    expect(onCellClick).toHaveBeenCalledWith(2);
  });

  it('помечает ошибки значком, а не только цветом', () => {
    const state = play({ type: 'input', letter: 'Я' }, { type: 'checkAll' });
    const { container } = renderWithApp(<CrosswordGrid grid={grid} state={state} cellSize={40} onCellClick={vi.fn()} />);
    const cell = container.querySelector('[data-cell="0"]')!;
    expect(cell).toHaveTextContent('×');
    expect(cell.getAttribute('aria-label')).toMatch(/ошибка/);
  });

  it('fitCellSize вписывает сетку и соблюдает пределы', () => {
    expect(fitCellSize({ width: 10, height: 5 }, 500, 500)).toBe(50);
    expect(fitCellSize({ width: 15, height: 15 }, 150, 150)).toBe(24);
    expect(fitCellSize({ width: 3, height: 3 }, 900, 900)).toBe(72);
  });
});

describe('CluePanel', () => {
  it('показывает вопрос, подсказку и вызывает действия', () => {
    const on = { onHint: vi.fn(), onRevealLetter: vi.fn(), onPrevWord: vi.fn(), onNextWord: vi.fn() };
    const first = renderWithApp(<CluePanel grid={grid} state={play()} {...on} />);
    expect(screen.getByTestId('current-clue')).toHaveTextContent('Мурлыка');
    expect(screen.getByText(/1 по горизонтали · 3 буквы/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Подсказка' }));
    fireEvent.click(screen.getByRole('button', { name: 'Открыть букву' }));
    fireEvent.click(screen.getByRole('button', { name: /Пред. слово/ }));
    fireEvent.click(screen.getByRole('button', { name: /След. слово/ }));
    expect(on.onHint).toHaveBeenCalled();
    expect(on.onRevealLetter).toHaveBeenCalled();
    expect(on.onPrevWord).toHaveBeenCalled();
    expect(on.onNextWord).toHaveBeenCalled();
    expect(screen.queryByTestId('current-hint')).toBeNull();
    first.unmount();
    renderWithApp(<CluePanel grid={grid} state={play({ type: 'showHint' })} {...on} />);
    expect(screen.getByTestId('current-hint')).toHaveTextContent('Ловит мышей');
  });
});

describe('ClueList', () => {
  it('выбор вопроса и отметка решённых слов', () => {
    const onSelect = vi.fn();
    renderWithApp(<ClueList grid={grid} state={play(...'КОТ'.split('').map((l) => ({ type: 'input', letter: l }) as GameAction))} onSelect={onSelect} />);
    const across = screen.getByRole('heading', { name: 'По горизонтали' }).parentElement!;
    const items = within(across).getAllByRole('button');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('√ готово');
    fireEvent.click(screen.getByRole('button', { name: /Течёт по проводам/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});

describe('ScrollBox', () => {
  it('рисует кнопки прокрутки и содержимое', () => {
    renderWithApp(
      <ScrollBox height="10rem" label="Список">
        <p>Содержимое</p>
      </ScrollBox>,
    );
    expect(screen.getByText('Содержимое')).toBeInTheDocument();
    // В jsdom нет раскладки, поэтому прокручивать нечего — кнопки недоступны.
    expect(screen.getByRole('button', { name: /Выше/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ниже/ })).toBeDisabled();
  });
});
