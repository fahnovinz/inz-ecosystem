// Rule-based command interpreter for VRAX World.
// Understands English and Bahasa Indonesia. Runs locally: text in, actions out.
//
// interpret(text, ctx) -> { lang, actions, replies, ask, text }
//   ctx.selected  landmark id the player clicked ("this", "ini")
//   ctx.last      { kind, id } of the last thing changed ("it", "itu")
//   ctx.state     { weather, season, bridges, festival, fires, robbery, ... } summary

const ID_MARKERS = new Set(('bikin buat jadikan jadi tolong dong ya yang ke di dan hujan malam pagi siang sore tutup buka sungai ' +
  'jembatan naikkan turunkan kebakaran bakar rampok taman pasar musim salju badai mendung cerah lampu mati macet ubah ' +
  'hentikan mulai kembali kembalikan semua kedua utara selatan sekolah gudang menara api air banjir padamkan panggil polisi ' +
  'pesta jam pukul lebih cepat lambat jeda lanjut batal ulang sekarang aja kota gerimis senja petang subuh kabut petir ' +
  'lalu terus nyalakan matikan listrik parkiran parkir tempat supaya biar agar deh sih nih kah kok gimana coba')
  .split(' '));
const EN_MARKERS = new Set(('make it the please turn start stop close open reopen raise lower rain night morning bridge river fire ' +
  'rob bank set on of to into and snow storm festival park parking back end put out weather time season power lights ' +
  'traffic fireworks tower let lets now go start show evening noon sunny cloudy foggy both north south').split(' '));

