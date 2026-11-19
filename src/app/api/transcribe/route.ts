import { NextRequest } from 'next/server';
import { route, success } from '@/lib/server';
import { context } from '@/lib/api-context';
import { transcribe } from '@/lib/ai/transcription';
import { transcriptionConfig } from '@/lib/ai/provider-config';
import { aiResponse } from '@/lib/ai/timing';
import { readAudio } from '@/lib/validation/audio';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  return route(async () => {
    const started = performance.now();
    await context(request, true);
    const sessionDone = performance.now();
    const { file, language } = await readAudio(request);
    const text = await transcribe(file, language);
    return aiResponse(success({ text }), transcriptionConfig().provider, {
      session: sessionDone - started,
      provider: performance.now() - sessionDone,
    });
  });
}
