import 'server-only';
import { selectProvider, modelName } from './provider-config';
export function translationConfig() {
  const provider = selectProvider(process.env.TRANSLATION_PROVIDER);
  return {
    provider,
    model:
      provider === 'gemini'
        ? modelName(process.env.GEMINI_TRANSLATION_MODEL, 'gemini-3.5-flash-lite')
        : modelName(process.env.OPENAI_TRANSLATION_MODEL, 'gpt-4.1-mini'),
  };
}
