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
    // Saati ilerletmek: ham `delta`nın var olma sebebi. `M64`'ten beri
    // `tick` kaç **sabit adım** koşulacağını döndürüyor (S132), ve
    // hit-stop donmuşken saat hiç ilerlemiyor — ikisi tek satırda.
    /^const adimlar = donduruldu \? 0 : this\.clock\.tick\(delta\);$/,
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
// 11 — Havuz sıfırlaması tamlığı (TIER 1 kural 3) — `Y08`
//
// Proje bu hata sınıfını (sıfırlanmayan görsel havuz durumu) **beş kez**
// yaşadı — dördü `resetForPool()` içinde eksik kalan bir `set*` çağrısı
// yüzünden (kural metninin kendi örneği: "sıfırlanmayan hedef referansı
// ölü düşmanı canlı tutar"). Her biri elle gözden geçirmede yakalandı,
// testle değil — `entities/`/`fx/` Phaser'a bağlı olduğu için (kural 11)
// `resetForPool`'un Phaser tarafı `node`'da doğrudan test edilemiyor.
//
// Bekçi `Poolable` sınıflarının **kendi bildirdiği** `HAVUZ_ALANLARI`
// listesini okuyup `resetForPool()` gövdesinde her birine karşılık gelen
// `set${ad}(` (`Tint` özel: `clearTint(`) çağrısını arıyor. Liste elle
// yazılıyor (kaynak metinden **çıkarılmıyor**) — Y08'in kendi notu:
// "hangi setter'ın sıfırlanması gerektiği" Phaser bilgisi ister (ör.
// `Enemy.setFrame` kasıtlı dışarıda, `spawn()` her zaman göstermeden
// önce yazıyor), bir regex bunu güvenilir çıkaramaz. Bekçinin koruduğu
// şey NEYİN sıfırlanması gerektiği değil, **listelenenin gerçekten
// sıfırlanıp sıfırlanmadığı** — yine de listenin kendisi (kod
// incelemesinde görünür, sınıfın en üstünde) yeni bir `set*` eklenince
// "bunu listeye eklemeyi unuttun mu" sorusunu soran görünür bir yer.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;
    const icerik = readFileSync(dosya, 'utf8');
    const satirlar = kodSatirlari(icerik);

    const manifestSatiri = satirlar.findIndex((s) =>
      /static\s+readonly\s+HAVUZ_ALANLARI\s*:/.test(s.metin),
    );
    if (manifestSatiri < 0) continue;

    // Manifest bildirimi tek satıra sığmayabilir (`GoldCoin` tek satır,
    // `Enemy` çok satır) — dizi köşeli parantezini **derinlik sayarak**
    // kapat. İlk denemede yalnız ilk `]` arandı ve bildirim satırındaki
    // `readonly string[]` TİP ek açıklamasının kendi `]`si erken
    // kesiyordu — `alanlar` hep boş çıkıyordu, kontrol sessizce hiçbir
    // şey doğrulamıyordu (kasıtlı bozma sınamasında yakalandı).
    let manifestMetin = '';
    let dizinDerinligi = 0;
    let dizinBasladi = false;
    for (let i = manifestSatiri; i < satirlar.length; i++) {
      const metin = satirlar[i].metin;
      // Bildirim satırındaki tip ek açıklaması (`readonly string[]`)
      // dizi başlamadan önceki köşeli parantezleri saymasın diye,
      // sayım yalnız `= [`den SONRAsında başlıyor.
      const baslangicNoktasi = i === manifestSatiri ? metin.indexOf('= [') + 2 : 0;
      for (let k = Math.max(0, baslangicNoktasi); k < metin.length; k++) {
        const ch = metin[k];
        if (ch === '[') {
          dizinDerinligi++;
          dizinBasladi = true;
        } else if (ch === ']') dizinDerinligi--;
      }
      manifestMetin += metin;
      if (dizinBasladi && dizinDerinligi <= 0) break;
    }
    const alanlar = [...manifestMetin.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);

    const resetBasi = satirlar.findIndex((s) => /resetForPool\s*\(\s*\)\s*:\s*void\s*\{/.test(s.metin));
    if (resetBasi < 0) {
      ihlalVar = true;
      ihlal('k.3 ', dosya, manifestSatiri + 1, 'HAVUZ_ALANLARI var ama resetForPool() bulunamadı');
      continue;
    }

    // `resetForPool()` gövdesi — süslü parantez eşleştirmesiyle (k.10'daki
    // `govdeCikar` ile aynı teknik, bu kontrol kendi kopyasını taşıyor).
    let derinlik = 0;
    let basladi = false;
    const govdeMetinleri = [];
    for (const s of satirlar.slice(resetBasi)) {
      for (const ch of s.metin) {
        if (ch === '{') {
          derinlik++;
          basladi = true;
        } else if (ch === '}') derinlik--;
      }
      govdeMetinleri.push(s.metin);
      if (basladi && derinlik <= 0) break;
    }
    const govde = govdeMetinleri.join('\n');

    for (const ad of alanlar) {
      const aranan = ad === 'Tint' ? 'clearTint(' : `set${ad}(`;
      if (govde.includes(aranan)) continue;
      ihlalVar = true;
      ihlal(
        'k.3 ',
        dosya,
        satirlar[resetBasi].no,
        `HAVUZ_ALANLARI '${ad}' bildiriyor ama resetForPool() ${aranan} çağırmıyor`,
      );
    }
  }
  sonuclar.push(['k.3  HAVUZ_ALANLARI → resetForPool() tam eşleşiyor', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 12 — i18n sızıntısı (CLAUDE.md Teknoloji) — `Y03`
//
// "Oyuncuya görünen hiçbir metin kodun içinde yazılmaz." Bu oturumun
// kanıtı: kural yazılı olmasına rağmen `scenes/`+`fx/`'te ~30 metin
// sızmıştı — bekçiye bağlı OLMAYAN tek TIER-1-komşusu kuraldı.
//
// SEZGİSEL (diğer bekçiler gibi): `src/scenes/` ve `src/fx/` içindeki
// dize/şablon değişmezlerinde **Türkçe'ye özgü karakter** (ç ö ü ş ğ ı
// İ Ç Ö Ü Ş Ğ) arıyor. Bu net, kasıtlı olarak **eksik** — "Top", "Son",
// "Sat", "Tam", "Ses" gibi aksansız Türkçe kelimeleri YAKALAMAZ (Y03'ün
// kendi notu). Yine de gelecekteki sızıntıların büyük çoğunluğu en az
// bir aksanlı harf taşıyacak (mevcut ~30 metnin yalnız 7'si aksansızdı)
// — sıfır kontrolden iyi, kanıt değil.
//
// Beyaz liste: marka adı ('Kale Nöbeti', S63 istisnası) ve havuz dolum
// uyarısının dev-only etiketleri (`#havuzDoldu(` — `console.warn`'a
// gidiyor, `import.meta.env.DEV` korumalı, oyuncu hiç görmüyor).
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  const kapsam = ['scenes', 'fx'].map((d) => join(SRC, d) + sep);
  const trChar = /[çöüşğıÇÖÜŞĞİ]/;
  // Tek satırlık string/template değişmezleri — çok satırlı şablon
  // (nadir, bu kod tabanında görülmedi) kasıtlı olarak dışarıda.
  const dizeDegismezi = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  const MARKA_ADI = 'Kale Nöbeti';

  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;
    if (!kapsam.some((k) => dosya.startsWith(k))) continue;

    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (s.metin.includes('#havuzDoldu(')) continue; // dev-only, oyuncu görmüyor

      dizeDegismezi.lastIndex = 0;
      let m;
      while ((m = dizeDegismezi.exec(s.metin))) {
        const deger = m[1] ?? m[2] ?? m[3] ?? '';
        if (deger === MARKA_ADI) continue; // S63 istisnası
        if (!trChar.test(deger)) continue;
        ihlalVar = true;
        ihlal('i18n', dosya, s.no, `"${deger}" — strings.ts'e taşınmalı, t() ile çağrılmalı`);
      }
    }
  }
  sonuclar.push(['i18n scenes/+fx/ içinde Türkçe metin sabiti yok (sezgisel)', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 13 — Platform yazı boyutu alt sınırı (CLAUDE.md "Platform kısıtları")
//
// "UI, 640×360'a küçültüldüğünde okunur kalmalı: minimum yazı 16 px."
// Mantıksal çözünürlük 1280×720 ve `Scale.FIT` yarıya indiriyor, yani
// 16 px'in altı o boyutta 8 fiziksel pikselin altına düşüyor.
//
// Bu kontrol `Y03` Adım 3'ün 640×360 denetiminden doğdu: kural
// `CLAUDE.md`'de yazılıydı ama bekçiye bağlı değildi ve **ihlal
// edilmişti** (`BuildMenu`'nün hedefleme satırı 14 px). k.12'nin
// gerekçesiyle birebir aynı ders: bağlanmayan kural tutmuyor.
//
// Kapsam `scenes/`+`fx/` — oyuncuya görünen her `Text` orada üretiliyor.
// `BitmapText`'in boyutu `fontSize` ile verilmiyor, bu net onu hiç
// görmüyor (sayı fontu zaten tek boyutlu bir doku).
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  const kapsam = ['scenes', 'fx'].map((d) => join(SRC, d) + sep);
  const ASGARI_PX = 16;
  const yaziBoyutu = /fontSize:\s*'(\d+)px'/g;

  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;
    if (!kapsam.some((k) => dosya.startsWith(k))) continue;

    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      yaziBoyutu.lastIndex = 0;
      let m;
      while ((m = yaziBoyutu.exec(s.metin))) {
        const px = Number(m[1]);
        if (px >= ASGARI_PX) continue;
        ihlalVar = true;
        ihlal('platform', dosya, s.no, `${px}px < ${ASGARI_PX}px — 640×360'ta okunmaz`);
      }
    }
  }
  sonuclar.push([`platform yazı boyutu ≥ ${ASGARI_PX}px (scenes/+fx/)`, !ihlalVar]);
}

