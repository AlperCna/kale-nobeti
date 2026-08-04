// TIER 1 kural bekçileri.
//
// UYARI (TEST-STRATEGY §4): bekçiler kanıt değil, AĞ. Hepsi düzenli ifade
// sezgiseli. Negatif doğrulama bekçinin ateşlendiğini kanıtlar, HER ihlali
// yakaladığını değil. Kuralları asıl koruyan şey görevlerin kendi kabul
// kriterleri ve kod incelemesi; bekçiler yalnız sessiz gerilemeleri yakalar.
//
// Node ile yazıldı (kabuk betiği değil) ki PowerShell'de de aynı komutla
// koşsun — TASK-TEMPLATE.md "Kabuk notu".

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = 'src';
const hatalar = [];

/** Taranamayan dizinler — sessizce yutulmaz, özette basılır. */
const taranamayan = [];

/**
 * src/ altındaki tüm .ts dosyaları.
 *
 * Okunamayan dizin **çökertmez ama gizlenmez de**. Bekçinin bir dizini
 * atlayıp yine de yeşil dönmesi, bekçinin sessizce devre dışı kalması
 * demektir; o yüzden atlanan her yol özetin başında listeleniyor.
 * (Gerçek örnek: Windows'ta silinmeyi bekleyen bir dizin `EPERM` verip
 * tüm bekçiyi düşürdü.)
 */
function tsDosyalari() {
  const sonuc = [];
  const gez = (dizin) => {
    let girisler;
    try {
      girisler = readdirSync(dizin);
    } catch (e) {
      taranamayan.push(`${relative('.', dizin).split(sep).join('/')} (${e.code ?? 'hata'})`);
      return;
    }
    for (const ad of girisler) {
      const tam = join(dizin, ad);
      try {
        if (statSync(tam).isDirectory()) gez(tam);
        else if (ad.endsWith('.ts')) sonuc.push(tam);
      } catch (e) {
        taranamayan.push(`${relative('.', tam).split(sep).join('/')} (${e.code ?? 'hata'})`);
      }
    }
  };
  gez(SRC);
  return sonuc;
}

/** Yorum satırlarını eler — `//`, `/*`, ` *`. */
function kodSatirlari(icerik) {
  return icerik
    .split(/\r?\n/)
    .map((satir, i) => ({ no: i + 1, metin: satir }))
    .filter(({ metin }) => !/^\s*(\/\/|\/\*|\*)/.test(metin));
}

function ihlal(kural, dosya, no, mesaj) {
  hatalar.push(`  ${kural}  ${relative('.', dosya).split(sep).join('/')}:${no}  ${mesaj}`);
}

const dosyalar = tsDosyalari();
const sonuclar = [];

