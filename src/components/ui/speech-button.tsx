'use client';
import { Volume2, Pause, Play, LoaderCircle, Square } from 'lucide-react';
import { useSpeech } from '@/hooks/use-speech';
import type { Language } from '@/types';
import { Button } from './button';
export function SpeechButton({ text, language }: { text: string; language: Language }) {
  const speech = useSpeech();
  return (
    <span className="speech-control">
      <Button
        variant="ghost"
        size="icon"
        title="AI ovozida eshitish"
        aria-label={
          speech.state === 'playing'
            ? 'Ovozni pauza qilish'
            : speech.state === 'paused'
              ? 'Ovozni davom ettirish'
              : 'Talaffuzni eshitish'
        }
        disabled={!text || speech.state === 'loading'}
        onClick={() =>
          speech.state === 'playing' || speech.state === 'paused'
            ? speech.toggle()
            : void speech.play(text, language)
        }
      >
        {speech.state === 'loading' ? (
          <LoaderCircle className="spin" />
        ) : speech.state === 'playing' ? (
          <Pause />
        ) : speech.state === 'paused' ? (
          <Play />
        ) : (
          <Volume2 />
        )}
      </Button>
      {speech.state !== 'idle' && speech.state !== 'loading' && (
        <Button variant="ghost" size="icon" aria-label="Ovozni to‘xtatish" onClick={speech.stop}>
          <Square />
        </Button>
      )}
      {speech.state !== 'idle' && speech.state !== 'loading' && (
        <small className="speech-source">
          {speech.source === 'ai' ? 'AI ovozi' : 'Qurilma ovozi'}
        </small>
      )}
      {speech.error && (
        <span role="status" className="speech-error">
          {speech.error}
          <button
            type="button"
            className="device-voice-fallback"
            onClick={() => void speech.playDevice(text, language)}
          >
            Qurilma ovozida eshitish
          </button>
        </span>
      )}
    </span>
  );
}
