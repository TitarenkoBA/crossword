import type { ReactNode } from 'react';
import { TopBar } from '../components/TopBar.tsx';
import { goBack } from '../router/router.ts';

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="bg-surface border-2 border-line rounded-xl p-4 mb-4">
      <h2 className="text-2xl font-bold">
        {n}. {title}
      </h2>
      <div className="text-xl mt-2">{children}</div>
    </section>
  );
}

/** Сэмпл клетки для иллюстраций. */
function Cell({ kind, children }: { kind: 'active' | 'word' | 'plain'; children?: ReactNode }) {
  const cls = kind === 'active' ? 'bg-cell-active text-cell-active-text' : kind === 'word' ? 'bg-cell-word text-cell-text' : 'bg-cell text-cell-text';
  return (
    <span
      className={'inline-flex items-center justify-center font-bold border-line ' + cls}
      style={{ width: 44, height: 44, borderWidth: kind === 'active' ? 4 : kind === 'word' ? 3 : 1, borderStyle: 'solid', marginRight: -1, fontSize: 24 }}
    >
      {children}
    </span>
  );
}

export function HelpScreen() {
  return (
    <div>
      <TopBar title="Как играть" backLabel="← Назад" onBack={goBack} />
      <main className="max-w-3xl mx-auto px-3 py-4">
        <Step n={1} title="Выберите кроссворд">
          <p>На главной странице нажмите «Лёгкие», «Средние» или «Сложные», а затем — номер кроссворда.</p>
        </Step>
        <Step n={2} title="Выберите слово">
          <p className="mb-2">Нажмите на любую клетку. Она станет жёлтой, а всё слово — голубым:</p>
          <p className="mb-2" aria-hidden="true">
            <Cell kind="word">К</Cell>
            <Cell kind="active" />
            <Cell kind="word" />
          </p>
          <p>Вопрос к этому слову появится крупно рядом с сеткой. Ещё можно нажать на вопрос в списке «Все вопросы».</p>
          <p className="mt-2">Если в клетке пересекаются два слова, нажмите на неё ещё раз или кнопку «Повернуть», чтобы выбрать другое слово.</p>
        </Step>
        <Step n={3} title="Впишите буквы">
          <p>Нажимайте буквы на экранной клавиатуре внизу экрана. После каждой буквы выделение само переходит на следующую клетку.</p>
          <p className="mt-2">Ошиблись — нажмите «Стереть». Можно печатать и на обычной клавиатуре, раскладку переключать не нужно.</p>
          <p className="mt-2">Букву Ё вписывайте как Е.</p>
        </Step>
        <Step n={4} title="Если трудно">
          <ul className="list-disc pl-6">
            <li className="mb-1">«Подсказка» — покажет дополнительное пояснение к слову.</li>
            <li className="mb-1">«Открыть букву» — впишет правильную букву в выделенную клетку.</li>
            <li className="mb-1">«Проверить слово» или «Проверить всё» — неверные буквы будут зачёркнуты и помечены значком ×.</li>
            <li>В меню «Ещё…» можно открыть всё слово, показать решение или начать заново.</li>
          </ul>
        </Step>
        <Step n={5} title="Не торопитесь">
          <p>Время не ограничено. Всё сохраняется само: можно закрыть страницу и вернуться позже — кроссворд откроется с того же места.</p>
        </Step>
        <Step n={6} title="Удобство">
          <p>В «Настройках» можно сделать текст и кнопки крупнее, включить высокий контраст и защиту от случайного двойного нажатия.</p>
        </Step>
      </main>
    </div>
  );
}
