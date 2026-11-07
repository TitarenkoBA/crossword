/**
 * Настройки. Каждый параметр — набор крупных кнопок-вариантов (без мелких
 * флажков и выпадающих списков, в которые трудно попасть мышью).
 * Изменения применяются и сохраняются сразу.
 */
import { useState, type ReactNode } from 'react';
import { Button } from '../components/Button.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { goBack } from '../router/router.ts';
import { useApp } from '../state/AppContext.tsx';
import {
  DEFAULT_SETTINGS,
  SCALE_LABELS,
  THEME_LABELS,
  TREMOR_DELAYS,
  type Scale,
  type Settings,
  type Theme,
} from '../state/settings.ts';
import { clearAllProgress } from '../storage/storage.ts';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-surface border-2 border-line rounded-xl p-4 mb-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      {hint && <p className="text-lg text-muted mt-1">{hint}</p>}
      <div className="flex flex-wrap -m-1 mt-2">{children}</div>
    </section>
  );
}

function Choice({ selected, onClick, children, guardKey }: { selected: boolean; onClick: () => void; children: ReactNode; guardKey: string }) {
  return (
    <div className="w-1/2 sm:w-1/4 p-1">
      <Button block variant={selected ? 'primary' : 'plain'} onClick={onClick} ariaPressed={selected} guardKey={guardKey}>
        {selected ? '● ' : '○ '}
        {children}
      </Button>
    </div>
  );
}

type Flag = 'showKeyboard' | 'toggleOnSameCell' | 'autoNextWord' | 'tremorGuard' | 'showTimer' | 'confirmActions';

const FLAGS: { key: Flag; title: string; hint: string }[] = [
  { key: 'showKeyboard', title: 'Экранная клавиатура', hint: 'Буквы на экране — можно вводить ответы только мышью.' },
  { key: 'toggleOnSameCell', title: 'Повторный клик по клетке', hint: 'Меняет направление слова (по горизонтали / по вертикали).' },
  { key: 'autoNextWord', title: 'Переход к следующему слову', hint: 'Когда слово заполнено, сразу перейти к следующему.' },
  { key: 'confirmActions', title: 'Спрашивать подтверждение', hint: 'Перед «Показать решение» и «Начать заново».' },
  { key: 'showTimer', title: 'Показывать время', hint: 'Время ни на что не влияет — торопиться не нужно.' },
  { key: 'tremorGuard', title: 'Защита от дрожания рук', hint: 'Если кнопка случайно нажалась дважды подряд, второе нажатие не считается.' },
];

export function SettingsScreen() {
  const { settings, updateSettings, store, loader } = useApp();
  const [confirm, setConfirm] = useState<0 | 1 | 2>(0);
  const [cleared, setCleared] = useState(false);
  const [download, setDownload] = useState<{ done: number; total: number; error?: boolean } | null>(null);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => updateSettings({ [key]: value } as Partial<Settings>);

  const startDownload = () => {
    setDownload({ done: 0, total: 0 });
    loader
      .downloadAll((done, total) => setDownload({ done, total }))
      .catch(() => setDownload((d) => ({ done: d?.done ?? 0, total: d?.total ?? 0, error: true })));
  };

  return (
    <div>
      <TopBar title="Настройки" backLabel="← Назад" onBack={goBack} />
      <main className="max-w-4xl mx-auto px-3 py-4">
        <Section title="Размер текста и кнопок">
          {SCALE_LABELS.map((label, i) => (
            <Choice key={label} selected={settings.scale === i} onClick={() => set('scale', i as Scale)} guardKey={'scale-' + i}>
              {label}
            </Choice>
          ))}
        </Section>

        <Section title="Оформление">
          {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
            <Choice key={t} selected={settings.theme === t} onClick={() => set('theme', t)} guardKey={'theme-' + t}>
              {THEME_LABELS[t]}
            </Choice>
          ))}
        </Section>

        {FLAGS.map((f) => (
          <Section key={f.key} title={f.title} hint={f.hint}>
            <Choice selected={settings[f.key]} onClick={() => set(f.key, true)} guardKey={f.key + '-on'}>
              Да
            </Choice>
            <Choice selected={!settings[f.key]} onClick={() => set(f.key, false)} guardKey={f.key + '-off'}>
              Нет
            </Choice>
          </Section>
        ))}

        {settings.tremorGuard && (
          <Section title="Сколько ждать повторного нажатия" hint="Чем больше время, тем надёжнее защита, но медленнее ввод.">
            {TREMOR_DELAYS.map((ms) => (
              <Choice key={ms} selected={settings.tremorDelayMs === ms} onClick={() => set('tremorDelayMs', ms)} guardKey={'delay-' + ms}>
                {ms / 1000} с
              </Choice>
            ))}
          </Section>
        )}

        <Section title="Без интернета" hint="Скачать все кроссворды заранее (около 2 МБ), чтобы играть без подключения.">
          <div className="w-full p-1">
            <Button block onClick={startDownload} disabled={!!download && !download.error && download.done < download.total}>
              Скачать все кроссворды
            </Button>
            {download && (
              <p className="text-lg mt-2" role="status">
                {download.error
                  ? 'Не получилось скачать. Проверьте интернет и попробуйте ещё раз.'
                  : download.total && download.done === download.total
                    ? '√ Готово: все кроссворды сохранены.'
                    : `Скачивание… ${download.done} из ${download.total || '?'}`}
              </p>
            )}
          </div>
        </Section>

        <Section title="Сброс">
          <div className="w-full sm:w-1/2 p-1">
            <Button block onClick={() => updateSettings(DEFAULT_SETTINGS)}>
              Вернуть настройки по умолчанию
            </Button>
          </div>
          <div className="w-full sm:w-1/2 p-1">
            <Button block variant="danger" onClick={() => setConfirm(1)}>
              Удалить весь прогресс
            </Button>
          </div>
          {cleared && (
            <p className="w-full text-lg p-1" role="status">
              Прогресс удалён.
            </p>
          )}
        </Section>
      </main>

      {confirm === 1 && (
        <ConfirmDialog
          title="Удалить весь прогресс?"
          text="Все начатые и решённые кроссворды станут снова пустыми."
          confirmLabel="Да, удалить"
          cancelLabel="Нет"
          danger
          onConfirm={() => setConfirm(2)}
          onCancel={() => setConfirm(0)}
        />
      )}
      {confirm === 2 && (
        <ConfirmDialog
          title="Вы точно уверены?"
          text="Отменить это действие будет нельзя."
          confirmLabel="Да, точно удалить"
          cancelLabel="Нет, оставить"
          danger
          onConfirm={() => {
            clearAllProgress(store);
            setConfirm(0);
            setCleared(true);
          }}
          onCancel={() => setConfirm(0)}
        />
      )}
    </div>
  );
}
