// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { transcribe } from '@/lib/ai/transcription';
import { translationConfig } from '@/lib/ai/translation-config';
import { speechConfig, transcriptionConfig } from '@/lib/ai/provider-config';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.stubEnv('GEMINI_API_KEY', 'private-test-key');
  for (const key of ['SPEECH_PROVIDER', 'TRANSCRIPTION_PROVIDER', 'TRANSLATION_PROVIDER'])
    vi.stubEnv(key, '');
  vi.stubEnv('OPENAI_API_KEY', 'old-no-balance-key');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('selects Gemini for all three services when a Gemini key exists, despite an old OpenAI key', () => {
  for (const config of [translationConfig(), speechConfig(), transcriptionConfig()])
    expect(config.provider).toBe('gemini');
});
it.each(['uz', 'ru'] as const)(
  'transcribes %s with Gemini and keeps the audio language instead of translating',
  async (language) => {
    fetchMock.mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ text: JSON.stringify({ text: language === 'uz' ? 'Salom' : 'Привет' }) }],
            },
          },
        ],
      }),
    );
    const file = new File(['recording'], 'speech.webm', { type: 'audio/webm;codecs=opus' });
    const result = await transcribe(file, language);
    expect(result).toBe(language === 'uz' ? 'Salom' : 'Привет');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).not.toContain('private-test-key');
    expect(JSON.parse(init.body).contents[0].parts[0].inlineData).toEqual({
      mimeType: 'audio/webm',
      data: Buffer.from('recording').toString('base64'),
    });
  },
);
it('retains explicit OpenAI selection instead of silently overriding it', () => {
  vi.stubEnv('TRANSCRIPTION_PROVIDER', 'openai');
  expect(transcriptionConfig().provider).toBe('openai');
});
it('rejects silence instead of inventing a transcript', async () => {
  fetchMock.mockResolvedValue(
    Response.json({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"text":""}' }] } }],
    }),
  );
  await expect(
    transcribe(new File(['silence'], 'silent.wav', { type: 'audio/wav' }), 'uz'),
  ).rejects.toMatchObject({ code: 'NO_SPEECH' });
});
it('reports a real provider quota error without falling back to OpenAI', async () => {
  fetchMock.mockResolvedValue(new Response('', { status: 429 }));
  await expect(
    transcribe(new File(['audio'], 'speech.wav', { type: 'audio/wav' }), 'uz'),
  ).rejects.toMatchObject({ code: 'TRANSCRIPTION_LIMIT' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
