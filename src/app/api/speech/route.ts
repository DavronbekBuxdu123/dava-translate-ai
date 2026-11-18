import { NextRequest, NextResponse } from 'next/server';
import { route, readJson } from '@/lib/server';
import { context } from '@/lib/api-context';
import { speechSchema } from '@/lib/validation';
import { speech } from '@/lib/ai/speech';
import { aiResponse } from '@/lib/ai/timing';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  return route(async () => {
    const started = performance.now();
    const input = await readJson(request, speechSchema);
    await context(request, true);
    const sessionDone = performance.now();
    const output = await speech(input.text, input.language);
    return aiResponse(
      new NextResponse(new Uint8Array(output.audio), {
        headers: {
          'Content-Type': output.mimeType,
          'Cache-Control': 'no-store',
          'X-Dava-Speech-Provider': output.provider,
        },
      }),
      output.provider,
      { session: sessionDone - started, provider: performance.now() - sessionDone },
    );
  });
}
