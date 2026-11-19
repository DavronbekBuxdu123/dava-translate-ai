import 'server-only';
import { z } from 'zod';
import { AppError } from '@/lib/server';
import { translationOutput } from '@/lib/validation';
import { translationPrompt, type TranslationInput } from './translation-prompt';
import { textGeneration } from './gemini-generation';

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z.array(
              z.object({ text: z.string().optional(), thought: z.boolean().optional() }),
            ),
          })
          .optional(),
      }),
    )
    .optional(),
});

export async function translateGemini(input: TranslationInput, model: string) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key)
    throw new AppError(
      'AI_NOT_CONFIGURED',
      'Gemini hali ulanmagan. Serverda GEMINI_API_KEY sozlanishi kerak.',
      503,
    );
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: translationPrompt(input) }] },
          contents: [{ role: 'user', parts: [{ text: input.text }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: { translatedText: { type: 'STRING' } },
              required: ['translatedText'],
            },
            ...textGeneration(model, input.text.length),
          },
        }),
      },
    );
    if (response.status === 429)
      throw new AppError(
        'PROVIDER_LIMIT',
        'Gemini so‘rov yoki kvota limitiga yetdi. AI Studio’da kvotani tekshiring yoki biroz kutib qayta urinib ko‘ring.',
        503,
      );
    if (response.status === 401 || response.status === 403)
      throw new AppError(
        'AI_CREDENTIALS',
        'Gemini kaliti yoki unga berilgan ruxsatni AI Studio’da tekshiring.',
        503,
      );
    if (response.status === 404)
      throw new AppError(
        'AI_MODEL_CONFIG',
        'Gemini modeli topilmadi. GEMINI_TRANSLATION_MODEL sozlamasini tekshiring.',
        503,
      );
    if (!response.ok)
      throw new AppError(
        'AI_UNAVAILABLE',
        'Gemini xizmatiga ulanib bo‘lmadi. Model va API sozlamalarini tekshiring.',
        502,
      );
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new AppError(
        'AI_OUTPUT',
        'Gemini tarjima javobi noto‘g‘ri. Qayta urinib ko‘ring.',
        502,
      );
    const candidate = parsed.data.candidates?.[0];
    if (candidate?.finishReason !== 'STOP')
      throw new AppError(
        'AI_OUTPUT',
        'Gemini to‘liq tarjima qaytarmadi. Matnni qisqartirib qayta urinib ko‘ring.',
        502,
      );
    const text = candidate.content?.parts
      .filter((part) => !part.thought)
      .map((part) => part.text || '')
      .join('');
    let output: unknown;
    try {
      output = JSON.parse(text || '');
    } catch {
      throw new AppError('AI_OUTPUT', 'Gemini tarjimasi olinmadi. Qayta urinib ko‘ring.', 502);
    }
    const validated = translationOutput.safeParse(output);
    if (!validated.success)
      throw new AppError(
        'AI_OUTPUT',
        'Gemini tarjima formati noto‘g‘ri. Qayta urinib ko‘ring.',
        502,
      );
    return validated.data.translatedText;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))
      throw new AppError('AI_TIMEOUT', 'Gemini javobi kechikdi. Qayta urinib ko‘ring.', 504);
    throw new AppError(
      'AI_UNAVAILABLE',
      'Gemini xizmatiga ulanib bo‘lmadi. Keyinroq urinib ko‘ring.',
      502,
    );
  }
}
