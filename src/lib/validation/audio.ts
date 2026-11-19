import type { NextRequest } from 'next/server';
import { AppError, readLimited } from '@/lib/server';
import { languageSchema } from '@/lib/validation';
export async function readAudio(request: NextRequest) {
  const limit = 4 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > limit + 12000)
    throw new AppError('AUDIO_SIZE', 'Audio hajmi 4 MB dan oshmasin.', 413);
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data;'))
    throw new AppError('AUDIO_TYPE', 'Multipart audio yuboring.', 415);
  const bounded = await readLimited(request, limit + 12000);
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(bounded), {
      headers: { 'Content-Type': contentType },
    }).formData();
  } catch {
    throw new AppError('AUDIO_BODY', 'Audio so‘rovi noto‘g‘ri.');
  }
  const file = form.get('audio');
  const language = languageSchema.parse(form.get('language'));
  if (!(file instanceof File) || !file.size || file.size > limit)
    throw new AppError('AUDIO_SIZE', 'Audio 4 MB dan kichik va bo‘sh bo‘lmasligi kerak.', 413);
  if (
    !['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(
      file.type.split(';')[0],
    )
  )
    throw new AppError('AUDIO_TYPE', 'Bu audio formati qo‘llab-quvvatlanmaydi.', 415);
  return { file, language, form };
}
