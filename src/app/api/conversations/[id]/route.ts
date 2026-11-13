import { NextRequest } from 'next/server';
import { context } from '@/lib/api-context';
import { db } from '@/lib/db';
import { route, success, readJson, AppError } from '@/lib/server';
import { assertOwner } from '@/lib/auth/guest';
import { z } from 'zod';
type Params = { params: Promise<{ id: string }> };
async function owned(request: NextRequest, params: Params['params']) { const owner = await context(request); const { id } = await params; const conversation = await db().conversation.findUnique({ where: { id } }); assertOwner(owner.id, conversation?.guestId); return conversation!; }
export async function GET(request: NextRequest, { params }: Params) { return route(async () => { const item = await owned(request, params); const messages = await db().conversationMessage.findMany({ where: { conversationId: item.id }, orderBy: { createdAt: 'asc' }, take: 300 }); return success({ ...item, messages }); }); }
export async function PATCH(request: NextRequest, { params }: Params) { return route(async () => { await readJson(request, z.object({ action: z.literal('end') })); const item = await owned(request, params); return success(await db().conversation.update({ where: { id: item.id }, data: { endedAt: new Date() } })); }); }
export async function DELETE(request: NextRequest, { params }: Params) { return route(async () => { const item = await owned(request, params); if (request.nextUrl.searchParams.get('messagesOnly') === 'true') { if (item.endedAt) throw new AppError('ENDED', 'Suhbat tugatilgan.', 409); await db().conversationMessage.deleteMany({ where: { conversationId: item.id } }); } else await db().conversation.delete({ where: { id: item.id } }); return success({ deleted: true }); }); }