// ---------------------------------------------------------------------
// 14 — `localStorage` yalnız `util/storage.ts` (TIER 1 kural 10)
//
// Kural "her `localStorage` erişimi try/catch içinde" diyor. Bunu satır
// satır kovalamak yerine **tek kapı** zorlanıyor: erişim yalnız
// `LocalStore`'un içinde yaşıyor ve try/catch orada, testli. k.9'un
// (`Math.sqrt` yalnız `math.ts`) birebir aynı deseni.
//
// Gizli sekmede `localStorage`'ın **varlığını okumak** bile fırlatıyor
// (`storage.ts`'in kendi notu), yani "sadece kontrol ediyorum" diyen bir
// satır da ihlal — bu yüzden net kelimenin kendisini arıyor, çağrıyı
// değil.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  const izinli = join(SRC, 'util', 'storage.ts');

  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;
    if (dosya === izinli) continue;

    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (!s.metin.includes('localStorage')) continue;
      ihlalVar = true;
      ihlal('k.10', dosya, s.no, 'localStorage yalnız util/storage.ts içinde — try/catch orada');
    }
  }
  sonuclar.push(['k.10 localStorage yalnız util/storage.ts', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 15 — Yayın yapısında konsol çıktısı yok (CLAUDE.md "Platform kısıtları")
//
// "Yayın yapısında konsol çıktısı, hata ayıklama tuşları ve FPS sayacı
// bulunmaz." Kod tabanındaki iki `console` çağrısı da
// `import.meta.env.DEV` korumalı ve üretimde siliniyor (doğrulandı:
// `dist/` içinde `[havuz]`/`[can]` etiketleri yok).
//
// Net aynı satırda koruma arıyor. Çok satırlı bir `if (DEV) { … }` bloğu
// yanlış pozitif verir — kod tabanındaki desen tek satır olduğu için
// kabul edildi; çıkarsa ya satır tek satıra indirilir ya buraya istisna
// yazılır. `dist/`'teki Phaser'ın kendi uyarıları bu kuralın konusu
// değil (kütüphane davranışı, bizim çıktımız değil).
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  const konsol = /\bconsole\.\w+\s*\(/;

  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;

    for (const s of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (!konsol.test(s.metin)) continue;
      if (s.metin.includes('import.meta.env.DEV')) continue;
      ihlalVar = true;
      ihlal('platform', dosya, s.no, 'console çağrısı import.meta.env.DEV ile korunmalı');
    }
  }
  sonuclar.push(['platform console yalnız DEV korumalı', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 16 — Dokunmatik hedef alt sınırı (CLAUDE.md "Platform kısıtları")
//
// k.13'ün cümlesinin diğer yarısı: "minimum dokunmatik hedef 44×44 px
// (1280×720 ölçeğinde)". `Y03` Adım 3'ün 640×360 denetiminde elle
// tarandı; bir daha elle taranmasın diye bağlanıyor.
//
// SEZGİSEL: `createParchmentButton(scene, x, y, W, H, …)` çağrılarının
// 4. ve 5. argümanını okuyor. Sayı değişmezlerini ve **aynı dosyadaki
// modül düzeyi `const AD = <sayı>;` tanımlarını** çözebiliyor
// (`BTN`, `KART_W`, `MOD_BUTON_W` böyle yakalanıyor). Parametre ya da
// ifade (`genislik`, `w`, `h`) **çözülemiyor ve sessizce atlanıyor** —
// kasıtlı kör nokta, k.12'nin aksansız-Türkçe kör noktasıyla aynı
// dürüstlük düzeyinde: sıfır kontrolden iyi, kanıt değil.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  const ASGARI_HEDEF = 44;
  const sabitTanim = /^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*;/;
  const cagri = /createParchmentButton\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^,)]+)/;

  for (const dosya of dosyalar) {
    if (dosya.endsWith('.test.ts')) continue;
    const satirlar = kodSatirlari(readFileSync(dosya, 'utf8'));

    const sabitler = new Map();
    for (const s of satirlar) {
      const m = sabitTanim.exec(s.metin);
      if (m !== null) sabitler.set(m[1], Number(m[2]));
    }
    const coz = (ifade) => {
      const t = ifade.trim();
      if (/^\d+$/.test(t)) return Number(t);
      if (sabitler.has(t)) return sabitler.get(t);
      return null; // parametre/ifade — bu net göremiyor
    };

    for (const s of satirlar) {
      const m = cagri.exec(s.metin);
      if (m === null) continue;
      for (const [i, ad] of [
        [1, 'genişlik'],
        [2, 'yükseklik'],
      ]) {
        const v = coz(m[i]);
        if (v === null || v >= ASGARI_HEDEF) continue;
        ihlalVar = true;
        ihlal('platform', dosya, s.no, `dokunmatik hedef ${ad} ${v}px < ${ASGARI_HEDEF}px`);
      }
    }
  }
  sonuclar.push([`platform dokunmatik hedef ≥ ${ASGARI_HEDEF}px (çözülebilen ölçüler)`, !ihlalVar]);
}

