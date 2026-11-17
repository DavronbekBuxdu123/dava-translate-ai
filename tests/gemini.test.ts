// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { translateGemini } from '@/lib/ai/gemini';
import { translationConfig } from '@/lib/ai/translation-config';
const input = { text: 'Salom', sourceLang: 'uz' as const, tone: 'casual' as const };
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-secret');
  vi.stubEnv('TRANSLATION_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_TRANSLATION_MODEL', 'gemini-3.5-flash-lite');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('uses server-side header authentication and validates structured output', async () => {
  fetchMock.mockResolvedValue(
    Response.json({
      candidates: [
        { finishReason: 'STOP', content: { parts: [{ text: '{"translatedText":"Привет"}' }] } },
      ],
    }),
  );
  expect(await translateGemini(input, translationConfig().model)).toBe('Привет');
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).not.toContain('test-secret');
  expect(options.headers['x-goog-api-key']).toBe('test-secret');
  expect(JSON.parse(options.body)).toMatchObject({
    contents: [{ role: 'user', parts: [{ text: 'Salom' }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
});
it('reports missing key without requesting the provider', async () => {
  vi.stubEnv('GEMINI_API_KEY', '');
  await expect(translateGemini(input, 'gemini-3.5-flash-lite')).rejects.toMatchObject({
    code: 'AI_NOT_CONFIGURED',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([
  [429, 'PROVIDER_LIMIT'],
  [403, 'AI_CREDENTIALS'],
  [404, 'AI_MODEL_CONFIG'],
  [500, 'AI_UNAVAILABLE'],
])('handles provider status %s without leaking its error body', async (status, code) => {
  fetchMock.mockResolvedValue(
    Response.json({ error: { message: 'private provider details test-secret' } }, { status }),
  );
  await expect(translateGemini(input, 'gemini-3.5-flash-lite')).rejects.toMatchObject({ code });
  try {
    await translateGemini(input, 'gemini-3.5-flash-lite');
  } catch (error) {
    expect((error as Error).message).not.toContain('test-secret');
  }
});
it.each([
  { candidates: [] },
  { candidates: [{ finishReason: 'MAX_TOKENS' }] },
  { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'bad JSON' }] } }] },
  {
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"translatedText":""}' }] } }],
  },
])('rejects incomplete or malformed model output', async (body) => {
  fetchMock.mockResolvedValue(Response.json(body));
  await expect(translateGemini(input, 'gemini-3.5-flash-lite')).rejects.toMatchObject({
    code: 'AI_OUTPUT',
  });
});
it('reports timeouts and does not automatically spend on another provider', async () => {
  fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
  await expect(translateGemini(input, 'gemini-3.5-flash-lite')).rejects.toMatchObject({
    code: 'AI_TIMEOUT',
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('keeps OpenAI as the backward-compatible default and rejects invalid config', () => {
  vi.stubEnv('TRANSLATION_PROVIDER', '');
  expect(translationConfig().provider).toBe('openai');
  vi.stubEnv('TRANSLATION_PROVIDER', 'unknown');
  expect(() => translationConfig()).toThrow();
  vi.stubEnv('TRANSLATION_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_TRANSLATION_MODEL', '../invalid?key=oops');
  expect(() => translationConfig()).toThrow();
});
