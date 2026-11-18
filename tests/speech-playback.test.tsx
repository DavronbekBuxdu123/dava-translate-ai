import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSpeech } from '@/hooks/use-speech';
import { clearSpeechCache } from '@/lib/speech-cache';
const fetchMock = vi.fn(),
  speak = vi.fn(),
  play = vi.fn(async () => {});
class TestAudio {
  playbackRate = 1;
  onended = null;
  onerror = null;
  play = play;
  pause = vi.fn();
}
beforeEach(() => {
  clearSpeechCache();
  fetchMock.mockReset();
  play.mockClear();
  speak.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('Audio', TestAudio);
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [{ lang: 'ru-RU', name: 'Robot' }],
    speak,
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(public text: string) {}
    },
  );
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL() {
        return 'blob:test';
      }
      static revokeObjectURL() {}
    },
  );
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => vi.unstubAllGlobals());
it('uses server AI even when a device voice exists', async () => {
  fetchMock.mockResolvedValue(
    new Response(new Blob(['wav'], { type: 'audio/wav' }), {
      headers: { 'Content-Type': 'audio/wav', 'X-Dava-Speech-Provider': 'gemini' },
    }),
  );
  const { result } = renderHook(() => useSpeech());
  await act(async () => {
    await result.current.play('Привет', 'ru');
  });
  expect(fetchMock).toHaveBeenCalledWith('/api/speech', expect.anything());
  expect(speak).not.toHaveBeenCalled();
  expect(play).toHaveBeenCalled();
  expect(result.current.source).toBe('ai');
});
it('does not silently replace failed AI speech with a robot voice', async () => {
  fetchMock.mockResolvedValue(
    Response.json({ error: { message: 'Kvota tugadi' } }, { status: 503 }),
  );
  const { result } = renderHook(() => useSpeech());
  await act(async () => {
    await result.current.play('Привет', 'ru');
  });
  expect(result.current.error).toBe('Kvota tugadi');
  expect(speak).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.playDevice('Привет', 'ru');
  });
  expect(speak).toHaveBeenCalled();
  expect(result.current.source).toBe('device');
});
it('never uses a Russian voice for an Uzbek device fallback', async () => {
  const { result } = renderHook(() => useSpeech());
  await act(async () => {
    await result.current.playDevice('Salom', 'uz');
  });
  expect(speak).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.current.error).toContain('o‘zbekcha');
});

it('does not switch to browser voice when Windows reports offline', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  const { result } = renderHook(() => useSpeech());
  await act(async () => {
    await result.current.play('Привет', 'ru');
  });
  expect(speak).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.current.error).toContain('internet');
});

it('replays identical audio without another provider request', async () => {
  fetchMock.mockResolvedValue(
    new Response(new Blob(['wav']), {
      headers: { 'Content-Type': 'audio/wav', 'X-Dava-Speech-Provider': 'gemini' },
    }),
  );
  const { result } = renderHook(() => useSpeech());
  await act(async () => {
    await result.current.play('Привет', 'ru');
  });
  await act(async () => {
    await result.current.play('Привет', 'ru');
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(result.current.provider).toBe('Gemini');
});
