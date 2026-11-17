import 'server-only';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ai, providerCall } from './client';
import { translationOutput } from '@/lib/validation';
import { translationPrompt, type TranslationInput } from './translation-prompt';
import { translationConfig } from './translation-config';
import { translateGemini } from './gemini';
import { AppError } from '@/lib/server';
export async function translate(input: TranslationInput) {
  const { provider, model } = translationConfig();
  if (provider === 'gemini') return translateGemini(input, model);
  return providerCall(async () => {
    const result = await ai().chat.completions.parse({
      model,
      messages: [
        {
          role: 'system',
          content: translationPrompt(input),
        },
        { role: 'user', content: input.text },
      ],
      response_format: zodResponseFormat(translationOutput, 'translation'),
      max_completion_tokens: 4500,
    });
    const parsed = result.choices[0]?.message.parsed;
    if (!parsed) throw new AppError('AI_OUTPUT', 'Tarjima olinmadi. Qayta urinib ko‘ring.', 502);
    return translationOutput.parse(parsed).translatedText;
  });
}
