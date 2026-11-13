import 'server-only';
import { ai, providerCall } from './client';
import { AppError } from '@/lib/server';
import type { Language } from '@/types';
export async function speech(text: string, language: Language) {
  if (language === 'uz') throw new AppError('VOICE_UNSUPPORTED', 'O‘zbekcha AI ovozi hozir yoqilmagan. Qurilmadagi o‘zbekcha ovozdan foydalaning.', 422);
  return providerCall(async () => {
    const voice = process.env.OPENAI_TTS_VOICE || 'coral';
    const result = await ai().audio.speech.create({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice, input: text, response_format: 'mp3' });
    return Buffer.from(await result.arrayBuffer());
  });
}
