/**
 * Прокручиваемая область с большими кнопками «Выше» и «Ниже».
 * Нужна тем, кому трудно попасть в тонкую полосу прокрутки или нет колеса мыши.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button.tsx';

export interface ScrollBoxProps {
  children: ReactNode;
  /** Высота области, например '20rem'. */
  height: string;
  label: string;
  /** Изменение этого значения — повод заново проверить, нужна ли прокрутка. */
  watch?: unknown;
}

export function ScrollBox({ children, height, label, watch }: ScrollBoxProps) {
  const box = useRef<HTMLDivElement>(null);
  const [canUp, setUp] = useState(false);
  const [canDown, setDown] = useState(false);

  const update = () => {
    const el = box.current;
    if (!el) return;
    setUp(el.scrollTop > 0);
    setDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  };

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [watch]);

  const scroll = (dir: 1 | -1) => {
    const el = box.current;
    if (!el) return;
    el.scrollTop += dir * Math.max(40, Math.round(el.clientHeight * 0.8));
    update();
  };

  return (
    <div>
      <Button block small variant="soft" onClick={() => scroll(-1)} disabled={!canUp} guardKey={label + '-up'} className="mb-1">
        ▲ Выше
      </Button>
      <div ref={box} className="overflow-y-auto border border-line rounded-xl bg-surface" style={{ height }} onScroll={update} aria-label={label}>
        {children}
      </div>
      <Button block small variant="soft" onClick={() => scroll(1)} disabled={!canDown} guardKey={label + '-down'} className="mt-1">
        ▼ Ниже
      </Button>
    </div>
  );
}
