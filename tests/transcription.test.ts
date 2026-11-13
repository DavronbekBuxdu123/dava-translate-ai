// @vitest-environment node
import { expect, it, vi } from 'vitest';
import OpenAI from 'openai';
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/lib/ai/client', () => ({
  ai: () => ({ audio: { transcriptions: { create } } }),
  providerCall: (call: () => Promise<unknown>) => call(),
}));
import { transcribe } from '@/lib/ai/transcription';
it('retries an explicitly rejected language code once without forcing another language', async () => {
  create
    .mockRejectedValueOnce(
      new OpenAI.APIError(
        400,
        { message: 'Unsupported language: uz' },
        'Unsupported language: uz',
        new Headers(),
      ),
    )
    .mockResolvedValueOnce({ text: 'Salom' });
  const file = new File(['audio'], 'speech.webm', { type: 'audio/webm' });
  expect(await transcribe(file, 'uz')).toBe('Salom');
  expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ language: 'uz' }));
  expect(create.mock.calls[1][0]).not.toHaveProperty('language');
  expect(create).toHaveBeenCalledTimes(2);
});
