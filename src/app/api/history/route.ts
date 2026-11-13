import { NextRequest } from 'next/server';
import { route, success } from '@/lib/server';
import { context } from '@/lib/api-context';
import { listSchema } from '@/lib/validation';
import { db } from '@/lib/db';
export async function GET(request: NextRequest) {
  return route(async () => {
    const owner = await context(request);
    const input = listSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const where = {
      guestId: owner.id,
      ...(input.language ? { sourceLang: input.language } : {}),
      ...(input.date
        ? {
            createdAt: {
              gte: new Date(input.date),
              lt: new Date(Date.parse(input.date) + 86400000),
            },
          }
        : {}),
      ...(input.q
        ? {
            OR: [
              { sourceText: { contains: input.q, mode: 'insensitive' as const } },
              { translatedText: { contains: input.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db().translation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: (input.page - 1) * 20,
        include: { favorites: { select: { id: true } } },
      }),
      db().translation.count({ where }),
    ]);
    return success({ items, total, page: input.page });
  });
}
export async function DELETE(request: NextRequest) {
  return route(async () => {
    const owner = await context(request);
    await db().translation.deleteMany({ where: { guestId: owner.id } });
    return success({ deleted: true });
  });
}
