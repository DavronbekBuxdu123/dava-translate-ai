import 'server-only';
import OpenAI from 'openai';
import { AppError } from '@/lib/server';
export function ai() {
  if (!process.env.OPENAI_API_KEY)
    throw new AppError(
      'AI_NOT_CONFIGURED',
      'AI hali ulanmagan. Serverda OPENAI_API_KEY sozlanishi kerak.',
      503,
    );
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 1 });
}
export async function providerCall<T>(call: () => Promise<T>) {
  try {
    return await call();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof OpenAI.APIError && error.status === 429)
      throw new AppError(
        'PROVIDER_LIMIT',
        'AI xizmatining limiti tugagan. Keyinroq urinib ko‘ring.',
        503,
      );
    if (error instanceof OpenAI.APIConnectionTimeoutError)
      throw new AppError('AI_TIMEOUT', 'AI javobi kechikdi. Qayta urinib ko‘ring.', 504);
    throw new AppError(
      'AI_UNAVAILABLE',
      'AI xizmatiga ulanib bo‘lmadi. Keyinroq urinib ko‘ring.',
      502,
    );
  }
}
