import { describe, expect, it } from 'vitest';
import { translationSchema, translationOutput, speechSchema, listSchema } from '@/lib/validation';
import { swapTranslation } from '@/types';
import { phrases, searchPhrases } from '@/data/phrases';
import { togglePhraseFavorite } from '@/components/phrases/phrase-library';
describe('translation validation', () => {
  it('rejects empty text, arbitrary languages and oversized input', () => {
    for (const input of [
      { text: '', sourceLang: 'uz' },
      { text: 'salom', sourceLang: 'en' },
      { text: 'a'.repeat(5001), sourceLang: 'ru' },
    ])
      expect(translationSchema.safeParse(input).success).toBe(false);
  });
  it('trims and applies default tone', () =>
    expect(translationSchema.parse({ text: ' salom ', sourceLang: 'uz' })).toEqual({
      text: 'salom',
      sourceLang: 'uz',
      tone: 'casual',
    }));
  it('rejects invalid AI output and speech', () => {
    expect(translationOutput.safeParse({ translatedText: '' }).success).toBe(false);
    expect(speechSchema.safeParse({ text: '', language: 'ru' }).success).toBe(false);
  });
  it('bounds pagination and date', () => {
    expect(listSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listSchema.safeParse({ date: 'bad' }).success).toBe(false);
  });
  it('swaps both text and language and is reversible', () => {
    const swapped = swapTranslation('salom', 'привет', 'uz');
    expect(swapped).toEqual({ sourceText: 'привет', translatedText: 'salom', sourceLang: 'ru' });
    expect(swapTranslation(swapped.sourceText, swapped.translatedText, swapped.sourceLang)).toEqual(
      { sourceText: 'salom', translatedText: 'привет', sourceLang: 'uz' },
    );
  });
});
describe('offline phrases', () => {
  it('contains 100 unique bilingual phrases across 10 categories', () => {
    expect(phrases.length).toBeGreaterThanOrEqual(100);
    expect(new Set(phrases.map((p) => p.id)).size).toBe(phrases.length);
    expect(new Set(phrases.map((p) => p.category)).size).toBe(10);
    for (const p of phrases) {
      expect(p.uz.length).toBeGreaterThan(3);
      expect(p.ru).toMatch(/[А-Яа-яЁё]/);
    }
  });
  it('searches both scripts and ignores Uzbek apostrophe variants', () => {
    expect(searchPhrases('ТАКСИ').length).toBe(0);
    expect(searchPhrases('МЕТРО').length).toBeGreaterThan(0);
    expect(searchPhrases("to'ldirish").length).toBeGreaterThan(0);
    expect(searchPhrases('', 'hotel')).toHaveLength(10);
  });
  it('toggles favorite without duplicates', () => {
    expect(togglePhraseFavorite([], 'hotel-1')).toEqual(['hotel-1']);
    expect(togglePhraseFavorite(['hotel-1'], 'hotel-1')).toEqual([]);
  });
});