export function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, '')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^a-z0-9.:,;&\s-]/g, ' ')
    .replace(/(^|\s)-(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectLang(text) {
  let id = 0, en = 0;
  for (const w of text.split(' ')) {
    if (ID_MARKERS.has(w)) id++;
    if (EN_MARKERS.has(w)) en++;
    if (/(kan|nya|lah)$/.test(w) && w.length > 5) id += 0.5;
  }
  if (id > en) return 'id';
  if (en > id) return 'en';
  return null;
}

// ---- Phrase matching ---------------------------------------------------------------

function has(c, phrases) {
  for (const p of phrases) if (c.text.includes(` ${p} `)) return p;
  return null;
}
function take(c, phrases) {
  const p = has(c, phrases);
  if (p) c.text = c.text.replace(` ${p} `, ' ~ ');
  return p;
}
function takeAll(c, phrases) {
  let any = null, p;
  while ((p = take(c, phrases))) any = any || p;
  return any;
}

const W = {
  undo: ['undo that', 'undo', 'go back', 'revert', 'urungkan', 'batalkan yang tadi', 'batalkan itu', 'kembalikan yang tadi', 'balikin yang tadi'],
  resetView: ['reset the view', 'reset view', 'reset the camera', 'reset camera', 'default view', 'center the view', 'reset kamera', 'kamera awal', 'tampilan awal', 'kembalikan kamera'],
  reset: ['reset the world', 'reset world', 'reset the town', 'reset the city', 'reset everything', 'start over', 'restart', 'reset', 'mulai ulang', 'ulang dari awal', 'reset kota', 'atur ulang', 'ulangi semua'],
  help: ['what can i do', 'what can i say', 'what can you do', 'help me', 'help', 'commands', 'bantuan', 'tolong bantu', 'bisa apa aja', 'bisa apa', 'perintah apa', 'contoh perintah'],
  showcase: ['play showcase', 'play the showcase', 'showcase', 'show me around', 'give me a tour', 'tour', 'demo', 'tur', 'pamerkan', 'keliling kota', 'jalan jalan'],
  timeLock: ['freeze time', 'stop time', 'stop the clock', 'pause the clock', 'lock the time', 'lock time', 'keep it like this', 'bekukan waktu', 'hentikan waktu', 'kunci waktu', 'waktu berhenti', 'stop waktu'],
  timeUnlock: ['let time run', 'let time pass', 'unfreeze time', 'unlock time', 'resume time', 'start the clock', 'jalankan waktu', 'lanjutkan waktu', 'waktu berjalan', 'buka kunci waktu'],
  pause: ['pause', 'hold on', 'freeze', 'jeda', 'pause dulu', 'berhenti sebentar', 'stop sebentar', 'stop', 'berhenti'],
  resume: ['resume', 'unpause', 'continue', 'play', 'lanjut', 'lanjutkan', 'jalan lagi', 'jalankan lagi'],
  faster: ['faster', 'speed up', 'speed it up', 'fast forward the simulation', 'percepat', 'lebih cepat', 'cepetin', 'ngebut'],
  slower: ['slower', 'slow down', 'normal speed', 'real time', 'perlambat', 'lebih lambat', 'pelan pelan', 'kecepatan normal', 'pelanin'],
  disaster: ['earthquake', 'earthquakes', 'volcano', 'eruption', 'meteor', 'asteroid', 'apocalypse', 'zombie', 'zombies', 'nuke', 'bomb', 'explosion', 'explode', 'blow up', 'godzilla', 'alien', 'aliens',
    'gempa bumi', 'gempa', 'gunung meletus', 'letusan', 'kiamat', 'bom', 'ledakan', 'meledak', 'ledakkan', 'tsunami'],
  windstorm: ['tornado', 'hurricane', 'typhoon', 'cyclone', 'puting beliung', 'angin topan', 'topan', 'angin ribut'],
  extinguish: ['put out the fires', 'put out the fire', 'put the fire out', 'put it out', 'put out', 'extinguish', 'douse', 'stop the fire', 'end the fire', 'call the fire brigade', 'call the firefighters', 'call firefighters', 'call the fire department', 'send the fire trucks', 'send fire trucks', 'send the firefighters',
    'padamkan apinya', 'padamkan api', 'padamkan kebakarannya', 'padamkan kebakaran', 'padamkan', 'matikan apinya', 'matikan api', 'panggil damkar', 'panggil pemadam kebakaran', 'panggil pemadam', 'kirim damkar', 'kirim pemadam', 'hentikan kebakaran', 'hentikan apinya'],
  callPolice: ['call the police', 'call the cops', 'call police', 'panggil polisi', 'lapor polisi', 'telepon polisi'],
  fireworks: ['fireworks', 'firework', 'kembang api', 'petasan', 'pesta kembang api'],
  lightshowOff: ['stop the light show', 'end the light show', 'turn off the tower lights', 'light show off', 'stop the lightshow', 'matikan pertunjukan cahaya', 'hentikan pertunjukan cahaya', 'matikan lampu menara', 'hentikan lightshow', 'matikan lightshow'],
  lightshowOn: ['light show', 'lightshow', 'light up the tower', 'light the tower', 'tower lights', 'laser show', 'pertunjukan cahaya', 'pertunjukan lampu', 'nyalakan menara', 'lampu menara', 'terangi menara', 'menara menyala'],
  blackoutOff: ['restore the power', 'restore power', 'power back on', 'power back', 'turn the power back on', 'turn the power on', 'power on', 'turn the lights back on', 'turn on the lights', 'lights back on', 'lights on', 'end the blackout', 'stop the blackout',
    'nyalakan listrik', 'nyalakan lagi listrik', 'listrik nyala', 'listrik menyala', 'lampu nyala lagi', 'lampu nyala', 'nyalakan lampu', 'lampu hidup', 'hidupkan listrik', 'listrik kembali', 'pulihkan listrik', 'hidupkan lampu'],
  blackoutOn: ['blackout', 'black out', 'power outage', 'power cut', 'power failure', 'cut the power', 'turn off the power', 'lights out', 'turn off the lights', 'no power', 'no electricity',
    'mati lampu', 'padam listrik', 'pemadaman listrik', 'pemadaman', 'listrik mati', 'listrik padam', 'matikan listrik', 'matikan lampu', 'lampu mati', 'byarpet'],
  rushOff: ['less traffic', 'clear the traffic', 'clear traffic', 'end rush hour', 'end the rush hour', 'stop the traffic jam', 'end the traffic jam', 'no traffic', 'fewer cars', 'lancarkan', 'lalu lintas lancar', 'jalan lancar', 'hentikan macet', 'macetnya selesai', 'kurangi mobil', 'udahan macet', 'macet selesai'],
  rushOn: ['rush hour', 'traffic jam', 'gridlock', 'more traffic', 'heavy traffic', 'more cars', 'lots of cars', 'traffic', 'macet total', 'macet', 'kemacetan', 'jam sibuk', 'jam pulang kerja', 'jam berangkat kerja', 'lalu lintas padat', 'banyak mobil', 'jalanan padat'],
  robbery: ['cops and robbers', 'rob', 'robs', 'robbed', 'robbing', 'robbery', 'heist', 'bank job', 'hold up', 'holdup', 'stick up', 'stickup', 'steal', 'steals', 'stealing', 'burglary', 'burgle', 'thief', 'thieves', 'robber', 'robbers', 'crime',
    'rampok', 'merampok', 'rampas', 'perampokan', 'perampok', 'maling', 'curi', 'mencuri', 'pencurian', 'pencuri', 'bobol', 'membobol', 'begal', 'kejahatan'],
  pasarMalam: ['pasar malam'],
  festivalEnd: ['end the festival', 'stop the festival', 'cancel the festival', 'festival is over', 'end the party', 'stop the party', 'end the concert', 'bubarkan festival', 'bubarkan pesta', 'hentikan festival', 'akhiri festival', 'selesaikan festival', 'festival selesai', 'batalkan festival', 'udahan festivalnya', 'tutup festival'],
  festival: ['festival', 'funfair', 'party', 'concert', 'carnival', 'celebration', 'celebrate', 'fest', 'parade', 'gig', 'pesta', 'konser', 'perayaan', 'karnaval', 'acara musik', 'panggung', 'dangdut', 'hajatan'],
  endVerb: ['end', 'stop', 'cancel', 'finish', 'over', 'close', 'shut down', 'no more', 'selesai', 'hentikan', 'akhiri', 'bubarkan', 'batalkan', 'udahan', 'sudahi', 'tutup', 'stop', 'berhenti', 'matikan'],
  bridge: ['bridges', 'bridge', 'crossings', 'crossing', 'jembatan'],
  north: ['north', 'northern', 'upper', 'top', 'steel', 'iron', 'utara', 'atas', 'besi'],
  south: ['south', 'southern', 'lower', 'bottom', 'stone', 'selatan', 'bawah', 'batu'],
  both: ['both', 'all', 'every', 'each', 'semua', 'kedua', 'dua duanya', 'keduanya', 'dua'],
  close: ['close', 'closed', 'shut', 'block', 'blocked', 'barricade', 'seal off', 'seal', 'tutup', 'tutupkan', 'menutup', 'ditutup', 'blokir', 'palang', 'segel'],
  open: ['reopen', 're open', 'open', 'unblock', 'buka lagi', 'buka kembali', 'buka', 'bukakan', 'membuka', 'dibuka'],
  toPark: ['a park', 'park', 'a garden', 'garden', 'green space', 'greenery', 'taman', 'ruang hijau', 'hijau'],
  convert: ['turn', 'make', 'convert', 'transform', 'into', 'replace', 'jadikan', 'ubah', 'ganti', 'jadi', 'menjadi', 'bikin', 'buat'],
  back: ['back', 'restore', 'bring back', 'return', 'kembali', 'kembalikan', 'balikin', 'lagi', 'semula'],
  river: ['water level', 'the river', 'river', 'rivers', 'the water', 'water', 'sungai', 'kali', 'air sungai', 'permukaan air', 'debit air', 'air'],
  flood: ['flood the city', 'flood the town', 'flood everything', 'flood', 'floods', 'flooding', 'banjir bandang', 'banjirkan', 'banjir', 'meluap', 'luapkan'],
  raise: ['raise', 'rise', 'higher', 'increase', 'up', 'lift', 'more', 'naikkan', 'naikin', 'naik', 'tinggikan', 'tambah', 'tambahkan', 'pasang', 'lebih tinggi'],
  lower: ['lower', 'drop', 'reduce', 'decrease', 'down', 'drain', 'dry up', 'dry', 'sink', 'less', 'turunkan', 'turunin', 'turun', 'kurangi', 'surutkan', 'surut', 'keringkan', 'rendahkan', 'lebih rendah'],
  normal: ['back to normal', 'normal level', 'normal', 'usual', 'reset', 'kembali normal', 'normalkan', 'seperti biasa', 'semula'],
  weatherStop: ['stop', 'end', 'no more', 'enough', 'clear up', 'hentikan', 'berhenti', 'stop', 'udahan', 'sudahi', 'reda', 'redakan', 'tanpa'],
  snow: ['snowfall', 'snowing', 'snowy', 'snow', 'blizzard', 'turun salju', 'hujan salju', 'bersalju', 'salju'],
  storm: ['thunderstorm', 'stormy', 'storm', 'thunder', 'lightning', 'windy', 'wind', 'gale', 'hujan badai', 'hujan petir', 'badai', 'petir', 'guntur', 'angin kencang', 'berangin', 'angin'],
  rain: ['raining', 'rainy', 'rains', 'rain', 'showers', 'shower', 'drizzle', 'downpour', 'wet', 'hujan deras', 'gerimis', 'hujan', 'rintik rintik', 'rintik', 'basah'],
  fog: ['foggy', 'fog', 'misty', 'mist', 'hazy', 'haze', 'smog', 'berkabut', 'kabut'],
  cloudy: ['overcast', 'cloudy', 'clouds', 'cloud', 'grey sky', 'gray sky', 'gloomy', 'mendung', 'berawan', 'awan', 'kelabu'],
  clear: ['clear the weather', 'clear skies', 'clear sky', 'clear', 'sunny', 'sunshine', 'sun', 'fair weather', 'nice weather', 'good weather', 'blue sky', 'cuaca cerah', 'cerah', 'terang', 'panas terik', 'cuaca bagus', 'langit biru'],
  winter: ['wintertime', 'winter', 'wintry', 'christmas', 'xmas', 'freezing', 'frosty', 'frost', 'icy', 'chilly', 'cold', 'musim dingin', 'dingin', 'natal', 'membeku', 'beku'],
  summer: ['summertime', 'summer', 'heatwave', 'heat wave', 'heat', 'hot', 'musim panas', 'musim kemarau', 'kemarau', 'panas', 'gerah'],
  spring: ['springtime', 'spring', 'cherry blossoms', 'cherry blossom', 'blossoms', 'blossom', 'blooming', 'bloom', 'musim semi', 'musim bunga', 'bunga mekar', 'sakura', 'mekar', 'semi'],
  autumn: ['autumnal', 'autumn', 'fall season', 'fall leaves', 'fall colors', 'fall colours', 'fall foliage', 'in fall', 'halloween', 'musim gugur', 'daun gugur', 'gugur'],
  later: ['fast forward', 'skip ahead', 'move forward', 'a few hours later', 'later', 'majukan waktu', 'percepat waktu', 'lompat waktu', 'beberapa jam lagi', 'nanti'],
  earlier: ['go back in time', 'rewind', 'earlier', 'mundurkan waktu', 'mundur waktu', 'lebih awal', 'lebih pagi'],
  morning: ['early morning', 'morning', 'dawn', 'sunrise', 'daybreak', 'breakfast', 'pagi hari', 'pagi', 'subuh', 'fajar', 'matahari terbit', 'sarapan'],
  noon: ['broad daylight', 'noon', 'midday', 'afternoon', 'daytime', 'lunchtime', 'lunch', 'day', 'siang hari', 'siang', 'tengah hari', 'makan siang'],
  sunset: ['golden hour', 'sunset', 'dusk', 'evening', 'twilight', 'sundown', 'sore hari', 'sore', 'senja', 'petang', 'matahari terbenam', 'magrib', 'maghrib'],
  night: ['after dark', 'late night', 'midnight', 'nighttime', 'tonight', 'night', 'dark', 'tengah malam', 'larut malam', 'malam hari', 'malam', 'gelap'],
  fireOn: ['set fire to', 'set on fire', 'on fire', 'set fire', 'burn down', 'burning', 'burns', 'burn', 'blaze', 'ablaze', 'arson', 'flames', 'inferno', 'torch', 'fire',
    'kebakaran', 'terbakar', 'membakar', 'dibakar', 'bakarlah', 'bakar', 'nyalakan api', 'api'],
  greet: ['hello', 'hi', 'hey', 'halo', 'hai', 'hallo', 'hola', 'yo', 'pagi pagi', 'assalamualaikum'],
  thanks: ['thank you', 'thanks', 'thx', 'terima kasih', 'makasih', 'trims', 'nuhun'],
  about: ['who are you', 'what is this', 'what is vrax world', 'about', 'apa ini', 'siapa kamu', 'tentang'],
  it: ['it', 'itu', 'that', 'tadi', 'nya'],
  thisRef: ['this one', 'this', 'here', 'ini', 'di sini', 'sini'],
};

// Buildings and places, longest names first so "rumah sakit" wins over "rumah".
const PLACES = [
  ['vrax-tower', ['vrax tower', 'the tower', 'tower', 'menara vrax', 'menara', 'gedung vrax', 'vrax']],
  ['bank', ['vault bank', 'the vault', 'vault', 'the bank', 'bank']],
  ['school', ['the school', 'school', 'sekolah', 'sekolahan']],
  ['warehouse', ['old warehouse', 'the warehouse', 'warehouse', 'gudang tua', 'gudang']],
  ['market', ['market hall', 'market square', 'the market', 'market', 'pasar']],
  ['hospital', ['the hospital', 'hospital', 'rumah sakit']],
  ['cinema', ['movie theater', 'movie theatre', 'the cinema', 'cinema', 'movies', 'bioskop']],
  ['hotel', ['hotel nirwana', 'the hotel', 'hotel']],
  ['police', ['police station', 'kantor polisi']],
  ['fire-station', ['fire station', 'firehouse', 'pos pemadam', 'pemadam kebakaran', 'damkar']],
  ['cafe', ['kopi vrax', 'coffee shop', 'cafe', 'kafe', 'kedai kopi']],
  ['toko-buku', ['book shop', 'bookshop', 'bookstore', 'toko buku']],
  ['bengkel', ['bengkel jaya', 'bengkel', 'repair shop', 'workshop', 'garage']],
  ['apartemen-samudra', ['apartemen samudra']],
  ['apartemen-nusa', ['apartemen nusa']],
  ['apartemen-pelangi', ['apartemen pelangi']],
  ['kantor-arunika', ['kantor arunika']],
  ['kantor-lazuardi', ['kantor lazuardi']],
  ['house', ['a house', 'some house', 'the house', 'house', 'home', 'sebuah rumah', 'rumah warga', 'rumah']],
  ['@parking', ['riverside parking', 'the parking lot', 'parking lot', 'the car park', 'car park', 'the parking', 'parking', 'tempat parkir', 'parkiran', 'lahan parkir', 'parkir']],
  ['@park', ['taman vrax', 'central park', 'city park', 'the park', 'taman kota']],
  ['@warung', ['warung', 'food stalls', 'street food', 'angkringan']],
  ['@pier', ['the pier', 'pier', 'dermaga', 'the docks', 'docks']],
].flatMap(([id, names]) => names.map((n) => [n, id])).sort((a, b) => b[0].length - a[0].length);

const BUILDING_IDS = new Set(PLACES.map((p) => p[1]).filter((id) => !id.startsWith('@')));

const NUM_WORDS = {
  half: 0.5, 'a half': 0.5, setengah: 0.5, 'a quarter': 0.25, seperempat: 0.25,
  a: 1, an: 1, one: 1, satu: 1, se: 1, two: 2, dua: 2, three: 3, tiga: 3, 'one and a half': 1.5, 'satu setengah': 1.5,
};

function parseAmount(text) {
  // "by 50 cm", "1.5 m", "setengah meter", "a meter", "to 2 meters", "jadi 1 meter"
  const unit = '(cm|centimeters?|centimetres?|centimeter|senti|sentimeter|m|meters?|metres?|meter)\\b';
  const re = new RegExp(`(?:^|\\s)(to|jadi|menjadi|ke|by|sebesar|sebanyak)?\\s*(-?\\d+(?:\\.\\d+)?|one and a half|satu setengah|a half|half|setengah|a quarter|seperempat|an|a|one|satu|se|two|dua|three|tiga)\\s*${unit}`);
  const m = text.match(re);
  if (!m) {
    if (/\b(a bit|a little|slightly|sedikit|dikit)\b/.test(text)) return { value: 0.3, set: false };
    if (/\b(a lot|lots|much|way up|banyak|tinggi sekali|drastis)\b/.test(text)) return { value: 1.5, set: false };
    return null;
  }
  let v = /\d/.test(m[2]) ? parseFloat(m[2]) : NUM_WORDS[m[2]];
  if (/^(cm|cent|senti)/.test(m[3])) v /= 100;
  const set = m[1] === 'to' || m[1] === 'jadi' || m[1] === 'menjadi' || m[1] === 'ke';
  return { value: v, set };
}

function parseClock(text) {
  let m = text.match(/(?:^|\s)(?:at|jam|pukul|pkl|around|sekitar)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|pagi|siang|sore|malam|subuh)?(?=\s|$)/);
  if (!m) m = text.match(/(?:^|\s)(\d{1,2})[:.](\d{2})\s*(am|pm|pagi|siang|sore|malam)?(?=\s|$)/);
  if (!m) {
    const k = text.match(/(?:^|\s)(\d{1,2})\s*(am|pm)(?=\s|$)/);
    if (k) m = [k[0], k[1], '', k[2]];
  }
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3] || '';
  if (h > 24 || min > 59) return null;
  if (/^p/.test(mer) && h < 12) h += 12;
  if (/^a/.test(mer) && h === 12) h = 0;
  if (mer === 'sore' && h < 12) h += 12;
  if (mer === 'siang' && h < 6) h += 12;
  if (mer === 'malam') { if (h >= 6 && h < 12) h += 12; else if (h === 12) h = 0; }
  return (h % 24) * 60 + min;
}

