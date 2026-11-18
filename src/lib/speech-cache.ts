'use client';
// Bounded tab-memory cache only. No localStorage, service worker, or shared server cache.
const entries = new Map<string, { blob: Blob; provider: string; expires: number }>();
const MAX_BYTES = 8 * 1024 * 1024;
export function clearSpeechCache() {
  entries.clear();
}
export async function loadSpeech(text: string, language: string, signal: AbortSignal) {
  const key = JSON.stringify([text, language]);
  const now = Date.now();
  for (const [id, entry] of entries) if (entry.expires < now) entries.delete(id);
  const cached = entries.get(key);
  if (cached) {
    entries.delete(key);
    entries.set(key, cached);
    return cached;
  }
  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
    signal,
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error?.message || 'Ovoz yaratilmadi.');
  }
  if (!response.headers.get('content-type')?.startsWith('audio/'))
    throw new Error('Server audio qaytarmadi. Sahifani yangilab qayta urinib ko‘ring.');
  const blob = await response.blob();
  if (blob.size > 4 * 1024 * 1024) throw new Error('Ovoz juda uzun. Qisqaroq matnni eshittiring.');
  const declared = response.headers.get('X-Dava-Speech-Provider');
  const entry = {
    blob,
    provider: declared === 'gemini' ? 'Gemini' : declared === 'openai' ? 'OpenAI' : '',
    expires: Date.now() + 120000,
  };
  entries.set(key, entry);
  while (
    entries.size > 3 ||
    [...entries.values()].reduce((total, value) => total + value.blob.size, 0) > MAX_BYTES
  ) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
  return entry;
}
