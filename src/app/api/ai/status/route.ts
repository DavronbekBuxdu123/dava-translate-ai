import { success, route, AppError } from '@/lib/server';
import { translationConfig } from '@/lib/ai/translation-config';
import { speechConfig, transcriptionConfig } from '@/lib/ai/provider-config';
export const dynamic = 'force-dynamic';
export async function GET() {
  return route(async () => {
    // Local development diagnostics only: never reveal server configuration in production.
    if (process.env.NODE_ENV !== 'development')
      throw new AppError('NOT_FOUND', 'Sahifa topilmadi.', 404);
    const service = (config: { provider: string; model: string }) => ({
      ...config,
      keyConfigured: !!(config.provider === 'gemini'
        ? process.env.GEMINI_API_KEY?.trim()
        : process.env.OPENAI_API_KEY?.trim()),
    });
    return success({
      revision: 'gemini-audit-2',
      translation: service(translationConfig()),
      transcription: service(transcriptionConfig()),
      speech: service(speechConfig()),
      databaseConfigured: !!process.env.DATABASE_URL,
      sharedRateLimitConfigured: !!(
        process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ),
      note: 'Kalit borligi xizmat ishlaganini tasdiqlamaydi. Jonli tekshiruvni alohida bajaring.',
    });
  });
}
