import 'server-only';
import { AppError } from '@/lib/server';
export type Provider = 'gemini' | 'openai';
export function selectProvider(value?: string): Provider {
  const provider = value?.trim() || (process.env.GEMINI_API_KEY?.trim() ? 'gemini' : 'openai');
  if (provider !== 'gemini' && provider !== 'openai')
    throw new AppError(
      'AI_PROVIDER_CONFIG',
      'AI provider qiymati gemini yoki openai bo‘lishi kerak.',
      503,
    );
  return provider;
}
export function modelName(value: string | undefined, fallback: string) {
  const model = value?.trim() || fallback;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}$/.test(model))
    throw new AppError('AI_MODEL_CONFIG', 'AI model nomi noto‘g‘ri sozlangan.', 503);
  return model;
}
export function transcriptionConfig() {
  const provider = selectProvider(
    process.env.TRANSCRIPTION_PROVIDER || process.env.TRANSLATION_PROVIDER,
  );
  return {
    provider,
    model:
      provider === 'gemini'
        ? modelName(process.env.GEMINI_TRANSCRIPTION_MODEL, 'gemini-3.5-flash-lite')
        : modelName(process.env.OPENAI_TRANSCRIPTION_MODEL, 'gpt-4o-mini-transcribe'),
  };
}
export function speechConfig() {
  const provider = selectProvider(process.env.SPEECH_PROVIDER || process.env.TRANSLATION_PROVIDER);
  return {
    provider,
    model:
      provider === 'gemini'
        ? modelName(process.env.GEMINI_TTS_MODEL, 'gemini-3.8-flash-lite-tts')
        : modelName(process.env.OPENAI_TTS_MODEL, 'gpt-4o-mini-tts'),
  };
}
