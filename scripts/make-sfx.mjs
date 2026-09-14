/**
 * `ui_click` ve `countdown_tick` kaynaklarını **sentezler** — `M8-P03`.
 *
 * Çıktı: `assets-src/audio/*.wav`. Oradan `prep-assets.mjs ses` alıp
 * `.m4a`'ya çeviriyor (baş sessizliği kırpması dahil).
 *
 *     node scripts/make-sfx.mjs
 *
 * ## Neden sentez
 *
 * `M8-sanat-brifi.md` bu üç sesi "insan işi" listesine koymuştu ve
 * dosyalar aylarca gelmedi; kod tarafı hazır olduğu için oyun onları
 * **sessizce atlıyordu**. Kullanıcı sentezlenmesini istedi.
 *
 * Bu ikisi sentezlenebilir çünkü brifin kendi tarifi bir **beste değil,
 * bir doku**:
 *
 * - `ui_click` — *"kısa, kuru, tok bir parşömen/tahta dokunuşu. Melodik
 *   değil, tınlamıyor: saniyede birkaç kez basılabilen bir düğme sesi;
 *   rezonansı olan bir ses üst üste binince çamurlaşıyor."*
 * - `countdown_tick` — *"kuru, kısa, alçak bir tahta/deri vuruşu —
 *   nöbetçi davulu. Melodik olmamalı... Ses düzeyi diğer efektlerden
 *   belirgin biçimde düşük olmalı: bir uyarı değil, bir nabız."*
 *
 * İkisi de "perdesiz, kuru, kısa darbe" tarif ediyor — sönümlü bir
 * gövde + kısa bir gürültü atağı bunu doğrudan veriyor. `boss_music`
 * sentezlenmedi: o bir beste ve `prep-assets.mjs` onu oyun müziğinden
 * **türetiyor** (brif zaten "aynı parçanın kuşatma hâli" diyor).
 *
 * **Kalıcı sanat değil, yer tutucu.** Sanatçı dosyası gelirse bu
 * betiğin çıktısının üstüne yazılır ve betik silinebilir.
 *
 * ## Tasarım
 *
 * Rezonans **bilerek yok**: brif "tınlamıyor" diyor ve ölçülmüş bir
 * sebebi var — `SFX_POOL_PER_KEY` 6 örnek tutuyor, uzun kuyruklu bir
 * ses üst üste binince havuz doyuyor (`shot_okcu` 2,25 sn'yken kesilme
 * %100'dü). Kısa ses = havuz hiç doymuyor.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEDEF = join(KOK, 'assets-src', 'audio');

/** Diğer kaynaklarla aynı — `prep-assets` zaten mono'ya indiriyor. */
const ORNEKLEME = 48000;

/**
 * Deterministik gürültü (LCG).
 *
 * `Math.random` kullanılmıyor: betiğin her koşusu **aynı** dosyayı
 * üretmeli, yoksa `git diff` her çalıştırmada kirlenir ve "ses değişti
 * mi" sorusu cevapsız kalır.
 */
function gurultuUreteci(tohum) {
  let s = tohum >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0x100000000) * 2 - 1;
  };
}

/** Tek kutuplu alçak geçiren — gürültünün tizini alıp "tok" yapıyor. */
function alcakGecir(ornekler, kesim) {
  const dt = 1 / ORNEKLEME;
  const rc = 1 / (2 * Math.PI * kesim);
  const a = dt / (rc + dt);
  let y = 0;
  return ornekler.map((x) => (y = y + a * (x - y)));
}

/** Tek kutuplu yüksek geçiren — DC ve gürültünün pesini atıyor. */
function yuksekGecir(ornekler, kesim) {
  const dt = 1 / ORNEKLEME;
  const rc = 1 / (2 * Math.PI * kesim);
  const a = rc / (rc + dt);
  const cikis = new Array(ornekler.length);
  let onceX = 0;
  let onceY = 0;
  for (let i = 0; i < ornekler.length; i++) {
    const x = ornekler[i];
    onceY = a * (onceY + x - onceX);
    onceX = x;
    cikis[i] = onceY;
  }
  return cikis;
}

/**
 * Sönümlü darbe: kısa gürültü atağı + sönümlü sinüs gövdesi.
 *
 * @param {object} o
 * @param {number} o.sure       saniye
 * @param {number} o.govdeHz    gövdenin perdesi (algılanan "yükseklik")
 * @param {number} o.govdeSonum sönüm zaman sabiti (sn) — küçük = kuru
 * @param {number} o.atakSonum  gürültü atağının sönümü (sn)
 * @param {number} o.atakPay    gürültünün karışım oranı (0-1)
 * @param {number} o.tizKesim   gürültü alçak geçiren kesimi (Hz)
 * @param {number} o.tepe       çıkış tepe genliği (0-1)
 * @param {number} o.tohum      gürültü tohumu
 */
