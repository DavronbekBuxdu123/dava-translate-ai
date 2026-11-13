import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { AppError } from '@/lib/server';
export const guestCookie = 'dava_guest';
export function assertOwner(guestId: string, ownerId?: string) { if (!ownerId || guestId !== ownerId) throw new AppError('NOT_FOUND', 'Yozuv topilmadi.', 404); }
export async function guest() {
  const store = await cookies();
  let token = store.get(guestCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) { token = randomBytes(32).toString('hex'); store.set(guestCookie, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 }); }
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return db().guestSession.upsert({ where: { tokenHash }, create: { tokenHash }, update: {} });
}
