import 'server-only';
import { ai, providerCall } from './client';
import type { Language } from '@/types';
import OpenAI from 'openai';
export async function transcribe(file: File, language: Language) {
  return providerCall(async () => {
    const client = ai();
    const options = {
      file,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
      prompt:
        language === 'uz'
          ? 'O‘zbek tilidagi nutq. Lotin yozuvidan foydalaning.'
          : 'Речь на русском языке.',
    };
    try {
      const result = await client.audio.transcriptions.create({ ...options, language });
      return result.text;
    } catch (error) {
      if (
        error instanceof OpenAI.APIError &&
        error.status === 400 &&
        /language/i.test(error.message)
      ) {
        const result = await client.audio.transcriptions.create(options);
        return result.text;
      }
      throw error;
    }
  });
}
