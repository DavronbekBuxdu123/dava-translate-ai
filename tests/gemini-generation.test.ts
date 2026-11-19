import { expect, it } from 'vitest';
import { quickThinking, textGeneration } from '@/lib/ai/gemini-generation';
it('explicitly requests minimal reasoning only for compatible models', () => {
  expect(quickThinking('gemini-3.5-flash-lite')).toEqual({
    thinkingConfig: { thinkingLevel: 'MINIMAL' },
  });
  expect(quickThinking('gemini-2.5-pro')).toEqual({});
  expect(quickThinking('custom-model')).toEqual({});
});
it('bounds short outputs while retaining capacity for long translations and custom models', () => {
  expect(textGeneration('gemini-3.5-flash-lite', 40).maxOutputTokens).toBe(1024);
  expect(textGeneration('gemini-3.5-flash-lite', 5000).maxOutputTokens).toBe(8192);
  expect(textGeneration('custom-model', 40).maxOutputTokens).toBe(8192);
});
