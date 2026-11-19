import { NextRequest } from 'next/server';
import { context } from '@/lib/api-context';
import { route, readJson, success } from '@/lib/server';
import { translationSchema } from '@/lib/validation';
import { translate } from '@/lib/ai/translation';
import { translationConfig } from '@/lib/ai/translation-config';
import { aiResponse } from '@/lib/ai/timing';
import { saveTurn } from '@/lib/conversations/turn';
import { opposite } from '@/types';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  return route(async () => {
    const started = performance.now();
    const input = await readJson(request, translationSchema);
    const owner = await context(request, true);
    const authorized = performance.now();
    const translatedText = await translate(input);
    const translated = performance.now();
    const result = await saveTurn(owner.id, null, {
      sourceText: input.text,
      translatedText,
      sourceLang: input.sourceLang,
      targetLang: opposite(input.sourceLang),
    });
    return aiResponse(success(result, 201), translationConfig().provider, {
      session: authorized - started,
      provider: translated - authorized,
      save: performance.now() - translated,
    });
  });
}
