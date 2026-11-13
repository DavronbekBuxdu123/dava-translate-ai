'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCheck,
  Copy,
  History,
  LoaderCircle,
  MessagesSquare,
  Mic,
  Plus,
  Send,
  Square,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, copy } from '@/lib/client';
import { languages, type Conversation, type Language, type Message } from '@/types';
import { usePreferences } from '@/hooks/use-preferences';
import { useRecorder } from '@/hooks/use-recorder';
import { useSpeech } from '@/hooks/use-speech';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/dialog';
import { Empty, ErrorBox } from '@/components/ui/empty';
import { SpeechButton } from '@/components/ui/speech-button';
export function ConversationView() {
  const reducedMotion = useReducedMotion();
  const [preferences] = usePreferences();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sourceLang, setSourceLang] = useState<Language>('uz');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [page, setPage] = useState(1);
  const bottom = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const speech = useSpeech();
  const history = useQuery({
    queryKey: ['conversations', page],
    queryFn: () => api<{ items: Conversation[]; total: number }>(`/api/conversations?page=${page}`),
    enabled: showHistory,
  });
  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'nearest',
    });
  }, [messages]);
  async function createSession() {
    const created = await api<Conversation>('/api/conversations', { method: 'POST' });
    setSession(created);
    setMessages([]);
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    return created;
  }
  async function send(text: string, language: Language) {
    if (!text.trim() || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    speech.stop();
    try {
      const current = session || (await createSession());
      const result = await api<Message>(`/api/conversations/${current.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, sourceLang: language, tone: 'casual' }),
      });
      setMessages((prev) => [...prev, result]);
      setDraft('');
      if (preferences.autoplay) void speech.play(result.translatedText, result.targetLang);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const recorder = useRecorder(async (text, language) => {
    setDraft(text);
    setSourceLang(language);
    if (preferences.autoTranslate) await send(text, language);
  });
  async function action(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    speech.stop();
    try {
      await work();
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const locked = busy || recorder.busy;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">BIR SUHBAT. IKKI TIL.</span>
          <h1>Jonli suhbat</h1>
          <p>Navbatma-navbat gapiring. DAVA eshitadi, tarjima qiladi va talaffuz etadi.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={() => setShowHistory(!showHistory)}>
            <History size={17} /> Suhbatlar
          </Button>
          <Button
            disabled={locked}
            onClick={() =>
              void action(async () => {
                await createSession();
                setDraft('');
              })
            }
          >
            <Plus size={17} /> Yangi suhbat
          </Button>
        </div>
      </div>
      {showHistory && (
        <section className="panel sessions-panel">
          <h2>Oldingi suhbatlar</h2>
          {history.isPending ? (
            <p>Yuklanmoqda...</p>
          ) : history.error ? (
            <ErrorBox message={history.error.message} />
          ) : !history.data?.items.length ? (
            <p className="muted">Hozircha suhbatlar yo‘q.</p>
          ) : (
            <>
              <div className="session-list">
                {history.data.items.map((item) => (
                  <div className="session-row" key={item.id}>
                    <button
                      disabled={locked}
                      onClick={() =>
                        void action(async () => {
                          const data = await api<Conversation>(`/api/conversations/${item.id}`);
                          setSession(data);
                          setMessages(data.messages || []);
                          setDraft('');
                          setShowHistory(false);
                        })
                      }
                    >
                      <MessagesSquare size={18} />
                      <span>
                        {item.title}
                        <small>
                          {new Date(item.createdAt).toLocaleDateString('uz-UZ')} ·{' '}
                          {item.endedAt ? 'Tugatilgan' : 'Faol'}
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                    <Confirm
                      title="Suhbatni o‘chirasizmi?"
                      description="Ushbu suhbat va barcha xabarlari butunlay o‘chiriladi."
                      onConfirm={() =>
                        void action(async () => {
                          await api(`/api/conversations/${item.id}`, { method: 'DELETE' });
                          if (session?.id === item.id) {
                            setSession(null);
                            setMessages([]);
                          }
                        })
                      }
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={locked}
                        aria-label="Suhbatni o‘chirish"
                      >
                        <Trash2 size={17} />
                      </Button>
                    </Confirm>
                  </div>
                ))}
              </div>
              <div className="pagination">
                <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Oldingi
                </Button>
                <span>{page}</span>
                <Button
                  variant="secondary"
                  disabled={page * 20 >= history.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Keyingi
                </Button>
              </div>
            </>
          )}
        </section>
      )}
      <section className="panel conversation-panel">
        <header className="panel-header">
          <div className="section-title">
            <span className="section-icon">
              <MessagesSquare size={20} />
            </span>
            <h2>{session?.endedAt ? 'Tugatilgan suhbat' : 'Suhbat maydoni'}</h2>
            <span className="pill">Navbatli ovozli tarjima</span>
          </div>
          {session && (
            <div className="actions">
              <Confirm
                title="Xabarlarni tozalaysizmi?"
                description="Ushbu suhbatdagi barcha xabarlar o‘chiriladi."
                onConfirm={() =>
                  void action(async () => {
                    await api(`/api/conversations/${session.id}?messagesOnly=true`, {
                      method: 'DELETE',
                    });
                    setMessages([]);
                  })
                }
              >
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={locked || !!session.endedAt || !messages.length}
                  aria-label="Xabarlarni tozalash"
                >
                  <Trash2 size={17} />
                </Button>
              </Confirm>
              <Button
                variant="secondary"
                disabled={locked || !!session.endedAt}
                onClick={() =>
                  void action(async () => {
                    const ended = await api<Conversation>(`/api/conversations/${session.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ action: 'end' }),
                    });
                    setSession(ended);
                  })
                }
              >
                <CheckCheck size={16} /> Tugatish
              </Button>
            </div>
          )}
        </header>
        <div className="chat-messages" aria-live="polite">
          {!messages.length ? (
            <Empty
              title="Muloqot shu yerdan boshlanadi"
              text="Tilni tanlab mikrofonni bosing yoki pastda matn yozing. Yozuvni tugatish uchun yana bosing."
            />
          ) : (
            messages.map((message) => (
              <article key={message.id} className={`message-bubble message-${message.sourceLang}`}>
                <div className="message-meta">
                  <span className={`flag flag-${message.sourceLang}`} />
                  <strong>{languages[message.sourceLang]}</strong>
                  <time>
                    {new Date(message.createdAt).toLocaleTimeString('uz-UZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                <p lang={message.sourceLang}>{message.sourceText}</p>
                <div className="message-translation">
                  <small>{languages[message.targetLang]}</small>
                  <p lang={message.targetLang}>{message.translatedText}</p>
                </div>
                <div className="message-actions">
                  <SpeechButton text={message.translatedText} language={message.targetLang} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xabarni nusxalash"
                    onClick={() =>
                      void copy(message.translatedText)
                        .then(() => toast.success('Nusxalandi'))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </article>
            ))
          )}
          {busy && (
            <div className="processing-message">
              <LoaderCircle className="spin" size={18} /> Suhbat qayta ishlanmoqda...
            </div>
          )}
          <div ref={bottom} />
        </div>
        {error && <ErrorBox message={error} />}{' '}
        {recorder.error && <ErrorBox message={recorder.error} />}{' '}
        {speech.error && (
          <p className="inline-error" role="status">
            {speech.error}
          </p>
        )}
        <div className="conversation-controls">
          <div className="microphone-grid">
            {(['uz', 'ru'] as Language[]).map((language) => (
              <motion.button
                whileTap={{ scale: reducedMotion ? 1 : 0.98 }}
                key={language}
                className={`microphone-card microphone-${language} ${recorder.state === 'recording' && recorder.language === language ? 'is-recording' : ''}`}
                disabled={
                  busy ||
                  recorder.state === 'processing' ||
                  !!session?.endedAt ||
                  (recorder.state === 'recording' && recorder.language !== language)
                }
                onClick={() => {
                  speech.stop();
                  if (recorder.state === 'recording') recorder.stop();
                  else {
                    setSourceLang(language);
                    void recorder.start(language);
                  }
                }}
              >
                <span className="microphone-circle">
                  {recorder.state === 'recording' && recorder.language === language ? (
                    <Square size={23} />
                  ) : recorder.state === 'processing' && recorder.language === language ? (
                    <LoaderCircle className="spin" size={25} />
                  ) : (
                    <Mic size={25} />
                  )}
                </span>
                <span>
                  <strong>{language === 'uz' ? 'O‘zbekcha gapirish' : 'Говорить по-русски'}</strong>
                  <small>
                    {recorder.state === 'recording' && recorder.language === language
                      ? `Yozilmoqda ${recorder.seconds}s / 60s · To‘xtatish`
                      : language === 'uz'
                        ? 'Bosib gapiring • UZ → RU'
                        : 'Нажмите и говорите • RU → UZ'}
                  </small>
                </span>
                <span className={`flag flag-${language}`} />
              </motion.button>
            ))}
          </div>
          <form
            className="conversation-input"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft, sourceLang);
            }}
          >
            <label className="sr-only" htmlFor="chat-language">
              Matn tili
            </label>
            <select
              id="chat-language"
              value={sourceLang}
              disabled={locked}
              onChange={(e) => setSourceLang(e.target.value as Language)}
            >
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
            </select>
            <input
              aria-label="Suhbat xabari"
              placeholder="Yoki shu yerga yozing..."
              maxLength={5000}
              value={draft}
              disabled={locked || !!session?.endedAt}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              disabled={locked || !draft.trim() || !!session?.endedAt}
              aria-label="Xabarni tarjima qilib yuborish"
            >
              <Send size={18} />
            </Button>
          </form>
        </div>
      </section>
      <p className="privacy-note">
        Bu navbatli push-to-talk suhbat: yozuv tugagach tarjima qilinadi. Audio OpenAI’ga
        yuboriladi, DAVA uni doimiy saqlamaydi. Talaffuz sintezlangan ovoz. Avtomatik tarjima va
        ijroni sozlamalardan boshqaring.
      </p>
    </>
  );
}
