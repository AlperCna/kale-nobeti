/**
 * Harita verisi. TIER 1 kural 1: sayılar burada, sistem dosyalarında değil.
 *
 * Kaynak: `docs/GAME-DESIGN.md` §9 tablosu (ad, yapı noktası sayısı, giriş
 * sayısı, çarpanlar, başlangıç altını) ve §5 (harita başına düşman kadrosu).
 *
 * **Koordinatlar dokümanda yok.** Waypoint ve yapı noktası yerleşimi burada
 * ilk kez belirleniyor — S11, S12, S16, S17. Nasıl türetildiği aşağıda.
 */

import type { Vec2 } from '../types/common';
import type { MapDef } from '../types/map';
import { measureCoverage } from '../util/coverage';

/**
 * Kapsama ölçümünün referans menzili. Birim: px.
 *
 * `research/01-denge-matematigi.md` §4'ün tüm hesapları T1 menzili 150 ile
 * yapıldı. Kule verisi M2'de gelecek; geldiğinde `towers.ts` T1 menzili bu
 * sayıya **eşit olmak zorunda**, yoksa `coverage` alanı denge hesabıyla
 * farklı bir tabana oturur. M2-T01 bunu bir testle bağlayacak.
 */
export const COVERAGE_REFERENCE_RANGE = 150;

/**
 * ## Harita 1 geometrisi nasıl türetildi
 *
 * `GAME-DESIGN.md` §9 kabul kriteri "nokta başına ≥ 450 px" diyor, ama §5'teki
 * boss (700) ve Trol (400) değerleri 300 px varsayımından türetilmiş. İkisi
 * aynı anda doğru olamaz (`research/01` §4 "Çözülmemiş varsayım").
 *
 * **Çelişki, kapsama hedef alınarak çözüldü** — Plan A §3.4'ün "türetme yönü
 * M1'de ters olmalı" kararı: elde kalem varken bilinmek istenen şey "yolu ne
 * kadar kıvırmalıyım", uydurulmuş bir eşik değil.
 *
 * Zincir:
 * - T2 referans tahtası ΣDPS = 84 (boss'a etkin), boss hızı 28 px/sn.
 * - Kısıt A tavanı = ΣDPS × ortalamaKapsama / hız = 84 × C / 28 = 3C.
 * - `research/01` §4 boss için hedef bandı: tavanın **%75-85**'i.
 * - Boss 700 sabit tutulursa gereken tavan = 700 / 0.80 = 875 → **C ≈ 292 px**.
 *
 * Yol ve noktalar bu sayıyı tutturacak şekilde çizildi. Ölçülen ortalama
 * `M1-T09` tarafından raporlanıyor; ölçüm hedeften saparsa düzeltilecek yer
 * boss HP'si değil, **bu koordinatlar**.
 *
 * **450 px reddedildi:** C = 450'de tavan 1350 olurdu ve boss 700 tavanın
 * yalnız %52'si kalırdı — hedef bandın çok altında. `GAME-DESIGN.md` §9'daki
 * 450 px kriteri türetilmemiş bir sayıydı; bu ölçüm onun yerine geçiyor.
 */

/**
 * Yol: tek giriş, iki keskin viraj (`GAME-DESIGN.md` §9 "Tek yol, 2 keskin
 * viraj"). Üç segment: üst yatay → dikey iniş → alt yatay.
 *
 * `// GEÇİCİ — S11`: koordinatlar dokümandan gelmiyor, burada çizildi.
 * `// GEÇİCİ — S17`: ilk waypoint ekran dışında (x = -60) — düşman görünür
 * şekilde içeri yürüyor. Yol uzunluğuna 60 px ekliyor.
 */
const MAP1_PATH: readonly Vec2[] = [
  { x: -60, y: 140 }, // GEÇİCİ — S17 (ekran dışı doğum)
  { x: 700, y: 140 }, // viraj 1
  { x: 700, y: 560 }, // viraj 2
  { x: 1220, y: 560 }, // kale
];

/** Kale, yolun son waypoint'i. Düşman buraya varırsa can gider. */
const MAP1_CASTLE: Vec2 = { x: 1220, y: 560 };

