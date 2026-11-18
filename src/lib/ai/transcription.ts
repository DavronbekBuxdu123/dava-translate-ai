import 'server-only';
import { ai, providerCall } from './client';
import type { Language } from '@/types';
import OpenAI from 'openai';
import { transcriptionConfig } from './provider-config';
import { geminiTranscribe } from './gemini-transcription';
export async function transcribe(file: File, language: Language) {
  const { provider, model } = transcriptionConfig();
  if (provider === 'gemini') return geminiTranscribe(file, language, model);
  return providerCall(async () => {
    const client = ai();
    const options = {
      file,
      model,
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
