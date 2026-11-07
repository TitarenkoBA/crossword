import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import { checkCss, checkEs5 } from './compat-rules.ts';
import { unwrapWhere } from '../postcss.config.js';

describe('checkEs5', () => {
  it('пропускает ES5', () => {
    expect(checkEs5('var a = function () { return 1; };', 'x')).toEqual([]);
  });
  it.each(['const a = 1;', 'var f = () => 1;', 'class A {}', 'var s = `x`;', 'async function f() {}'])(
    'находит ES2015+: %s',
    (code) => {
      expect(checkEs5(code, 'x')).toHaveLength(1);
    },
  );
});

describe('checkCss', () => {
  it('пропускает совместимый CSS', () => {
    const css =
      '.a{display:flex;margin-right:8px;color:#fff;background:rgba(0,0,0,.5);--tw-space-x-reverse:0}' +
      '.b{margin-left:calc(1rem * var(--tw-space-x-reverse))}.c{min-width:3rem;top:0;left:0}';
    expect(checkCss(css, 'x')).toEqual([]);
  });

  it.each([
    '.a{display:grid}',
    '.a{gap:4px}',
    '.a{column-gap:4px}',
    '.a{aspect-ratio:1}',
    '.a{inset:0}',
    '.a{position:sticky}',
    '.a{color:rgb(0 0 0 / 50%)}',
    '@layer base{.a{color:red}}',
    'a:where(.b){color:red}',
    'a:focus-visible{color:red}',
    '.a{width:min(10px,5vw)}',
    '.a{&:hover{color:red}}',
    '.a{height:100dvh}',
  ])('находит запрещённое: %s', (css) => {
    expect(checkCss(css, 'x').length).toBeGreaterThan(0);
  });

  it('не путает имя переменной --tw-ring-inset со свойством inset', () => {
    expect(checkCss('*{--tw-ring-inset:var(--x)}', 'x')).toEqual([]);
  });

  it('находит использование пустой переменной', () => {
    const css = '*{--tw-ring-inset: ;}.ring{box-shadow:var(--tw-ring-inset) 0 0 1px red}';
    expect(checkCss(css, 'x')).toHaveLength(1);
  });

  it('игнорирует содержимое строк и url()', () => {
    expect(checkCss('.a{background:url(data:image/svg+xml;a&b)}.b::after{content:"gap:1"}', 'x')).toEqual([]);
  });
});

describe('unwrapWhere (PostCSS)', () => {
  it('убирает :where() из селекторов preflight', async () => {
    const out = await postcss([unwrapWhere]).process(
      'button,input:where([type=button]){color:red}[hidden]:where(:not([hidden=until-found])){display:none}',
      { from: undefined },
    );
    expect(out.css).toBe(
      'button,input[type=button]{color:red}[hidden]:not([hidden=until-found]){display:none}',
    );
  });
});
