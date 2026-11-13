import { NextRequest } from 'next/server';
import { context } from '@/lib/api-context';
import { db } from '@/lib/db';
import { route, success } from '@/lib/server';
import { listSchema } from '@/lib/validation';
export async function GET(request: NextRequest) { return route(async () => { const owner = await context(request); const { page } = listSchema.parse(Object.fromEntries(request.nextUrl.searchParams)); const where = { guestId: owner.id }; const [items, total] = await Promise.all([db().conversation.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20, skip: (page - 1) * 20 }), db().conversation.count({ where })]); return success({ items, total, page }); }); }
export async function POST(request: NextRequest) { return route(async () => { const owner = await context(request); return success(await db().conversation.create({ data: { guestId: owner.id } }), 201); }); }
