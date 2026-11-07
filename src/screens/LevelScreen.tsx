/**
 * Список кроссвордов уровня: постранично, крупные плитки со статусом.
 * Постраничный вывод вместо длинной прокрутки — удобнее мышью.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { Progress } from '../components/Progress.tsx';
import { puzzleId } from '../core/generator.ts';
import type { Difficulty } from '../core/types.ts';
import { navigate } from '../router/router.ts';
import { useApp } from '../state/AppContext.tsx';
import { progressSummaries, type ProgressSummary } from '../storage/storage.ts';
import { LEVEL_INFO } from './levels.ts';

export const PAGE_SIZE = 20;

function statusText(s: ProgressSummary | undefined): string {
  if (!s) return 'Не начат';
  if (s.solved) return '√ Решён';
  if (s.solutionShown) return 'Показан ответ';
  return `Начат: ${s.percent}%`;
}

/** Строка статуса под номером: «чип» для решённых, полоска для начатых. */
function Status({ s, accent }: { s: ProgressSummary | undefined; accent: string }) {
  if (s?.solved) {
    return <span className="inline-block bg-ok-soft text-ok text-sm font-semibold rounded-full px-3 py-0.5">{statusText(s)}</span>;
  }
  if (s && !s.solutionShown) {
    return (
      <span className="block w-full">
        <span className="block text-sm font-normal text-muted mb-1">{statusText(s)}</span>
        <Progress value={s.percent} color={accent} />
      </span>
    );
  }
  return <span className="block text-sm font-normal text-muted">{statusText(s)}</span>;
}

export interface LevelScreenProps {
  level: Difficulty;
  page: number;
}

export function LevelScreen({ level, page }: LevelScreenProps) {
  const { store, loader } = useApp();
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    loader.index().then(
      (i) => alive && setCount(i.levels[level].count),
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, [loader, level]);

  const summaries = useMemo(() => progressSummaries(store), [store]);
  const pages = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const current = Math.min(page, pages);
  const go = (p: number) => navigate({ name: 'level', level, page: p });

  const randomUnsolved = () => {
    if (!count) return;
    const free: number[] = [];
    for (let i = 1; i <= count; i++) {
      const s = summaries.get(puzzleId(level, i));
      if (!s || (!s.solved && !s.solutionShown)) free.push(i);
    }
    if (free.length) navigate({ name: 'puzzle', id: puzzleId(level, free[Math.floor(Math.random() * free.length)]) });
  };

  const tiles = [];
  if (count) {
    const from = (current - 1) * PAGE_SIZE + 1;
    const to = Math.min(count, current * PAGE_SIZE);
    for (let i = from; i <= to; i++) {
      const id = puzzleId(level, i);
      const s = summaries.get(id);
      tiles.push(
        <div key={id} className="w-1/2 sm:w-1/4 lg:w-1/5 p-1.5">
          <Button block onClick={() => navigate({ name: 'puzzle', id })} guardKey={'tile-' + id} className="py-3" testId={'tile-' + id}>
            <span className="block w-full">
              <span className="block text-2xl font-bold mb-1">№ {i}</span>
              <Status s={s} accent={LEVEL_INFO[level].accent} />
            </span>
          </Button>
        </div>,
      );
    }
  }

  return (
    <div>
      <TopBar title={`${LEVEL_INFO[level].title} кроссворды`} backLabel="← На главную" onBack={() => navigate({ name: 'home' })} />
      <main className="max-w-5xl mx-auto px-3 py-4">
        {error && (
          <p className="text-xl text-error" role="alert">
            Не удалось загрузить список. Проверьте интернет и обновите страницу (F5).
          </p>
        )}
        {count === null && !error && <p className="text-xl">Загрузка…</p>}
        {count !== null && (
          <>
            <div className="mb-4">
              <Button block variant="soft" onClick={randomUnsolved}>
                Случайный нерешённый кроссворд
              </Button>
            </div>
            <div className="flex flex-wrap -m-1.5">{tiles}</div>
            <p className="text-base text-muted font-semibold text-center mt-5">
              Страница {current} из {pages}
            </p>
            <nav className="flex -m-1 mt-1" aria-label="Страницы">
              <div className="w-1/2 p-1">
                <Button block onClick={() => go(current - 1)} disabled={current <= 1} guardKey="page-prev">
                  ← Предыдущая
                </Button>
              </div>
              <div className="w-1/2 p-1">
                <Button block onClick={() => go(current + 1)} disabled={current >= pages} guardKey="page-next">
                  Следующая →
                </Button>
              </div>
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
