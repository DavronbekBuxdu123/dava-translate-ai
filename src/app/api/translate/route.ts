import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { route, success, readJson } from '@/lib/server';
import { context } from '@/lib/api-context';
import { translationSchema } from '@/lib/validation';
import { translate } from '@/lib/ai/translation';
import { db } from '@/lib/db';
import { opposite } from '@/types';
export const maxDuration = 60;
export async function POST(request: NextRequest) { return route(async () => {
  const input = await readJson(request, translationSchema); const owner = await context(request, true);
  const requestKey = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const existing = await db().translation.findFirst({ where: { guestId: owner.id, requestKey, createdAt: { gte: new Date(Date.now() - 300000) } }, include: { favorites: { select: { id: true } } }, orderBy: { createdAt: 'desc' } });
  if (existing) return success(existing);
  const translatedText = await translate(input);
  const data = await db().translation.create({ data: { guestId: owner.id, sourceText: input.text, translatedText, sourceLang: input.sourceLang, targetLang: opposite(input.sourceLang), tone: input.tone, requestKey }, include: { favorites: { select: { id: true } } } });
  return success(data);
}); }