/**
 * Uçan hattı: doğumdan kaleye düz çizgi (`GAME-DESIGN.md` §5 — harpi yolu
 * takip etmez).
 *
 * `GAME-DESIGN.md` §5 kabul kriteri: yapı noktalarının en az **%40'ı** bu
 * hattı menzilinde görmeli, yoksa harpi garantili sızar (R4). Bu yerleşimde
 * 8 noktanın 7'si görüyor — `maps.test.ts` ölçüyor.
 */
const MAP1_FLYER_PATH: readonly Vec2[] = [
  { x: -60, y: 140 },
  { x: 1220, y: 560 },
];

/**
 * 8 yapı noktası (`GAME-DESIGN.md` §9 tablosu).
 *
 * `// GEÇİCİ — S12`: koordinatlar dokümandan gelmiyor.
 *
 * Yerleşim mantığı: düz segment kenarındaki noktalar yol merkezinden **75 px**
 * uzakta (tek geçiş → kiriş 2√(150²−75²) ≈ 260 px). İki viraj içine birer
 * nokta konuldu; onlar yolu **iki kez** görüyor (~420 px). Karışım ortalamayı
 * yukarıdaki hedefe (≈292 px) oturtuyor ve viraj noktalarını oyuncu için
 * gözle görülür şekilde değerli kılıyor — Kingdom Rush'ta da köşeler primlidir.
 */
const MAP1_BUILD_SPOTS: readonly Vec2[] = [
  { x: 95, y: 215 }, // üst segment, altta
  { x: 300, y: 65 }, // üst segment, üstte
  { x: 480, y: 215 }, // üst segment, altta
  { x: 610, y: 240 }, // viraj 1 içi — iki segment görüyor
  { x: 775, y: 290 }, // dikey segment, sağda
  { x: 790, y: 470 }, // viraj 2 içi — iki segment görüyor
  { x: 950, y: 485 }, // alt segment, altta
  { x: 1120, y: 485 }, // alt segment, altta
];