function splitClauses(text) {
  return text
    .split(/\s*(?:;|,(?!\d)|\band then\b|\bthen\b|\band\b|\bdan\b|\blalu\b|\bterus\b|\bkemudian\b|\bsambil\b|\bplus\b|\bserta\b|\bsetelah itu\b|&)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function refersToLast(c) {
  return has(c, W.it);
}

const SELECT_TO_BRIDGE = { 'bridge-north': 'north', 'bridge-south': 'south' };
const NOT_BUILDINGS = new Set(['park', 'parking', 'bridge-north', 'bridge-south', 'warung', 'pier', 'river']);

function parseClause(raw, ctx, carry) {
  const c = { text: ` ${raw} ` };
  const out = { actions: [], replies: [], ask: null };
  const act = (a) => out.actions.push(a);
  const selected = ctx.selected || null;
  const last = carry.last;

  // Meta commands.
  if (take(c, W.undo)) { act({ type: 'undo' }); return out; }
  if (take(c, W.resetView)) { act({ type: 'resetView' }); return out; }
  if (!has(c, W.river) && !has(c, W.flood) && take(c, W.reset)) { act({ type: 'reset' }); return out; }
  if (take(c, W.showcase)) { act({ type: 'showcase' }); return out; }
  if (take(c, W.help)) { act({ type: 'help' }); return out; }
  if (take(c, W.timeLock)) { act({ type: 'timeLock', value: true }); return out; }
  if (take(c, W.timeUnlock)) { act({ type: 'timeLock', value: false }); return out; }
  const speed = c.text.match(/\s(1|2|4)\s?(?:x|kali)\s/);
  if (speed) { act({ type: 'speed', value: parseInt(speed[1], 10) }); return out; }
  if (take(c, W.faster)) { act({ type: 'speed', value: 'up' }); return out; }
  if (take(c, W.slower)) { act({ type: 'speed', value: 1 }); return out; }

  // Out of scope.
  if (take(c, W.windstorm)) {
    act({ type: 'weather', value: 'storm' });
    out.replies.push({ key: 'reply.noTornado' });
    return out;
  }
  if (has(c, W.disaster)) {
    out.replies.push({ key: 'reply.disaster', chips: ['river', 'storm', 'bridge'] });
    return out;
  }

  // Phrases that contain place names are read before places are picked out.
  if (take(c, W.extinguish)) { act({ type: 'extinguish' }); return out; }
  if (take(c, W.callPolice)) {
    const active = ctx.state && ctx.state.robbery;
    out.replies.push({ key: active ? 'reply.policeOnIt' : 'reply.noCrime' });
    return out;
  }
  if (take(c, W.fireworks)) act({ type: 'fireworks' });
  if (take(c, W.lightshowOff)) act({ type: 'lightshow', on: false });
  else if (take(c, W.lightshowOn)) act({ type: 'lightshow', on: true });
  if (take(c, W.blackoutOff)) act({ type: 'blackout', on: false });
  else if (take(c, W.blackoutOn)) act({ type: 'blackout', on: true });
  if (take(c, W.rushOff)) act({ type: 'rush', on: false });
  else if (take(c, W.rushOn)) act({ type: 'rush', on: true });
  if (take(c, W.pasarMalam)) { act({ type: 'festival', on: true }); act({ type: 'time', value: 'night' }); }
  if (take(c, W.festivalEnd)) act({ type: 'festival', on: false });

  // Places.
  const places = [];
  for (const [name, id] of PLACES) {
    if (c.text.includes(` ${name} `)) {
      c.text = c.text.replace(` ${name} `, ' ~ ');
      if (!places.includes(id)) places.push(id);
    }
  }
  const building = places.find((p) => BUILDING_IDS.has(p)) || null;
  const thisRef = has(c, W.thisRef);
  const itRef = refersToLast(c);

  // Robbery.
  if (take(c, W.robbery)) {
    if (building && building !== 'bank') out.replies.push({ key: 'reply.onlyBank' });
    act({ type: 'robbery' });
  }

  // Festival (start or stop).
  const fest = take(c, W.festival);
  if (fest) {
    if (has(c, W.endVerb)) act({ type: 'festival', on: false });
    else act({ type: 'festival', on: true });
    carry.last = { kind: 'festival' };
  }

  // Fire.
  if (take(c, W.fireOn)) {
    let target = building;
    if (!target && (thisRef || itRef) && selected && !NOT_BUILDINGS.has(selected)) target = selected;
    if (!target && itRef && last && last.kind === 'fire') target = last.id;
    const area = places.find((p) => p.startsWith('@'));
    if (!target && (area || places.length)) out.replies.push({ key: 'reply.fireBuildingsOnly' });
    else if (!target) out.ask = { key: 'ask.fireWhere', options: [
      { label: 'b.school', action: { type: 'fire', target: 'school' } },
      { label: 'b.warehouse', action: { type: 'fire', target: 'warehouse' } },
      { label: 'b.market', action: { type: 'fire', target: 'market' } },
    ] };
    else act({ type: 'fire', target });
  }

  // Bridges.
  const bridgeWord = take(c, W.bridge);
  const dirN = has(c, W.north), dirS = has(c, W.south);
  const dirBoth = has(c, W.both) || bridgeWord === 'bridges' || bridgeWord === 'crossings' || /\b(north|utara)\b.*\b(south|selatan)\b|\b(south|selatan)\b.*\b(north|utara)\b/.test(c.text);
  const selBridge = SELECT_TO_BRIDGE[selected];
  const words = c.text.trim().split(/\s+/).length;
  const continues = carry.topic === 'bridge' && words <= 5 && /\b(north|northern|south|southern|utara|selatan|both|keduanya)\b/.test(c.text) &&
    !has(c, W.river) && !has(c, W.flood);
  const verbOnly = !bridgeWord && last && last.kind === 'bridge' && (has(c, W.close) || has(c, W.open)) && (itRef || words <= 3);
  const bridgeCtx = bridgeWord || continues || (thisRef && selBridge) || verbOnly;
  if (bridgeCtx && !out.actions.some((a) => a.type === 'festival' || a.type === 'lightshow')) {
    const opening = !!has(c, W.open);
    const closing = !!has(c, W.close);
    let closed = opening ? false : closing ? true : carry.bridgeClosed;
    let id = dirBoth && (dirN || dirS || bridgeWord === 'bridges' || has(c, W.both)) ? 'both' : dirN ? 'north' : dirS ? 'south' : null;
    if (!id && thisRef && selBridge) id = selBridge;
    if (!id && (itRef || verbOnly) && last && last.kind === 'bridge') id = last.id;
    if (!id && selBridge) id = selBridge;
    if (closed === null || closed === undefined) {
      out.ask = { key: 'ask.bridgeWhat', options: [
        { label: 'chip.closeBridge', action: { type: 'bridge', id: id || 'north', closed: true } },
        { label: 'chip.openBridge', action: { type: 'bridge', id: id || 'north', closed: false } },
      ] };
    } else if (!id) {
      out.ask = { key: 'ask.bridgeWhich', options: [
        { label: 'lm.bridgeNorth', action: { type: 'bridge', id: 'north', closed } },
        { label: 'lm.bridgeSouth', action: { type: 'bridge', id: 'south', closed } },
        { label: 'chip.bothBridges', action: { type: 'bridge', id: 'both', closed } },
      ] };
    } else {
      act({ type: 'bridge', id, closed });
    }
    carry.topic = 'bridge';
    carry.bridgeClosed = closed;
    c.text = c.text.replace(/ (north|northern|utara|south|southern|selatan|both|semua|kedua) /g, ' ~ ');
  }

  // Parking <-> park.
  const aboutParking = places.includes('@parking') || (thisRef && selected === 'parking') || (itRef && last && last.kind === 'parking');
  if (aboutParking) {
    const backWord = has(c, W.back);
    const wantsPark = places.includes('@park') || !!has(c, W.toPark);
    if (backWord && (!wantsPark || /back into parking|jadi parkir|jadi parkiran/.test(raw))) act({ type: 'parking', park: false });
    else if (wantsPark || has(c, W.convert)) act({ type: 'parking', park: true });
    else if (has(c, W.back)) act({ type: 'parking', park: false });
  } else if ((places.includes('@park') || has(c, W.toPark)) && has(c, W.convert) && (building || thisRef)) {
    out.replies.push({ key: 'reply.onlyParking' });
  }

  // River.
  const riverWord = take(c, W.river);
  const floodWord = take(c, W.flood);
  if (riverWord || floodWord || (itRef && last && last.kind === 'river' && (has(c, W.raise) || has(c, W.lower)))) {
    const amt = parseAmount(raw);
    if (has(c, W.normal)) act({ type: 'river', mode: 'set', value: 0 });
    else if (take(c, W.lower)) act({ type: 'river', mode: amt && amt.set ? 'set' : 'delta', value: amt ? (amt.set ? amt.value : -Math.abs(amt.value)) : -0.5 });
    else if (take(c, W.raise) || floodWord) {
      if (floodWord && !amt) act({ type: 'river', mode: 'set', value: 2.5 });
      else act({ type: 'river', mode: amt && amt.set ? 'set' : 'delta', value: amt ? Math.abs(amt.value) : 1 });
    } else if (amt && amt.set) act({ type: 'river', mode: 'set', value: amt.value });
    else out.ask = { key: 'ask.riverWhat', options: [
      { label: 'chip.raiseRiver', action: { type: 'river', mode: 'delta', value: 1 } },
      { label: 'chip.lowerRiver', action: { type: 'river', mode: 'delta', value: -0.5 } },
      { label: 'chip.normalRiver', action: { type: 'river', mode: 'set', value: 0 } },
    ] };
    carry.last = { kind: 'river' };
  }

  // Weather.
  const stopWord = has(c, W.weatherStop);
  let weather = null;
  if (take(c, W.snow)) weather = 'snow';
  else if (take(c, W.storm)) weather = 'storm';
  else if (take(c, W.rain)) weather = 'rain';
  else if (take(c, W.fog)) weather = 'fog';
  else if (take(c, W.cloudy)) weather = 'cloudy';
  else if (take(c, W.clear)) weather = 'clear';
  if (weather) {
    if (stopWord && weather !== 'clear') act({ type: 'weather', value: 'clear' });
    else act({ type: 'weather', value: weather });
    if (/wind/.test(raw) && weather === 'storm') out.replies.push({ key: 'reply.windStorm' });
  }

  // Seasons.
  let season = null;
  if (takeAll(c, W.winter)) season = 'winter';
  else if (takeAll(c, W.autumn)) season = 'autumn';
  else if (takeAll(c, W.spring)) season = 'spring';
  else if (takeAll(c, W.summer)) season = 'summer';
  if (season) {
    act({ type: 'season', value: season });
    if (/kemarau/.test(raw) && !weather) act({ type: 'weather', value: 'clear' });
  }

  // Time of day.
  const clock = parseClock(raw);
  if (clock !== null) act({ type: 'time', clock });
  else if (take(c, W.later)) act({ type: 'timeStep', minutes: 120 });
  else if (take(c, W.earlier)) act({ type: 'timeStep', minutes: -120 });
  else if (!out.actions.some((a) => a.type === 'time')) {
    let tod = null;
    if (take(c, W.morning)) tod = 'morning';
    else if (take(c, W.sunset)) tod = 'sunset';
    else if (take(c, W.night)) tod = 'night';
    else if (take(c, W.noon)) tod = 'noon';
    if (tod) act({ type: 'time', value: tod });
  }

  // Generic "stop it" / "hentikan" for the last running thing.
  if (!out.actions.length && !out.ask && has(c, W.endVerb) && (itRef || c.text.trim().split(' ').length <= 3) && last) {
    const off = { festival: { type: 'festival', on: false }, blackout: { type: 'blackout', on: false }, rush: { type: 'rush', on: false }, lightshow: { type: 'lightshow', on: false }, fire: { type: 'extinguish' }, weather: { type: 'weather', value: 'clear' } }[last.kind];
    if (off) act(off);
  }

  // Playback after everything else so "stop the rain" never pauses.
  if (!out.actions.length && !out.ask) {
    if (take(c, W.pause)) act({ type: 'pause', value: true });
    else if (take(c, W.resume)) act({ type: 'pause', value: false });
  }

  if (!out.actions.length && !out.ask && !out.replies.length) {
    if (has(c, W.greet)) out.replies.push({ key: 'reply.greet' });
    else if (has(c, W.thanks)) out.replies.push({ key: 'reply.thanks' });
    else if (has(c, W.about)) out.replies.push({ key: 'reply.about' });
  }

  for (const a of out.actions) {
    if (a.type === 'bridge') carry.last = { kind: 'bridge', id: a.id };
    if (a.type === 'parking') carry.last = { kind: 'parking' };
    if (a.type === 'fire') carry.last = { kind: 'fire', id: a.target };
    if (a.type === 'blackout' && a.on) carry.last = { kind: 'blackout' };
    if (a.type === 'rush' && a.on) carry.last = { kind: 'rush' };
    if (a.type === 'lightshow' && a.on) carry.last = { kind: 'lightshow' };
    if (a.type === 'festival' && a.on) carry.last = { kind: 'festival' };
    if (a.type === 'weather' && a.value !== 'clear') carry.last = { kind: 'weather' };
  }
  return out;
}

export function interpret(input, ctx = {}) {
  const text = normalize(input);
  const result = { text, lang: detectLang(text), actions: [], replies: [], ask: null };
  if (!text) return result;
  const pre = text
    .replace(/\b(north|utara)\s+(?:and|dan|&|sama|plus)\s+(south|selatan)\b/g, 'both')
    .replace(/\b(south|selatan)\s+(?:and|dan|&|sama|plus)\s+(north|utara)\b/g, 'both')
    .replace(/\bmusim hujan\b/g, 'hujan')
    .replace(/\bcops and robbers\b/g, 'robbery');
  const carry = { topic: null, bridgeClosed: null, last: ctx.last || null };
  for (const clause of splitClauses(pre)) {
    const r = parseClause(clause, ctx, carry);
    result.actions.push(...r.actions);
    result.replies.push(...r.replies);
    if (r.ask && !result.ask) result.ask = r.ask;
    if (!r.actions.length && !r.ask && !r.replies.length) result.unknown = (result.unknown || []).concat(clause);
  }
  // Drop exact duplicates ("rain and more rain").
  const seen = new Set();
  result.actions = result.actions.filter((a) => {
    const k = JSON.stringify(a);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // Only one value per setting: the last one mentioned wins.
  for (const type of ['weather', 'season', 'time']) {
    const idx = result.actions.map((a, i) => (a.type === type ? i : -1)).filter((i) => i >= 0);
    if (idx.length > 1) {
      const keep = idx[idx.length - 1];
      result.actions = result.actions.filter((a, i) => a.type !== type || i === keep);
    }
  }
  if (!result.actions.length && !result.ask && !result.replies.length) {
    result.replies.push({ key: 'reply.unknown' });
  }
  result.last = carry.last;
  return result;
}
