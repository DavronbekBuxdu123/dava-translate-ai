import { Translator } from '@/components/translator/translator';
export const metadata = { title: 'Tezkor tarjima' };
export default function Page() {
  return (
    <div className="focused-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">O‘ZBEKCHA ↔ РУССКИЙ</span>
          <h1>So‘zlaringizga yangi imkoniyat</h1>
          <p>
            Matn yozing yoki mikrofon orqali gapiring. So&apos;zla AI ma’nosini saqlab tarjima
            qiladi.
          </p>
        </div>
      </div>
      <Translator />
      <p className="privacy-note">
        Mikrofon faqat siz bosganingizda ishga tushadi. Audio transkripsiya uchun tanlangan Gemini
        yoki OpenAI xizmatiga yuboriladi va So&apos;zla AI serverida saqlanmaydi. Talaffuz sun’iy
        ovoz yordamida yaratiladi.
      </p>
    </div>
  );
}
