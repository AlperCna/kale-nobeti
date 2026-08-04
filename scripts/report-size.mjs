// İlk indirme boyutu raporu. CLAUDE.md TIER 1 kural 2.
//
// Poki ilk indirmeyi 8 MB altında istiyor (research/05 §1); iç hedef
// aşamalı yüklemeyle ~1.5 MB (research/04 §6).
//   > 5 MB  uyarı
//   > 8 MB  hata (exit 1)
//
// S10 AÇIK: "ilk indirme" tam olarak neyi kapsıyor — dist/ toplamı mı,
// yoksa index.html'den ilk oynanabilir ana kadar inen dosyalar mı?
// Cevap gelene kadar dist/ toplamı kullanılıyor ve varsayım çıktıda
// açıkça yazdırılıyor. Bu, aşamalı yükleme devreye girdiğinde (M6)
// gerçek ilk indirmeyi OLDUĞUNDAN BÜYÜK gösterir — güvenli yön.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const UYARI_MB = 5;
const HATA_MB = 8;

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

const hepsi = dosyalar(DIST);
const toplamHam = hepsi.reduce((t, f) => t + statSync(f).size, 0);

// Sunucular metin ve JS'i gzip'liyor; woff2 ve png zaten sıkıştırılmış.
const SIKISIK = new Set(['.woff2', '.png', '.jpg', '.webp', '.m4a', '.ogg']);
const toplamAg = hepsi.reduce((t, f) => {
  const boyut = statSync(f).size;
  if (SIKISIK.has(extname(f))) return t + boyut;
  return t + gzipSync(readFileSync(f)).length;
}, 0);

const mb = (b) => (b / 1024 / 1024).toFixed(2);
const kb = (b) => (b / 1024).toFixed(1);

console.log('\n[report-size] İlk indirme');
console.log(`  varsayım: dist/ toplamı — S10 cevaplanmadı, gerçek ilk`);
console.log(`            indirmeyi olduğundan BÜYÜK gösterir (güvenli yön)`);
console.log('');

const enBuyuk = hepsi
  .map((f) => ({ ad: relative(DIST, f).replace(/\\/g, '/'), boyut: statSync(f).size }))
  .sort((a, b) => b.boyut - a.boyut)
  .slice(0, 5);
for (const { ad, boyut } of enBuyuk) {
  console.log(`  ${kb(boyut).padStart(9)} KB  ${ad}`);
}

console.log('');
console.log(`  ham        ${mb(toplamHam)} MB  (${hepsi.length} dosya)`);
console.log(`  ağ (gzip)  ${mb(toplamAg)} MB  ← portalın gördüğü`);
console.log(`  eşikler    ${UYARI_MB} MB uyarı · ${HATA_MB} MB hata`);

const agMb = toplamAg / 1024 / 1024;
if (agMb > HATA_MB) {
  console.error(`\n[report-size] HATA: ${mb(toplamAg)} MB > ${HATA_MB} MB`);
  process.exit(1);
}
if (agMb > UYARI_MB) {
  console.warn(`\n[report-size] UYARI: ${mb(toplamAg)} MB > ${UYARI_MB} MB`);
}
console.log('');
