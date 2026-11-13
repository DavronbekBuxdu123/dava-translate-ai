import { NextRequest } from 'next/server';
import { route, success, AppError } from '@/lib/server';
import { context } from '@/lib/api-context';
import { db } from '@/lib/db';
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return route(async () => { const owner = await context(request); const { id } = await params; const result = await db().favorite.deleteMany({ where: { id, guestId: owner.id } }); if (!result.count) throw new AppError('NOT_FOUND', 'Yozuv topilmadi.', 404); return success({ deleted: true }); }); }
