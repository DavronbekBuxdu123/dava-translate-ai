import 'server-only';
import { db } from '@/lib/db';
import { AppError } from '@/lib/server';
import { assertOwner } from '@/lib/auth/guest';
import type { Language } from '@/types';

export async function prepareConversation(guestId: string, id?: string) {
  if (!id) return null;
  const conversation = await db().conversation.findUnique({
    where: { id },
    include: { _count: { select: { messages: true } } },
  });
  assertOwner(guestId, conversation?.guestId);
  if (conversation!.endedAt)
    throw new AppError('ENDED', 'Suhbat tugatilgan. Yangi suhbat oching.', 409);
  if (conversation!._count.messages >= 300)
    throw new AppError('SESSION_LIMIT', '300 ta xabar limiti. Yangi suhbat oching.', 409);
  return conversation!;
}
type Turn = {
  sourceText: string;
  translatedText: string;
  sourceLang: Language;
  targetLang: Language;
};
export async function saveTurn(
  guestId: string,
  conversation: Awaited<ReturnType<typeof prepareConversation>>,
  turn: Turn,
) {
  if (!conversation) {
    // A single request creates the session only after AI succeeds. No speculative empty sessions.
    const created = await db().conversation.create({
      data: { guestId, title: turn.sourceText.slice(0, 60), messages: { create: turn } },
      include: { messages: { take: 1 } },
    });
    const { messages, ...session } = created;
    return { conversation: session, message: messages[0] };
  }
  const [message] = await Promise.all([
    db().conversationMessage.create({ data: { conversationId: conversation.id, ...turn } }),
    conversation._count.messages === 0
      ? db().conversation.update({
          where: { id: conversation.id },
          data: { title: turn.sourceText.slice(0, 60) },
        })
      : Promise.resolve(),
  ]);
  const { _count, ...session } = conversation;
  return {
    conversation: {
      ...session,
      title: _count.messages === 0 ? turn.sourceText.slice(0, 60) : session.title,
    },
    message,
  };
}
