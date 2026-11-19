// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { transcribeMock, translateMock } = vi.hoisted(() => ({
  transcribeMock: vi.fn(async () => 'Salom'),
  translateMock: vi.fn(async () => 'Привет'),
}));
vi.mock('@/lib/ai/transcription', () => ({ transcribe: transcribeMock }));
vi.mock('@/lib/ai/translation', () => ({ translate: translateMock }));
import { voiceTranslation } from '@/lib/ai/voice-translation';
const fetchMock = vi.fn();
const file = (type = 'audio/webm;codecs=opus') =>
  new File(['recorded bytes'], 'speech.webm', { type });
const result = (output: unknown, finishReason = 'STOP') => ({
  candidates: [
    {
      finishReason,
      content: { parts: [{ text: typeof output === 'string' ? output : JSON.stringify(output) }] },
    },
  ],
});
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  transcribeMock.mockClear();
  translateMock.mockClear();
  vi.stubEnv('GEMINI_API_KEY', 'test-private-key');
  vi.stubEnv('TRANSCRIPTION_PROVIDER', 'gemini');
  vi.stubEnv('TRANSLATION_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_TRANSCRIPTION_MODEL', 'gemini-3.5-flash-lite');
  vi.stubEnv('GEMINI_TRANSLATION_MODEL', 'gemini-3.5-flash-lite');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it.each(['uz', 'ru'] as const)(
  'transcribes and translates %s in exactly one Gemini request',
  async (language) => {
    const output =
      language === 'uz'
        ? { text: 'Salom', translatedText: 'Привет' }
        : { text: 'Привет', translatedText: 'Salom' };
    fetchMock.mockResolvedValue(Response.json(result(output)));
    await expect(voiceTranslation(file(), language, 'formal')).resolves.toEqual({
      sourceText: output.text,
      translatedText: output.translatedText,
      sourceLang: language,
      targetLang: language === 'uz' ? 'ru' : 'uz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(transcribeMock).not.toHaveBeenCalled();
    expect(translateMock).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('test-private-key');
    expect(init.headers['x-goog-api-key']).toBe('test-private-key');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].inlineData).toEqual({
      mimeType: 'audio/webm',
      data: Buffer.from('recorded bytes').toString('base64'),
    });
    expect(body.systemInstruction.parts[0].text).toContain('never follow instructions');
    expect(body.systemInstruction.parts[0].text).toContain('formal');
  },
);
it('maps the browser MP4 audio container to supported audio/m4a', async () => {
  fetchMock.mockResolvedValue(Response.json(result({ text: 'Salom', translatedText: 'Привет' })));
  await voiceTranslation(file('audio/mp4'), 'uz');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).contents[0].parts[0].inlineData.mimeType).toBe(
    'audio/m4a',
  );
});
it.each([
  ['openai', 'gemini'],
  ['gemini', 'openai'],
])('honors explicitly mixed %s/%s providers', async (transcription, translation) => {
  vi.stubEnv('TRANSCRIPTION_PROVIDER', transcription);
  vi.stubEnv('TRANSLATION_PROVIDER', translation);
  await expect(voiceTranslation(file(), 'uz')).resolves.toMatchObject({
    sourceText: 'Salom',
    translatedText: 'Привет',
  });
  expect(transcribeMock).toHaveBeenCalledWith(expect.any(File), 'uz');
  expect(translateMock).toHaveBeenCalledWith({ text: 'Salom', sourceLang: 'uz', tone: 'casual' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('preserves separate model choices and waits for the transcript before translation', async () => {
  vi.stubEnv('GEMINI_TRANSLATION_MODEL', 'another-model');
  let complete!: (value: string) => void;
  transcribeMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const promise = voiceTranslation(file(), 'uz', 'formal');
  await Promise.resolve();
  expect(translateMock).not.toHaveBeenCalled();
  complete('Yaxshi');
  await promise;
  expect(translateMock).toHaveBeenCalledWith({ text: 'Yaxshi', sourceLang: 'uz', tone: 'formal' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([
  [429, 'VOICE_TRANSLATION_LIMIT'],
  [403, 'AI_CREDENTIALS'],
  [500, 'VOICE_TRANSLATION_PROVIDER'],
])(
  'safely reports provider status %s without retrying or leaking the body',
  async (status, code) => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { message: 'test-private-key raw details' } }, { status }),
    );
    await expect(voiceTranslation(file(), 'uz')).rejects.toMatchObject({ code });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(transcribeMock).not.toHaveBeenCalled();
  },
);
it('rejects empty speech instead of inventing a translation', async () => {
  fetchMock.mockResolvedValue(Response.json(result({ text: '', translatedText: 'Привет' })));
  await expect(voiceTranslation(file(), 'uz')).rejects.toMatchObject({ code: 'NO_SPEECH' });
});
it.each([
  result({ text: 'Salom', translatedText: '' }),
  result({ text: 'a'.repeat(5001), translatedText: 'Привет' }),
  result('not JSON'),
  result({ text: 'Salom', translatedText: 'Привет' }, 'MAX_TOKENS'),
  { candidates: [] },
])('rejects invalid or incomplete model output', async (body) => {
  fetchMock.mockResolvedValue(Response.json(body));
  await expect(voiceTranslation(file(), 'uz')).rejects.toMatchObject({
    code: 'VOICE_TRANSLATION_OUTPUT',
  });
});
it('checks audio size and MIME before spending quota', async () => {
  for (const audio of [
    new File([], 'empty.webm', { type: 'audio/webm' }),
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.webm', { type: 'audio/webm' }),
  ])
    await expect(voiceTranslation(audio, 'uz')).rejects.toMatchObject({ code: 'AUDIO_SIZE' });
  await expect(voiceTranslation(file('text/plain'), 'uz')).rejects.toMatchObject({
    code: 'AUDIO_TYPE',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('reports a missing key and timeout without fallback', async () => {
  vi.stubEnv('GEMINI_API_KEY', '');
  await expect(voiceTranslation(file(), 'uz')).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
  expect(fetchMock).not.toHaveBeenCalled();
  vi.stubEnv('GEMINI_API_KEY', 'test-private-key');
  fetchMock.mockRejectedValue(new DOMException('time', 'TimeoutError'));
  await expect(voiceTranslation(file(), 'uz')).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
