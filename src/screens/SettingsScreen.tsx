/**
 * Настройки. Каждый параметр — набор крупных кнопок-вариантов (без мелких
 * флажков и выпадающих списков, в которые трудно попасть мышью).
 * Изменения применяются и сохраняются сразу.
 *
 * Зрительные специальные возможности (крупный текст, высокий контраст) по умолчанию
 * выключены и собраны под одним переключателем.
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
    <section className="card rounded-2xl p-5 mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="text-base text-muted mt-1">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Набор вариантов: выбранный — залитый и с точкой (не только цветом). */
function Choices<T extends string | number>({
  options,
  value,
  onChange,
  name,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap -m-1">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <div key={String(o.value)} className="w-1/2 sm:w-1/4 p-1">
            <Button
              block
              variant={selected ? 'primary' : 'secondary'}
              onClick={() => onChange(o.value)}
              ariaPressed={selected}
              guardKey={name + '-' + o.value}
            >
              {selected ? '● ' : '○ '}
              {o.label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/** Строка «название + пояснение» и переключатель Да / Нет. */
function FlagRow({
  title,
  hint,
  value,
  onChange,
  name,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between py-3 border-t border-line" data-setting={name}>
      <div className="flex-1 mr-3 my-1" style={{ minWidth: '14rem' }}>
        <h3 className="text-base font-semibold">{title}</h3>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <div className="flex my-1" style={{ width: '13rem' }}>
        <div className="w-1/2 pr-1">
          <Button block small variant={value ? 'primary' : 'secondary'} onClick={() => onChange(true)} ariaPressed={value} guardKey={name + '-on'}>
            {value ? '● Да' : 'Да'}
          </Button>
        </div>
        <div className="w-1/2 pl-1">
          <Button block small variant={!value ? 'primary' : 'secondary'} onClick={() => onChange(false)} ariaPressed={!value} guardKey={name + '-off'}>
            {!value ? '● Нет' : 'Нет'}
          </Button>
        </div>
      </div>
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
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Section title="Оформление">
          <Choices
            name="theme"
            value={settings.theme}
            onChange={(t: Theme) => set('theme', t)}
            options={(Object.keys(THEME_LABELS) as Theme[]).map((t) => ({ value: t, label: THEME_LABELS[t] }))}
          />
        </Section>

        <Section title="Специальные возможности для зрения" hint="Крупный текст и кнопки, высокий контраст, более разборчивый шрифт.">
          <FlagRow name="visualAids" title="Включить" value={settings.visualAids} onChange={(v) => set('visualAids', v)} />
          {settings.visualAids && (
            <>
              <div className="py-3 border-t border-line">
                <h3 className="text-base font-semibold mb-2">Размер текста и кнопок</h3>
                <Choices
                  name="scale"
                  value={settings.scale}
                  onChange={(v: Scale) => set('scale', v)}
                  options={SCALE_LABELS.map((label, i) => ({ value: i as Scale, label }))}
                />
              </div>
              <FlagRow
                name="highContrast"
                title="Высокий контраст"
                hint="Жёлтый текст на чёрном фоне, толстые рамки."
                value={settings.highContrast}
                onChange={(v) => set('highContrast', v)}
              />
            </>
          )}
        </Section>

        <Section title="Управление">
          {FLAGS.map((f) => (
            <FlagRow key={f.key} name={f.key} title={f.title} hint={f.hint} value={settings[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
          {settings.tremorGuard && (
            <div className="py-3 border-t border-line">
              <h3 className="text-base font-semibold">Сколько ждать повторного нажатия</h3>
              <p className="text-sm text-muted mb-2">Чем больше время, тем надёжнее защита, но медленнее ввод.</p>
              <Choices
                name="delay"
                value={settings.tremorDelayMs}
                onChange={(ms: number) => set('tremorDelayMs', ms)}
                options={TREMOR_DELAYS.map((ms) => ({ value: ms, label: `${ms / 1000} с` }))}
              />
            </div>
          )}
        </Section>

        <Section title="Без интернета" hint="Скачать все кроссворды заранее (около 2 МБ), чтобы играть без подключения.">
          <Button block variant="soft" onClick={startDownload} disabled={!!download && !download.error && download.done < download.total}>
            Скачать все кроссворды
          </Button>
          {download && (
            <p className="text-base mt-2" role="status">
              {download.error
                ? 'Не получилось скачать. Проверьте интернет и попробуйте ещё раз.'
                : download.total && download.done === download.total
                  ? '√ Готово: все кроссворды сохранены.'
                  : `Скачивание… ${download.done} из ${download.total || '?'}`}
            </p>
          )}
        </Section>

        <Section title="Сброс">
          <div className="flex flex-wrap -m-1">
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
          </div>
          {cleared && (
            <p className="text-base mt-2" role="status">
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
