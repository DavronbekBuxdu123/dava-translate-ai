import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
export class AppError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); } }
export function success<T>(data: T, status = 200) { return NextResponse.json({ ok: true, data }, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function failure(error: unknown) {
  if (error instanceof AppError) return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  if (error instanceof ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'So‘rov noto‘g‘ri.' } }, { status: 400 });
  // Do not expose provider/DB exception details, prompts or credentials.
  return NextResponse.json({ ok: false, error: { code: 'SERVICE_ERROR', message: 'Xizmatga ulanishda xato. Birozdan keyin qayta urinib ko‘ring.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
export async function route<T>(handler: () => Promise<T>) { try { return await handler(); } catch (error) { return failure(error); } }
export function sameOrigin(request: NextRequest) {
  if (['GET','HEAD'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
  if (!origin || origin !== new URL(expected).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('ORIGIN', 'Bu so‘rovga ruxsat berilmagan.', 403);
}
export async function readJson<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new AppError('CONTENT_TYPE', 'JSON so‘rov yuboring.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('BODY', 'So‘rov bo‘sh.');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 40000) { await reader.cancel(); throw new AppError('TOO_LARGE', 'Matn hajmi juda katta.', 413); } chunks.push(value); } } finally { reader.releaseLock(); }
  try { return schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { if (error instanceof ZodError) throw error; throw new AppError('JSON', 'JSON formati noto‘g‘ri.'); }
}
