import { NextRequest } from 'next/server';
import { route, success, readJson, AppError } from '@/lib/server';
import { context } from '@/lib/api-context';
import { favoriteSchema, listSchema } from '@/lib/validation';
import { db } from '@/lib/db';
export async function GET(request: NextRequest) {
  return route(async () => {
    const owner = await context(request);
    const { page, q, language, date } = listSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const where = {
      guestId: owner.id,
      translation: {
        ...(language ? { sourceLang: language } : {}),
        ...(date
          ? { createdAt: { gte: new Date(date), lt: new Date(Date.parse(date) + 86400000) } }
          : {}),
        ...(q
          ? {
              OR: [
                { sourceText: { contains: q, mode: 'insensitive' as const } },
                { translatedText: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
    };
    const [items, total] = await Promise.all([
      db().favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
        include: { translation: true },
      }),
      db().favorite.count({ where }),
    ]);
    return success({
      items: items.map((f) => ({ ...f.translation, favorites: [{ id: f.id }] })),
      total,
      page,
    });
  });
}
export async function POST(request: NextRequest) {
  return route(async () => {
    const input = await readJson(request, favoriteSchema);
    const owner = await context(request);
    const translation = await db().translation.findFirst({
      where: { id: input.translationId, guestId: owner.id },
    });
    if (!translation) throw new AppError('NOT_FOUND', 'Tarjima topilmadi.', 404);
    const item = await db().favorite.upsert({
      where: { guestId_translationId: { guestId: owner.id, translationId: translation.id } },
      create: { guestId: owner.id, translationId: translation.id },
      update: {},
    });
    return success(item);
  });
}
