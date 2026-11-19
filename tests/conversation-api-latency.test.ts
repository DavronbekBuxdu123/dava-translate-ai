// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  context: vi.fn(async () => ({ id: 'owner' })),
  findUnique: vi.fn(),
  createConversation: vi.fn(),
  createMessage: vi.fn(),
  update: vi.fn(),
  translate: vi.fn(),
  voice: vi.fn(),
}));
vi.mock('@/lib/api-context', () => ({ context: mocks.context }));
vi.mock('@/lib/db', () => ({
  db: () => ({
    conversation: {
      findUnique: mocks.findUnique,
      create: mocks.createConversation,
      update: mocks.update,
    },
    conversationMessage: { create: mocks.createMessage },
  }),
}));
vi.mock('@/lib/ai/translation', () => ({ translate: mocks.translate }));
vi.mock('@/lib/ai/voice-translation', () => ({ voiceTranslation: mocks.voice }));
import { POST as firstText } from '@/app/api/conversations/messages/route';
import { POST as existingText } from '@/app/api/conversations/[id]/messages/route';
import { POST as voice } from '@/app/api/conversations/voice/route';
const message = {
  id: 'm',
  sourceText: 'Salom',
  translatedText: 'Привет',
  sourceLang: 'uz',
  targetLang: 'ru',
};
const session = {
  id: 'c',
  guestId: 'owner',
  title: 'Suhbat',
  endedAt: null,
  _count: { messages: 3 },
};
function textRequest() {
  return new NextRequest('https://example.test/api/conversations/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Salom', sourceLang: 'uz' }),
  });
}
function voiceRequest(id?: string) {
  const form = new FormData();
  form.append('audio', new File(['actual-test-bytes'], 'test.webm', { type: 'audio/webm' }));
  form.append('language', 'uz');
  if (id) form.append('conversationId', id);
  return new NextRequest('https://example.test/api/conversations/voice', {
    method: 'POST',
    body: form,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.translate.mockResolvedValue('Привет');
  mocks.voice.mockResolvedValue(message);
  mocks.findUnique.mockResolvedValue(session);
  mocks.createMessage.mockResolvedValue(message);
  mocks.createConversation.mockResolvedValue({ ...session, messages: [message] });
});
afterEach(() => vi.unstubAllEnvs());
it('creates first typed conversation and message in one server request after AI succeeds', async () => {
  const response = await firstText(textRequest());
  expect(response.status).toBe(201);
  expect((await response.json()).data.message).toEqual(message);
  expect(mocks.context).toHaveBeenCalledTimes(1);
  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.createConversation).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        guestId: 'owner',
        messages: { create: expect.objectContaining({ translatedText: 'Привет' }) },
      }),
    }),
  );
});
it('does not persist an empty speculative session when provider fails', async () => {
  mocks.translate.mockRejectedValue(new Error('unavailable'));
  expect((await firstText(textRequest())).status).toBe(503);
  expect(mocks.createConversation).not.toHaveBeenCalled();
});
it.each([
  { ...session, guestId: 'other' },
  { ...session, endedAt: new Date() },
  { ...session, _count: { messages: 300 } },
])('rejects foreign, ended or full conversations before spending AI quota', async (value) => {
  mocks.findUnique.mockResolvedValue(value);
  const response = await existingText(textRequest(), { params: Promise.resolve({ id: 'c' }) });
  expect(response.status).toBe(value.guestId === 'other' ? 404 : 409);
  expect(mocks.translate).not.toHaveBeenCalled();
});
it('loads conversation ownership and message count together, without a second count query', async () => {
  const response = await existingText(textRequest(), { params: Promise.resolve({ id: 'c' }) });
  expect(response.status).toBe(201);
  expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  expect(mocks.findUnique).toHaveBeenCalledWith({
    where: { id: 'c' },
    include: { _count: { select: { messages: true } } },
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('saves a voice turn through one combined provider operation and one authorization pass', async () => {
  const response = await voice(voiceRequest());
  expect(response.status).toBe(201);
  expect(mocks.context).toHaveBeenCalledTimes(1);
  expect(mocks.voice).toHaveBeenCalledTimes(1);
  expect(mocks.translate).not.toHaveBeenCalled();
});
it('checks voice session ownership before processing its audio', async () => {
  mocks.findUnique.mockResolvedValue({ ...session, guestId: 'foreign' });
  expect((await voice(voiceRequest('c'))).status).toBe(404);
  expect(mocks.voice).not.toHaveBeenCalled();
});
