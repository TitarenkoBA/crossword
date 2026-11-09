/**
 * Главная: выбор сложности, «Продолжить», настройки и помощь.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { Progress } from '../components/Progress.tsx';
import { LEVEL_INFO } from './levels.ts';
import { DIFFICULTIES, type Difficulty } from '../core/types.ts';
import type { DataIndex } from '../data/format.ts';
import { parsePuzzleId } from '../data/loader.ts';
import { navigate } from '../router/router.ts';
import { useApp } from '../state/AppContext.tsx';
import { loadLastPuzzle, progressSummaries } from '../storage/storage.ts';
import { InstallPrompt } from '../pwa/InstallPrompt.tsx';

/** Маленький логотип — фрагмент кроссворда из клеток. */
function Logo() {
  const cell = (ch: string, active?: boolean) => (
    <span
      className={'inline-flex items-center justify-center font-bold rounded ' + (active ? 'bg-cell-active text-cell-active-text' : 'bg-surface text-text')}
      style={{ width: 22, height: 22, fontSize: 13, margin: 1 }}
    >
      {ch}
    </span>
  );
  return (
    <span className="inline-block bg-primary rounded-xl p-1.5 mr-3 btn-raised" aria-hidden="true">
      <span className="flex">
        {cell('К')}
        {cell('О', true)}
        {cell('Т')}
      </span>
      <span className="flex">
        <span style={{ width: 24 }} />
        {cell('С')}
        <span style={{ width: 24 }} />
      </span>
    </span>
  );
}

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
    <main className="max-w-3xl mx-auto px-4 py-8">
      <header className="flex items-center justify-center mb-2">
        <Logo />
        <h1 className="text-4xl font-bold">Кроссворды</h1>
      </header>
      <p className="text-lg text-center text-muted mb-8">Бесплатно, без регистрации и рекламы. Всё можно делать одной мышью.</p>

      {canContinue && (
        <section className="card rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm font-semibold">Вы остановились здесь</span>
            <span className="text-muted text-sm">{lastSummary!.percent}%</span>
          </div>
          <Progress value={lastSummary!.percent} />
          <div className="mt-3">
            <Button block large variant="primary" onClick={() => navigate({ name: 'puzzle', id: last! })} testId="continue">
              Продолжить: {LEVEL_INFO[lastParsed!.level].singular} кроссворд №{lastParsed!.index} ({lastSummary!.percent}%)
            </Button>
          </div>
        </section>
      )}

      <h2 className="text-xl font-bold mb-3">Выберите сложность</h2>
      {error && (
        <p className="text-lg text-error mb-4" role="alert">
          Не удалось загрузить список кроссвордов. Проверьте подключение к интернету и обновите страницу (клавиша F5).
        </p>
      )}
      {DIFFICULTIES.map((level) => {
        const info = LEVEL_INFO[level];
        const total = index ? index.levels[level].count : 0;
        const solved = solvedBy(level);
        return (
          <div key={level} className="mb-3">
            <Button block onClick={() => navigate({ name: 'level', level, page: 1 })} testId={'level-' + level} className="py-4">
              <span className="flex items-center w-full text-left">
                <span className="flex-1" style={{ minWidth: 0 }}>
                  <span className="flex items-center text-xl font-bold">
                    <span className="flex-none rounded-full mr-2" style={{ width: 12, height: 12, backgroundColor: info.accent }} aria-hidden="true" />
                    {info.title}
                  </span>
                  <span className="block text-base font-normal text-muted">{info.description}</span>
                  {index && (
                    <span className="flex items-center mt-2">
                      <span className="flex-1 mr-3">
                        <Progress value={total ? (solved / total) * 100 : 0} color={info.accent} />
                      </span>
                      <span className="text-sm font-normal text-muted">
                        Решено {solved} из {total}
                      </span>
                    </span>
                  )}
                </span>
                <span className="flex-none text-2xl text-muted ml-3" aria-hidden="true">
                  →
                </span>
              </span>
            </Button>
          </div>
        );
      })}

      <div className="flex flex-wrap -m-1.5 mt-5">
        <div className="w-1/2 p-1.5">
          <Button block variant="soft" onClick={() => navigate({ name: 'help' })}>
            Как играть
          </Button>
        </div>
        <div className="w-1/2 p-1.5">
          <Button block variant="soft" onClick={() => navigate({ name: 'settings' })}>
            Настройки
          </Button>
        </div>
      </div>
      <InstallPrompt />
    </main>
  );
}
