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
// İzinli: GameClock.ts (saatin kendisi) ve GameScene.ts'te **sayılı değil,
// ADLI** üç satır.
//
// M6'ya kadar kural "GameScene'de en fazla 2 satır" biçimindeydi. Hit-stop
// gelince üçüncü meşru kullanım doğdu (duraklattığı saatle kendini ölçemez)
// ve sayıyı 3'e çıkarmak bekçiyi zayıflatırdı: dördüncü bir SIZINTI da
// serbest kalırdı, üstelik izinli satırlardan birinin değişmesi
// görülmezdi.
//
// Sayım yerine **izin listesi**: her satır tam olarak beklenen ifadeyle
// eşleşmeli. Böylece hem yeni bir kullanım hem de mevcut birinin değişmesi
// yakalanıyor.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  /** GameScene'de ham `delta` geçmesine izin verilen tam ifadeler. */
  const DELTA_IZIN = [
    // `update`'in Phaser imzası — kaçınılmaz.
    /^update\(_time:\s*number,\s*delta:\s*number\):\s*void\s*\{$/,
    // Saati ilerletmek: ham `delta`nın var olma sebebi.
    /^this\.clock\.tick\(delta\);$/,
    // Hit-stop **oyun zamanını durduran** katman; sayacı durdurduğu saatle
    // ölçseydi hiç bitmezdi (`fx/HitStop.ts` başlığındaki gerekçe).
    /^const donduruldu = this\.hitStop\.update\(delta\);$/,
  ];
  for (const dosya of dosyalar) {
    if (/GameClock\.(ts|test\.ts)$/.test(dosya)) continue;
    const hits = kodSatirlari(readFileSync(dosya, 'utf8')).filter((s) => /\bdelta\b/.test(s.metin));
    const gameScene = /GameScene\.ts$/.test(dosya);
    for (const h of hits) {
      const duz = h.metin.trim();
      if (gameScene && DELTA_IZIN.some((r) => r.test(duz))) continue;
      ihlalVar = true;
      ihlal('k.8 ', dosya, h.no, gameScene ? 'ham delta (izin listesinde yok)' : 'ham delta');
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
// SEZGİSEL: `BitmapText`in de `setText`i var ve o **serbest** — kuralın
// yasakladığı şey `Text` nesnesinin içeriğini değiştirmek, çünkü `Text`
// her değişimde canvas yeniden üretip GPU'ya yüklüyor.
//
// M2'ye kadar kontrol "hiç setText olmasın" idi; bitmap font M2-T08'de
// (planlanandan erken) gelince daraltıldı: **bir dosya `setText` çağırıyorsa
// içinde `Text` nesnesi ÜRETMEMELİ.**
//
// `G02` (2026-08-27) bunu **yanlış pozitif** olarak yakaladı: aynı
// dosyada hem `BitmapText.setText` hem başka bir alanın `add.text`si
// olunca eski kontrol ikisini ayıramayıp ikisini de ihlal sayıyordu.
// Düzeltme: `setText`in **alıcısı** (çağrıldığı ifade — `this.#hizYazi`
// gibi) bulunup dosyada NEREDE atandığı aranıyor. Atama satırı aynı
// satırda `.bitmapText(` içeriyorsa (kod tabanı zinciri hep tek satırda
// yazıyor — `this.#label1x = this.add.text(...).setOrigin(...)` deseniyle
// aynı biçim) o çağrı **serbest**, dosyanın geri kalanı taranmaz. Alıcı
// çözülemezse ya da `add.text`e atanmışsa eski (muhafazakâr) davranışa
// dönülüyor: dosyada herhangi bir `Text` üretimi varsa ihlal.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    const satirlar = kodSatirlari(readFileSync(dosya, 'utf8'));
    const setTextSatirlari = satirlar.filter((s) => /\.setText\s*\(/.test(s.metin));
    if (setTextSatirlari.length === 0) continue;

    const textUretimiVar = satirlar.some((s) =>
      /\badd\.text\s*\(|new\s+Phaser\.GameObjects\.Text\b|GameObjects\.Text\b(?!\s*\.)/.test(
        s.metin,
      ),
    );
    if (!textUretimiVar) continue; // dosyada hiç Text yok — hepsi zaten serbest

    for (const s of setTextSatirlari) {
      const alici = /^(.*?)\.setText\s*\(/.exec(s.metin)?.[1]?.trim().replace(/\?$/, '');
      const bitmapMi =
        alici !== undefined &&
        alici.length > 0 &&
        satirlar.some((a) => {
          const kacisli = alici.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`${kacisli}\\s*[:=](?!=)`).test(a.metin) && /\.bitmapText\s*\(/.test(a.metin);
        });
      if (bitmapMi) continue; // alıcı BitmapText'e atanmış — bu çağrı serbest

      ihlalVar = true;
      ihlal('k.7 ', dosya, s.no, 'setText + aynı dosyada Text üretimi — ayrıştırılamıyor');
    }
  }
  sonuclar.push(['k.7  setText yalnız Text üretmeyen dosyada', !ihlalVar]);
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
//
// **Test dosyaları hariç** — k.9'daki `Math.sqrt` istisnasıyla aynı gerekçe:
// bir performans testinin `performance.now()` ile *kendi koşu süresini*
// ölçmesi kuralın konusu değil. Kural oyun mantığının duvar saatine
// bağlanmasını yasaklıyor; test dosyası yayına girmiyor ve içinde oyun
// mantığı yaşamıyor. Ham `delta` kontrolü (yukarıdaki 1. kontrol) bu
// istisnayı **almıyor**: orada isim bile karışıklık üretiyor.
// ---------------------------------------------------------------------
{
  const kapsam = ['systems', 'util', 'data', 'types'].map((d) => join(SRC, d) + sep);
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;
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
// 10 — Sahne alanları `create()` içinde sıfırlanıyor (mimari)
//
// **Bu tuzak DÖRT kez çıktı:**
//   M0  `create()` içinde `on` → her yeniden başlatmada bir dinleyici daha
//   M4  `#towerBySpot` → yeni oyunda önceki oyunun yok edilmiş kuleleri
//   M5  kışla durumu → aynısı
//   M6  `#gecici` → yok edilmiş sahnenin askerleri sonsuza dek işleniyor
//
// Sebep hep aynı: **alan başlatıcısı yalnız BİR KEZ koşuyor, `create()`
// her yeniden başlatmada.** Phaser sahne örneğini yeniden kullanıyor.
// Sızıntı çökme üretmiyor, "yanlış durum" olarak görünüyor — yani en zor
// fark edilen türden.
//
// Kural: bir sahnenin **değişebilir** özel alanı `create()` gövdesinde
// adı geçmeden var olamaz. Salt okunur sabitler (`readonly x = new X()`
// biçiminde olup `create()`'te dokunulmayanlar) muaf **değil** — çünkü
// `Map`/`Set`/dizi `readonly` olsa da içeriği değişir; M4 ve M6 hataları
// tam olarak bunlardı.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  const sahneler = dosyalar.filter(
    (d) => /scenes[\\/][A-Za-z]+Scene\.ts$/.test(d) && !d.endsWith('.test.ts'),
  );

  for (const dosya of sahneler) {
    const icerik = readFileSync(dosya, 'utf8');
    const satirlar = kodSatirlari(icerik);

    // `create()` gövdesi **süslü parantez eşleştirmesiyle** çıkarılıyor.
    //
    // İlk yazımda "imzadan dosya sonuna kadar" bakılıyordu ve kural
    // **hiçbir şey yakalamıyordu**: alan adları `create()`'in altındaki
    // metotlarda (`#placeTower`, `#kislalariIsle`…) zaten geçiyor, yani
    // kontrol her zaman geçiyordu. Kasıtlı bozma sınamasında ortaya çıktı —
    // bekçinin kendisi de negatif doğrulanmadan güvenilmez.
    /** Bir metodun gövdesini süslü parantez eşleştirmesiyle çıkarır. */
    const govdeCikar = (bas) => {
      let derinlik = 0;
      let basladi = false;
      const metinler = [];
      let sonNo = satirlar[bas].no;
      for (const s of satirlar.slice(bas)) {
        for (const ch of s.metin) {
          if (ch === '{') {
            derinlik++;
            basladi = true;
          } else if (ch === '}') derinlik--;
        }
        metinler.push(s.metin);
        sonNo = s.no;
        if (basladi && derinlik <= 0) break;
      }
      return { metin: metinler.join('\n'), ilkNo: satirlar[bas].no, sonNo };
    };

    // **Üç yaşam döngüsü kancası da sayılıyor: `init`, `preload`, `create`.**
    // Phaser üçünü de sahnenin HER başlatılmasında çağırıyor; kuralın
    // sorduğu şey "alan her başlatmada tazeleniyor mu", "özellikle
    // `create()`'te mi" değil. (`GameOverScene.#data` `init(data)` içinde,
    // `PreloadScene.#bar` `preload()` içinde atanıyor — ikisi de doğru.)
    const kancaBaslari = ['init', 'preload', 'create']
      .map((ad) => satirlar.findIndex((s) => new RegExp(`^\\s*${ad}\\s*\\(`).test(s.metin)))
      .filter((i) => i >= 0);
    if (kancaBaslari.length === 0) continue;

    const kancalar = kancaBaslari.map(govdeCikar);
    let createGovde = kancalar.map((k) => k.metin).join('\n');
    const createBas = kancaBaslari[0];
    void createBas;

    // `create()` çağırdığı özel yardımcıların gövdeleri de sayılıyor.
    //
    // Aksi hâlde kural, kurulumu bir yardımcıya çıkarmayı cezalandırırdı:
    // `#label1x` `#createLabels()` içinde atanıyor ve o da `create()`'ten
    // çağrılıyor — durum her yeniden başlatmada gerçekten tazeleniyor.
    // **Tek kademe.** İki kademe geri çağrıların (`kb.on(... => this.#togglePause())`)
    // içine girip alanı "ele alınmış" sayıyordu — oysa geri çağrı `create()`
    // sırasında koşmuyor, kullanıcı tuşa basınca koşuyor.
    for (let kademe = 0; kademe < 1; kademe++) {
      const cagrilanlar = [...createGovde.matchAll(/this\.(#[A-Za-z][A-Za-z0-9]*)\s*\(/g)].map(
        (m) => m[1],
      );
      for (const ad of new Set(cagrilanlar)) {
        const bas = satirlar.findIndex((s) => new RegExp(`^\\s*${ad}\\s*\\(`).test(s.metin));
        if (bas < 0) continue;
        createGovde += '\n' + govdeCikar(bas).metin;
      }
    }

    // Alan bildirimleri **sınıfın tamamında** aranıyor, yalnız `create()`
    // öncesinde değil: `#gecici` `create()`'in altında bildirilmişti ve
    // ilk sürüm onu kaçırdı.
    for (const s of satirlar) {
      // Kancaların KENDİ satırları atlanıyor. İlk sürüm bitişi "başlangıç +
      // gövde satır SAYISI" diye hesaplıyordu; yorumlar elendiği için o
      // sayı gerçek satır numarasının çok altındaydı ve aralık dosyanın
      // yarısını yutup `#gecici`yi görünmez yapıyordu.
      if (kancalar.some((k) => s.no >= k.ilkNo && s.no <= k.sonNo)) continue;
      // `#ad = deger;` / `#ad?: Tip;` / `readonly #ad = new Map...`
      const m = /^\s*(?:readonly\s+)?(#[A-Za-z][A-Za-z0-9]*)\s*[?:=]/.exec(s.metin);
      if (m === null) continue;
      const ad = m[1];

      // **Adın geçmesi yetmez, ATANMASI gerekir.**
      //
      // İlk sürüm yalnız adı arıyordu ve hiçbir şey yakalamıyordu:
      // `#gecici` `#devKancalari` içinde *okunuyor* (`[...this.#gecici]`),
      // yani "ele alınmış" sayılıyordu — oysa hiç sıfırlanmıyordu ve tam
      // da aradığımız hata oydu.
      const atama = new RegExp(
        `this\\.${ad}\\s*=(?!=)` + // this.#x = ...
          `|this\\.${ad}\\.(clear|reset|splice)\\s*\\(` + // .clear() / .reset() / .splice()
          `|this\\.${ad}\\.length\\s*=`, // .length = 0
      );
      if (atama.test(createGovde)) continue;

      ihlalVar = true;
      ihlal(
        'mim.',
        dosya,
        s.no,
        `${ad} create() içinde sıfırlanmıyor — yeniden başlatmada önceki oyunun durumu taşınır`,
      );
    }
  }
  sonuclar.push(['mim. sahne alanları create() içinde sıfırlanıyor', !ihlalVar]);
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
