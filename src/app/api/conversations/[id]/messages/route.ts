import { NextRequest } from 'next/server';
import { context } from '@/lib/api-context';
import { route, success, readJson } from '@/lib/server';
import { translationSchema } from '@/lib/validation';
import { translate } from '@/lib/ai/translation';
import { opposite } from '@/types';
import { prepareConversation, saveTurn } from '@/lib/conversations/turn';
import { aiResponse } from '@/lib/ai/timing';
import { translationConfig } from '@/lib/ai/translation-config';
export const maxDuration = 60;
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const started = performance.now();
    const input = await readJson(request, translationSchema);
    const owner = await context(request, true);
    const { id } = await params;
    const conversation = await prepareConversation(owner.id, id);
    const authorized = performance.now();
    const translatedText = await translate(input);
    const translated = performance.now();
    const result = await saveTurn(owner.id, conversation, {
      sourceText: input.text,
      translatedText,
      sourceLang: input.sourceLang,
      targetLang: opposite(input.sourceLang),
    });
    return aiResponse(success(result.message, 201), translationConfig().provider, {
      session: authorized - started,
      provider: translated - authorized,
      save: performance.now() - translated,
    });
  });
}
