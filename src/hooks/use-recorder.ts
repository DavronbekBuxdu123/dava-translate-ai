'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import type { Language } from '@/types';
export type RecordingState =
  'idle' | 'recording' | 'processing' | 'transcribed' | 'translated' | 'error';
export function useRecorder(
  onTranscript: (text: string, language: Language) => void | Promise<void>,
  options: { onAudio?: (audio: Blob, language: Language) => Promise<void> } = {},
) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<Language>('uz');
  const active = useRef(false);
  const mounted = useRef(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const frame = useRef<number>(0);
  const callback = useRef(onTranscript);
  const audioCallback = useRef(options.onAudio);
  useEffect(() => {
    audioCallback.current = options.onAudio;
  }, [options.onAudio]);
  useEffect(() => {
    callback.current = onTranscript;
  }, [onTranscript]);
  function cleanup() {
    if (timer.current) clearInterval(timer.current);
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
    stream.current = null;
    active.current = false;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      cleanup();
    };
  }, []);
  async function start(lang: Language) {
    if (active.current) return;
    active.current = true;
    setError('');
    setLanguage(lang);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      active.current = false;
      setError(
        'Brauzeringiz mikrofon yozuvini qo‘llamaydi. Matn kiriting yoki HTTPS orqali oching.',
      );
      setState('error');
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        active.current = false;
        return;
      }
      stream.current = media;
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const recording = new MediaRecorder(
        media,
        mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined,
      );
      recorder.current = recording;
      const chunks: Blob[] = [];
      let size = 0;
      let tooLarge = false;
      recording.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          size += event.data.size;
          if (size > 4 * 1024 * 1024) {
            tooLarge = true;
            if (recording.state === 'recording') recording.stop();
          }
        }
      };
      recording.onerror = () => {
        cleanup();
        if (mounted.current) {
          setError('Ovoz yozishda xato. Mikrofonni tekshiring.');
          setState('error');
        }
      };
      recording.onstop = async () => {
        cleanup();
        if (!mounted.current) return;
        setLevel(0);
        if (tooLarge || !size) {
          setState('error');
          setError(
            tooLarge
              ? 'Audio 4 MB limitidan oshdi. Qisqaroq gapiring.'
              : 'Audio yozilmadi. Qayta urinib ko‘ring.',
          );
          return;
        }
        active.current = true;
        setState('processing');
        try {
          const blob = new Blob(chunks, { type: recording.mimeType || 'audio/webm' });
          if (audioCallback.current) {
            await audioCallback.current(blob, lang);
            if (mounted.current) setState('translated');
            return;
          }
          const form = new FormData();
          const ext = blob.type.includes('mp4')
            ? 'm4a'
            : blob.type.includes('ogg')
              ? 'ogg'
              : 'webm';
          form.append('audio', blob, `speech.${ext}`);
          form.append('language', lang);
          const result = await api<{ text: string }>('/api/transcribe', {
            method: 'POST',
            body: form,
          });
          if (!mounted.current) return;
          setState('transcribed');
          await callback.current(result.text, lang);
        } catch (e) {
          if (mounted.current) {
            setError(e instanceof Error ? e.message : 'Transkripsiya amalga oshmadi.');
            setState('error');
          }
        } finally {
          active.current = false;
        }
      };
      recording.start(250);
      setSeconds(0);
      setState('recording');
      const started = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 60 && recording.state === 'recording') recording.stop();
      }, 250);
      try {
        const context = new AudioContext();
        audioContext.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 64;
        context.createMediaStreamSource(media).connect(analyser);
        const values = new Uint8Array(analyser.frequencyBinCount);
        const animate = () => {
          if (!mounted.current || recording.state !== 'recording') return;
          analyser.getByteFrequencyData(values);
          setLevel(values.reduce((a, b) => a + b, 0) / values.length / 255);
          frame.current = requestAnimationFrame(animate);
        };
        animate();
      } catch {
        /* Recording works even if live metering is unavailable. */
      }
    } catch (e) {
      cleanup();
      setState('error');
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.'
          : 'Mikrofon topilmadi yoki boshqa dastur band qilgan.',
      );
    }
  }
  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }
  return {
    state,
    seconds,
    level,
    error,
    language,
    start,
    stop,
    busy: state === 'recording' || state === 'processing',
  };
}
