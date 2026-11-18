import { NextRequest } from 'next/server';
import { route, success, AppError, readLimited } from '@/lib/server';
import { context } from '@/lib/api-context';
import { languageSchema } from '@/lib/validation';
import { transcribe } from '@/lib/ai/transcription';
import { transcriptionConfig } from '@/lib/ai/provider-config';
import { aiResponse } from '@/lib/ai/timing';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  return route(async () => {
    const started = performance.now();
    await context(request, true);
    const sessionDone = performance.now();
    const length = Number(request.headers.get('content-length'));
    if (length > 4 * 1024 * 1024 + 12000)
      throw new AppError('AUDIO_SIZE', 'Audio hajmi 4 MB dan oshmasin.', 413);
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data;'))
      throw new AppError('AUDIO_TYPE', 'Multipart audio yuboring.', 415);
    const boundedBody = await readLimited(request, 4 * 1024 * 1024 + 12000);
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(boundedBody), {
        headers: { 'Content-Type': contentType },
      }).formData();
    } catch {
      throw new AppError('AUDIO_BODY', 'Audio so‘rovi noto‘g‘ri.');
    }
    const file = form.get('audio');
    const language = languageSchema.parse(form.get('language'));
    if (!(file instanceof File) || file.size === 0 || file.size > 4 * 1024 * 1024)
      throw new AppError('AUDIO_SIZE', 'Audio 4 MB dan kichik va bo‘sh bo‘lmasligi kerak.', 413);
    if (
      !['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(
        file.type.split(';')[0],
      )
    )
      throw new AppError('AUDIO_TYPE', 'Bu audio formati qo‘llab-quvvatlanmaydi.', 415);
    const text = await transcribe(file, language);
    return aiResponse(success({ text }), transcriptionConfig().provider, {
      session: sessionDone - started,
      provider: performance.now() - sessionDone,
    });
  });
}