// ---------------------------------------------------------------------
// 17 — `base: './'` (CLAUDE.md "Platform kısıtları" · `RISKS.md` **R15**)
//
// R15: "Mutlak yol kullanılırsa oyun portalda **hiç yüklenmez**.
// `npm run dev`'de fark edilmez." Erken uyarısı "dist/ alt klasörden
// servis edilince beyaz ekran" — yani ancak yayın anında görülüyor.
// Tek satırlık bir hata, yüksek etki: bekçilenmesi bedava.
//
// `src/` dışında olduğu için tek dosya doğrudan okunuyor.
// ---------------------------------------------------------------------
{
  const yol = 'vite.config.ts';
  let ok = false;
  try {
    ok = /base:\s*'\.\/'/.test(readFileSync(yol, 'utf8'));
  } catch (e) {
    taranamayan.push(`${yol} (${e.code ?? 'hata'})`);
  }
  if (!ok) ihlal('platform', yol, 0, "base: './' yok — mutlak yol portalda beyaz ekran (R15)");
  sonuclar.push(["platform vite base: './' (R15)", ok]);
}

// ---------------------------------------------------------------------
// 18 — Ham kule fiyatı (`S117`, `M79`)
//
// `TowerTier.cost` **ham** fiyat; oyuncunun ödediği `maliyet(ham, map)`.
// Fiyat üç dosyada yirmi beş yerden okunuyordu ve birini atlamak
// "menüde yazan fiyat ile kesilen fiyat farklı" demek — sessiz ve
// oyuncuya güven kaybettiren bir hata. Tek adres zorunlu.
//
// **Muaf:** `towers.ts` (`maliyet` orada yaşıyor) ve `*.test.ts` — testler
// HAM tabloyu sınamakta serbest, çünkü korunan şey **çalışma zamanında**
// ödenen fiyat. Kör noktası: fiyatı bir değişkene alıp başka satırda
// kullanan kod (`const c = t.cost` → ilk satır yakalanır, ikincisi değil).
//
// **SÖZCÜK SINIRI KAÇIŞI KULLANMA.** Bu kural ilk yazıldığında regex
// `/\.cost\b/` idi; geçtiği katmanlarda \b **gerçek bir geri-boşluk
// baytına** (0x08) dönüştü ve regex `/\.cost<BS>/` hiçbir şeyle
// eşleşmez oldu — kural **sessizce hep yeşil** döndü, S136'nın aynısı
// ("ateşlenmeyen bekçi"). Yerine karakter sınıfı kullanılıyor.
// Negatif doğrulama yapıldı:
// `GameScene`'e kasten ham `.cost` kondu → 17/18.
// ---------------------------------------------------------------------
{
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    // `maliyet` burada yaşıyor; testler HAM tabloyu sınamakta serbest.
    if (/towers\.ts$/.test(dosya) || /\.test\.ts$/.test(dosya)) continue;
    for (const h of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      if (!/\.cost(?![A-Za-z0-9_])/.test(h.metin)) continue;
      if (/maliyet\s*\(/.test(h.metin)) continue; // zaten sarılmış
      ihlalVar = true;
      ihlal('S117', dosya, h.no, 'ham `.cost` — `maliyet(ham, map)` kullan');
    }
  }
  sonuclar.push(['S117 kule fiyatı tek adresten (maliyet)', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 19 — Özel Phaser yapımının **kapalı** ad uzayları (`M100`)
//
// `src/vendor/phaser-custom.js` Phaser'ın çekirdeğinden başlayıp yalnız
// bu projenin kullandığı modülleri geri ekliyor (paket boyutu, `Y11`).
// Tipler ise tam `phaser` paketinden geliyor. Sonuç: yapımın taşımadevam
// bir API `npm run typecheck`'ten **yeşil** geçiyor, `node` testleri
// Phaser çalıştırmadığı için onu da görmüyor, ve oyun o kod yolu
// oynanınca tarayıcıda çöküyor. Dosyanın kendi “Nasıl kırılır” başlığı
// bunu yazılı olarak söylüyordu ve tek çaresi **elle tam tur**du.
//
// `M100` bu tuzağa canlı düştü: seviye pimleri `Phaser.Geom.Point` ile
// çiziliyordu, typecheck yeşildi, kapı 18/18'di ve düğme tarayıcıda her
// karede `Point is not a constructor` atıyordu.
//
// **Kapsam — yalnız KAPALI ad uzayları.** Yapım iki biçimde yazıyor:
//   `Phaser.Math.Clamp = Clamp;`        → EKLEME, altındaki çekirdek durur
//   `Phaser.Geom = { Rectangle, ... };` → KAPALI, yüzey tam olarak bu
// Kural yalnız ikincisini denetliyor, çünkü üyeleri **dosyanın
// kendisinden türetilebilen** tek küme o (elle yazılmış liste yok — TIER 2).
// Birinci biçimin boşlukları için elle tam tur hâlâ tek çare.
//
// Bilinen yanlış pozitif sınıfı: yalnız **tip** konumunda geçen
// `Phaser.NS.Üye` (derlemede siliniyor, çalışma zamanı riski yok).
// Bugün öyle bir kullanım yok; çıkarsa muafiyet buraya yazılır.
// Negatif doğrulama: `Phaser.Geom.Point` ile 18/19, kaldırılınca 19/19.
// ---------------------------------------------------------------------
{
  const ozelYol = join(SRC, 'vendor', 'phaser-custom.js');
  let ozel = null;
  try {
    ozel = readFileSync(ozelYol, 'utf8');
  } catch (e) {
    taranamayan.push(`${relative('.', ozelYol).split(sep).join('/')} (${e.code ?? 'hata'})`);
  }
  let ihlalVar = false;
  if (ozel === null) {
    // Yapım dosyası okunamadıysa kural **sessizce yeşil dönemez** (S136).
    ihlalVar = true;
    ihlal('M100', ozelYol, 0, 'özel Phaser yapımı okunamadı — kural kör kalırdı');
  } else {
    /** Ad uzayı → taşıdığı üyeler. Yalnız `Phaser.NS = { ... }` biçimi. */
    const kapali = new Map();
    for (const e of ozel.matchAll(/^Phaser\.(\w+)\s*=\s*\{([^}]*)\}/gm)) {
      const uyeler = new Set();
      for (const u of e[2].matchAll(/(\w+)\s*:/g)) uyeler.add(u[1]);
      kapali.set(e[1], uyeler);
    }
    // Sonradan eklenen alt üyeler de yüzeye dahil (`Phaser.Geom.Circle.X = ...`).
    for (const e of ozel.matchAll(/^Phaser\.(\w+)\.(\w+)/gm)) {
      if (kapali.has(e[1])) kapali.get(e[1]).add(e[2]);
    }
    for (const dosya of dosyalar) {
      if (relative('.', dosya).split(sep).join('/').includes('/vendor/')) continue;
      for (const h of kodSatirlari(readFileSync(dosya, 'utf8'))) {
        for (const e of h.metin.matchAll(/(?<![A-Za-z0-9_$])Phaser\.(\w+)\.(\w+)/g)) {
          const uyeler = kapali.get(e[1]);
          if (uyeler === undefined || uyeler.has(e[2])) continue;
          ihlalVar = true;
          ihlal('M100', dosya, h.no,
            `\`Phaser.${e[1]}.${e[2]}\` özel yapımda YOK — tarayıcıda çöker`);
        }
      }
    }
  }
  sonuclar.push(['M100 özel Phaser yapımının kapalı yüzeyi', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 20 — Özel Phaser yapımı ÖLÜ modül taşımasın (`M101`)
//
// 19. kural "kullanılan bir şey yapımda var mı" diye soruyor; bu kural
// tersini soruyor: **yapımdaki her şeyin bir kullanıcısı var mı.**
// Dosyanın kendi varlık sebebi bu — "yalnız bu projenin gerçekten
// kullandığı modülleri geri ekler" (TIER 1 kural 2, paket boyutu).
//
// `M101`'de ölçüldü: altı satırın (`Math.Linear`, `Math.Wrap`,
// `Math.Distance`, `Math.Easing`, `Math.RandomDataGenerator`,
// `Geom.Circle`) `src/` içinde **sıfır** okuyucusu vardı. Dosyanın
// başlığı onları "taramada kullanıldığı görülen parçalar" diye
// anlatıyordu — hepsi doğruydu bir zamanlar, bugün değil.
//
// **Kapsam:** yalnız `import X from '...'` biçiminde alınıp SADECE
// `Phaser.A.B = X;` satırlarında geçen modüller. Yan etki import'ları
// (`import 'phaser/src/.../XFactory'`) bu kuralın dışında — onlar
// `scene.add.*` üstüne kayıt yapıyor, adlarıyla okunmuyorlar.
//
// **Muafiyet:** assignment satırının sonuna `// bekçi: <gerekçe>`
// yazılırsa kural o satırı atlıyor. Bugün üç tane var ve üçü de
// "adıyla okunmuyor ama fabrika/alt sınıf yoluyla gerekli" diyor.
// Muafiyet listesi bekçide DEĞİL dosyanın kendisinde, çünkü gerekçe
// orada okunmalı.
//
// Negatif doğrulama: `Phaser.Math.Wrap = Wrap;` geri konunca 19/20.
// ---------------------------------------------------------------------
{
  const ozelYol = join(SRC, 'vendor', 'phaser-custom.js');
  let ihlalVar = false;
  let ozel = null;
  try {
    ozel = readFileSync(ozelYol, 'utf8');
  } catch (e) {
    taranamayan.push(`${relative('.', ozelYol).split(sep).join('/')} (${e.code ?? 'hata'})`);
  }
  if (ozel === null) {
    ihlalVar = true;
    ihlal('M101', ozelYol, 0, 'özel Phaser yapımı okunamadı — kural kör kalırdı');
  } else {
    const satirlar = ozel.split(String.fromCharCode(10));
    /** `src/` (vendor hariç) içindeki tüm kod — `Phaser.A.B` aranacak yer. */
    const kullanim = dosyalar
      .filter((d) => !relative('.', d).split(sep).join('/').includes('/vendor/'))
      .map((d) => readFileSync(d, 'utf8'))
      .join(String.fromCharCode(10));
    for (const [i, satir] of satirlar.entries()) {
      const imp = /^import (\w+) from '(phaser\/src\/[^']+)'/.exec(satir);
      if (imp === null) continue;
      const ad = imp[1];
      const gectigi = satirlar
        .map((s, k) => ({ s, k }))
        // `import` ve YORUM satırları sayılmıyor: modül yolu da adı
        // içeriyor (`.../TileSpriteFactory`), dosyanın başlığındaki
        // gerekçe tablosu da adı yazıyor. Sayılsalardı kural o modülü
        // "başka işi de var" sanıp **sessizce** atlardı — S136 sınıfı.
        .filter(({ s, k }) => k !== i && !/^import /.test(s)
          && !/^\s*(\/\/|\/\*|\*)/.test(s)
          && new RegExp(`(?<![A-Za-z0-9_$])${ad}(?![A-Za-z0-9_$])`).test(s));
      // Ad alanı doldurmaktan BAŞKA bir işi varsa (alt sınıf, çağrı) bu
      // kuralın konusu değil.
      const atamalar = gectigi.filter(({ s }) => /^Phaser\.[\w.]+\s*=/.test(s));
      if (atamalar.length === 0 || atamalar.length !== gectigi.length) continue;
      for (const { s, k } of atamalar) {
        if (s.includes('// bekçi:')) continue;
        const hedef = /^(Phaser\.[\w.]+)\s*=/.exec(s)?.[1];
        if (hedef === undefined) continue;
        // `Phaser.Geom = { Rectangle: X }` biçimi: üyeyi ayrıca ara.
        const aranan = /=\s*\{/.test(s) ? `${hedef}.${ad.replace(/^Geom/, '')}` : hedef;
        if (kullanim.includes(aranan)) continue;
        ihlalVar = true;
        ihlal('M101', ozelYol, k + 1,
          `\`${aranan}\` src/'te hiç okunmuyor — ölü modül (kaldır ya da \`// bekçi:\` gerekçesi yaz)`);
      }
    }
  }
  sonuclar.push(['M101 özel Phaser yapımı ölü modül taşımıyor', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 21 — `data/`, `systems/`, `util/` ÖLÜ dışa aktarım taşımasın (`M103`)
//
// 20. kural aynı soruyu Phaser yapımına sordu; bu, projenin **kendi**
// koduna soruyor. Gerekçe TIER 1 kural 1: denge verisinin adresi
// `src/data` ve kimsenin okumadığı bir sabit, yetkili görünen ama
// hiçbir şey yapmayan bir sayıdır.
//
// `M103` dördünü buldu ve dördü de farklı bir zarardı:
//   `deriveBossHp`          `M18` (S113) **reddettiği** ölçütü hâlâ
//                           çağrılmaya hazır tutuyordu — onu çağıran
//                           biri reddedilmiş bir boss HP'si alırdı.
//   `ceilingAApplies`       "bu düşman Kısıt A'dan muaf mı" kapısı;
//                           hiçbir test onu sormuyordu.
//   `stepBarracks`          `stepSoldiers`'ın çağrılmayan sarmalayıcısı.
//   `REST_K_KULLANILMIYOR`  bir kararın `true` dönen sabit hâli.
//
// **Kapsam:** yalnız `export const` / `export function`. Tipler
// dışarıda: derlemede siliniyorlar, yani çalışma zamanı tuzağı
// üretmiyorlar.
//
// **Okuyucu havuzuna `scripts/*.mjs` de giriyor** — belge üreticisi
// `src/data`'yı meşru biçimde okuyor (`KISLA_ILE_DOGRULANAN` yalnız
// orada kullanılıyor) ve onu saymamak yanlış alarm üretirdi.
//
// **Muafiyet:** dışa aktarım satırında `// bekçi: <gerekçe>` (20. kuralın
// deseni). Bugün hiç yok.
//
// Kör noktası yazılı: ad bir **satır içi** yorumda geçerse sayılır.
// Satır başındaki yorumlar `kodSatirlari` ile eleniyor.
// Negatif doğrulama: `export const OLU_SABIT = 1;` kondu → 20/21.
// ---------------------------------------------------------------------
{
  const DISA_AKTARIM = /^export\s+(?:const|function)\s+(\w+)/;
  const kodHavuzu = [];
  for (const dosya of dosyalar) {
    kodHavuzu.push(kodSatirlari(readFileSync(dosya, 'utf8')).map((h) => h.metin).join(' '));
  }
  try {
    for (const ad of readdirSync(join(process.cwd(), 'scripts'))) {
      if (!ad.endsWith('.mjs')) continue;
      const tam = join(process.cwd(), 'scripts', ad);
      kodHavuzu.push(kodSatirlari(readFileSync(tam, 'utf8')).map((h) => h.metin).join(' '));
    }
  } catch (e) {
    taranamayan.push(`scripts/ (${e.code ?? 'hata'})`);
  }
  const havuz = kodHavuzu.join('\n');
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    const yol = relative('.', dosya).split(sep).join('/');
    if (!/^src\/(data|systems|util)\//.test(yol) || yol.endsWith('.test.ts')) continue;
    for (const h of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      const m = DISA_AKTARIM.exec(h.metin);
      if (m === null || h.metin.includes('// bekçi:')) continue;
      const kez = havuz.match(new RegExp(`(?<![A-Za-z0-9_$])${m[1]}(?![A-Za-z0-9_$])`, 'g'));
      if ((kez?.length ?? 0) > 1) continue;
      ihlalVar = true;
      ihlal('M103', dosya, h.no,
        `\`${m[1]}\` hiçbir yerde okunmuyor — ölü dışa aktarım (kaldır ya da \`// bekçi:\` gerekçesi yaz)`);
    }
  }
  sonuclar.push(['M103 data/systems/util ölü dışa aktarım taşımıyor', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 22 — Her olayın bir YAYANI ve bir DİNLEYENİ olsun (`M104`)
//
// 20. ve 21. kural "taşınan her şeyin okuyucusu var mı" diye soruyor;
// bu, aynı soruyu `EventBus`'a soruyor. CLAUDE.md'nin mimari kuralı
// *"sistemler birbirini doğrudan çağırmaz, EventBus üzerinden
// haberleşir"* diyor — yani dinleyicisiz bir olay, olmayan bir kanalı
// varmış gibi gösteriyor.
//
// `M104`'te üçü birden çıktı ve üçü de farklı sonuç verdi:
//   `game:paused`   dinleyicisizdi ve bu bir **kusuru gizliyordu**:
//                   ipucu balonunun duvar saati duraklatmayı görmüyor,
//                   balon perdenin arkasında süresini doldurup
//                   kayboluyordu (tarayıcıda ölçüldü). Dinleyici eklendi.
//   `speed:changed` hızın gerçek kanalı doğrudan `clock.setScale`
//                   çağrısıydı; olay onu yalnız tekrarlıyordu. Kaldırıldı.
//   `save:failed`   bilerek dinleyicisiz bir seam — `// bekçi:` taşıyor.
//
// **Kapsam:** `src/types/events.ts` içindeki `'ad:ad':` satırları.
// Yayan/dinleyen aranırken **testler sayılmıyor**: bir olayı yalnız
// testin yayması, oyunda o kanalın çalıştığı anlamına gelmez.
//
// Kör noktası: olay adı bir değişkene alınıp öyle yayılırsa
// (`bus.emit(ad, ...)`) bu kural göremez. Bugün öyle bir kullanım yok.
// Negatif doğrulama: `game:paused` dinleyicisi kaldırılınca 21/22.
// ---------------------------------------------------------------------
{
  const olayYolu = join(SRC, 'types', 'events.ts');
  let ihlalVar = false;
  let kaynak = null;
  try {
    kaynak = readFileSync(olayYolu, 'utf8');
  } catch (e) {
    taranamayan.push(`${relative('.', olayYolu).split(sep).join('/')} (${e.code ?? 'hata'})`);
  }
  if (kaynak === null) {
    ihlalVar = true;
    ihlal('M104', olayYolu, 0, 'olay sözleşmesi okunamadı — kural kör kalırdı');
  } else {
    /** Oyun kodu (testler ve sözleşmenin kendisi hariç), yorumsuz. */
    const oyunSatirlari = [];
    for (const dosya of dosyalar) {
      const yol = relative('.', dosya).split(sep).join('/');
      if (yol.endsWith('.test.ts') || yol === 'src/types/events.ts') continue;
      for (const h of kodSatirlari(readFileSync(dosya, 'utf8'))) oyunSatirlari.push(h.metin);
    }
    const bildirim = /^\s{2}'([a-z]+:[a-zA-Z]+)':/;
    let sayi = 0;
    for (const h of kodSatirlari(kaynak)) {
      const m = bildirim.exec(h.metin);
      if (m === null) continue;
      sayi += 1;
      if (h.metin.includes('// bekçi:')) continue;
      const anahtar = `'${m[1]}'`;
      const yayan = oyunSatirlari.some((s) => s.includes(anahtar) && /\.emit\s*\(/.test(s));
      const dinleyen = oyunSatirlari.some(
        (s) => s.includes(anahtar) && /\.(on|once)\s*\(/.test(s),
      );
      if (yayan && dinleyen) continue;
      ihlalVar = true;
      const eksik = !yayan && !dinleyen ? 'yayanı da dinleyeni de' : !yayan ? 'yayanı' : 'dinleyeni';
      ihlal('M104', olayYolu, h.no,
        `\`${m[1]}\` olayının ${eksik} yok — ölü kanal (bağla, kaldır ya da \`// bekçi:\` yaz)`);
    }
    if (sayi === 0) {
      ihlalVar = true;
      ihlal('M104', olayYolu, 0, 'hiç olay bulunamadı — kural sessizce yeşil dönerdi (S136)');
    }
  }
  sonuclar.push(['M104 her olayın yayanı ve dinleyeni var', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 23 — Hareket, hareket AYARINI izlesin (TIER 1 kural 6, `M105`)
//
// Kural 6: *"ekran sarsıntısı ve parçacık yoğunluğu ayarlardan
// kapatılabilir olmalı. `prefers-reduced-motion` saygı görür."*
// `Settings.reducedMotionDefaults()` o tercihte `screenShake: false` ve
// `effects: 'low'` veriyor — ama bunu **okumayan** bir tween o tercihi
// hiç görmüyor.
//
// `M105`'te sayıldı: tween kuran 8 dosyanın **5'i** ayarı hiç
// okumuyordu — gülle nabzı (`repeat: -1`, sahadaki her mermide sürekli),
// boss pankartının büyümesi, başarım şeridinin kayması, yetenek
// düğmesinin hazır-olma nabzı ve kayıt uyarısının kayması. Yani
// "hareketi azalt" diyen oyuncuya oyun beşini de tam güçte oynatıyordu.
//
// **Kural sezgisel:** tween kuran dosya, **kod** satırlarında hareket
// ayarına dair bir ad geçirmeli (`effectScale`, `screenShake`,
// `hareketOlcegi`, `olcek`). Yorumda geçmesi saymıyor — `Tower.ts`
// ayarı yalnız bir `@param` notunda anıyor olsaydı kural onu yakalardı.
// Gerçekten hareketsiz bir tween varsa satırına `// bekçi:` yazılır.
//
// Ölçmediği şey: adı geçirip **kullanmayan** dosya. Bu sınıfı otomatik
// ayırmanın yolu yok; kural ağ, kanıt değil (§17'nin kendi cümlesi).
// Negatif doğrulama: `Projectile.ts`'ten `hareketOlcegi` kaldırıldı → 22/23.
// ---------------------------------------------------------------------
{
  const AYAR_ADLARI = ['effectScale', 'screenShake', 'hareketOlcegi', 'olcek'];
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    const yol = relative('.', dosya).split(sep).join('/');
    if (yol.endsWith('.test.ts')) continue;
    const kod = kodSatirlari(readFileSync(dosya, 'utf8'));
    const tweenSatirlari = kod.filter(
      (h) => /\btweens\s*\.\s*add\s*\(/.test(h.metin) && !h.metin.includes('// bekçi:'),
    );
    if (tweenSatirlari.length === 0) continue;
    const govde = kod.map((h) => h.metin).join('\n');
    if (AYAR_ADLARI.some((a) => govde.includes(a))) continue;
    ihlalVar = true;
    for (const h of tweenSatirlari) {
      ihlal('M105', dosya, h.no,
        'tween var ama dosya hareket ayarını hiç okumuyor (k.6) — ölçeğe bağla ya da `// bekçi:` yaz');
    }
  }
  sonuclar.push(['M105 hareket, hareket ayarını izliyor (k.6)', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 24 — Dokunma hedefi ÖLÇÜLÜ bir nesnede olsun (`M114`)
//
// Platform kuralı 44×44 px istiyor. 16. kural bunu ancak **çözülebilen
// ölçülerde** görüyor: `rectangle(x, y, 44, 44)` gibi sayı taşıyan
// çağrılarda. Hedef bir `Image` ya da `Text`in **kendi sınırlarından**
// geliyorsa ortada denetlenecek bir sayı yok ve kural kör kalıyor.
//
// `M112`/`M113` üç örneği birden ölçtü (tarayıcıda, `getBounds`):
//   "← Geri" bağlantısı   62×19  (üç ekranda geri dönmenin tek yolu)
//   dalga telgrafı ikonu  22×22
//   kule paneli ikonu     20×20
// Üçü de `setInteractive`'i doğrudan bir `image`/`text` zincirine
// takıyordu — yani hepsinin ortak imzası **aynıydı**.
//
// Kural o imzayı yasaklıyor: `setInteractive` çağrısının bulunduğu
// deyim, ölçüsü **açıkça yazılmış** bir nesneye bağlanmalı
// (`rectangle(...)`, `Geom.Rectangle`, `setSize(...)`) ve bir
// `image`/`text`/`bitmapText` üretimi içermemeli. Ölçünün 44 olup
// olmadığına 16. kural bakıyor; bu kural yalnız **bakılabilir**
// olmasını sağlıyor.
//
// Sezgisel: deyim penceresi, `setInteractive` satırından geriye doğru
// ilk `;` ya da blok başına kadar. Gerçekten ölçüsüz bir hedef
// gerekiyorsa satıra `// bekçi:` yazılır. Bugün hiç yok.
// Negatif doğrulama: `WaveTelegraph`'ta hedef ikona geri takıldı → 23/24.
// ---------------------------------------------------------------------
{
  const OLCULU = ['.rectangle(', 'Geom.Rectangle', 'setSize('];
  const URETIM = ['.image(', '.text(', '.bitmapText('];
  let ihlalVar = false;
  for (const dosya of dosyalar) {
    if (relative('.', dosya).endsWith('.test.ts')) continue;
    const kod = kodSatirlari(readFileSync(dosya, 'utf8'));
    for (const [i, h] of kod.entries()) {
      if (!h.metin.includes('setInteractive')) continue;
      if (h.metin.includes('// bekçi:')) continue;
      // Deyim penceresi: geriye doğru, `;` ile biten satırdan sonrası.
      const pencere = [h.metin];
      for (let k = i - 1; k >= 0 && i - k <= 8; k--) {
        const onceki = kod[k]?.metin ?? '';
        if (onceki.trimEnd().endsWith(';')) break;
        pencere.unshift(onceki);
      }
      // İleri de bakılıyor: `setInteractive(` çok satırlı olabiliyor ve
      // isabet alanı (`new Phaser.Geom.Rectangle(...)`) **sonraki**
      // satırda duruyor (`ParchmentFrame`, `TutorialHints`).
      if (!h.metin.trimEnd().endsWith(';')) {
        for (let k = i + 1; k < kod.length && k - i <= 8; k++) {
          const sonraki = kod[k]?.metin ?? '';
          pencere.push(sonraki);
          if (sonraki.trimEnd().endsWith(';')) break;
        }
      }
      const govde = pencere.join(' ');
      if (URETIM.some((u) => govde.includes(u))) {
        ihlalVar = true;
        ihlal('M114', dosya, h.no,
          'dokunma hedefi `image`/`text` üstünde — ölçüsü yazılı bir nesneye taşı (k. platform 44×44)');
        continue;
      }
      if (!OLCULU.some((o) => govde.includes(o))) {
        ihlalVar = true;
        ihlal('M114', dosya, h.no,
          'dokunma hedefinin ölçüsü görünmüyor — `rectangle`/`setSize`/`Geom.Rectangle` kullan');
      }
    }
  }
  sonuclar.push(['M114 dokunma hedefi ölçülü nesnede', !ihlalVar]);
}

// ---------------------------------------------------------------------
// 25 — `strings.ts` ÖLÜ oyuncu metni taşımasın (`M122`)
//
// 21. kural aynı soruyu `export`lara soruyor ama metin anahtarları
// **nesne alanı**, yani ona görünmüyorlar. İki ayrı zarar veriyorlar:
//
//   1. Her anahtar **iki** çeviri demek — `STRINGS` tipi
//      `Record<Locale, Record<StringKey, string>>` ve derleyici eşitliği
//      zorluyor. Ölü bir anahtar iki dilde birden bakım yükü.
//   2. Asıl sebep bu değil: yazılıp **bağlanmamış** bir metin, `M31`'in
//      "yarım kalmış takas" sınıfının imzası. `saveFailed` (TIER 1
//      kural 10: "kayıt başarısızsa oyuncuya bir kez bildirilir")
//      bağlanmamış olsaydı kural sessizce tutulmamış olurdu — o bağlıydı,
//      ama bunu ancak bir tarama söyleyebilir.
//
// `M122` ikisini buldu: `speed` ('Hız' — hız düğmesi yalnız `1×` yazıyor,
// etiket hiç kullanılmadı) ve `achLocked` ('Kilitli' — başarım ekranı
// kilidi **dolu/boş yıldız karesiyle** anlatıyor, yani metin fazlalık ve
// TIER 1 kural 6 zaten sağlanıyor).
//
// **Tarama neden literal eşleşmesi:** `t(key: StringKey)` her çağrıda
// sabit alıyor; projede dinamik anahtar kurulumu yok (arandı). Kırılırsa
// bu kural yanlış alarm üretir — o gün çözüm `// bekçi:` değil, dinamik
// kurulumun kendisini sorgulamak.
//
// **Havuza testler de giriyor:** bir anahtarı yalnız test çağırıyorsa ölü
// değil, kapsanmış demektir (21. kuralın havuz kararı).
// Negatif doğrulama: `olsun: 'x'` kondu → 24/25.
// ---------------------------------------------------------------------
{
  const BT = String.fromCharCode(96);
  const STR_YOLU = 'src/data/strings.ts';
  let ihlalVar = false;
  try {
    const metin = readFileSync(STR_YOLU, 'utf8');
    const satirlar = metin.split(String.fromCharCode(10));
    const trBas = satirlar.findIndex((l) => l.startsWith('const TR'));
    const trSon = satirlar.findIndex((l, i) => i > trBas && l.startsWith('} as const'));
    const havuz = dosyalar
      .filter((d) => !relative('.', d).split(sep).join('/').endsWith(STR_YOLU))
      .map((d) => readFileSync(d, 'utf8'))
      .join(String.fromCharCode(10));
    for (let i = trBas + 1; i < trSon; i++) {
      const l = satirlar[i] ?? '';
      const m = /^ +([A-Za-z0-9_]+): '/.exec(l);
      if (m === null || l.includes('// bekçi:')) continue;
      const ad = m[1];
      if (havuz.includes("'" + ad + "'") || havuz.includes('"' + ad + '"')) continue;
      ihlalVar = true;
      ihlal('M122', STR_YOLU, i + 1,
        BT + ad + BT + ' metnini hiçbir yer göstermiyor — ölü oyuncu metni (kaldır ya da bağla)');
    }
  } catch (e) {
    taranamayan.push(STR_YOLU + ' (' + (e.code ?? 'hata') + ')');
  }
  sonuclar.push(['M122 strings.ts ölü oyuncu metni taşımıyor', !ihlalVar]);
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
