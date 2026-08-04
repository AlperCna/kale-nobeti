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
};

export const MAPS: readonly MapDef[] = [MAP_1];