function darbe(o) {
  const n = Math.round(o.sure * ORNEKLEME);
  const rnd = gurultuUreteci(o.tohum);
  let ham = new Array(n);
  for (let i = 0; i < n; i++) ham[i] = rnd();
  ham = alcakGecir(ham, o.tizKesim);
  ham = yuksekGecir(ham, 120);

  const cikis = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / ORNEKLEME;
    const govde = Math.sin(2 * Math.PI * o.govdeHz * t) * Math.exp(-t / o.govdeSonum);
    const atak = ham[i] * Math.exp(-t / o.atakSonum);
    cikis[i] = govde * (1 - o.atakPay) + atak * o.atakPay;
  }

  // Normalize + istenen tepeye ölçekle.
  const enBuyuk = Math.max(...cikis.map(Math.abs));
  const k = enBuyuk > 0 ? o.tepe / enBuyuk : 0;

  // Son 5 ms'de sıfıra in: WAV'ın sonunda süreksizlik kalırsa AAC
  // kodlayıcı orada bir "tık" üretiyor.
  const kapanis = Math.round(0.005 * ORNEKLEME);
  return cikis.map((v, i) => {
    const kalan = n - i;
    const kap = kalan < kapanis ? kalan / kapanis : 1;
    return v * k * kap;
  });
}

/** 16-bit mono PCM WAV. */
function wavYaz(yol, ornekler) {
  const veri = Buffer.alloc(ornekler.length * 2);
  for (let i = 0; i < ornekler.length; i++) {
    const v = Math.max(-1, Math.min(1, ornekler[i]));
    veri.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const bas = Buffer.alloc(44);
  bas.write('RIFF', 0);
  bas.writeUInt32LE(36 + veri.length, 4);
  bas.write('WAVE', 8);
  bas.write('fmt ', 12);
  bas.writeUInt32LE(16, 16);
  bas.writeUInt16LE(1, 20); // PCM
  bas.writeUInt16LE(1, 22); // mono
  bas.writeUInt32LE(ORNEKLEME, 24);
  bas.writeUInt32LE(ORNEKLEME * 2, 28);
  bas.writeUInt16LE(2, 32);
  bas.writeUInt16LE(16, 34);
  bas.write('data', 36);
  bas.writeUInt32LE(veri.length, 40);
  writeFileSync(yol, Buffer.concat([bas, veri]));
  return veri.length / 2 / ORNEKLEME;
}

mkdirSync(HEDEF, { recursive: true });

/**
 * `ui_click` — brif: *kısa, kuru, tok, tınlamıyor, bir tık alçak.*
 *
 * Gövde 210 Hz ve 18 ms'de sönüyor: perde duyulmayacak kadar kısa,
 * yalnız "tokluk" veriyor. Atak payı yüksek (0,55) — tıklamanın
 * karakteri gürültüde, notada değil.
 */
const click = darbe({
  sure: 0.07,
  govdeHz: 210,
  govdeSonum: 0.018,
  atakSonum: 0.006,
  atakPay: 0.55,
  tizKesim: 2600,
  tepe: 0.5,
  tohum: 20260914,
});

/**
 * `countdown_tick` — brif: *kuru, kısa, **alçak**, nöbetçi davulu; ses
 * düzeyi diğerlerinden belirgin düşük ("bir uyarı değil, bir nabız").*
 *
 * Gövde 130 Hz (click'in yarısından pes), sönüm biraz uzun (35 ms) ki
 * deri vuruşu hissi olsun, atak payı düşük (0,3) ki tiz çıtırtı değil
 * tok bir vuruş duyulsun. Tepe 0,33 — click'in üçte ikisi.
 */
const tick = darbe({
  sure: 0.13,
  govdeHz: 130,
  govdeSonum: 0.035,
  atakSonum: 0.004,
  atakPay: 0.3,
  tizKesim: 1800,
  tepe: 0.33,
  tohum: 815,
});

for (const [ad, ornekler] of [
  ['ui_click', click],
  ['countdown_tick', tick],
]) {
  const yol = join(HEDEF, `${ad}.wav`);
  const sure = wavYaz(yol, ornekler);
  const tepe = Math.max(...ornekler.map(Math.abs));
  console.log(`  assets-src/audio/${ad}.wav  ${(sure * 1000).toFixed(0)} ms · tepe ${tepe.toFixed(2)}`);
}
console.log('Bitti — `node scripts/prep-assets.mjs ses` ile .m4a üretilir.');
