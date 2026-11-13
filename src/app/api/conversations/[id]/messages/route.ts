import { NextRequest } from 'next/server';
import { context } from '@/lib/api-context';
import { db } from '@/lib/db';
import { route, success, readJson, AppError } from '@/lib/server';
import { translationSchema } from '@/lib/validation';
import { assertOwner } from '@/lib/auth/guest';
import { translate } from '@/lib/ai/translation';
import { opposite } from '@/types';
export const maxDuration = 60;
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const input = await readJson(request, translationSchema);
    const owner = await context(request, true);
    const { id } = await params;
    const conversation = await db().conversation.findUnique({ where: { id } });
    assertOwner(owner.id, conversation?.guestId);
    if (conversation!.endedAt)
      throw new AppError('ENDED', 'Suhbat tugatilgan. Yangi suhbat oching.', 409);
    if ((await db().conversationMessage.count({ where: { conversationId: id } })) >= 300)
      throw new AppError('SESSION_LIMIT', '300 ta xabar limiti. Yangi suhbat oching.', 409);
    const translatedText = await translate(input);
    const message = await db().conversationMessage.create({
      data: {
        conversationId: id,
        sourceText: input.text,
        translatedText,
        sourceLang: input.sourceLang,
        targetLang: opposite(input.sourceLang),
      },
    });
    if (
      !(await db().conversationMessage.count({
        where: { conversationId: id, id: { not: message.id } },
      }))
    )
      await db().conversation.update({ where: { id }, data: { title: input.text.slice(0, 60) } });
    return success(message, 201);
  });
}
