import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Globe2,
  MapPin,
  MessagesSquare,
  Mic,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Utensils,
  Hotel,
  Siren,
  Lightbulb,
} from 'lucide-react';
import { Translator } from '@/components/translator/translator';
import { Button } from '@/components/ui/button';
const categories = [
  {
    label: 'Transport',
    icon: TrainFront,
    id: 'transport',
    text: 'Yo‘lni oson toping',
    color: 'blue',
  },
  { label: 'Mehmonxona', icon: Hotel, id: 'hotel', text: 'Qulay joylashing', color: 'purple' },
  {
    label: 'Restoran',
    icon: Utensils,
    id: 'restaurant',
    text: 'Bemalol buyurtma bering',
    color: 'orange',
  },
  {
    label: 'Yordam',
    icon: Siren,
    id: 'emergency',
    text: 'Zarur paytda yoningizda',
    color: 'green',
  },
];
export default function Home() {
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">DAVA BILAN YANGI IMKONIYATLAR</span>
          <h1>
            Salom! Bugun qayerga yo‘l olamiz? <span className="wave">✦</span>
          </h1>
          <p>Yangi joylar, yangi insonlar. Til to‘sig‘ini bizga qoldiring.</p>
        </div>
        <span className="language-pair">
          <span className="flag flag-uz" /> UZ <span>↔</span> RU <span className="flag flag-ru" />
        </span>
      </div>
      <section className="hero">
        <div
          className="hero-art"
          role="img"
          aria-label="Sankt-Peterburg me’morchiligi va Neva daryosining chizilgan manzarasi"
        />
        <div className="hero-content">
          <span className="hero-tag">
            <Sparkles size={13} /> O‘ZINGIZNI ERKIN HIS QILING
          </span>
          <h2>
            Til to‘siqsiz.
            <br />
            <em>Imkoniyatlar cheksiz.</em>
          </h2>
          <p>
            O‘zbekcha o‘ylang, ruscha muloqot qiling.
            <br />
            Har bir suhbatda ishonchli hamrohingiz.
          </p>
          <Button asChild>
            <Link href="/conversation">
              Suhbatni boshlash <ArrowUpRight size={17} />
            </Link>
          </Button>
        </div>
        <div className="hero-location">
          <MapPin size={14} />
          <span>Sankt-Peterburg, Rossiya</span>
        </div>
        <div className="floating-phrase">
          <span className="flag flag-uz" />
          <span>
            Assalomu alaykum!<small>Здравствуйте!</small>
          </span>
          <span className="floating-check">
            <Check size={14} />
          </span>
        </div>
      </section>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <Translator />
          <section className="conversation-preview panel">
            <div className="conversation-preview-icon">
              <MessagesSquare size={27} />
              <span className="online-dot" />
            </div>
            <div>
              <div className="section-title">
                <h2>Gapiring. Tushuning. Muloqot qiling.</h2>
                <span className="pill purple-pill">Ovozli suhbat</span>
              </div>
              <p>Navbat bilan gapiring — DAVA ikkala tomonni ham tarjima qiladi.</p>
              <div className="mini-features">
                <span>
                  <Mic size={13} /> Ovozdan matnga
                </span>
                <span>
                  <Globe2 size={13} /> Ikki tomonlama tarjima
                </span>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/conversation">
                Boshlash <ArrowRight size={16} />
              </Link>
            </Button>
          </section>
          <section className="phrases-preview">
            <div className="section-heading">
              <div>
                <h2>Har bir safar uchun kerakli so‘zlar</h2>
                <p>O‘zingizni mahalliy aholi kabi his qiling.</p>
              </div>
              <Link href="/phrases">
                Barcha iboralar <ChevronRight size={16} />
              </Link>
            </div>
            <div className="category-grid">
              {categories.map(({ label, icon: Icon, id, text, color }) => (
                <Link href={`/phrases?category=${id}`} key={id} className="category-card">
                  <span className={`category-icon ${color}`}>
                    <Icon size={23} />
                  </span>
                  <h3>{label}</h3>
                  <p>{text}</p>
                  <span className="category-count">
                    10 ta ibora <ArrowUpRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="panel tips-panel">
            <div className="section-title">
              <span className="tips-icon">
                <Lightbulb size={19} />
              </span>
              <h2>Yaxshi bilib oling</h2>
            </div>
            <p className="tip-eyebrow">KUNLIK MULOQOT UCHUN</p>
            <h3>
              Birgina «пожалуйста»
              <br /> ko‘p eshiklarni ochadi.
            </h3>
            <p>
              Rus tilida «iltimos» va «arzimaydi» uchun bitta so‘z ishlatiladi. Muloyimlik har doim
              yordam beradi.
            </p>
            <div className="word-example">
              <strong lang="ru">Пожалуйста</strong>
              <span>Iltimos / Arzimaydi</span>
            </div>
            <Link href="/phrases?category=greetings">
              Ko‘proq iboralar <ArrowRight size={15} />
            </Link>
          </section>
          <section className="privacy-panel">
            <span className="privacy-icon">
              <ShieldCheck size={22} />
            </span>
            <h3>Muloqotingiz — shaxsiy</h3>
            <p>
              Tarix shu brauzerga bog‘lanadi. Cookie o‘chirilsa, eski yozuvlarga kirish yo‘qoladi.
            </p>
            <Link href="/settings#privacy">
              Maxfiylik haqida <ArrowUpRight size={14} />
            </Link>
          </section>
          <section className="offline-tip">
            <BookOpen size={20} />
            <div>
              <strong>Internet yo‘qmi?</strong>
              <p>Sayohat iboralarini oflayn ham ko‘rishingiz mumkin.</p>
              <Link href="/phrases">Kutubxonaga o‘tish →</Link>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
