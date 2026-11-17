import { NextRequest, NextResponse } from 'next/server';
import { route, readJson } from '@/lib/server';
import { context } from '@/lib/api-context';
import { speechSchema } from '@/lib/validation';
import { speech } from '@/lib/ai/speech';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  return route(async () => {
    const input = await readJson(request, speechSchema);
    await context(request, true);
    const output = await speech(input.text, input.language);
    return new NextResponse(new Uint8Array(output.audio), {
      headers: {
        'Content-Type': output.mimeType,
        'Cache-Control': 'no-store',
        'X-Dava-Speech-Provider': output.provider,
      },
    });
  });
}