// ---------------------------------------------------------------------
// 1 — Ham `delta` (TIER 1 kural 8)
//
// İzinli: GameClock.ts (saatin kendisi) ve GameScene.ts'te TAM 2 satır
// (update imzası + clock.tick çağrısı). Üçüncü satır sızıntı demektir.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    if (/GameClock\.(ts|test\.ts)$/.test(dosya)) continue;
    const hits = kodSatirlari(readFileSync(dosya, 'utf8')).filter((s) => /\bdelta\b/.test(s.metin));
    const izinli = /GameScene\.ts$/.test(dosya) ? 2 : 0;
    if (hits.length > izinli) {
      ihlalVar = true;
      for (const h of hits.slice(izinli)) {
        ihlal('k.8 ', dosya, h.no, `ham delta (izinli: ${izinli})`);
      }
    }
  }
  sonuclar.push(['k.8  ham delta yalnız GameClock/GameScene', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 2 — `any` (TIER 1 kural 5)
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (/:\s*any\b|<any>|\bas\s+any\b/.test(s.metin)) {
        ihlalVar = true;
        ihlal('k.5 ', dosya, s.no, 'any kullanımı');
      }
    }
  }
  sonuclar.push(['k.5  any kullanılmıyor', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 3 — PreloadScene dört aşama (ROADMAP M0)
//
// Tek blok preload() yazılırsa M6'da sökmek pahalı.
// ---------------------------------------------------------------------
{
  const dosya = join(SRC, 'scenes', 'PreloadScene.ts');
  const icerik = readFileSync(dosya, 'utf8');
  const adlar = new Set([...icerik.matchAll(/(?:private|static)\s+(queue[A-Za-z]+)\s*\(/g)].map((m) => m[1]));
  const tamam = adlar.size >= 4;
  if (!tamam) ihlal('M0  ', dosya, 1, `aşama fonksiyonu ${adlar.size}/4: ${[...adlar].join(', ')}`);
  sonuclar.push([`M0   PreloadScene 4 aşama (${adlar.size})`, tamam]);
}

// ---------------------------------------------------------------------
// 4 — setText (TIER 1 kural 7)
//
// SEZGİSEL: BitmapText'in de setText'i var, düzenli ifade ikisini ayıramaz.
// M6'da bitmap font gelince bu kontrol "Text nesnesinde setText" olarak
// daraltılmalı. Şimdilik her setText yasak, çünkü henüz BitmapText yok.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (/\.setText\s*\(/.test(s.metin)) {
        ihlalVar = true;
        ihlal('k.7 ', dosya, s.no, 'setText — değişen metin BitmapText olmalı');
      }
    }
  }
  sonuclar.push(['k.7  setText yok (sezgisel)', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 5 — Çalışma zamanı Phaser import'u (TIER 1 kural 11)
//
// systems/, util/, data/, types/ Phaser'ı yalnız `import type` ile alır.
// İhlal edilirse node ortamındaki testler `window is not defined` ile
// patlar — M0-T04'te kasten ihlal edilerek kanıtlandı.
// ---------------------------------------------------------------------
{
  const kapsam = ['systems', 'util', 'data', 'types'].map((d) => join(SRC, d) + sep);
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    if (!kapsam.some((k) => dosya.startsWith(k))) continue;
    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (/^\s*import\s+(?!type\b)[^;]*from\s+['"]phaser['"]/.test(s.metin)) {
        ihlalVar = true;
        ihlal('k.11', dosya, s.no, 'çalışma zamanı Phaser import');
      }
    }
  }
  sonuclar.push(['k.11 saf mantıkta runtime Phaser yok', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 6 — En az bir test dosyası
//
// vitest.config.ts'teki passWithNoTests maskesini denetlenmiş varsayıma
// çevirir: "tüm testlerim kayboldu" durumunu yakalar.
// ---------------------------------------------------------------------
{
  const sayi = dosyalar.filter((d) => d.endsWith('.test.ts')).length;
  const tamam = sayi > 0;
  if (!tamam) ihlal('test', SRC, 1, 'hiç *.test.ts yok — passWithNoTests maskeliyor');
  sonuclar.push([`test src/ altında test dosyası (${sayi})`, tamam]);
}

// ---------------------------------------------------------------------
// 7 — Math.sqrt (TIER 1 kural 9)
//
// Menzil ve yakınlık karşılaştırmaları karesel yapılır. Tek meşru
// kullanım `util/math.ts` içindeki `segmentLength` — yol uzunluğu
// toplanabilir olmalı ve karelerin toplamı uzunlukların toplamına eşit
// değil (math.test.ts bunu ayrıca kanıtlıyor).
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;
    const izinli = /util[\\/]math\.ts$/.test(dosya);
    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (/Math\.sqrt\s*\(/.test(s.metin) && !izinli) {
        ihlalVar = true;
        ihlal('k.9 ', dosya, s.no, 'Math.sqrt — karesel mesafe kullan');
      }
    }
  }
  sonuclar.push(['k.9  Math.sqrt yalnız math.ts', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 8 — `coverage` elle yazılmıyor (CLAUDE.md Mimari kuralı)
//
// `MapDef.coverage` util/coverage.ts üretir. Elle yazılırsa denge testleri
// gerçeği değil, birinin yazdığı sayıyı doğrular — sessiz ve ölümcül.
// maps.test.ts de aynı şeyi kontrol ediyor; bu bekçi, testin silinmesi
// durumunda ayakta kalan ikinci kat.
// ---------------------------------------------------------------------
{
  const dosya = join(SRC, 'data', 'maps.ts');
  let ihlalVar = false;
  for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
    if (/\bcoverage\s*:/.test(s.metin) && !/measureCoverage\s*\(/.test(s.metin)) {
      ihlalVar = true;
      ihlal('mim.', dosya, s.no, 'coverage elle yazılmış — measureCoverage üretmeli');
    }
  }
  sonuclar.push(['mim. coverage measureCoverage ile üretiliyor', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 9 — Duvar saati (TIER 1 kural 8'in ikinci yüzü)
//
// Kural 8 ham `delta`yı yasaklıyor ama asıl amaç şu: zaman bağımlı mantık
// TEK bir kaynaktan beslensin. `Date.now()` veya `performance.now()` ham
// `delta`dan daha sinsi — 2× hızda hiç hızlanmaz, duraklatmada durmaz ve
// başsız simülasyonda (`simulateWave`) gerçek zamanı bekler.
// Kapsam kural 11'inkiyle aynı: saf mantık katmanı.
// ---------------------------------------------------------------------
{
  const kapsam = ['systems', 'util', 'data', 'types'].map((d) => join(SRC, d) + sep);
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    if (!kapsam.some((k) => dosya.startsWith(k))) continue;
    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (/\b(Date\.now|performance\.now)\s*\(/.test(s.metin)) {
        ihlalVar = true;
        ihlal('k.8 ', dosya, s.no, 'duvar saati — zaman GameClock üzerinden gelmeli');
      }
    }
  }
  sonuclar.push(['k.8  saf mantıkta duvar saati yok', !ihlalVar]);
}

// ---------------------------------------------------------------------

const gecen = sonuclar.filter(([, ok]) => ok).length;
if (taranamayan.length > 0) {
  console.log(`  ⚠ TARANAMAYAN ${taranamayan.length} yol — bekçi bu kapsamda kör:`);
  for (const y of taranamayan) console.log(`      ${y}`);
  console.log('');
}
for (const [ad, ok] of sonuclar) console.log(`  ${ok ? '✓' : '✗'} ${ad}`);
if (hatalar.length > 0) {
  console.log('\nİhlaller:');
  for (const h of hatalar) console.log(h);
}
console.log(`\n[guard] ${gecen}/${sonuclar.length} ✓`);

process.exit(gecen === sonuclar.length ? 0 : 1);
