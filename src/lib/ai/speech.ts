import 'server-only';
import { ai, providerCall } from './client';
import { AppError } from '@/lib/server';
import type { Language } from '@/types';
import { geminiSpeech } from './gemini-speech';
import { speechConfig } from './provider-config';
export async function speech(text: string, language: Language) {
  const { provider, model } = speechConfig();
  if (provider === 'gemini') return geminiSpeech(text, language);
  if (language === 'uz')
    throw new AppError(
      'VOICE_UNSUPPORTED',
      'O‘zbekcha AI ovozi hozir yoqilmagan. Qurilmadagi o‘zbekcha ovozdan foydalaning.',
      422,
    );
  return providerCall(async () => {
    const voice = process.env.OPENAI_TTS_VOICE || 'coral';
    const result = await ai().audio.speech.create({
      model,
      voice,
      input: text,
      response_format: 'mp3',
    });
    return {
      audio: Buffer.from(await result.arrayBuffer()),
      mimeType: 'audio/mpeg',
      provider: 'openai',
    };
  });
}
