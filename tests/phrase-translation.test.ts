import { expect, it } from 'vitest';
import { phraseTranslation } from '@/lib/phrase-translation';
it('returns exact curated phrases in both directions with harmless punctuation variants', () => {
  expect(phraseTranslation('  Assalomu alaykum  ', 'uz')).toBe('Здравствуйте!');
  expect(phraseTranslation('Здравствуйте!', 'ru')).toBe('Assalomu alaykum!');
});
it('does not approximate new sentences or ignore requested formal tone', () => {
  expect(phraseTranslation('Salom, bugun muzey qayerda?', 'uz')).toBeNull();
  expect(phraseTranslation('Assalomu alaykum!', 'uz', 'formal')).toBeNull();
});
