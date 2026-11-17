// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const { gemini, openai } = vi.hoisted(() => ({
  gemini: vi.fn(async () => 'Привет'),
  openai: vi.fn(async () => ({
    choices: [{ message: { parsed: { translatedText: 'Здравствуйте' } } }],
  })),
}));
vi.mock('@/lib/ai/gemini', () => ({ translateGemini: gemini }));
vi.mock('@/lib/ai/client', () => ({
  ai: () => ({ chat: { completions: { parse: openai } } }),
  providerCall: <T>(call: () => Promise<T>) => call(),
}));
import { translate } from '@/lib/ai/translation';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it('dispatches both language directions to Gemini without requiring OpenAI', async () => {
  vi.stubEnv('TRANSLATION_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_TRANSLATION_MODEL', 'gemini-2.5-flash');
  vi.stubEnv('OPENAI_API_KEY', '');
  for (const sourceLang of ['uz', 'ru'] as const) {
    const input = { text: 'test', sourceLang, tone: 'formal' as const };
    await expect(translate(input)).resolves.toBe('Привет');
    expect(gemini).toHaveBeenCalledWith(input, 'gemini-2.5-flash');
  }
  expect(openai).not.toHaveBeenCalled();
});
it('preserves the OpenAI path when no provider is configured', async () => {
  vi.stubEnv('TRANSLATION_PROVIDER', '');
  vi.stubEnv('OPENAI_TRANSLATION_MODEL', 'gpt-4.1-mini');
  await expect(translate({ text: 'Salom', sourceLang: 'uz', tone: 'casual' })).resolves.toBe(
    'Здравствуйте',
  );
  expect(gemini).not.toHaveBeenCalled();
  expect(openai).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4.1-mini' }));
});
