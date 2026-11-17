import 'server-only';
import { AppError } from '@/lib/server';

export function translationConfig() {
  const provider = process.env.TRANSLATION_PROVIDER?.trim() || 'openai';
  if (provider !== 'openai' && provider !== 'gemini') {
    throw new AppError(
      'AI_PROVIDER_CONFIG',
      'TRANSLATION_PROVIDER qiymati openai yoki gemini bo‘lishi kerak.',
      503,
    );
  }
  const model =
    provider === 'gemini'
      ? process.env.GEMINI_TRANSLATION_MODEL?.trim() || 'gemini-3.5-flash-lite'
      : process.env.OPENAI_TRANSLATION_MODEL?.trim() || 'gpt-4.1-mini';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}$/.test(model)) {
    throw new AppError('AI_MODEL_CONFIG', 'Tarjima modeli nomi noto‘g‘ri sozlangan.', 503);
  }
  return { provider, model };
}
