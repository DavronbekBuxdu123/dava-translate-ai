'use strict';
const labels = {
  greetings: 'Salomlashish',
  transport: 'Metro va transport',
  hotel: 'Mehmonxona',
  restaurant: 'Restoran',
  shopping: 'Do‘kon',
  directions: 'Manzil so‘rash',
  university: 'Universitet',
  documents: 'Hujjatlar',
  emergency: 'Favqulodda vaziyat',
  everyday: 'Kundalik suhbat',
};
const root = document.querySelector('#phrases'),
  search = document.querySelector('#search'),
  category = document.querySelector('#category'),
  status = document.querySelector('#status'),
  favoritesButton = document.querySelector('#favorites');
let phrases = [],
  favorites = [],
  onlyFavorites = false;
try {
  const stored = JSON.parse(localStorage.getItem('dava-phrase-favorites') || '[]');
  favorites = Array.isArray(stored) ? stored : [];
} catch {}
for (const [id, label] of Object.entries(labels)) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = label;
  category.append(option);
}
const normalize = (text) => text.toLowerCase().replace(/[‘’ʻʼ`']/g, '');
function button(text, label, click) {
  const element = document.createElement('button');
  element.textContent = text;
  element.setAttribute('aria-label', label);
  element.onclick = click;
  return element;
}
function render() {
  root.replaceChildren();
  const q = normalize(search.value.trim());
  const filtered = phrases.filter(
    (p) =>
      (category.value === 'all' || p.category === category.value) &&
      (!onlyFavorites || favorites.includes(p.id)) &&
      normalize(p.uz + ' ' + p.ru).includes(q),
  );
  document.querySelector('#count').textContent = filtered.length + ' ta ibora';
  for (const p of filtered) {
    const card = document.createElement('article'),
      small = document.createElement('small'),
      h2 = document.createElement('h2'),
      translation = document.createElement('p'),
      actions = document.createElement('div');
    small.textContent = labels[p.category];
    h2.textContent = p.uz;
    h2.lang = 'uz';
    translation.textContent = p.ru;
    translation.lang = 'ru';
    actions.className = 'actions';
    const favorite = button(
      favorites.includes(p.id) ? '♥ Saqlangan' : '♡ Saqlash',
      'Iborani saqlash',
      () => {
        favorites = favorites.includes(p.id)
          ? favorites.filter((id) => id !== p.id)
          : [...favorites, p.id];
        try {
          localStorage.setItem('dava-phrase-favorites', JSON.stringify(favorites));
        } catch {
          status.textContent = 'Brauzer saqlashga ruxsat bermadi.';
        }
        render();
      },
    );
    favorite.setAttribute('aria-pressed', String(favorites.includes(p.id)));
    actions.append(
      favorite,
      button('♫ Eshitish', 'Ruscha talaffuzni eshitish', () => {
        if (!('speechSynthesis' in window)) {
          status.textContent = 'Brauzer ovoz sintezini qo‘llamaydi.';
          return;
        }
        const voice = speechSynthesis
          .getVoices()
          .find((v) => v.lang.toLowerCase().startsWith('ru'));
        if (!voice) {
          status.textContent = 'Qurilmada ruscha ovoz mavjud emas. Matnni o‘qishingiz mumkin.';
          return;
        }
        speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(p.ru);
        speech.voice = voice;
        speech.lang = voice.lang;
        speechSynthesis.speak(speech);
      }),
      button('Nusxalash', 'Iborani nusxalash', async () => {
        try {
          await navigator.clipboard.writeText(p.uz + '\n' + p.ru);
          status.textContent = 'Nusxalandi.';
        } catch {
          status.textContent = 'Nusxalashga ruxsat berilmadi.';
        }
      }),
    );
    card.append(small, h2, translation, actions);
    root.append(card);
  }
}
search.addEventListener('input', render);
category.addEventListener('change', render);
favoritesButton.onclick = () => {
  onlyFavorites = !onlyFavorites;
  favoritesButton.setAttribute('aria-pressed', String(onlyFavorites));
  render();
};
if ('speechSynthesis' in window) speechSynthesis.getVoices();
fetch('/offline/phrases.json')
  .then((r) => {
    if (!r.ok) throw Error();
    return r.json();
  })
  .then((data) => {
    phrases = data;
    render();
  })
  .catch(() => {
    status.textContent = 'Kutubxona yuklanmadi. Bir marta internet bilan ochib ko‘ring.';
  });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
