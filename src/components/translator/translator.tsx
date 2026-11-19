'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Clipboard,
  Copy,
  Heart,
  Languages,
  LoaderCircle,
  Mic,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SpeechButton } from '@/components/ui/speech-button';
import { api, copy } from '@/lib/client';
import { languages, opposite, swapTranslation, type Language, type Translation } from '@/types';
import { useRecorder } from '@/hooks/use-recorder';
import { usePreferences } from '@/hooks/use-preferences';
import { useSpeech } from '@/hooks/use-speech';
import { phraseTranslation } from '@/lib/phrase-translation';
const formSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Tarjima uchun matn kiriting.')
    .max(5000, '5000 belgidan oshmasin.'),
});
export function Translator() {
  const [preferences] = usePreferences();
  const [sourceLang, setSourceLang] = useState<Language | null>(null);
  const lang = sourceLang || preferences.sourceLang;
  const [tone, setTone] = useState<'casual' | 'formal'>('casual');
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [displayResult, setDisplayResult] = useState('');
  const [resultSource, setResultSource] = useState<'ai' | 'phrasebook'>('ai');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const requestId = useRef({ value: 0 });
  const mounted = useRef(true);
  const speech = useSpeech();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: '' },
  });
  const text = useWatch({ control: form.control, name: 'text' }) || '';
  // Hydrate a one-shot navigation payload from external sessionStorage after SSR.
  useEffect(() => {
    const sequence = requestId.current;
    mounted.current = true;
    const reuse = sessionStorage.getItem('dava-reuse');
    if (reuse) {
      try {
        const data = JSON.parse(reuse);
        if (typeof data.text === 'string') form.setValue('text', data.text.slice(0, 5000));
        // External navigation state is intentionally hydrated once after SSR.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (data.sourceLang === 'uz' || data.sourceLang === 'ru') setSourceLang(data.sourceLang);
      } catch {}
      sessionStorage.removeItem('dava-reuse');
    }
    return () => {
      mounted.current = false;
      sequence.value++;
    };
  }, [form]);
  async function submit(values: { text: string }) {
    if (busy) return;
    const prepared = phraseTranslation(values.text, lang, tone);
    if (!navigator.onLine && !prepared) {
      setError(
        'AI tarjima uchun internetga ulaning. Offline iboralar kutubxonasidan foydalanishingiz mumkin.',
      );
      return;
    }
    speech.stop();
    if (prepared) {
      setDisplayResult(prepared);
      setTranslation(null);
      setResultSource('phrasebook');
    } else {
      setDisplayResult('');
      setResultSource('ai');
    }
    if (!navigator.onLine && prepared) {
      setError('');
      return;
    }
    const current = ++requestId.current.value;
    setError('');
    setBusy(true);
    try {
      const result = await api<Translation>('/api/translate', {
        method: 'POST',
        body: JSON.stringify({ text: values.text, sourceLang: lang, tone }),
      });
      if (!mounted.current || current !== requestId.current.value) return;
      setTranslation(result);
      setResultSource(result.source || 'ai');
      setDisplayResult(result.translatedText);
      void queryClient.invalidateQueries({ queryKey: ['history'] });
      if (preferences.autoplay) void speech.play(result.translatedText, result.targetLang);
    } catch (e) {
      if (mounted.current && current === requestId.current.value)
        setError(e instanceof Error ? e.message : 'Tarjima bajarilmadi.');
    } finally {
      if (mounted.current && current === requestId.current.value) setBusy(false);
    }
  }
  const recorder = useRecorder((transcript, language) => {
    setSourceLang(language);
    form.setValue('text', transcript.slice(0, 5000), { shouldValidate: true });
    setTranslation(null);
    setDisplayResult('');
  });
  async function favorite() {
    if (!translation || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      const current = translation.favorites?.[0];
      if (current) {
        await api(`/api/favorites/${current.id}`, { method: 'DELETE' });
        setTranslation({ ...translation, favorites: [] });
      } else {
        const item = await api<{ id: string }>('/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ translationId: translation.id }),
        });
        setTranslation({ ...translation, favorites: [{ id: item.id }] });
      }
      void queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFavoriteBusy(false);
    }
  }
  const locked = busy || recorder.busy;
  return (
    <section className="panel translator-panel" aria-labelledby="translator-title">
      <div className="panel-header">
        <div className="section-title">
          <span className="section-icon">
            <Languages size={19} />
          </span>
          <h2 id="translator-title">Tezkor tarjima</h2>
          <span className="pill">
            {displayResult && resultSource === 'phrasebook' ? 'Tayyor ibora' : 'AI yordamida'}
          </span>
        </div>
        <label className="tone-select">
          <span>Uslub:</span>
          <select
            aria-label="Tarjima uslubi"
            value={tone}
            disabled={locked}
            onChange={(e) => setTone(e.target.value as typeof tone)}
          >
            <option value="casual">Kundalik</option>
            <option value="formal">Rasmiy</option>
          </select>
        </label>
      </div>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(submit)(event);
        }}
      >
        <div className="translation-languages">
          <button
            type="button"
            disabled={locked}
            className="language-label"
            onClick={() => {
              setSourceLang(opposite(lang));
              setDisplayResult('');
              setTranslation(null);
            }}
          >
            <span className={`flag flag-${lang}`} />
            {languages[lang]}
            <span className="muted">⌄</span>
          </button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={locked}
            aria-label="Tillar va matnlarni almashtirish"
            onClick={() => {
              const swapped = swapTranslation(text, displayResult, lang);
              setSourceLang(swapped.sourceLang);
              form.setValue('text', swapped.sourceText);
              setDisplayResult(swapped.translatedText);
              setTranslation(null);
              speech.stop();
            }}
          >
            <ArrowLeftRight size={17} />
          </Button>
          <div className="language-label">
            <span className={`flag flag-${opposite(lang)}`} />
            {languages[opposite(lang)]}
          </div>
        </div>
        <div className="translation-grid">
          <div className="source-box">
            <label htmlFor="source-text" className="sr-only">
              Tarjima qilinadigan matn
            </label>
            <textarea
              id="source-text"
              maxLength={5000}
              placeholder={
                lang === 'uz'
                  ? 'Nima demoqchisiz? Shu yerga yozing...'
                  : 'Введите текст на русском языке...'
              }
              {...form.register('text', {
                onChange: () => {
                  setTranslation(null);
                  setDisplayResult('');
                },
              })}
              disabled={locked}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void form.handleSubmit(submit)();
                }
              }}
            />
            {text && !locked && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="clear-source"
                aria-label="Matnni tozalash"
                onClick={() => {
                  form.setValue('text', '');
                  setDisplayResult('');
                  setTranslation(null);
                  speech.stop();
                }}
              >
                <X size={16} />
              </Button>
            )}
            <div className="text-toolbar">
              <div className="actions">
                <Button
                  type="button"
                  variant={recorder.state === 'recording' ? 'destructive' : 'ghost'}
                  size="icon"
                  aria-label={
                    recorder.state === 'recording' ? 'Yozuvni to‘xtatish' : 'Mikrofondan yozish'
                  }
                  disabled={busy || recorder.state === 'processing'}
                  onClick={() =>
                    recorder.state === 'recording' ? recorder.stop() : void recorder.start(lang)
                  }
                >
                  {recorder.state === 'processing' ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : recorder.state === 'recording' ? (
                    <Square size={17} />
                  ) : (
                    <Mic size={19} />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Buferdan matn qo‘yish"
                  disabled={locked}
                  onClick={async () => {
                    try {
                      const value = await navigator.clipboard.readText();
                      form.setValue('text', value.slice(0, 5000));
                      setTranslation(null);
                      setDisplayResult('');
                    } catch {
                      toast.error('Buferga ruxsat berilmadi. Ctrl+V orqali matn qo‘ying.');
                    }
                  }}
                >
                  <Clipboard size={18} />
                </Button>
              </div>
              <small>{text.length.toLocaleString()} / 5 000</small>
            </div>
          </div>
          <div className="target-box" aria-live="polite" aria-busy={busy}>
            {busy && !displayResult ? (
              <div className="translation-loading">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
                <span>
                  <Sparkles size={16} /> Ma’nosini saqlab tarjima qilinmoqda...
                </span>
              </div>
            ) : displayResult ? (
              <p className="translated-text" lang={opposite(lang)}>
                {displayResult}
              </p>
            ) : (
              <div className="translation-placeholder">
                <span>
                  <Sparkles size={24} />
                </span>
                <p>Tarjimangiz shu yerda paydo bo‘ladi</p>
                <small>So‘zlar emas, ma’nolarni bog‘laymiz.</small>
              </div>
            )}
            <div className="text-toolbar">
              <SpeechButton text={displayResult} language={opposite(lang)} />
              <div className="actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!displayResult}
                  aria-label="Tarjimani nusxalash"
                  onClick={async () => {
                    try {
                      await copy(displayResult);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!translation || favoriteBusy}
                  aria-label={
                    translation?.favorites?.length
                      ? 'Sevimlilardan olib tashlash'
                      : 'Sevimlilarga qo‘shish'
                  }
                  aria-pressed={!!translation?.favorites?.length}
                  onClick={() => void favorite()}
                >
                  <Heart
                    size={18}
                    className={translation?.favorites?.length ? 'heart-filled' : ''}
                  />
                </Button>
              </div>
            </div>
          </div>
        </div>
        {recorder.state === 'recording' && (
          <div className="recording-status" role="status">
            <span className="recording-dot" /> Yozilmoqda: {recorder.seconds}s / 60s{' '}
            <span className="meter">
              <i style={{ width: `${Math.max(3, recorder.level * 100)}%` }} />
            </span>
            <small>4 MB gacha</small>
          </div>
        )}
        {(error || recorder.error || form.formState.errors.text) && (
          <div className="inline-error" role="alert">
            {error || recorder.error || form.formState.errors.text?.message}
          </div>
        )}
        {recorder.state === 'transcribed' && (
          <p className="hint transcript-hint">
            Ovoz matnga aylantirildi. Matnni tahrirlab, tarjima qiling.
          </p>
        )}
        <div className="translator-footer">
          <span>
            <span className="tiny-sparkle">✦</span> Tabiiy va kontekstga mos tarjima{' '}
            <kbd>Ctrl ↵</kbd>
          </span>
          <Button type="submit" disabled={locked || !text.trim()}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}Tarjima
            qilish <ArrowRight size={17} />
          </Button>
        </div>
      </form>
      <span className="sr-only">
        Talaffuz sun’iy intellekt yoki qurilmadagi sintezlangan ovoz orqali yaratiladi.
      </span>
      {speech.error && (
        <p role="status" className="inline-error">
          {speech.error}
        </p>
      )}
    </section>
  );
}
