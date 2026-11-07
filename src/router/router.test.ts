import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { navigate, parseRoute, routeToHash, useRoute, type Route } from './router.ts';

describe('parseRoute', () => {
  it.each<[string, Route]>([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/level/easy', { name: 'level', level: 'easy', page: 1 }],
    ['#/level/hard/3', { name: 'level', level: 'hard', page: 3 }],
    ['#/level/hard/0', { name: 'level', level: 'hard', page: 1 }],
    ['#/level/hard/1.5', { name: 'level', level: 'hard', page: 1 }],
    ['#/level/super', { name: 'home' }],
    ['#/puzzle/medium-0042', { name: 'puzzle', id: 'medium-0042' }],
    ['#/puzzle/medium-42', { name: 'home' }],
    ['#/settings', { name: 'settings' }],
    ['#/help', { name: 'help' }],
    ['#/что-то', { name: 'home' }],
  ])('%s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });
});

describe('routeToHash', () => {
  it('обратное преобразование', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'level', level: 'medium', page: 1 },
      { name: 'level', level: 'medium', page: 4 },
      { name: 'puzzle', id: 'easy-0001' },
      { name: 'settings' },
      { name: 'help' },
    ];
    for (const r of routes) expect(parseRoute(routeToHash(r))).toEqual(r);
    expect(routeToHash({ name: 'level', level: 'easy', page: 1 })).toBe('#/level/easy');
  });
});

describe('useRoute', () => {
  it('следит за адресом', () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current).toEqual({ name: 'home' });
    act(() => {
      navigate({ name: 'help' });
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current).toEqual({ name: 'help' });
  });
});
