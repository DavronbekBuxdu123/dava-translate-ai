// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { geminiSpeech } from '@/lib/ai/gemini-speech';
import { speech } from '@/lib/ai/speech';
import { speechSchema } from '@/lib/validation';
const fetchMock = vi.fn();
const wav = Buffer.alloc(48);
wav.write('RIFF', 0);
wav.write('WAVE', 8);
function output(audio = wav, mimeType = 'audio/wav') {
  return {
    candidates: [
      {
        finishReason: 'STOP',
        content: { parts: [{ inlineData: { mimeType, data: audio.toString('base64') } }] },
      },
    ],
  };
}
beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
  vi.stubEnv('SPEECH_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_TTS_MODEL', 'gemini-3.8-flash-lite-tts');
  vi.stubEnv('GEMINI_TTS_VOICE', 'Kore');
  vi.stubEnv('OPENAI_API_KEY', '');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it.each(['uz', 'ru'] as const)(
  'uses Gemini for %s without an OpenAI key, returning WAV directly',
  async (language) => {
    fetchMock.mockResolvedValue(Response.json(output()));
    const result = await speech('Salom', language);
    expect(result.audio).toEqual(wav);
    expect(result.mimeType).toBe('audio/wav');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('test-only-key');
    expect(init.headers['x-goog-api-key']).toBe('test-only-key');
    expect(JSON.parse(init.body)).toMatchObject({
      contents: [{ parts: [{ text: 'Salom' }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { voice: 'Kore' } },
      },
    });
  },
);
it('reports a missing key before contacting the provider', async () => {
  vi.stubEnv('GEMINI_API_KEY', '');
  await expect(geminiSpeech('Salom', 'uz')).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([
  [429, 'VOICE_LIMIT'],
  [403, 'VOICE_ACCESS'],
  [500, 'VOICE_PROVIDER'],
])('maps %s into a safe error', async (status, code) => {
  fetchMock.mockResolvedValue(
    Response.json({ error: { message: 'test-only-key private details' } }, { status }),
  );
  await expect(geminiSpeech('Salom', 'uz')).rejects.toMatchObject({ code });
});
it('rejects invalid audio rather than returning playable garbage', async () => {
  fetchMock.mockResolvedValue(Response.json(output(Buffer.from('not audio'))));
  await expect(geminiSpeech('Salom', 'uz')).rejects.toMatchObject({ code: 'VOICE_OUTPUT' });
});
it('rejects legacy raw PCM instead of wrapping WAV twice or playing an unknown format', async () => {
  fetchMock.mockResolvedValue(Response.json(output(wav, 'audio/l16')));
  await expect(geminiSpeech('Salom', 'uz')).rejects.toMatchObject({ code: 'VOICE_OUTPUT' });
});
it('reports a timeout without making a paid fallback request', async () => {
  fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
  await expect(geminiSpeech('Salom', 'uz')).rejects.toMatchObject({ code: 'VOICE_TIMEOUT' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('bounds speech request size', () => {
  expect(speechSchema.safeParse({ text: 'a'.repeat(1001), language: 'ru' }).success).toBe(false);
});
it('inherits Gemini selection for existing Gemini installs', async () => {
  vi.stubEnv('SPEECH_PROVIDER', '');
  vi.stubEnv('TRANSLATION_PROVIDER', 'gemini');
  fetchMock.mockResolvedValue(Response.json(output()));
  await expect(speech('Salom', 'uz')).resolves.toMatchObject({ provider: 'gemini' });
});
