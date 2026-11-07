/**
 * Простой hash-роутер: адреса вида `#/level/easy/2`.
 *
 * Hash-роутинг выбран потому, что работает на любом статическом хостинге
 * (GitHub Pages) без настройки сервера и в любых старых браузерах.
 */
import { useEffect, useState } from 'react';
import { DIFFICULTIES, type Difficulty } from '../core/types.ts';

export type Route =
  | { name: 'home' }
  | { name: 'level'; level: Difficulty; page: number }
  | { name: 'puzzle'; id: string }
  | { name: 'settings' }
  | { name: 'help' };

const PUZZLE_ID = /^(easy|medium|hard)-\d{4}$/;

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [head, a, b] = parts;
  if (head === 'level' && DIFFICULTIES.indexOf(a as Difficulty) !== -1) {
    const page = Number(b);
    return { name: 'level', level: a as Difficulty, page: page >= 1 && Math.floor(page) === page ? page : 1 };
  }
  if (head === 'puzzle' && PUZZLE_ID.test(a || '')) return { name: 'puzzle', id: a };
  if (head === 'settings' && parts.length === 1) return { name: 'settings' };
  if (head === 'help' && parts.length === 1) return { name: 'help' };
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'level':
      return route.page > 1 ? `#/level/${route.level}/${route.page}` : `#/level/${route.level}`;
    case 'puzzle':
      return `#/puzzle/${route.id}`;
    case 'settings':
      return '#/settings';
    case 'help':
      return '#/help';
  }
}

export function navigate(route: Route): void {
  const hash = routeToHash(route);
  if (window.location.hash !== hash) window.location.hash = hash;
}

/** Текущий маршрут; обновляется при смене адреса. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
