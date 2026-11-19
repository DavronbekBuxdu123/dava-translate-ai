/** Only models with documented MINIMAL support receive this setting. Other choices stay untouched. */
const minimalModels = new Set([
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
]);
export function quickThinking(model: string) {
  return minimalModels.has(model) ? { thinkingConfig: { thinkingLevel: 'MINIMAL' as const } } : {};
}
export function textGeneration(model: string, length: number) {
  return {
    ...quickThinking(model),
    maxOutputTokens: minimalModels.has(model)
      ? Math.min(8192, Math.max(1024, Math.ceil(length * 2) + 256))
      : 8192,
  };
}
