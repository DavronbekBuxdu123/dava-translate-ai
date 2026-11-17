import 'server-only';
import { AppError } from '@/lib/server';
import type { Language } from '@/types';

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export async function geminiSpeech(text: string, language: Language) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key)
    throw new AppError(
      'AI_NOT_CONFIGURED',
      'AI ovozi uchun serverda GEMINI_API_KEY sozlanishi kerak.',
      503,
    );
  const model = process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.8-flash-lite-tts';
  const voice = process.env.GEMINI_TTS_VOICE?.trim() || 'Kore';
  if (!/^[a-zA-Z0-9._-]{1,120}$/.test(model) || !/^[a-zA-Z0-9_-]{1,120}$/.test(voice))
    throw new AppError('VOICE_CONFIG', 'Gemini ovoz modeli yoki voice nomi noto‘g‘ri.', 503);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(40000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text,
                  speech_metadata: {
                    style: `Speak naturally, warmly and clearly in ${language === 'uz' ? 'Uzbek, using the provided Latin-script transcript' : 'Russian'}. Read the transcript verbatim, without any introduction or commentary.`,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { voice } },
          },
        }),
      },
    );
    if (response.status === 429)
      throw new AppError(
        'VOICE_LIMIT',
        'Gemini ovoz kvotasi yoki so‘rov tezligi limitiga yetildi. AI Studio’da limitni tekshiring yoki keyinroq urinib ko‘ring.',
        503,
      );
    if (response.status === 401 || response.status === 403)
      throw new AppError(
        'VOICE_ACCESS',
        'Gemini kaliti va TTS modeliga kirish ruxsatini AI Studio’da tekshiring.',
        503,
      );
    if (!response.ok)
      throw new AppError(
        'VOICE_PROVIDER',
        'Gemini ovoz yaratmadi. TTS modeli va hisob sozlamalarini tekshiring.',
        502,
      );
    // Bound the base64 JSON response as well as the decoded audio for serverless hosting.
    const reader = response.body?.getReader();
    if (!reader) throw new AppError('VOICE_OUTPUT', 'Ovoz javobi bo‘sh.', 502);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_AUDIO_BYTES * 1.4 + 16384) {
          await reader.cancel();
          throw new AppError('VOICE_SIZE', 'Ovoz juda uzun. Qisqaroq matnni eshittiring.', 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const candidate = result?.candidates?.[0];
    if (candidate?.finishReason !== 'STOP')
      throw new AppError(
        'VOICE_OUTPUT',
        'To‘liq ovoz olinmadi. Qisqaroq matn bilan qayta urinib ko‘ring.',
        502,
      );
    const parts = candidate.content?.parts;
    const outputs = Array.isArray(parts) ? parts.filter((part) => part?.inlineData) : [];
    if (outputs.length !== 1)
      throw new AppError('VOICE_OUTPUT', 'Ovoz javobi noto‘g‘ri formatda.', 502);
    const data = outputs[0].inlineData;
    if (
      !['audio/wav', 'audio/x-wav', 'audio/wave'].includes(data.mimeType) ||
      typeof data.data !== 'string' ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data.data)
    )
      throw new AppError(
        'VOICE_OUTPUT',
        'Gemini WAV ovoz qaytarmadi. TTS modelini tekshiring.',
        502,
      );
    const audio = Buffer.from(data.data, 'base64');
    if (audio.length > MAX_AUDIO_BYTES)
      throw new AppError('VOICE_SIZE', 'Ovoz juda uzun. Qisqaroq matnni eshittiring.', 413);
    if (
      audio.length < 44 ||
      audio.toString('ascii', 0, 4) !== 'RIFF' ||
      audio.toString('ascii', 8, 12) !== 'WAVE'
    )
      throw new AppError('VOICE_OUTPUT', 'Ovoz fayli noto‘g‘ri.', 502);
    return { audio, mimeType: 'audio/wav', provider: 'gemini' };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
      throw new AppError('VOICE_TIMEOUT', 'Ovoz yaratish kechikdi. Qayta urinib ko‘ring.', 504);
    throw new AppError(
      'VOICE_PROVIDER',
      'AI ovoz xizmatiga ulanib bo‘lmadi. Keyinroq urinib ko‘ring.',
      502,
    );
  }
}
