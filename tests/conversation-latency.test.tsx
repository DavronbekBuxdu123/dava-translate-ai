import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  speechPlay: vi.fn(),
  speechStop: vi.fn(),
  transcript: null as null | ((text: string, language: 'uz' | 'ru') => void | Promise<void>),
  onAudio: null as null | ((audio: Blob, language: 'uz' | 'ru') => Promise<void>),
  autoTranslate: true,
  speechState: 'idle',
  recorderState: 'idle',
  autoplay: true,
}));
vi.mock('@/lib/client', () => ({ api: mocks.api, copy: vi.fn() }));
vi.mock('@/hooks/use-preferences', () => ({
  usePreferences: () => [{ autoplay: mocks.autoplay, autoTranslate: mocks.autoTranslate }],
}));
vi.mock('@/hooks/use-speech', () => ({
  useSpeech: () => ({
    state: mocks.speechState,
    error: '',
    play: mocks.speechPlay,
    stop: mocks.speechStop,
  }),
}));
vi.mock('@/hooks/use-recorder', () => ({
  useRecorder: (
    callback: typeof mocks.transcript,
    options?: { onAudio?: typeof mocks.onAudio },
  ) => {
    mocks.transcript = callback;
    mocks.onAudio = options?.onAudio || null;
    return {
      state: mocks.recorderState,
      busy: mocks.recorderState === 'processing',
      error: '',
      seconds: 0,
      language: 'uz',
      start: vi.fn(),
      stop: vi.fn(),
    };
  },
}));
vi.mock('@/components/ui/speech-button', () => ({
  SpeechButton: () => <span>Ovozni eshitish</span>,
}));
import { ConversationView } from '@/components/conversation/conversation';
const conversation = {
  id: 'session-first',
  title: 'Salom',
  createdAt: '2026-11-19T12:00:00Z',
  endedAt: null,
};
const message = {
  id: 'message-first',
  sourceText: 'Salom',
  translatedText: 'Привет',
  sourceLang: 'uz',
  targetLang: 'ru',
  createdAt: '2026-11-19T12:00:00Z',
};
function renderConversation() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ConversationView />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.speechState = 'idle';
  mocks.recorderState = 'idle';
  mocks.autoplay = true;
  mocks.autoTranslate = true;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Element.prototype.scrollIntoView = vi.fn();
  mocks.api.mockResolvedValue({ conversation, message });
});
afterEach(cleanup);
it('sends the first message in one request and displays text before audio generation completes', async () => {
  mocks.speechPlay.mockImplementation(() => {
    mocks.speechState = 'loading';
    return new Promise(() => {});
  });
  renderConversation();
  fireEvent.change(screen.getByRole('textbox', { name: 'Suhbat xabari' }), {
    target: { value: 'Salom' },
  });
  expect(mocks.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Xabarni tarjima qilib yuborish' }));
  await screen.findByText('Привет');
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(mocks.api).toHaveBeenCalledWith(
    '/api/conversations/messages',
    expect.objectContaining({ method: 'POST' }),
  );
  expect(mocks.speechPlay).toHaveBeenCalledWith('Привет', 'ru');
  expect(screen.getByRole('status')).toHaveTextContent('AI ovozi tayyorlanmoqda');
  expect(screen.getByRole('textbox', { name: 'Suhbat xabari' })).toBeEnabled();
  mocks.api.mockResolvedValueOnce({ ...message, id: 'message-next', translatedText: 'Как дела?' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Suhbat xabari' }), {
    target: { value: 'Qalaysiz?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Xabarni tarjima qilib yuborish' }));
  await screen.findByText('Как дела?');
  expect(mocks.api).toHaveBeenLastCalledWith(
    '/api/conversations/session-first/messages',
    expect.anything(),
  );
});
it('shows transcription and translation as separate stages without truncating or duplicating the transcript', async () => {
  mocks.autoplay = false;
  mocks.autoTranslate = false;
  mocks.recorderState = 'processing';
  const view = renderConversation();
  expect(screen.getByRole('status')).toHaveTextContent('Ovoz matnga aylantirilmoqda');
  let complete: ((value: unknown) => void) | undefined;
  mocks.api.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  mocks.recorderState = 'transcribed';
  const transcript = 'Tushuntirib bering. '.repeat(30);
  let sent: Promise<void> | void = undefined;
  act(() => {
    sent = mocks.transcript!(transcript, 'uz');
  });
  expect(mocks.api).not.toHaveBeenCalled();
  expect(mocks.onAudio).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Xabarni tarjima qilib yuborish' }));
  expect(screen.getByRole('status')).toHaveTextContent('Tarjima tayyorlanmoqda');
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mocks.api.mock.calls[0][1].body).text).toBe(transcript);
  await act(async () => {
    complete!({ conversation, message });
    await sent;
  });
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(mocks.speechPlay).not.toHaveBeenCalled();
  view.unmount();
});

it('posts recorded audio once through the combined voice route when automatic translation is enabled', async () => {
  mocks.autoplay = false;
  renderConversation();
  const audio = new Blob(['recorded audio'], { type: 'audio/webm' });
  await act(async () => {
    await mocks.onAudio!(audio, 'uz');
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(mocks.api).toHaveBeenCalledWith(
    '/api/conversations/voice',
    expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
  );
  const form = mocks.api.mock.calls[0][1].body as FormData;
  expect(form.get('language')).toBe('uz');
  expect(form.has('audio')).toBe(true);
  expect(form.has('conversationId')).toBe(false);
  expect(screen.getByText('Привет')).toBeInTheDocument();
  mocks.api.mockResolvedValueOnce({ conversation, message: { ...message, id: 'voice-next' } });
  await act(async () => {
    await mocks.onAudio!(audio, 'ru');
  });
  expect((mocks.api.mock.calls[1][1].body as FormData).get('conversationId')).toBe('session-first');
});

it('does not autoplay a late voice response after the conversation page is unmounted', async () => {
  let complete: ((result: unknown) => void) | undefined;
  mocks.api.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const view = renderConversation();
  const onAudio = mocks.onAudio!;
  let submitted: Promise<void>;
  act(() => {
    submitted = onAudio(new Blob(['recorded audio'], { type: 'audio/webm' }), 'uz');
  });
  expect(mocks.api).toHaveBeenCalledWith('/api/conversations/voice', expect.anything());
  view.unmount();
  await act(async () => {
    complete!({ conversation, message });
    await submitted!;
  });
  expect(mocks.speechPlay).not.toHaveBeenCalled();
});

it('does not autoplay a late typed response after navigating away', async () => {
  let complete: ((result: unknown) => void) | undefined;
  mocks.api.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const view = renderConversation();
  fireEvent.change(screen.getByRole('textbox', { name: 'Suhbat xabari' }), {
    target: { value: 'Salom' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Xabarni tarjima qilib yuborish' }));
  view.unmount();
  await act(async () => {
    complete!({ conversation, message });
  });
  expect(mocks.speechPlay).not.toHaveBeenCalled();
});
