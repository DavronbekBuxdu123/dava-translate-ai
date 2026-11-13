import { NextRequest } from 'next/server';
import { context } from '@/lib/api-context';
import { db } from '@/lib/db';
import { route, success, AppError } from '@/lib/server';
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    const owner = await context(request);
    const { id } = await params;
    const result = await db().translation.deleteMany({ where: { id, guestId: owner.id } });
    if (!result.count) throw new AppError('NOT_FOUND', 'Yozuv topilmadi.', 404);
    return success({ deleted: true });
  });
}
