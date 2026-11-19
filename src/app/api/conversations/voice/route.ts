import { NextRequest } from 'next/server';
import { z } from 'zod';
import { context } from '@/lib/api-context';
import { route, success } from '@/lib/server';
import { readAudio } from '@/lib/validation/audio';
import { voiceTranslation } from '@/lib/ai/voice-translation';
import { translationConfig } from '@/lib/ai/translation-config';
import { aiResponse } from '@/lib/ai/timing';
import { prepareConversation, saveTurn } from '@/lib/conversations/turn';
export const maxDuration = 60;
const fields = z.object({
  conversationId: z.string().min(1).max(100).optional(),
  tone: z.enum(['casual', 'formal']).default('casual'),
});
export async function POST(request: NextRequest) {
  return route(async () => {
    const started = performance.now();
    const owner = await context(request, true);
    const { file, language, form } = await readAudio(request);
    const input = fields.parse({
      conversationId: form.get('conversationId') ?? undefined,
      tone: form.get('tone') ?? undefined,
    });
    const conversation = await prepareConversation(owner.id, input.conversationId);
    const authorized = performance.now();
    const turn = await voiceTranslation(file, language, input.tone);
    const translated = performance.now();
    const result = await saveTurn(owner.id, conversation, turn);
    return aiResponse(success(result, 201), translationConfig().provider, {
      session: authorized - started,
      provider: translated - authorized,
      save: performance.now() - translated,
    });
  });
}
