import { describe, expect, it } from 'vitest';
import { decodeBase64Utf8, encodeBase64Utf8 } from './base64';

describe('base64 UTF-8', () => {
  it('голый btoa падает на кириллице, поэтому и нужна обёртка', () => {
    expect(() => btoa('Плов с курицей')).toThrow();
  });

  it('кириллица туда и обратно', () => {
    const text = '{"title":"Плов с курицей","note":"ёжик, щи, ъ"}';
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text);
  });

  it('эмодзи и смешанный текст', () => {
    const text = 'Сырники 🥞 + kefir 1%';
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text);
  });

  it('совпадает с эталонным base64', () => {
    // "Привет" в UTF-8: d0 9f d1 80 d0 b8 d0 b2 d0 b5 d1 82
    expect(encodeBase64Utf8('Привет')).toBe('0J/RgNC40LLQtdGC');
  });

  it('переносы строк из ответа GitHub не мешают', () => {
    const text = 'Гречка с индейкой и грибами, хранится 3 дня. '.repeat(10);
    const wrapped = encodeBase64Utf8(text).replace(/(.{60})/g, '$1\n');
    expect(wrapped).toContain('\n');
    expect(decodeBase64Utf8(wrapped)).toBe(text);
  });

  it('большой текст не упирается в лимит аргументов', () => {
    const text = 'щ'.repeat(200_000);
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text);
  });
});
