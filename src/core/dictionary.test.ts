import { describe, expect, it } from 'vitest';
import { givesAway, mergeDictionaries, parseDictionary } from './dictionary.ts';

describe('parseDictionary', () => {
  it('читает строки, пропуская комментарии и пустые', () => {
    const r = parseDictionary('# тема\n\nкот | 1 | Мурлыка | Ловит мышей\r\nЁЖИК|2|Колючий зверёк|Носит яблоки\n', 'животные');
    expect(r.errors).toEqual([]);
    expect(r.entries).toEqual([
      { word: 'КОТ', level: 1, clue: 'Мурлыка', hint: 'Ловит мышей', topic: 'животные' },
      { word: 'ЕЖИК', level: 2, clue: 'Колючий зверёк', hint: 'Носит яблоки', topic: 'животные' },
    ]);
  });

  it.each([
    ['КОТ | 1 | Мурлыка', /4 поля/],
    ['CAT | 1 | Мурлыка | п', /только из русских/],
    ['ЖУК-ОЛЕНЬ | 1 | Жук | п', /только из русских/],
    ['ОК | 1 | Хорошо | п', /длина/],
    ['КОТ | 4 | Мурлыка | п', /уровень/],
    ['КОТ | 1 |  | п', /нет вопроса/],
    ['КОТ | 1 | Кот учёный | п', /содержит само слово/],
    ['ЛЕС | 1 | Там грибы | Лесной массив', /содержит само слово/],
  ])('ошибка для «%s»', (line, re) => {
    const r = parseDictionary(line, 't');
    expect(r.entries).toEqual([]);
    expect(r.errors[0]).toMatch(re);
    expect(r.errors[0]).toMatch(/^t:1:/);
  });
});

describe('givesAway', () => {
  it('находит ответ только в начале слова', () => {
    expect(givesAway('Полосатая и жалит', 'ОСА')).toBe(false);
    expect(givesAway('Оса жалит', 'ОСА')).toBe(true);
    expect(givesAway('напиток из винограда', 'ВИНО')).toBe(true);
    expect(givesAway('Зелёная ёлка', 'ЕЛКА')).toBe(true);
  });
});

describe('mergeDictionaries', () => {
  it('сортирует и находит повторы между темами', () => {
    const a = parseDictionary('ЛЕС | 1 | Много деревьев | Там грибы', 'природа');
    const b = parseDictionary('КОТ | 1 | Мурлыка | Мяу\nЛЕС | 2 | Бор | Тайга', 'другое');
    const m = mergeDictionaries([a, b]);
    expect(m.entries.map((e) => e.word)).toEqual(['КОТ', 'ЛЕС']);
    expect(m.entries[1].topic).toBe('природа');
    expect(m.errors).toEqual(['Слово «ЛЕС» повторяется: темы «природа» и «другое»']);
  });
});
