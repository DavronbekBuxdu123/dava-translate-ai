import { phrases } from '@/data/phrases';
import type { Language, Tone } from '@/types';
function normalized(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[‘’ʻʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim();
}
/** Exact curated phrase matches only: never approximate, invent or impersonate AI output. */
export function phraseTranslation(text: string, language: Language, tone: Tone = 'casual') {
  if (tone !== 'casual') return null;
  const key = normalized(text);
  if (!key) return null;
  const matches = phrases.filter((phrase) => normalized(phrase[language]) === key);
  const target = language === 'uz' ? 'ru' : 'uz';
  const results = new Set(matches.map((phrase) => phrase[target]));
  return results.size === 1 ? [...results][0] : null;
}
