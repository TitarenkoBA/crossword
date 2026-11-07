import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'build/sw-template.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Pointer Events нет в Chrome 49 — только mouse/touch/click.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name=/^onPointer/]",
          message: 'Pointer Events не поддерживаются в Chrome 49. Используйте onClick/onMouseDown.',
        },
        {
          selector: "Identifier[name=/^(ResizeObserver|IntersectionObserver)$/]",
          message: 'Нет в Chrome 49. Используйте window resize.',
        },
      ],
    },
  },
);
