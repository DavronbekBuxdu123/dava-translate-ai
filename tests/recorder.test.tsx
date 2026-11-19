import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useRecorder } from '@/hooks/use-recorder';
vi.mock('@/lib/client', () => ({ api: vi.fn(async () => ({ text: 'Salom' })) }));
it('shows a clear error if microphone access is denied', async () => {
  vi.stubGlobal('MediaRecorder', class {});
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
    },
  });
  const { result } = renderHook(() => useRecorder(vi.fn()));
  await act(async () => {
    await result.current.start('uz');
  });
  expect(result.current.state).toBe('error');
  expect(result.current.error).toContain('ruxsat');
  vi.unstubAllGlobals();
});
it('records a real Blob through processing and transcribed states and releases tracks', async () => {
  const stopTrack = vi.fn(),
    callback = vi.fn();
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['actual bytes'], { type: 'audio/webm' }) });
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', Recorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
  });
  const { result, unmount } = renderHook(() => useRecorder(callback));
  await act(async () => {
    await result.current.start('ru');
  });
  expect(result.current.state).toBe('recording');
  act(() => result.current.stop());
  await waitFor(() => expect(result.current.state).toBe('transcribed'));
  expect(callback).toHaveBeenCalledWith('Salom', 'ru');
  expect(stopTrack).toHaveBeenCalled();
  unmount();
  vi.unstubAllGlobals();
});

it('sends recorded audio to one combined handler without a separate transcription request', async () => {
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['recording'], { type: 'audio/webm' }) });
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', Recorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) },
  });
  const transcript = vi.fn(),
    onAudio = vi.fn(async () => {});
  const { result, unmount } = renderHook(() => useRecorder(transcript, { onAudio }));
  await act(async () => {
    await result.current.start('uz');
  });
  act(() => result.current.stop());
  await waitFor(() => expect(result.current.state).toBe('translated'));
  expect(onAudio).toHaveBeenCalledWith(expect.any(Blob), 'uz');
  expect(transcript).not.toHaveBeenCalled();
  unmount();
  vi.unstubAllGlobals();
});
