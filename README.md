# DAVA Translate AI

O‘zbekcha ↔ ruscha AI tarjimon, navbatli ovozli suhbat va 100 ta offline sayohat iborasi. Next.js App Router frontend va backendni bitta loyihada birlashtiradi. Target hosting: **Vercel + Neon PostgreSQL**.

## Ishga tushirish

Node.js 22.12+ yoki 24 LTS, npm va PostgreSQL kerak.

```bash
git clone https://github.com/DavronbekBuxdu123/dava-translate-ai.git
cd dava-translate-ai
npm ci
cp .env.example .env
# .env ichiga o‘z servis kalitlaringizni kiriting
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Brauzerda http://localhost:3000 ni oching. `.env` Git’ga kiritilmaydi. Kalitlarni chatga, commitga yoki `NEXT_PUBLIC_*` o‘zgaruvchisiga yozmang.

**Servis kalitlarisiz:** UI, mavzu, lokal sozlamalar va iboralar ishlaydi. Baza ulanmaganida tarix/suhbat/API aniq xato qaytaradi. Tanlangan tarjima provayderining kaliti yo‘q bo‘lsa tarjima ishlamaydi; soxta natija berilmaydi. Gemini matn tarjimasi uchun OpenAI kaliti talab qilinmaydi. **OpenAI API billing ChatGPT Plus obunasidan alohida.**

## Gemini bilan lokal tarjimani ulash

Google AI Studio’dan olingan kalitni faqat kompyuteringizdagi `.env`ga kiriting:

```env
TRANSLATION_PROVIDER=gemini
GEMINI_API_KEY=haqiqiy_kalitingiz
GEMINI_TRANSLATION_MODEL=gemini-3.5-flash-lite
```

Neon `DATABASE_URL` va `DIRECT_URL` qiymatlarini saqlang. `npm run db:migrate` oldin bajarilgan bo‘lishi kerak. So‘ng serverni to‘xtatib, `npm run dev` bilan qayta yoqing. Gemini matn tarjimasi tezkor tarjimon va suhbatdagi matn xabarlarida ishlaydi. Kalit faqat Google API’ga serverdagi HTTP header orqali yuboriladi, brauzerga berilmaydi. Javob JSON schema va Zod bilan tekshiriladi. 25 soniya timeout; boshqa provayderga avtomatik pullik fallback yo‘q.

**Mikrofon transkripsiyasi va server AI talaffuzi hozircha OpenAI’da qoladi.** OpenAI balansisiz matn yozib tarjima qiling. Qurilmada ruscha voice mavjud bo‘lsa, ruscha eshittirish OpenAI’siz ishlaydi. Gemini bepul kvotasi hisob, region va modelga bog‘liq; mavjud kvotani [AI Studio](https://aistudio.google.com/) orqali tekshiring. `429` kvota tugashi yoki so‘rovlar tezligi limitini bildirishi mumkin.

Avval `.env`ga `GEMINI_TRANSLATION_MODEL=gemini-2.5-flash` yozgan bo‘lsangiz, uni `gemini-3.5-flash-lite`ga yangilang. Google hujjatlarida 2.5 Flash deprecated deb ko‘rsatilgan; yangi default amaldagi Flash-Lite modelidir. [Model](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite) va [kvota/narxlar](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite) hisobingiz uchun tekshiriladi.

Mavjud lokal nusxani yangilash (PowerShell’da ham birma-bir):

```bash
git pull --ff-only
npm ci
npm run dev
```

Bu Gemini yangilanishida yangi paket yoki schema migration yo‘q; `npm ci` majburiy emas, lekin lock faylga mos muhitni qayta tiklaydi. Git lokal `.env`ni almashtirmaydi. `.env.example`ni yana `.env`ga ko‘chirib, o‘z kalitlaringizni ustidan yozmang. Lokal kod o‘zgarishlari sabab pull rad qilinsa, ularni o‘chirib yubormasdan avval ko‘rib chiqing.

`TRANSLATION_PROVIDER=openai` eski tarjima provayderini tanlaydi; o‘zgaruvchi umuman yo‘q bo‘lsa ham eski OpenAI yo‘li saqlanadi. Provider yoki model almashtirilganda tarjima keshi alohida yuritiladi. Barcha AI endpointlar production’da Upstash bilan himoyalanishi shart, Gemini bepul kvota ishlatsa ham.

## Tayyor funksiyalar

- Kontekstni saqlovchi server AI tarjimasi: UZ/RU, kundalik/rasmiy uslub, Zod structured output, Ctrl+Enter, ikki taraflama swap, copy/paste, 5000 belgi limiti, 5 daqiqalik aynan bir xil so‘rov keshi.
- Haqiqiy mikrofon: MediaRecorder, ruxsat xatolari, audio darajasi, 60 soniya va 4 MB limit, tahrirlanadigan transkript. Audio DAVA serverida doimiy saqlanmaydi.
- Ruscha qurilma ovozi yoki server AI TTS. O‘zbekcha uchun faqat qurilmada haqiqiy `uz` ovoz mavjud bo‘lsa ijro etiladi; yashirin ruscha/inglizcha fallback yo‘q. Play/pause/replay, tezlik va xato holatlari.
- Navbatli push-to-talk suhbat: ikkita til mikrofoni, matn yuborish, sessiyalar, tugatish, replay/copy, xabarlarni tasdiq bilan tozalash. Bu simultaneous streaming emas.
- PostgreSQL tarix va tarjima sevimlilari: qidirish, til/sana filtri (UTC kuni), sahifalash, qayta ishlatish, o‘chirish. Suhbatlar alohida o‘chiriladi.
- 10 kategoriya × 10 UZ–RU ibora, qidirish, audio, copy va lokal saqlangan iboralar. Iboralar sevimlilari shu sahifada; tarjima sevimlilari alohida sahifada.
- Light/dark/system theme, asosiy til, avtomatik ovoz/sohbat tarjimasi, lokal preferences.
- PWA manifest va 192/512 ikonka. Alohida minimal offline ilova qobig‘i va to‘liq iboralar kutubxonasi. Xususiy API javoblari, audio yoki RSC payload cache qilinmaydi.

## Muhit o‘zgaruvchilari

| O‘zgaruvchi                  | Vazifasi                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Neon pooled runtime connection string, `sslmode=require` bilan                    |
| `DIRECT_URL`                 | Neon direct connection, migrations uchun. Bo‘sh bo‘lsa `DATABASE_URL` ishlatiladi |
| `TRANSLATION_PROVIDER`       | `gemini` yoki `openai`; o‘zgaruvchi yo‘q bo‘lsa `openai`                          |
| `GEMINI_API_KEY`             | Google AI Studio server kaliti, Gemini tarjima uchun                              |
| `GEMINI_TRANSLATION_MODEL`   | Default `gemini-3.5-flash-lite`                                                   |
| `OPENAI_API_KEY`             | Faqat serverda ishlatiladigan OpenAI API kaliti                                   |
| `OPENAI_TRANSLATION_MODEL`   | Default `gpt-4.1-mini`, structured output qo‘llashi kerak                         |
| `OPENAI_TRANSCRIPTION_MODEL` | Default `gpt-4o-mini-transcribe`                                                  |
| `OPENAI_TTS_MODEL`           | Default `gpt-4o-mini-tts`                                                         |
| `OPENAI_TTS_VOICE`           | Default `coral`, tanlangan model qo‘llaydigan voice                               |
| `UPSTASH_REDIS_REST_URL`     | Shared rate limiting uchun Upstash REST URL                                       |
| `UPSTASH_REDIS_REST_TOKEN`   | Upstash REST token                                                                |
| `APP_ORIGIN`                 | Ilovaning aniq tashqi origin’i, masalan `https://dava.example.com`                |
| `AI_DAILY_LIMIT`             | Barcha mehmonlar uchun umumiy pullik so‘rov limiti, default 500/kun               |

