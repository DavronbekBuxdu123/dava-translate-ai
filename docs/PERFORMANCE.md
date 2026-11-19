# Tarjima kechikishi: o‘lchov va optimizatsiyalar

## Jonli boshlang‘ich o‘lchov

2026-11-19 kuni mavjud `dava-translate-ai-vmh9.vercel.app` deploymentiga yangi mehmon sessiyasi bilan qisqa UZ→RU matn yuborildi. Bu bitta kuzatuv, SLA yoki o‘rtacha ko‘rsatkich emas.

| So‘rov               | To‘liq javob | Server bosqichlari                                             |
| -------------------- | -----------: | -------------------------------------------------------------- |
| Yangi matn, Gemini   |    21 660 ms | session 1 497 ms; lookup 42 ms; provider 18 124 ms; save 55 ms |
| Xuddi shu matn, kesh |       544 ms | session 30 ms; lookup 7 ms; AI chaqirilmadi                    |

Yana bir yangi matn so‘rovi 8 680 ms dan keyin `AI_UNAVAILABLE` qaytardi; muvaffaqiyatsiz so‘rov tezlashish natijasi sifatida hisoblanmaydi. Bu testlarda muhitdagi provider kaliti o‘qilmadi yoki chiqarilmadi: saytdagi haqiqiy API endpoint ishlatildi. Provayderning kutishi, vaqtinchalik xatolari, tarmoq, region va cold start javob vaqtiga ta’sir qiladi.

## O‘zgargan yo‘llar

- **Avtomatik ovozli suhbat:** oldin audio → STT AI → matn → tarjima AI ketma-ketligi bor edi. `TRANSCRIPTION_PROVIDER` va `TRANSLATION_PROVIDER` ikkalasi Gemini bo‘lib, modellari ham bir xil bo‘lsa, `/api/conversations/voice` bitta multimodal AI so‘rovida asl transcript va tarjimani oladi. Audio modelining javobi Zod bilan tekshiriladi; til va tone saqlanadi. Keyin session/message saqlanadi. TTS baribir alohida audio xizmati, lekin matn uning tugashini kutmay ko‘rinadi.
- **Birinchi matnli suhbat xabari:** alohida session yaratish HTTP so‘rovi olib tashlandi. `/api/conversations/messages` AI muvaffaqiyatidan keyin session va birinchi message’ni bir server so‘rovida yaratadi. AI ishlamasa bo‘sh session yaratilmaydi. «Yangi suhbat»ni qo‘lda bosish imkoniyati saqlangan.
- **Mavjud suhbatlar:** ownership va message count bir lookup orqali olinadi. Har xabardan keyingi ortiqcha count olib tashlandi. Begona guest, ended session va 300 message cheklovlari saqlanadi.
- **Rate limit:** guest/IP tekshiruvlari parallel ishlaydi. Umumiy kunlik AI byudjeti faqat ikkalasi ruxsat bergandan keyin hisoblanadi. Himoya yoki timeout xatosida provider chaqirilmaydi. Paid path uchta ketma-ket tarmoq kutishidan ikkita fazaga tushadi; aniq millisekund Upstash masofasiga bog‘liq.
- **Tayyor iboralar:** yozilgan matn mavjud 100 iboradan biriga aniq mos kelsa, tarjimon javobni lokal dataset’dan darhol ko‘rsatadi. «Tayyor ibora» deb ochiq belgilanadi, AI javobi deb ko‘rsatilmaydi. Backend ham aynan shu matching’ni mustaqil bajaradi; client bergan arbitrary tarjimaga ishonmaydi. Onlayn bo‘lsa tarixga keyin saqlanadi; offline ham shu ma’lum ibora ko‘rinadi. Faqat apostrof turi, harf registri, bo‘sh joy va oxirgi tinish belgisi normallashtiriladi; o‘xshash gaplar taxminan almashtirilmaydi. Rasmiy tone uchun ham odatdagi AI ishlaydi.

## Nimalar o‘zgarmagan

Yangi, oldin uchramagan matn hali ham Gemini javobini kutadi; «har bir gap bir zumda» degan kafolat yo‘q. Maxsus boshqa provider/model tanlangan bo‘lsa ovozli suhbat uning tanlovini hurmat qilib avvalgi transcribe → translate yo‘lidan foydalanadi. `autoTranslate=false` rejimida transcript’ni ko‘rib/tahrirlab, qo‘lda yuborish saqlangan. TTS ovoz yaratish vaqti, mikrofon permission, foydalanuvchi interneti alohida omillar.

## Tekshirish

`Server-Timing` header’lari tarjima, transkripsiya, yangi suhbat va combined voice endpointlarda session/lookup/provider/save fazalarini beradi. DevTools → Network → tegishli API → Timing/Headers orqali qaysi bosqich uzunligini tekshiring. Body’da audio yoki kalitni ulashish shart emas.

Deploy yangi bo‘lsa `X-Dava-Performance: combined-voice-v1` header’i bor. GitHub yangi build Ready bo‘lgach brauzerni Ctrl+Shift+R orqali yangilang. Yangi kutubxona/API kaliti, npm dependency yoki Prisma migration talab qilinmaydi.

Testlar timer/gate bilan mustaqil tekshiruvlar parallel boshlanganini, Gemini ovoz yo‘li bitta provider request qilganini, birinchi suhbat bitta HTTP request qilganini va tayyor ibora server javobidan oldin ko‘ringanini tekshiradi. Browser testlaridagi AI mock’lar faqat test execution uchun; production’da fake provider mavjud emas. Combined ovozning haqiqiy tezligi va sifati odam nutqi bilan alohida tekshirilishi kerak.
