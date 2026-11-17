'use client';
import { useEffect, useRef, useState } from 'react';
import type { Language } from '@/types';
import { usePreferences } from './use-preferences';
export function useSpeech() {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [error, setError] = useState('');
  const [source, setSource] = useState<'ai' | 'device' | null>(null);
  const [preferences] = usePreferences();
  const audio = useRef<HTMLAudioElement | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const url = useRef('');
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  function stop() {
    generation.current++;
    request.current?.abort();
    request.current = null;
    audio.current?.pause();
    audio.current = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    utterance.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = '';
    setState('idle');
  }
  useEffect(
    () => () => {
      generation.current++;
      request.current?.abort();
      audio.current?.pause();
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  async function play(text: string, language: Language, mode: 'ai' | 'device' = 'ai') {
    stop();
    const current = generation.current;
    setError('');
    setState('loading');
    setSource(null);
    try {
      const useDevice = mode === 'device' || !navigator.onLine;
      let voices =
        useDevice && typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [];
      if (useDevice && !voices.length && typeof speechSynthesis !== 'undefined') {
        await new Promise<void>((resolve) => {
          const done = () => {
            clearTimeout(timeout);
            speechSynthesis.removeEventListener('voiceschanged', done);
            resolve();
          };
          const timeout = setTimeout(done, 700);
          speechSynthesis.addEventListener('voiceschanged', done);
        });
        voices = speechSynthesis.getVoices();
      }
      if (current !== generation.current) return;
      const voice = voices.find((v) => v.lang.toLowerCase().split(/[-_]/)[0] === language);
      if (voice) {
        const speech = new SpeechSynthesisUtterance(text);
        utterance.current = speech;
        speech.voice = voice;
        speech.lang = voice.lang;
        speech.rate = preferences.speed;
        speech.onend = () => {
          if (current === generation.current) setState('idle');
        };
        speech.onerror = () => {
          if (current === generation.current) {
            setState('idle');
            setError('Qurilma ovozni ijro eta olmadi.');
          }
        };
        setSource('device');
        speechSynthesis.speak(speech);
        setState('playing');
        return;
      }
      if (useDevice)
        throw new Error(
          `Qurilmangizda ${language === 'uz' ? 'o‘zbekcha' : 'ruscha'} ovoz mavjud emas. Matn tarjimasidan foydalanishingiz mumkin.`,
        );
      if (text.length > 1000) throw new Error('AI ovozi uchun 1000 belgigacha matn tanlang.');
      const controller = new AbortController();
      request.current = controller;
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Ovoz yaratilmadi.');
      }
      const blob = await response.blob();
      if (current !== generation.current) return;
      url.current = URL.createObjectURL(blob);
      const player = new Audio(url.current);
      audio.current = player;
      player.playbackRate = preferences.speed;
      player.onended = () => setState('idle');
      player.onerror = () => {
        setState('idle');
        setError('Audio ijro etilmadi.');
      };
      setSource('ai');
      await player.play();
      if (current !== generation.current) {
        player.pause();
        return;
      }
      setState('playing');
    } catch (e) {
      if (current !== generation.current) return;
      setError(e instanceof Error ? e.message : 'Ovoz ijro etilmadi.');
      setState('idle');
    }
  }
  function toggle() {
    if (state === 'playing') {
      if (audio.current) audio.current.pause();
      else speechSynthesis.pause();
      setState('paused');
    } else if (state === 'paused') {
      if (audio.current) void audio.current.play();
      else speechSynthesis.resume();
      setState('playing');
    }
  }
  return {
    state,
    error,
    source,
    play,
    playDevice: (text: string, language: Language) => play(text, language, 'device'),
    stop,
    toggle,
  };
}
