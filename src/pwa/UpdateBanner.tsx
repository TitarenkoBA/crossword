import { useEffect, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { applyUpdate, onUpdateAvailable } from './register.ts';

/** Плашка «Доступна новая версия» с кнопкой «Обновить». */
export function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  useEffect(() => onUpdateAvailable(setAvailable), []);
  if (!available) return null;
  return (
    <div className="flex items-center justify-center flex-wrap bg-soft text-on-soft p-3" role="status">
      <p className="text-base font-semibold mr-3 my-1">Доступна новая версия сайта.</p>
      <Button variant="primary" onClick={applyUpdate}>
        Обновить
      </Button>
    </div>
  );
}
