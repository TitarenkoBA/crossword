import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/**
 * Разворачивает `:where(X)` в `X`.
 *
 * Preflight Tailwind 3.4 использует селекторы вроде `input:where([type=button])`.
 * Chrome 49 не знает `:where()` и отбрасывает ВСЁ правило целиком (например, сброс
 * фона у кнопок). Без `:where` селектор становится чуть специфичнее, но работает везде.
 */
export const unwrapWhere = {
  postcssPlugin: 'unwrap-where',
  Rule(rule) {
    if (rule.selector.indexOf(':where(') === -1) return;
    rule.selector = rule.selector.replace(/:where\(((?:[^()]|\([^()]*\))*)\)/g, '$1');
  },
};

export default {
  plugins: [
    tailwindcss(),
    unwrapWhere,
    // Добавляет -webkit- префиксы для старых браузеров (по browserslist из package.json).
    autoprefixer(),
  ],
};
