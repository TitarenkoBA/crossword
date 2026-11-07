/**
 * Текущий вопрос — крупно, с кнопками подсказок и перехода между словами.
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
}

export function CluePanel({ grid, state, onHint, onRevealLetter, onPrevWord, onNextWord }: CluePanelProps) {
  const index = currentWord(grid, state);
  const word = grid.words[index];
  const hintShown = state.hintsShown.indexOf(index) !== -1;
  const finished = isFinished(state);

  return (
    <section className="bg-surface border-2 border-line rounded-xl p-4" aria-live="polite" aria-label="Текущий вопрос">
      <p className="text-lg text-muted font-bold">
        {wordLabel(word)} · {lettersCount(word.answer.length)}
      </p>
      <p className="text-2xl font-bold mt-1" data-testid="current-clue">
        {word.clue}
      </p>
      {hintShown && (
        <p className="text-xl mt-2 p-2 rounded-lg border-2 border-dashed border-line" data-testid="current-hint">
          Подсказка: {word.hint}
        </p>
      )}
      <div className="flex flex-wrap -m-1 mt-2">
        <div className="w-1/2 p-1">
          <Button block onClick={onHint} disabled={hintShown}>
            Подсказка
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block onClick={onRevealLetter} disabled={finished}>
            Открыть букву
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block onClick={onPrevWord} guardKey="prev-word">
            ◄ Пред. слово
          </Button>
        </div>
        <div className="w-1/2 p-1">
          <Button block onClick={onNextWord} guardKey="next-word">
            След. слово ►
          </Button>
        </div>
      </div>
    </section>
  );
}
