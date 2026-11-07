/** @type {import('tailwindcss').Config} */
// Tailwind v3 (не v4!) — v4 требует Chrome 111+. См. docs/COMPATIBILITY.md.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Tailwind создаёт утилиту для любого похожего слова в коде (например, role="grid"
  // или .filter(...)). Эти утилиты не работают в Chrome 49 — запрещаем их.
  blocklist: ['grid', '!grid', 'inline-grid', 'filter', '!filter', 'backdrop-filter'],
  theme: {
    fontFamily: {
      sans: ['Verdana', 'Tahoma', '"Segoe UI"', 'Arial', 'sans-serif'],
    },
    extend: {
      // Цвета задаются CSS-переменными (src/styles/index.css), чтобы темы
      // переключались одним классом на <html>.
      colors: {
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        text: 'var(--c-text)',
        muted: 'var(--c-muted)',
        line: 'var(--c-border)',
        primary: 'var(--c-primary)',
        'on-primary': 'var(--c-on-primary)',
        secondary: 'var(--c-secondary)',
        'on-secondary': 'var(--c-on-secondary)',
        danger: 'var(--c-danger)',
        'on-danger': 'var(--c-on-danger)',
        ok: 'var(--c-ok)',
        error: 'var(--c-error)',
        cell: 'var(--c-cell)',
        'cell-text': 'var(--c-cell-text)',
        'cell-word': 'var(--c-cell-word)',
        'cell-active': 'var(--c-cell-active)',
        'cell-active-text': 'var(--c-cell-active-text)',
        focus: 'var(--c-focus)',
      },
      minHeight: { target: '3rem' },
      minWidth: { target: '3rem' },
    },
  },
  corePlugins: {
    // Утилиты прозрачности генерируют `rgb(r g b / a)` — Chrome 49 этого не понимает.
    // С ними выключенными Tailwind пишет обычные цвета.
    textOpacity: false,
    backgroundOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    placeholderOpacity: false,
    ringOpacity: false,
    // CSS Grid и gap не поддерживаются в Chrome 49 — используйте flex и margin.
    gap: false,
    gridTemplateColumns: false,
    gridTemplateRows: false,
    gridColumn: false,
    gridColumnStart: false,
    gridColumnEnd: false,
    gridRow: false,
    gridRowStart: false,
    gridRowEnd: false,
    gridAutoColumns: false,
    gridAutoFlow: false,
    gridAutoRows: false,
    aspectRatio: false,
    backdropFilter: false,
    // filter-утилиты ссылаются на пустые CSS-переменные — в Chrome 49 не работают.
    filter: false,
    blur: false,
    brightness: false,
    contrast: false,
    dropShadow: false,
    grayscale: false,
    hueRotate: false,
    invert: false,
    saturate: false,
    sepia: false,
    backdropBlur: false,
  },
  plugins: [],
};
