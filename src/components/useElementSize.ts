import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export interface Size {
  width: number;
  height: number;
}

/**
 * Размер элемента. Без ResizeObserver (его нет в Chrome 49): пересчитываем
 * при изменении окна и при изменении deps (например, масштаба интерфейса).
 */
export function useElementSize(ref: RefObject<HTMLElement | null>, deps: unknown[] = []): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      setSize((prev) =>
        prev.width === el.clientWidth && prev.height === el.clientHeight ? prev : { width: el.clientWidth, height: el.clientHeight },
      );
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps передаёт вызывающий код
  }, deps);

  return size;
}

/** Размер окна браузера. */
export function useViewport(): Size {
  const [size, setSize] = useState<Size>(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return size;
}
