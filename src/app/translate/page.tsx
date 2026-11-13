import { Translator } from '@/components/translator/translator';
export const metadata = { title: 'Tezkor tarjima' };
export default function Page() {
  return (
    <div className="focused-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">O‘ZBEKCHA ↔ РУССКИЙ</span>
          <h1>So‘zlaringizga yangi imkoniyat</h1>
          <p>Matn yozing yoki mikrofon orqali gapiring. DAVA ma’nosini saqlab tarjima qiladi.</p>
        </div>
      </div>
      <Translator />
      <p className="privacy-note">
        Mikrofon faqat siz bosganingizda ishga tushadi. Audio transkripsiya uchun OpenAI’ga
        yuboriladi va DAVA serverida saqlanmaydi. Talaffuz sun’iy ovoz yordamida yaratiladi.
      </p>
    </div>
  );
}
