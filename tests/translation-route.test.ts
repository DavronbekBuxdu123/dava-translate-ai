// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { findFirst, create, provider, contextMock } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  provider: vi.fn(),
  contextMock: vi.fn(async () => ({ id: 'guest-a' })),
}));
vi.mock('@/lib/api-context', () => ({ context: contextMock }));
vi.mock('@/lib/db', () => ({ db: () => ({ translation: { findFirst, create } }) }));
vi.mock('@/lib/ai/translation', () => ({ translate: provider }));
import { POST } from '@/app/api/translate/route';
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue(null);
  provider.mockResolvedValue('Здравствуйте!');
  create.mockImplementation(async ({ data }) => ({ id: 'saved', ...data, favorites: [] }));
});
it('rejects malformed input before invoking the paid provider or database context', async () => {
  const res = await POST(request({ text: '', sourceLang: 'uz' }));
  expect(res.status).toBe(400);
  expect(provider).not.toHaveBeenCalled();
  expect(contextMock).not.toHaveBeenCalled();
});
it('returns a recent identical translation without invoking the provider', async () => {
  const cached = { id: 'cached', translatedText: 'Привет' };
  findFirst.mockResolvedValue(cached);
  const res = await POST(request({ text: 'Salom', sourceLang: 'uz' }));
  expect((await res.json()).data).toEqual(cached);
  expect(provider).not.toHaveBeenCalled();
  expect(findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ guestId: 'guest-a' }) }),
  );
});
it('saves new AI translation under the resolved guest with the correct direction', async () => {
  const res = await POST(request({ text: 'Assalomu alaykum!', sourceLang: 'uz' }));
  expect(res.status).toBe(200);
  expect(provider).toHaveBeenCalledWith({
    text: 'Assalomu alaykum!',
    sourceLang: 'uz',
    tone: 'casual',
  });
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        guestId: 'guest-a',
        targetLang: 'ru',
        translatedText: 'Здравствуйте!',
      }),
    }),
  );
});

afterEach(() => vi.unstubAllEnvs());
it('separates cached translations by provider and model', async () => {
  const input = { text: 'Salom', sourceLang: 'uz' };
  vi.stubEnv('TRANSLATION_PROVIDER', 'openai');
  await POST(request(input));
  const openaiKey = findFirst.mock.calls.at(-1)![0].where.requestKey;
  vi.stubEnv('TRANSLATION_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_TRANSLATION_MODEL', 'gemini-2.5-flash');
  await POST(request(input));
  const geminiKey = findFirst.mock.calls.at(-1)![0].where.requestKey;
  vi.stubEnv('GEMINI_TRANSLATION_MODEL', 'another-model');
  await POST(request(input));
  const otherModelKey = findFirst.mock.calls.at(-1)![0].where.requestKey;
  expect(new Set([openaiKey, geminiKey, otherModelKey]).size).toBe(3);
});
