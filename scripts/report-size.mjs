// Paket boyutu raporu. CLAUDE.md TIER 1 kural 2.
//
// ÜÇ SAYI basılıyor çünkü iki farklı portal iki farklı şeye bakıyor:
//
//   Poki          ilk indirme < 8 MB  (research/05 §1)
//   CrazyGames    ilk indirme <= 50 MB, mobil ana sayfa <= 20 MB;
//                 SDK entegre EDİLMEZSE paketin TAMAMI ilk indirme
//                 sayılıyor (research/05 §2). S61 SDK'yı M7'ye erteledi,
//                 yani şimdilik CrazyGames için geçerli olan "toplam".
//
// JS/HTML/CSS gzip'te ~4:1 sıkışıyor; atlas, WebP, woff2 ve m4a ZATEN
// sıkıştırılmış, gzip ~%2 kazandırır. Bu yüzden ikisi ayrı raporlanıyor:
// M6'da eklenecek varlıklar bütçeye 1:1 yazılacak ve tek toplam sayı
// "yerimiz bol" yanılgısı üretiyor.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const UYARI_MB = 5;
const HATA_MB = 8;

/** Bu dizin altındakiler ilk indirmeye SAYILMAZ — M6'da tembel yüklenecek
 *  müzik ve harita 2-3 arka planları buraya konur (PreloadScene.queueLazy /
 *  queueBackground). Şimdilik boş; yer bugünden ayrıldı ki M6'da ölçüm
 *  kendiliğinden doğru bölünsün. */
const TEMBEL = join('assets', 'lazy');

/** gzip kazandırmayan, zaten sıkıştırılmış biçimler. */
const SIKISIK = new Set(['.woff2', '.png', '.jpg', '.jpeg', '.webp', '.m4a', '.ogg', '.mp3']);

function dosyalar(dizin) {
  const sonuc = [];
  const gez = (d) => {
    for (const ad of readdirSync(d)) {
      const tam = join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else sonuc.push(tam);
    }
  };
  gez(dizin);
  return sonuc;
}

/** Ağda gidecek boyut: metin gzip'lenir, medya olduğu gibi sayılır. */
function agBoyutu(dosya) {
  const boyut = statSync(dosya).size;
  if (SIKISIK.has(extname(dosya).toLowerCase())) return boyut;
  return gzipSync(readFileSync(dosya)).length;
}

const hepsi = dosyalar(DIST).map((f) => {
  const goreli = relative(DIST, f);
  return {
    yol: goreli.replace(/\\/g, '/'),
    ham: statSync(f).size,
    ag: agBoyutu(f),
    medya: SIKISIK.has(extname(f).toLowerCase()),
    tembel: goreli.startsWith(TEMBEL),
  };
});

const ilk = hepsi.filter((d) => !d.tembel);
const topla = (liste, alan) => liste.reduce((t, d) => t + d[alan], 0);

const jsAg = topla(ilk.filter((d) => !d.medya), 'ag');
const varlikAg = topla(ilk.filter((d) => d.medya), 'ag');
const ilkAg = jsAg + varlikAg;
const toplamAg = topla(hepsi, 'ag');

const mb = (b) => (b / 1024 / 1024).toFixed(2);
const kb = (b) => (b / 1024).toFixed(1);

console.log('\n[report-size]');
console.log(`  varsayım: ilk indirme = dist/ eksi ${TEMBEL.replace(/\\/g, '/')}/`);
console.log('            (S10 cevaplanmadı; tembel dizini boşken ikisi eşit)');
console.log('');

for (const d of [...ilk].sort((a, b) => b.ham - a.ham).slice(0, 5)) {
  console.log(`  ${kb(d.ham).padStart(9)} KB  ${d.yol}`);
}

console.log('');
console.log(`  js/html/css   ${mb(jsAg).padStart(6)} MB   (gzip'li, ~4:1 sıkışır)`);
console.log(`  varlıklar     ${mb(varlikAg).padStart(6)} MB   (sıkışmaz — M6'da 1:1 büyür)`);
console.log(`  ─────────────────────────`);
console.log(`  İLK İNDİRME   ${mb(ilkAg).padStart(6)} MB   ← Poki sınırı ${HATA_MB} MB`);
console.log(`  toplam        ${mb(toplamAg).padStart(6)} MB   ← CrazyGames, SDK'sız (S61)`);
console.log('');
console.log(`  eşikler: ${UYARI_MB} MB uyarı · ${HATA_MB} MB hata`);

const ilkMb = ilkAg / 1024 / 1024;
if (ilkMb > HATA_MB) {
  console.error(`\n[report-size] HATA: ilk indirme ${mb(ilkAg)} MB > ${HATA_MB} MB`);
  process.exit(1);
}
if (ilkMb > UYARI_MB) {
  console.warn(`\n[report-size] UYARI: ilk indirme ${mb(ilkAg)} MB > ${UYARI_MB} MB`);
}
console.log('');
