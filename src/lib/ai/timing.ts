import type { NextResponse } from 'next/server';
export function aiResponse<T extends NextResponse>(
  response: T,
  provider: string,
  timings: Record<string, number>,
  cache = 'miss',
) {
  response.headers.set('X-Dava-AI-Provider', provider);
  response.headers.set('X-Dava-AI-Cache', cache);
  response.headers.set(
    'Server-Timing',
    Object.entries(timings)
      .map(([key, value]) => `${key};dur=${Math.max(0, value).toFixed(1)}`)
      .join(', '),
  );
  return response;
}