export const MAP_1: MapDef = {
  id: 'degirmen-gecidi',
  background: 'bg/map1.webp',
  paths: [MAP1_PATH],
  buildSpots: MAP1_BUILD_SPOTS,
  flyerPaths: [MAP1_FLYER_PATH],
  castle: MAP1_CASTLE,
  hpMultiplier: 1.0,
  goldMultiplier: 1.0, // = hpMultiplier (§9)
  startGold: 280,
  enemyRoster: ['goblin', 'orkSavasci', 'kurtBinicisi', 'harpi', 'ogreSef'],
  // ELLE YAZILMAZ — CLAUDE.md Mimari kuralı.
  coverage: measureCoverage([MAP1_PATH], MAP1_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
  // Tek yol — kol başına kapsama toplamla aynı.
  branchCoverage: [measureCoverage([MAP1_PATH], MAP1_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE)],
};


// =====================================================================
// HARITA 2 — "Taş Köprü" (§9: Y şeklinde ikiye ayrılır, köprüde birleşir)
// =====================================================================
//
// ## Koordinatlar nasıl türetildi (S57)
//
// Harita 1'in yöntemi aynen uygulandı: **kapsama hedefinden geriye**.
// §9'un bandı yapı noktası başına ortalama **285-311 px** (geometri bandı
// 285-315 ile boss bandı 275-311'in kesişimi).
//
// **Ayrık yolda bant KOL BAŞINA ölçülüyor.** Toplam ölçüm yanıltıcı:
// iki kol ortak gövdeyi paylaştığı için `measureCoverage` aynı fiziksel
// yolu iki kez sayıyor ve ilk denemede ortalama **487,5** çıktı. Ama bir
// düşman **tek** kol yürüyor; Kısıt A'nın tavanı da o kolun kapsamasına
// bağlı. §9'un "ayrık yol uyarısı" tam olarak bunu söylüyor.
//
// Ölçülen: **her iki kol da 299,8 px** ✓ (7/10 nokta o kolu görüyor).
//
// **Kollar 480 px ayrık** — 150 px menzilli bir kule ikisini birden
// göremiyor, yani "hangi kolu savunuyorum" gerçek bir karar. Bitişik
// olsalardı Y ayrımı görsel bir süs olurdu.
const MAP2_GIRIS: Vec2 = { x: -60, y: 360 }; // GEÇİCİ — S17 (ekran dışı)
const MAP2_AYRIM: Vec2 = { x: 240, y: 360 };
const MAP2_BIRLESME: Vec2 = { x: 640, y: 360 }; // köprü ayağı
const MAP2_KALE: Vec2 = { x: 1220, y: 360 };

/** Üst kol. Giriş ve kuyruk alt kolla **ortak**. */
const MAP2_UST: readonly Vec2[] = [
  MAP2_GIRIS,
  MAP2_AYRIM,
  { x: 240, y: 120 },
  { x: 640, y: 120 },
  MAP2_BIRLESME,
  MAP2_KALE,
];

/** Alt kol — üstün aynası. */
const MAP2_ALT: readonly Vec2[] = [
  MAP2_GIRIS,
  MAP2_AYRIM,
  { x: 240, y: 600 },
  { x: 640, y: 600 },
  MAP2_BIRLESME,
  MAP2_KALE,
];

/**
 * 10 yapı noktası (§9). Reçete harita 1'inkiyle aynı: çoğu **düz kesimden
 * 75 px** (≈260 px kapsama), ikisi **köşeden 75/75 çapraz** (≈410 px).
 * Oran ~%22 köşe — 296 px hedefini tutturan karışım.
 *
 * 0 ve 1 bilerek girişin **soluna** çekildi: 150 px'te bırakılsalardı
 * ayrım köşesini de görüp 368-415 px veriyorlardı ve ortalama bandı
 * aşıyordu (ölçüldü: 318,8).
 */
const MAP2_BUILD_SPOTS: readonly Vec2[] = [
  { x: 60, y: 285 }, // gövde, üstten 75
  { x: 60, y: 435 }, // gövde, alttan 75
  { x: 315, y: 195 }, // üst kol köşesi (240,120)
  { x: 440, y: 195 }, // üst kol düz
  { x: 565, y: 195 }, // üst kol köşesi (640,120)
  { x: 315, y: 525 }, // alt kol köşesi (240,600)
  { x: 440, y: 525 }, // alt kol düz
  { x: 565, y: 525 }, // alt kol köşesi (640,600)
  { x: 840, y: 285 }, // köprü sonrası kuyruk
  { x: 940, y: 285 }, // kale önü
];

/** Uçan hattı: çapraz. 10 noktanın **5'ini** kesiyor (%50 ≥ %40 ✓). */
const MAP2_FLYER: readonly Vec2[] = [
  { x: -60, y: 250 },
  { x: 1240, y: 470 },
];

export const MAP_2: MapDef = {
  id: 'tas-kopru',
  background: 'bg/map2.webp',
  paths: [MAP2_UST, MAP2_ALT],
  buildSpots: MAP2_BUILD_SPOTS,
  flyerPaths: [MAP2_FLYER],
  castle: MAP2_KALE,
  hpMultiplier: 1.6,
  goldMultiplier: 1.6, // = hpMultiplier (§9)
  // S72 — §9 tablosu 340 diyor; **280 × 1,6 = 448** kullanılıyor.
  // Gerekçe §9'un kendi cümlesi: altın çarpanı "altın/HP oranı düşmesin"
  // diye var. Çarpan öldürme altınına ve (S70'te) dalga bonusuna
  // uygulanıyordu ama başlangıç altınına uygulanmıyordu — ölçülen sonuç:
  // dalga 1 tahtası üç haritada da 3-4 kule, ama goblin efektif HP'si
  // 45/72/117. Erken dalga sızıntısının kaynağı buydu.
  startGold: Math.round(280 * 1.6),
  // §5 kadro tablosu: harita 1 + Zırhlı Ork, Şaman.
  enemyRoster: ['goblin', 'orkSavasci', 'kurtBinicisi', 'harpi', 'zirhliOrk', 'saman', 'ogreSef'],
  // ELLE YAZILMAZ — CLAUDE.md Mimari kuralı.
  coverage: measureCoverage([MAP2_UST, MAP2_ALT], MAP2_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
  branchCoverage: [MAP2_UST, MAP2_ALT].map((k) =>
    measureCoverage([k], MAP2_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
  ),
};

// =====================================================================
// HARITA 3 — "Kül Ovası" (§9: İki ayrı giriş, kalede birleşir)
// =====================================================================
//
// Harita 2'den farkı: **iki bağımsız giriş**. Ortak olan yalnız kaleye
// inen son 270 px. `WaveGroup.spawnPoint` burada ilk kez anlamlı.
//
// Ölçülen: **her iki kol da 291,3 px** ✓ (7/12 nokta o kolu görüyor).
const MAP3_KALE: Vec2 = { x: 640, y: 690 };
const MAP3_ORTAK: Vec2 = { x: 640, y: 420 };

/** Sol giriş. */
const MAP3_KOL_A: readonly Vec2[] = [
  { x: -60, y: 120 }, // GEÇİCİ — S17
  { x: 300, y: 120 },
  { x: 300, y: 420 },
  MAP3_ORTAK,
  MAP3_KALE,
];

/** Sağ giriş — A'nın aynası. */
const MAP3_KOL_B: readonly Vec2[] = [
  { x: 1340, y: 120 }, // GEÇİCİ — S17
  { x: 980, y: 120 },
  { x: 980, y: 420 },
  MAP3_ORTAK,
  MAP3_KALE,
];

/**
 * 12 yapı noktası (§9): kol başına 5 + kale yolunda 2 ortak.
 *
 * Ortak ikisi (10, 11) bilerek kale yolunun **aşağısına** kondu: yukarıda
 * bırakılsalardı birleşme köşesini görüp 391 px veriyorlardı ve ortalama
 * 321'e çıkıyordu (ölçüldü).
 */
const MAP3_BUILD_SPOTS: readonly Vec2[] = [
  // Kol A
  { x: 120, y: 195 },
  { x: 225, y: 195 }, // köşe (300,120)
  { x: 375, y: 270 },
  { x: 375, y: 345 }, // köşe (300,420)
  { x: 480, y: 345 },
  // Kol B — ayna
  { x: 1160, y: 195 },
  { x: 1055, y: 195 },
  { x: 905, y: 270 },
  { x: 905, y: 345 },
  { x: 800, y: 345 },
  // Ortak kale yolu — iki kolu da görüyor
  { x: 565, y: 600 },
  { x: 715, y: 600 },
];

/** Her giriş için bir uçan hattı. 12 noktanın **6'sını** kesiyor (%50 ✓). */
const MAP3_FLYER_A: readonly Vec2[] = [
  { x: -60, y: 200 },
  { x: 640, y: 700 },
];
const MAP3_FLYER_B: readonly Vec2[] = [
  { x: 1340, y: 200 },
  { x: 640, y: 700 },
];

export const MAP_3: MapDef = {
  id: 'kul-ovasi',
  background: 'bg/map3.webp',
  paths: [MAP3_KOL_A, MAP3_KOL_B],
  buildSpots: MAP3_BUILD_SPOTS,
  flyerPaths: [MAP3_FLYER_A, MAP3_FLYER_B],
  castle: MAP3_KALE,
  hpMultiplier: 2.6,
  /**
   * **S73 — altın çarpanı HP çarpanından AYRIŞTI (2,6 → 3,8).**
   *
   * §9 "altın çarpanı = HP çarpanı" diyor ve gerekçesi *"altın/HP oranı
   * düşmesin"*. Ölçüm bu gerekçenin harita 3'te **karşılanmadığını**
   * gösterdi: 12 nokta ×2,6 altınla tam yükseltilemiyordu ve tahta
   * 3820 altınlık bir tavanda takılıyordu.
   *
   * Türetilebilir kural: **altın, haritanın noktalarını tam yükseltmeye
   * yetmeli.** Tarama (sabit tahta, sabit dalgalar):
   *
   * | Altın çarpanı | Tahta maliyeti | Can kaybı |
   * |---|---|---|
   * | 2,6 | 3820 | 26 ✗ |
   * | 3,0 | 4390 | 25 ✗ |
   * | 3,4 | 4870 | 21 ✗ |
   * | **3,8** | **5100** (doyum) | **15 ✓** |
   * | 4,2 | 5100 (aynı) | 10 |
   *
   * 3,8'de maliyet **doyuyor** — üstü fazladan bir kule almıyor. Yani bu
   * sayı seçilmedi, tam yükseltme noktası olarak **ölçüldü**.
   */
  goldMultiplier: 3.8,
  // S72 + S73 — başlangıç altını da **altın** çarpanını izliyor.
  startGold: Math.round(280 * 3.8),
  // §5: + Trol, Örümcek Ana. Örümcek yavrusu kadroda sayılmaz (bölünmeden
  // çıkıyor) ama doğabilmesi için listede olmak zorunda.
  enemyRoster: [
    'goblin',
    'orkSavasci',
    'kurtBinicisi',
    'harpi',
    'zirhliOrk',
    'saman',
    'trol',
    'orumcekAna',
    'orumcekYavrusu',
    'ogreSef',
  ],
  coverage: measureCoverage([MAP3_KOL_A, MAP3_KOL_B], MAP3_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
  branchCoverage: [MAP3_KOL_A, MAP3_KOL_B].map((k) =>
    measureCoverage([k], MAP3_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
  ),
};


// =====================================================================
// HARITA 4 — "Kar Geçidi" (`M8-T04`)
// =====================================================================
//
// ## Koordinatlar nasıl türetildi
//
// Harita 1 ve 2'nin yöntemi aynen: **kapsama hedefinden geriye**. §9'un
// bandı nokta başına 285-311 px (geometri ∩ boss bandı).
//
// **Tek giriş, S kıvrımı (üç keskin viraj).** Harita 3'ün iki kapısından
// sonra bu bir sadeleşme gibi görünüyor ama kıvrım kapsamayı noktalara
// eşit dağıtıyor: "hangi kolu savunayım" kararının yerini "hangi noktayı
// önce doldurayım" alıyor. Yeni bir mekanik tanıtılmıyor (kadro tam,
// hepsi harita 1-3'te tanıtıldı) — zorluk yalnız çarpanlardan ve
// geometriden geliyor.
//
// Ölçülen ortalama kapsama: **290,1 px** ✓ (`maps.test.ts` kilitliyor).
const MAP4_GIRIS: Vec2 = { x: -60, y: 140 }; // GEÇİCİ — S17 (ekran dışı)
const MAP4_KALE: Vec2 = { x: 1000, y: 660 };

const MAP4_PATH: readonly Vec2[] = [
  MAP4_GIRIS,
  { x: 480, y: 140 }, // viraj 1 — aşağı
  { x: 480, y: 430 }, // viraj 2 — sağa
  { x: 1000, y: 430 }, // viraj 3 — aşağı
  MAP4_KALE,
];

/**
 * 12 yapı noktası — harita 3'le aynı sayı (monotonluk: 8 → 10 → 12 → 12).
 * Reçete harita 1'inkiyle aynı: çoğu düz kesimden **75 px** (≈260 px),
 * virajların içinde olanlar iki kesimi birden görüyor (≈410 px).
 *
 * Kale tarafındaki nokta (1075, 500) önce (1075, 580)'deydi ve yalnız
 * **210 px** görüyordu — dikey kesim 230 px, nokta fazla aşağıdaydı ve
 * menzilin bir kısmı boşa gidiyordu. Yukarı çekmek ortalamayı 286,1'den
 * 290,1'e taşıdı; bant tabanına (285) yapışmak istenmedi.
 */
const MAP4_BUILD_SPOTS: readonly Vec2[] = [
  { x: 100, y: 215 }, // üst kesim, altta
  { x: 280, y: 65 }, // üst kesim, üstte
  { x: 405, y: 215 }, // viraj 1 içi — iki kesim
  { x: 555, y: 290 }, // dikey kesim, sağda
  { x: 405, y: 355 }, // dikey kesim, solda
  { x: 555, y: 505 }, // viraj 2 dışı
  { x: 700, y: 355 }, // orta kesim, üstte
  { x: 860, y: 505 }, // orta kesim, altta
  { x: 925, y: 355 }, // viraj 3 içi — iki kesim
  { x: 1075, y: 500 }, // kale kesimi, sağda
  // `M8-T05` turunda düzeltildi: eskiden `(190, 65)`'ti ve **altın/can
  // kartuşunun tam altında** kalıyordu (kartuş 8-224 × 16-156) — oyuncu o
  // yapı noktasını ne görebiliyor ne de rahat tıklayabiliyordu. Yolun öbür
  // yanına, aynı kapsamayı veren konuma alındı: ortalama 290,1 px **aynı**
  // kaldı, uçan hattını gören nokta sayısı da (11/12).
  { x: 200, y: 215 }, // üst kesim, üstte
  { x: 780, y: 505 }, // orta kesim, altta
];

/** Uçan hattı: çapraz. 12 noktanın **11'ini** kesiyor (%92 ≥ %40 ✓). */
const MAP4_FLYER: readonly Vec2[] = [
  { x: -60, y: 200 },
  { x: 1240, y: 600 },
];

export const MAP_4: MapDef = {
  id: 'kar-gecidi',
  // `M8-P01` — **GEÇİCİ görsel**: harita 1'in arka planından soğuk tonlama
  // ile türetildi (`prep-assets.mjs`). Gerçek sanat brifi
  // `docs/plan/M8-sanat-brifi.md`'de; üretilince yalnız bu dosya değişmez,
  // yalnız PNG değişir.
  background: 'lazy/kar-gecidi.webp',
  paths: [MAP4_PATH],
  buildSpots: MAP4_BUILD_SPOTS,
  flyerPaths: [MAP4_FLYER],
  castle: MAP4_KALE,
  /**
   * **Ölçülerek seçildi, uydurulmadı** (S77). İki turda belirlendi:
   *
   * 1. İlk tur yalnız *monotonluğa* baktı: `hpMultiplier` 3,4 (1,0 → 1,6 →
   *    2,6 → 3,4), `goldMultiplier` 4,0 (tam yükseltme **doyum** taraması
   *    3,8'de düzleşiyor — tahta maliyeti 5100'de sabit, üstü fazladan kule
   *    almıyor; 4,0 `startGold`'u harita 3'ün 1064'ünün üstüne çıkaran en
   *    küçük adım).
   * 2. **Bu yetmedi.** Referans tahta simülasyonu 3,4/4,0 ile **sıfır**
   *    sızıntı verdi — yani harita 4, harita 2 (6 sızıntı) ve harita 3'ten
   *    (8 sızıntı, 10 can) **kolaydı**. Sebep geometri: tek yol + 12 nokta
   *    demek 12 kulenin de **aynı** yolu görmesi; harita 2-3'te savunma iki
   *    kola bölünüyordu. Monoton çarpan, monoton zorluk demek değil.
   *
   * `hpMultiplier` taraması (3,4 → 5,6, `goldMultiplier` ≥ `hpMultiplier`
   * şartıyla) can kaybını şöyle verdi: 3,4→0 · 3,8→6 · 4,2→11 · **4,4→13**
   * · 5,0→17 · 5,6→21. Seçilen **4,4/4,4**: harita 3'ün 10'unun üstünde
   * (monoton zorluk) ve 20 can sınırının %35 altında (Kısıt B payı).
   * Boss tavanı çarpandan bağımsız (tahta DPS'i ÷ boss zırhı), o yüzden
   * türetilen boss HP 1857 bu değişiklikte **aynı kaldı**.
   */
  hpMultiplier: 4.4,
  goldMultiplier: 4.4,
  startGold: Math.round(280 * 4.4),
  // §5: kadro **tam** — dokuz tip, yeni tanıtım yok.
  enemyRoster: [
    'goblin',
    'orkSavasci',
    'kurtBinicisi',
    'harpi',
    'zirhliOrk',
    'saman',
    'trol',
    'orumcekAna',
    // Yavru dalgada doğmuyor ama Örümcek Ana bölününce **sahada** doğuyor;
    // kadroda olmazsa bilgi paneli onu hiç listelemiyor ve oyuncu sahada
    // gördüğü düşmanın kartını bulamıyor (harita 3'te listede).
    'orumcekYavrusu',
    'ogreSef',
  ],
  // ELLE YAZILMAZ — CLAUDE.md Mimari kuralı.
  coverage: measureCoverage([MAP4_PATH], MAP4_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
  // Tek yol — kol başına kapsama toplamla aynı.
  branchCoverage: [measureCoverage([MAP4_PATH], MAP4_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE)],
};

// ---------------------------------------------------------------------
// Harita 5 — "Kadim Harabe" (`M8-T05`)
// ---------------------------------------------------------------------

/**
 * Çarpanlar — **ölçülerek** dolduruluyor (`M8-T04` dersi: monoton çarpan
 * monoton zorluk demek değil; ölçüt simülasyonun verdiği **can kaybı**).
 * Tarama gerekçesi `docs/plan/M8-genisleme.md` Faz 5 sonucunda.
 */
const MAP5_HP_CARPANI = 6.8;
const MAP5_ALTIN_CARPANI = 6.8;

const MAP5_KALE: Vec2 = { x: 1180, y: 600 };

/**
 * İki giriş **birleşiyor** ve birleşmeden sonra uzun bir gövde var.
 *
 * Harita 3 de iki girişliydi ama orada birleşme noktası neredeyse kalenin
 * dibindeydi: kollar ayrı savunuluyordu, ortak gövde iki noktalık bir
 * kuyruktu. Burada birleşme **ekranın solunda**; ondan sonraki 1420 px'lik
 * gövde iki kolun da geçtiği yer. Yani karar tersine dönüyor: "iki kolu da
 * ayrı mı tutayım, yoksa gövdeye mi yığayım" — gövdeye yığmak iki kola da
 * hizmet ediyor ama düşmanı yolun yarısı boyunca serbest bırakıyor.
 */
const MAP5_BIRLESME: Vec2 = { x: 380, y: 410 };

/** Birleşmeden kaleye ortak gövde — üç viraj. */
const MAP5_GOVDE: readonly Vec2[] = [
  MAP5_BIRLESME,
  { x: 700, y: 410 },
  { x: 700, y: 180 },
  { x: 1000, y: 180 },
  { x: 1000, y: 600 },
  MAP5_KALE,
];

/**
 * Sol üst giriş.
 *
 * `y = 250` — iki turda buraya geldi ve **ikisini de canlı ekran görüntüsü
 * yakaladı, ölçüm değil** (kapsama ve bütçe testlerinin hiçbiri HUD'u
 * bilmiyor):
 *
 * 1. `y = 120`: altın/can kartuşunun (8-224 × 16-156) **altından** giriyordu,
 *    düşman ekrana görünmeden 260 px yürüyordu.
 * 2. `y = 200`: kartuşu kurtardı ama erken-başlat rozetinin (17-102 × 155-211)
 *    altında kaldı — hazırlık sayacı boyunca, yani oyuncunun yerleşim kararı
 *    verdiği tam anda, giriş kapalıydı.
 *
 * HUD dikdörtgenleri canlı `Container.getBounds()` ile ölçüldü; tahmin değil.
 */
const MAP5_KOL_A: readonly Vec2[] = [
  { x: -60, y: 250 },
  { x: 200, y: 250 },
  { x: 200, y: 410 },
  ...MAP5_GOVDE,
];

/**
 * Sol alt giriş — A'nın aynası (ikisinin de dikeyi 160 px), aynı köşede
 * birleşiyor. `y = 570`: ilk tasarım 660'tı ve yetenek butonlarının
 * (28-170 × 622-707) altından geçiyordu — A ile aynı hata, aynı turda.
 */
const MAP5_KOL_B: readonly Vec2[] = [
  { x: -60, y: 570 },
  { x: 200, y: 570 },
  { x: 200, y: 410 },
  ...MAP5_GOVDE,
];

/**
 * 15 yapı noktası.
 *
 * Konumlar **aranarak** bulundu, elle serpilmedi. Elle serpilen başlangıç
 * yerleşimi kol ortalamalarını 272,2 ve 278,4 veriyordu — ikisi de 285-311
 * bandının **altında**. Tepe tırmanma (60/30/15/5 px adımlar) ceza
 * fonksiyonunu `|A-298| + |B-298| + 0,5·|A-B|` olarak minimize etti ve
 * **ikisini de 298,0**'a getirdi: bandın tam ortası, simetrik.
 *
 * Aramanın kısıtları (hepsi ölçülebilir, hiçbiri zevk meselesi değil):
 * - yoldan **≥ 50 px** (yol yarı genişliği ~13 + nokta yarıçapı ~28 + pay);
 *   ilk turda 40'tı ve 43 px'lik bir nokta ekranda yola **yapışık**
 *   görünüyordu,
 * - noktalar arası ≥ 100 px (menüler üst üste binmesin),
 * - **HUD dikdörtgenlerinden 36 px uzak** — kartuş, hız/ayar ve yetenek
 *   butonları. Bu kısıt canlı ekran görüntüsünden doğdu.
 */
const MAP5_BUILD_SPOTS: readonly Vec2[] = [
  { x: 90, y: 315 },
  { x: 270, y: 175 },
  { x: 150, y: 405 },
  { x: 345, y: 460 },
  { x: 275, y: 535 },
  { x: 65, y: 480 },
  { x: 315, y: 335 },
  { x: 480, y: 360 },
  { x: 480, y: 470 },
  { x: 610, y: 500 },
  { x: 625, y: 335 },
  { x: 910, y: 255 },
  { x: 910, y: 105 },
  { x: 925, y: 400 },
  { x: 1075, y: 520 },
];

/** Her giriş için bir uçan hattı; 15 noktanın **13'ünü** kesiyor (%87 ✓). */
const MAP5_FLYER_A: readonly Vec2[] = [
  { x: -60, y: 280 },
  { x: 1240, y: 560 },
];
const MAP5_FLYER_B: readonly Vec2[] = [
  { x: -60, y: 600 },
  { x: 1240, y: 240 },
];

export const MAP_5: MapDef = {
  id: 'kadim-harabe',
  // `M8-P02` — **GEÇİCİ görsel**, brif `docs/plan/M8-sanat-brifi.md`.
  background: 'lazy/kadim-harabe.webp',
  paths: [MAP5_KOL_A, MAP5_KOL_B],
  buildSpots: MAP5_BUILD_SPOTS,
  flyerPaths: [MAP5_FLYER_A, MAP5_FLYER_B],
  castle: MAP5_KALE,
  /** **Ölçüldü** — gerekçe `docs/plan/M8-genisleme.md` Faz 5 sonucu. */
  hpMultiplier: MAP5_HP_CARPANI,
  goldMultiplier: MAP5_ALTIN_CARPANI,
  startGold: Math.round(280 * MAP5_ALTIN_CARPANI),
  enemyRoster: [
    'goblin',
    'orkSavasci',
    'kurtBinicisi',
    'harpi',
    'zirhliOrk',
    'saman',
    'trol',
    'orumcekAna',
    'orumcekYavrusu',
    'ogreSef',
  ],
  // ELLE YAZILMAZ — CLAUDE.md Mimari kuralı.
  coverage: measureCoverage(
    [MAP5_KOL_A, MAP5_KOL_B],
    MAP5_BUILD_SPOTS,
    COVERAGE_REFERENCE_RANGE,
  ),
  branchCoverage: [
    measureCoverage([MAP5_KOL_A], MAP5_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
    measureCoverage([MAP5_KOL_B], MAP5_BUILD_SPOTS, COVERAGE_REFERENCE_RANGE),
  ],
};

export const MAPS: readonly MapDef[] = [MAP_1, MAP_2, MAP_3, MAP_4, MAP_5];

export function getMap(id: string): MapDef | undefined {
  return MAPS.find((m) => m.id === id);
}
