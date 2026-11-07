/**
 * Экран кроссворда — главный экран приложения.
 *
 * Раскладка:
 *  - широкий экран (от 45×34 rem, т.е. 720×544 px при обычном тексте): слева сетка, справа текущий вопрос с кнопками,
 *    внизу на всю ширину — экранная клавиатура; на 1024×768 всё помещается
 *    без прокрутки;
 *  - узкий экран: вопрос, сетка и клавиатура друг под другом.
 * «Все вопросы», «Ещё…» и «Настройки» — в верхней строке.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { ClueList } from '../components/ClueList.tsx';
import { CluePanel } from '../components/CluePanel.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { CrosswordGrid, fitCellSize } from '../components/CrosswordGrid.tsx';
import { Overlay } from '../components/Overlay.tsx';
import { ScreenKeyboard } from '../components/ScreenKeyboard.tsx';
import { ScrollBox } from '../components/ScrollBox.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { useElementSize, useViewport } from '../components/useElementSize.ts';
import { currentWord, isFinished, type GameAction } from '../core/game.ts';
import { puzzleId } from '../core/generator.ts';
import { wordAt } from '../core/grid.ts';
import { keyCommand } from '../core/keys.ts';
import type { Puzzle } from '../core/types.ts';
import { navigate } from '../router/router.ts';
import { useApp } from '../state/AppContext.tsx';
import { formatTime, useGame } from '../state/useGame.ts';
import { ROOT_FONT_PX, effectiveScale } from '../state/settings.ts';
import { LEVEL_INFO } from './levels.ts';
import { PAGE_SIZE } from './LevelScreen.tsx';

export function PuzzleScreen({ id }: { id: string }) {
  const { loader } = useApp();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setPuzzle(null);
    setError(null);
    loader.puzzle(id).then(
      (p) => alive && setPuzzle(p),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [loader, id, attempt]);

  if (!puzzle) {
    return (
      <div>
        <TopBar title="Кроссворд" backLabel="← На главную" onBack={() => navigate({ name: 'home' })} />
        <main className="max-w-2xl mx-auto p-4 text-xl">
          {error ? (
            <div role="alert">
              <p className="mb-4">Не удалось открыть кроссворд. Возможно, нет подключения к интернету.</p>
              <Button variant="primary" onClick={() => setAttempt((a) => a + 1)}>
                Попробовать ещё раз
              </Button>
            </div>
          ) : (
            <p>Загрузка…</p>
          )}
        </main>
      </div>
    );
  }
  return <Game key={puzzle.id} puzzle={puzzle} />;
}

type Panel = 'none' | 'clues' | 'more';

type Confirm = null | 'reveal' | 'reset';

function Game({ puzzle }: { puzzle: Puzzle }) {
  const { store, settings, loader } = useApp();
  const { grid, state, dispatch, elapsedMs } = useGame(puzzle, store, {
    autoNextWord: settings.autoNextWord,
    toggleOnSameCell: settings.toggleOnSameCell,
  });
  const [panel, setPanel] = useState<Panel>('none');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [showDone, setShowDone] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const finished = isFinished(state);

  useEffect(() => {
    loader.index().then((i) => setCount(i.levels[puzzle.difficulty].count), () => setCount(null));
  }, [loader, puzzle.difficulty]);

  // Поздравление — когда кроссворд решён прямо сейчас (а не открыт уже решённым).
  const wasSolved = useRef(state.solved);
  useEffect(() => {
    if (state.solved && !wasSolved.current) setShowDone(true);
    wasSolved.current = state.solved;
  }, [state.solved]);

  // Физическая клавиатура.
  const blocked = panel !== 'none' || confirm !== null || showDone;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (blocked || e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      const onGrid = !!target && typeof target.getAttribute === 'function' && target.getAttribute('data-cell') !== null;
      const cmd = keyCommand(e, onGrid);
      if (!cmd) return;
      // В том числе не даём Backspace сработать как «Назад» в старом Chrome.
      e.preventDefault();
      dispatch(cmd.type === 'letter' ? { type: 'input', letter: cmd.letter } : (cmd as GameAction));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocked, dispatch]);

  // Если фокус был на клетке — переносим его вслед за курсором (для клавиатуры и экранных читалок).
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && active.getAttribute && active.getAttribute('data-cell') !== null) {
      const next = document.querySelector<HTMLElement>(`[data-cell="${state.cursor.cell}"]`);
      if (next && next !== active) next.focus();
    }
  }, [state.cursor.cell]);

  // Раскладка и размер клеток.
  const vp = useViewport();
  // Широкая раскладка — только если окно достаточно большое для выбранного размера
  // текста (45×34 rem: 720×544 px при обычном размере). Иначе — всё друг под другом.
  const scale = effectiveScale(settings);
  const rem = ROOT_FONT_PX[scale];
  const wide = vp.width >= rem * 45 && vp.height >= rem * 34;
  const gridBox = useRef<HTMLDivElement>(null);
  const box = useElementSize(gridBox, [wide, scale, settings.showKeyboard, finished]);
  // В узкой раскладке страница прокручивается, так что сетка может занять всю высоту окна.
  const availHeight = wide ? box.height : vp.height - 24;
  const cellSize = box.width ? fitCellSize(grid, box.width - 4, availHeight - 4) : 32;

  const act = useCallback((a: GameAction) => dispatch(a), [dispatch]);
  const canToggle =
    wordAt(grid, state.cursor.cell, state.cursor.direction === 'across' ? 'down' : 'across') !== undefined;

  const ask = (what: Exclude<Confirm, null>) => {
    setPanel('none');
    if (settings.confirmActions) setConfirm(what);
    else act({ type: what === 'reveal' ? 'revealAll' : 'reset' });
  };

  const nextId = count !== null && puzzle.index < count ? puzzleId(puzzle.difficulty, puzzle.index + 1) : null;
  const toList = () =>
    navigate({ name: 'level', level: puzzle.difficulty, page: Math.floor((puzzle.index - 1) / PAGE_SIZE) + 1 });
  const toNext = () => nextId && navigate({ name: 'puzzle', id: nextId });

  const cluePanel = (
    <CluePanel
      grid={grid}
      state={state}
      onHint={() => act({ type: 'showHint' })}
      onRevealLetter={() => act({ type: 'revealLetter' })}
      onPrevWord={() => act({ type: 'prevWord' })}
      onNextWord={() => act({ type: 'nextWord' })}
      onCheckWord={() => act({ type: 'checkWord' })}
      onCheckAll={() => act({ type: 'checkAll' })}
    />
  );

  const stats = (
    <p className="text-base text-muted">
      Подсказок: {state.stats.hintsShown}, открыто букв: {state.stats.revealedLetters}, проверок: {state.stats.checks}
      {settings.showTimer ? `, время: ${formatTime(elapsedMs)}` : ''}.
    </p>
  );

  const finishedBanner = finished && (
    <div className="bg-ok-soft border border-ok rounded-2xl p-4 mb-3" role="status" data-testid="finished-banner">
      <p className="text-xl font-bold text-ok">{state.solved ? '√ Кроссворд решён!' : 'Показано решение'}</p>
      {stats}
      <div className="flex flex-wrap -m-1 mt-2">
        {nextId && (
          <div className="w-1/2 p-1">
            <Button block variant="primary" onClick={toNext}>
              Следующий кроссворд →
            </Button>
          </div>
        )}
        <div className="w-1/2 p-1">
          <Button block onClick={toList}>
            К списку
          </Button>
        </div>
      </div>
    </div>
  );

  const keyboard = settings.showKeyboard && (
    <ScreenKeyboard
      onLetter={(letter) => act({ type: 'input', letter })}
      onErase={() => act({ type: 'erase' })}
      onPrev={() => act({ type: 'moveInWord', delta: -1 })}
      onNext={() => act({ type: 'moveInWord', delta: 1 })}
      onToggleDirection={() => act({ type: 'toggleDirection' })}
      canToggle={canToggle}
      disabled={finished}
      compact={vp.width < 640}
    />
  );

  const gridView = <CrosswordGrid grid={grid} state={state} cellSize={cellSize} onCellClick={(cell) => act({ type: 'selectCell', cell })} />;
  const title = `№ ${puzzle.index} · ${LEVEL_INFO[puzzle.difficulty].singular}`;
  const topBar = (
    <TopBar
      title={title}
      backLabel="← К списку"
      onBack={toList}
      right={
        <>
          <Button variant="soft" onClick={() => setPanel('clues')} className="ml-2 my-1">
            Все вопросы
          </Button>
          <Button variant="soft" onClick={() => setPanel('more')} className="ml-2 my-1">
            Ещё…
          </Button>
          <Button variant="ghost" onClick={() => navigate({ name: 'settings' })} guardKey="open-settings" className="ml-2 my-1">
            Настройки
          </Button>
        </>
      }
    />
  );

  return (
    <div className="flex flex-col" style={wide ? { height: vp.height } : undefined} data-layout={wide ? 'wide' : 'narrow'}>
      {topBar}
      {wide ? (
        <div className="flex flex-1 p-3" style={{ minHeight: 0 }}>
          <div ref={gridBox} className="flex-1 flex items-center justify-center overflow-auto" style={{ minWidth: 0 }}>
            {gridView}
          </div>
          <div className="ml-3 flex-none overflow-y-auto" style={{ width: '40%', maxWidth: '32rem' }}>
            {finishedBanner}
            {!finished && cluePanel}
            {settings.showTimer && !finished && <p className="text-lg mt-2">Время: {formatTime(elapsedMs)}</p>}
          </div>
        </div>
      ) : (
        <div className="p-3">
          {finishedBanner}
          {!finished && cluePanel}
          <div ref={gridBox} className="flex justify-center overflow-auto my-3">
            {gridView}
          </div>
        </div>
      )}
      {keyboard && !finished && (
        <div className="px-3 pb-3 flex-none">
          <div className="max-w-4xl mx-auto">{keyboard}</div>
        </div>
      )}
      {!wide && settings.showTimer && !finished && <p className="text-lg px-3 pb-4">Время: {formatTime(elapsedMs)}</p>}

      {panel === 'clues' && (
        <Overlay title="Все вопросы" onClose={() => setPanel('none')}>
          <ScrollBox height="55vh" label="Список вопросов" watch={grid}>
            <ClueList
              grid={grid}
              state={state}
              onSelect={(w) => {
                act({ type: 'selectWord', word: w });
                setPanel('none');
              }}
            />
          </ScrollBox>
        </Overlay>
      )}

      {panel === 'more' && (
        <Overlay title="Ещё действия" onClose={() => setPanel('none')}>
          <div className="flex flex-col">
            <Button
              block
              className="mb-2"
              disabled={finished}
              onClick={() => {
                act({ type: 'revealWord' });
                setPanel('none');
              }}
            >
              Открыть текущее слово
            </Button>
            <Button block className="mb-2" disabled={finished} onClick={() => ask('reveal')}>
              Показать всё решение
            </Button>
            <Button block className="mb-2" variant="danger" onClick={() => ask('reset')}>
              Начать заново
            </Button>
            {stats}
          </div>
        </Overlay>
      )}

      {confirm === 'reveal' && (
        <ConfirmDialog
          title="Показать всё решение?"
          text="Все ответы будут открыты, и кроссворд не засчитается как решённый."
          confirmLabel="Да, показать"
          cancelLabel="Нет, не надо"
          onConfirm={() => {
            act({ type: 'revealAll' });
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="Начать заново?"
          text="Все введённые буквы будут стёрты."
          confirmLabel="Да, стереть всё"
          cancelLabel="Нет, оставить"
          danger
          onConfirm={() => {
            act({ type: 'reset' });
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {showDone && (
        <Overlay title="Поздравляем!" onClose={() => setShowDone(false)}>
          <p className="text-2xl font-bold mb-2">√ Кроссворд решён!</p>
          {stats}
          <div className="flex flex-col mt-3">
            {nextId && (
              <Button block large variant="primary" className="mb-2" onClick={toNext}>
                Следующий кроссворд →
              </Button>
            )}
            <Button block onClick={toList}>
              К списку кроссвордов
            </Button>
          </div>
        </Overlay>
      )}
      <span className="sr-only" aria-live="polite">
        {finished ? '' : `Выбрано слово ${grid.words[currentWord(grid, state)].number}`}
      </span>
    </div>
  );
}
