// Talks to the actual running Next.js server, so .env/.env.local precedence is identical to the app.
const base = process.env.DAVA_CHECK_URL || 'http://localhost:3000';
const target = new URL(base);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
  throw new Error('Tekshiruv faqat lokal server uchun. DAVA_CHECK_URL localhost bo‘lsin.');
let cookie = '';
async function request(path, init = {}) {
  const started = performance.now();
  const response = await fetch(new URL(path, base), {
    ...init,
    headers: { Origin: target.origin, ...(cookie ? { Cookie: cookie } : {}), ...init.headers },
    signal: AbortSignal.timeout(65000),
  });
  const nextCookie = response.headers.get('set-cookie');
  if (nextCookie) cookie = nextCookie.split(';')[0];
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    return {
      ok: false,
      code: result.error?.code || `HTTP_${response.status}`,
      ms: Math.round(performance.now() - started),
    };
  }
  return { ok: true, response, ms: Math.round(performance.now() - started) };
}
try {
  const status = await request('/api/ai/status');
  if (!status.ok)
    throw new Error(
      `Diagnostika: ${status.code}. npm run dev serveri va yangi kod ishlayotganini tekshiring.`,
    );
  const { data } = await status.response.json();
  console.log('DAVA server versiyasi:', data.revision);
  console.table(
    ['translation', 'transcription', 'speech'].map((name) => ({
      funksiya: name,
      provider: data[name].provider,
      model: data[name].model,
      kalit: data[name].keyConfigured ? 'BOR' : 'YO‘Q',
      holat: 'hali jonli tekshirilmagan',
    })),
  );
  console.log('Baza:', data.databaseConfigured ? 'sozlangan' : 'YO‘Q');
  if (!process.argv.includes('--live'))
    console.log(
      'Haqiqiy 3 ta AI so‘rovi uchun: npm run ai:check -- --live (kvota sarflanadi, bitta sinov tarjimasi tarixga yoziladi).',
    );
  else {
    const rows = [];
    const translation = await request('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Salom, metro qayerda?', sourceLang: 'uz', tone: 'casual' }),
    });
    rows.push({
      funksiya: 'Tarjima',
      holat: translation.ok ? 'OK' : translation.code,
      millis: translation.ms,
      provider: translation.ok
        ? translation.response.headers.get('x-dava-ai-provider')
        : data.translation.provider,
      timing: translation.ok ? translation.response.headers.get('server-timing') : '',
    });
    if (translation.ok) await translation.response.json();
    const speech = await request('/api/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Salom, metro qayerda?', language: 'uz' }),
    });
    rows.push({
      funksiya: 'AI ovozi',
      holat: speech.ok ? 'OK' : speech.code,
      millis: speech.ms,
      provider: speech.ok
        ? speech.response.headers.get('x-dava-speech-provider')
        : data.speech.provider,
    });
    if (speech.ok) {
      const blob = await speech.response.blob();
      const form = new FormData();
      form.append('audio', blob, 'check.wav');
      form.append('language', 'uz');
      const transcript = await request('/api/transcribe', { method: 'POST', body: form });
      rows.push({
        funksiya: 'Transkripsiya',
        holat: transcript.ok ? 'OK' : transcript.code,
        millis: transcript.ms,
        provider: data.transcription.provider,
      });
      if (transcript.ok) await transcript.response.json();
    } else
      rows.push({
        funksiya: 'Transkripsiya',
        holat: 'SINOV O‘TKAZILMADI: audio olinmadi',
        provider: data.transcription.provider,
      });
    console.table(rows);
    if (rows.some((row) => row.holat !== 'OK')) process.exitCode = 1;
    console.log(
      'Bu natija faqat shu server/kalit uchun. Ovoz sifatini ilovada alohida tinglang. Kalitlar, matn natijalari va audio bu buyruqda chiqarilmaydi yoki diskka yozilmaydi.',
    );
  }
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith('Diagnostika:')
      ? error.message
      : 'Lokal serverga ulanib bo‘lmadi. Avval boshqa terminalda npm run dev ishga tushiring.',
  );
  process.exitCode = 1;
}
