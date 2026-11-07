/**
 * Текущий вопрос — крупно, с кнопками подсказок, проверки и перехода между словами.
 */
import type { Grid } from '../core/grid.ts';
import { lettersCount, wordLabel } from '../core/grid.ts';
import { currentWord, isFinished, type GameState } from '../core/game.ts';
import { Button } from './Button.tsx';

export interface CluePanelProps {
  grid: Grid;
  state: GameState;
  onHint: () => void;
  onRevealLetter: () => void;
  onPrevWord: () => void;
  onNextWord: () => void;
  onCheckWord: () => void;
  onCheckAll: () => void;
}

export function CluePanel({ grid, state, onHint, onRevealLetter, onPrevWord, onNextWord, onCheckWord, onCheckAll }: CluePanelProps) {
  const index = currentWord(grid, state);
  const word = grid.words[index];
  const hintShown = state.hintsShown.indexOf(index) !== -1;
  const finished = isFinished(state);

  return (
    <section className="card rounded-2xl p-4" aria-live="polite" aria-label="Текущий вопрос">
      <div className="flex items-center justify-between flex-wrap">
        <span className="inline-block bg-soft text-on-soft text-sm font-semibold rounded-full px-3 py-1 mr-2 mb-1">
          {wordLabel(word)}
        </span>
        <span className="text-sm text-muted mb-1">{lettersCount(word.answer.length)}</span>
      </div>
      <p className="text-xl font-semibold mt-1 leading-snug" data-testid="current-clue">
        {word.clue}
      </p>
      {hintShown && (
        <p className="text-base mt-2 px-3 py-2 rounded-xl bg-surface-2 text-text" data-testid="current-hint">
          <span className="text-muted">Подсказка:</span> {word.hint}
        </p>
      )}
      <div className="flex flex-wrap -m-1 mt-3">
        <div className="w-1/2 p-1">
          <Button block small variant="soft" onClick={onHint} disabled={hintShown}>
            Подсказка
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block small variant="soft" onClick={onRevealLetter} disabled={finished}>
            Открыть букву
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block small onClick={onPrevWord} guardKey="prev-word">
            ◄ Пред. слово
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block small onClick={onNextWord} guardKey="next-word">
            След. слово ►
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block small onClick={onCheckWord} disabled={finished}>
            Проверить слово
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block small onClick={onCheckAll} disabled={finished}>
            Проверить всё
          </Button>
        </div>
      </div>
    </section>
  );
}