**Production’da Upstash juftligi sozlanmasa AI endpointlar 503 bilan yopiladi.** Bu xavfsiz default. Development’da xotiradagi 30/min cheklov ishlaydi. Production’da sessiya va platforma IP xeshi bo‘yicha 30/min, shuningdek cookie almashtirishdan mustaqil umumiy kunlik AI byudjeti ishlatiladi. Upstash timeout yoki xatosida ham AI so‘rovlariga ruxsat berilmaydi. Bu anonim MVP; katta trafikda provayder spending limit, kuzatuv va qo‘shimcha bot himoyasini yoqing.

Runtime Prisma 7 `@prisma/adapter-pg` orqali PostgreSQL’ga ulanadi. Migration URL `prisma.config.ts` orqali olinadi. Pool maksimumi har instance uchun 5; Neon pooled endpoint tavsiya qilinadi.

## Neon sozlash

1. [Neon Console](https://console.neon.tech) ichida loyiha yarating, Vercel region’iga yaqin region tanlang.
2. **Connect → Connection string** orqali pooled URL’ni oling va `DATABASE_URL` ga kiriting.
3. Pooling o‘chirilgan direct URL’ni `DIRECT_URL` ga kiriting. URL tarkibidagi credential’larni oshkor qilmang.
4. Schema’ni qo‘llang:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`seed` bazaga ulanishni tekshiradi. Sun’iy mehmon tarixi yaratmaydi; iboralar `src/data/phrases.json` ichida saqlanadi. Schema o‘zgartirganda development bazasida `npm run db:dev` orqali yangi migration yarating; production’da faqat `db:migrate` ishlating.

## Vercel orqali deploy

1. Vercel’da **Add New → Project → Import Git Repository** orqali shu repo’ni tanlang.
2. Framework: **Next.js**. Root: repo ildizi. Node.js: 24.x yoki mos 22.x.
3. Install command: `npm ci`. Build: `npm run build`. Output directory: Next.js default.
4. Yuqoridagi environment qiymatlarini Vercel Environment Variables’da kiriting. `APP_ORIGIN` ga yakuniy `https://...vercel.app` manzilini yoki custom domain’ni yozing (yo‘l va trailing slash talab qilinmaydi).
5. Baza migration’ini yuqoridagi buyruq bilan deploymentdan oldin bir marta bajaring. Build har safar client’ni generate qiladi; production schema’ni yashirincha o‘zgartirmaydi.
6. **Deploy** qiling. Preview deploymentlar uchun `APP_ORIGIN` ni o‘sha preview origin’iga mos sozlang; production origin preview’da mutating API’larni ruxsat bermaydi.
7. Custom domain uchun **Project Settings → Domains** orqali domain qo‘shing, Vercel ko‘rsatgan DNS yozuvini kiriting. HTTPS faollashgach `APP_ORIGIN` ni yangilang va redeploy qiling.

Server AI route’lar `maxDuration = 60`; OpenAI chaqiriqlari 25 soniya timeout va maksimum bitta transient retry bilan bajariladi. Gemini chaqirig‘i ham 25 soniyada cheklanadi, avtomatik retry yo‘q. Hosting plan’ingizdagi runtime muddatini tekshiring. Audio 4 MB (multipart bilan taxminan 4.21 MB) dan kichik; Vercel 4.5 MB request limitiga sig‘adi. Server audio fayl saqlamaydi. HTTPS yoki localhost mikrofon/clipboard uchun shart.

## Xavfsizlik va maxfiylik

- Guest identity: cryptographically random 256-bit opaque token; HttpOnly, SameSite=Lax, production Secure cookie. Bazada tokenning SHA-256 xeshi saqlanadi. Client bergan `userId` qabul qilinmaydi.
- Barcha tarix/sevimli/suhbat amallari guest ownership bilan cheklangan. Begona ID uchun 404.
- Mutating API same-origin tekshiruvi; JSON va audio hajm/type validatsiyasi. Xatolarda credential yoki provayder ichki exception’i chiqmaydi. AI matni HTML sifatida render qilinmaydi.
- Cookie o‘chirilsa eski tarixga qayta bog‘lanib bo‘lmaydi. Bu authsiz MVP; keyingi akkaunt migratsiyasi uchun `GuestSession` alohida model sifatida ajratilgan.
- Tarjima matni tanlangan Gemini yoki OpenAI provayderiga yuboriladi; audio transkripsiya va server TTS OpenAI orqali bajariladi. Gemini uchun [Google API terms](https://ai.google.dev/gemini-api/terms) amal qiladi, bepul va pullik xizmatdagi ma’lumotlardan foydalanish shartlari farq qiladi. DAVA raw audio’ni doimiy saqlamaydi; provayderning [data controls](https://platform.openai.com/docs/guides/your-data) va [privacy](https://openai.com/policies/privacy-policy/) siyosati amal qiladi.
- OpenAI va Upstash billing limitlarini servislarning o‘zida ham o‘rnating. Loglarga matn, audio, connection string yoki API kalit yozmang.

## Testlar

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Oldindan o‘rnatilgan Chromium uchun:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

`PLAYWRIGHT_BASE_URL` mavjud serverni test qilish uchun ishlatilishi mumkin. U o‘rnatilmasa Playwright dev serverni o‘zi ishga tushiradi. Mock tarjima faqat Playwright testining network interception’ida mavjud; production bundle’da test provider yoki fake AI branch yo‘q. Missing-provider smoke testi env sozlanmagan serverni kutadi; jonli credential bilan bu testni alohida test muhitida ishga tushiring.

Unit/integration testlar validation, swap, favorite toggle, qidirish, guest cookie, ownership, route scoping, xatolar, mikrofon lifecycle va production rate limit default’ini tekshiradi. PostgreSQL migration constraint testlari PGlite’da ishlaydi; bu haqiqiy Neon ulanishi sinovi o‘rnini bosmaydi.

## Jonli qabul sinovi

Deploy’dan keyin alohida tekshiring:

- [ ] Neon migration’lari qo‘llangan, guest A va B tarixlari ajratilgan.
- [ ] Haqiqiy tanlangan provayder kaliti bilan UZ→RU va RU→UZ tarjima: sonlar, ism, rasmiy/kundalik kontekst.
- [ ] Desktop Chrome va Android Chrome’da haqiqiy o‘zbek/rus nutqi bilan mikrofon, rad etilgan permission va 60s limit.
- [ ] Transkripsiyada Uzbek ISO til kodi provayder tomonidan rad qilinsa til parametrsiz fallback; noto‘g‘ri til majburlanmaydi.
- [ ] Ruscha browser/AI talaffuz, autoplay bloklansa qo‘lda replay, mavjud `uz` voice va yo‘q `uz` voice holatlari.
- [ ] Upstash rate limit va provider billing limiti, HTTP xatolari.
- [ ] 375px, planshet va desktop; HTTPS; PWA o‘rnatish; qayta ochganda offline iboralar.

Kalitlarsiz bajarilgan testlar jonli AI sifati, haqiqiy mikrofon yoki Neon production ulanishi sinovi deb hisoblanmaydi. Deploy avtomatik bajarilmagan: ushbu repo Vercel import va environment sozlash uchun tayyorlanadi.

## Tuzilma

```text
src/app/                 Sahifalar va route handlers
src/components/          Layout, tarjimon, suhbat, tarix, iboralar, shadcn uslubidagi UI
src/hooks/               Recorder, speech va local preferences
src/lib/ai/              Alohida translation/transcription/speech providerlari
src/lib/auth/            Guest cookie va ownership
src/lib/db/              Prisma adapter va lazy database client
src/lib/rate-limit/      Shared va development throttling
src/lib/validation/      Zod contractlar
src/data/                100 ta lokal ibora
prisma/                  Schema, migration, seed
public/offline/          Mustaqil offline qobiq va iboralar nusxasi
tests/                   Unit, integration va Playwright
```

Iboralarni o‘zgartirganda `src/data/phrases.json` va `public/offline/phrases.json` bir xil bo‘lishi kerak; test bu tenglikni tekshiradi. Offline asset’lar o‘zgarsa `public/sw.js` cache versiyasini oshiring.

## Rasmiy API manbalari

- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [OpenAI structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Speech to text](https://platform.openai.com/docs/guides/speech-to-text)
- [Text to speech](https://platform.openai.com/docs/guides/text-to-speech)
- [Prisma + Neon](https://www.prisma.io/docs/orm/overview/databases/neon)
- [Vercel functions limits](https://vercel.com/docs/functions/limitations)

Dizayn: talabdagi ranglar va dashboard kompozitsiyasi, lokal Sankt-Peterburg SVG manzarasi. Reference rasm joriy suhbatga kelmagani sabab aynan rasmdagi piksel mosligi da’vo qilinmaydi.
