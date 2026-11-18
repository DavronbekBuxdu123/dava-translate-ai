'use client';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Laptop, Moon, Sun, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences, defaults } from '@/hooks/use-preferences';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/dialog';
import { api } from '@/lib/client';
const subscribe = () => () => {};
export function SettingsView() {
  const [preferences, update] = usePreferences();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">SIZGA MOS DAVA</span>
          <h1>Sozlamalar</h1>
          <p>Muloqot tajribangizni o‘zingizga moslang.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Ko‘rinish va til</h2>
          <p className="muted">Ko‘zingiz uchun qulay ko‘rinishni tanlang.</p>
          <div className="theme-options">
            {[
              { value: 'light', label: 'Yorug‘', icon: Sun },
              { value: 'dark', label: 'Qorong‘i', icon: Moon },
              { value: 'system', label: 'Tizim', icon: Laptop },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                aria-pressed={mounted && theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon size={23} />
                {label}
              </button>
            ))}
          </div>
          <label className="setting-row">
            <span>
              <strong>Asosiy tarjima yo‘nalishi</strong>
              <small>Tarjimon ochilgandagi manba tili.</small>
            </span>
            <select
              value={preferences.sourceLang}
              onChange={(e) => update({ sourceLang: e.target.value as 'uz' | 'ru' })}
            >
              <option value="uz">UZ → RU</option>
              <option value="ru">RU → UZ</option>
            </select>
          </label>
        </section>
        <section className="panel settings-panel">
          <h2>Ovoz va suhbat</h2>
          <p className="muted">
            AI ovozi serverda yaratiladi; qurilma ovozi alohida zaxira sifatida tanlanadi.
          </p>
          <label className="setting-row">
            <span>
              <strong>Tarjimani avtomatik eshittirish</strong>
              <small>Natija kelgach talaffuz qilish.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={preferences.autoplay}
              onChange={(e) => update({ autoplay: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>Ovoz tezligi</strong>
              <small>Qo‘llab-quvvatlanadigan ijro uchun.</small>
            </span>
            <select
              value={preferences.speed}
              onChange={(e) => update({ speed: Number(e.target.value) })}
            >
              {[0.75, 1, 1.25, 1.5].map((speed) => (
                <option key={speed} value={speed}>
                  {speed}×
                </option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            <span>
              <strong>Suhbatda avtomatik tarjima</strong>
              <small>Yozuv tugashi bilan xabar yuboriladi.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={preferences.autoTranslate}
              onChange={(e) => update({ autoTranslate: e.target.checked })}
            />
          </label>
        </section>
        <section className="panel settings-panel privacy-settings" id="privacy">
          <span className="privacy-icon">
            <ShieldCheck size={24} />
          </span>
          <h2>Maxfiyligingiz haqida</h2>
          <p>
            Akkaunt talab qilinmaydi. Tasodifiy mehmon identifikatori HttpOnly cookie’da saqlanadi.
            Tarjima tarixi va suhbatlar shu identifikatorga bog‘langan.
          </p>
          <p>
            Cookie’ni o‘chirsangiz, avvalgi yozuvlaringizga kirish tiklanmaydi. Umumiy kompyuterda
            ishlagach tarix va suhbatlarni alohida o‘chiring.
          </p>
          <p>
            Tarjima matni tanlangan Gemini yoki OpenAI xizmatiga yuboriladi. Audio transkripsiyasi
            tanlangan Gemini yoki OpenAI orqali bajariladi. AI talaffuzi uchun matn tanlangan Gemini
            yoki OpenAI ovoz xizmatiga yuboriladi. DAVA audio yozuvlarni doimiy saqlamaydi.
            Provayder ma’lumotlarni o‘z siyosatiga binoan qayta ishlaydi.
          </p>
          <p>
            Oflayn keshda faqat ommaviy iboralar va ilova qobig‘i saqlanadi; shaxsiy API javoblari
            keshlanmaydi.
          </p>
          <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noreferrer">
            OpenAI maxfiylik siyosati ↗
          </a>
          <br />
          <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">
            Gemini ma’lumotlardan foydalanish shartlari ↗
          </a>
        </section>
        <section className="panel settings-panel">
          <h2>Ma’lumotlarni boshqarish</h2>
          <p className="muted">O‘chirish amallarini ortga qaytarib bo‘lmaydi.</p>
          <div className="data-actions">
            <Button
              variant="secondary"
              onClick={() => {
                update(defaults);
                setTheme('system');
                toast.success('Mahalliy sozlamalar tiklandi.');
              }}
            >
              Sozlamalarni tiklash
            </Button>
            <Confirm
              title="Tarixni o‘chirasizmi?"
              description="Barcha tarjimalar va ularga tegishli sevimlilar o‘chiriladi. Suhbatlarni suhbat sahifasidan o‘chiring."
              onConfirm={() =>
                void api('/api/history', { method: 'DELETE' })
                  .then(() => toast.success('Tarix o‘chirildi.'))
                  .catch((e) => toast.error(e.message))
              }
            >
              <Button variant="destructive">
                <Trash2 size={17} /> Tarjima tarixini o‘chirish
              </Button>
            </Confirm>
          </div>
        </section>
      </div>
    </>
  );
}
