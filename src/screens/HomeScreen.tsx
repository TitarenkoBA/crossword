/**
 * Главная: выбор сложности, «Продолжить», настройки и помощь.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { LEVEL_INFO } from './levels.ts';
import { DIFFICULTIES, type Difficulty } from '../core/types.ts';
import type { DataIndex } from '../data/format.ts';
import { parsePuzzleId } from '../data/loader.ts';
import { navigate } from '../router/router.ts';
import { useApp } from '../state/AppContext.tsx';
import { loadLastPuzzle, progressSummaries } from '../storage/storage.ts';

export function HomeScreen() {
  const { store, loader } = useApp();
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    loader.index().then(
      (i) => alive && setIndex(i),
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, [loader]);

  const summaries = useMemo(() => progressSummaries(store), [store]);
  const solvedBy = (level: Difficulty) => {
    let n = 0;
    summaries.forEach((s, id) => {
      if (s.solved && id.indexOf(level + '-') === 0) n++;
    });
    return n;
  };

  const last = loadLastPuzzle(store);
  const lastParsed = last ? parsePuzzleId(last) : null;
  const lastSummary = last ? summaries.get(last) : undefined;
  const canContinue = lastParsed && lastSummary && !lastSummary.solved && !lastSummary.solutionShown;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-4xl font-bold text-center">Кроссворды</h1>
      <p className="text-xl text-center text-muted mt-2 mb-6">Бесплатно, без регистрации и рекламы. Всё можно делать одной мышью.</p>

      {canContinue && (
        <div className="mb-6">
          <Button
            block
            large
            variant="primary"
            onClick={() => navigate({ name: 'puzzle', id: last! })}
            testId="continue"
          >
            Продолжить: {LEVEL_INFO[lastParsed!.level].singular} кроссворд №{lastParsed!.index} ({lastSummary!.percent}%)
          </Button>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-3">Выберите сложность</h2>
      {error && (
        <p className="text-xl text-error mb-4" role="alert">
          Не удалось загрузить список кроссвордов. Проверьте подключение к интернету и обновите страницу (клавиша F5).
        </p>
      )}
      {DIFFICULTIES.map((level) => (
        <div key={level} className="mb-4">
          <Button block large onClick={() => navigate({ name: 'level', level, page: 1 })} testId={'level-' + level}>
            <span className="block w-full">
              <span className="block text-2xl">{LEVEL_INFO[level].title}</span>
              <span className="block text-lg font-normal">{LEVEL_INFO[level].description}</span>
              {index && (
                <span className="block text-lg font-normal">
                  Решено {solvedBy(level)} из {index.levels[level].count}
                </span>
              )}
            </span>
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap -m-2 mt-4">
        <div className="w-1/2 p-2">
          <Button block onClick={() => navigate({ name: 'help' })}>
            Как играть
          </Button>
        </div>
        <div className="w-1/2 p-2">
          <Button block onClick={() => navigate({ name: 'settings' })}>
            Настройки
          </Button>
        </div>
      </div>
    </main>
  );
}
