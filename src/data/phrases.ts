import data from './phrases.json';
export type Phrase = { id: string; category: string; uz: string; ru: string };
export const phrases: Phrase[] = data;
export const categories = [
  { id: 'greetings', label: 'Salomlashish' },
  { id: 'transport', label: 'Metro va transport' },
  { id: 'hotel', label: 'Mehmonxona' },
  { id: 'restaurant', label: 'Restoran' },
  { id: 'shopping', label: 'Do‘kon' },
  { id: 'directions', label: 'Manzil so‘rash' },
  { id: 'university', label: 'Universitet' },
  { id: 'documents', label: 'Hujjatlar' },
  { id: 'emergency', label: 'Favqulodda vaziyat' },
  { id: 'everyday', label: 'Kundalik suhbat' },
];
export function normalize(text: string) {
  return text.toLocaleLowerCase().replace(/[‘’ʻʼ`']/g, '');
}
export function searchPhrases(query: string, category = 'all') {
  const q = normalize(query.trim());
  return phrases.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      (!q || normalize(p.uz + ' ' + p.ru).includes(q)),
  );
}
