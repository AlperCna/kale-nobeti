/**
 * Düşman verisi. TIER 1 kural 1: sayı burada.
 *
 * Her sayı `docs/GAME-DESIGN.md` §5 tablosundan **birebir**.
 * **Dokuz düşman tipi** — harita kadroları §5 "Harita başına düşman
 * kadrosu" tablosunda.
 */

import type { EnemyDef } from '../types/enemy';
import { bossFor } from './bossScaling';

export const GOBLIN: EnemyDef = {
  id: 'goblin',
  hp: 45,
  speed: 60,
  armor: 0,
  magicResist: 0,
  gold: 3,
  points: 1,
  leakDamage: 1,
  flying: false,
};

/** Zırh kavramını tanıtır: Okçu T1 (6 hasar) ona 4 vuruyor (§3, §5). */
export const ORK_SAVASCI: EnemyDef = {
  id: 'orkSavasci',
  hp: 110,
  speed: 45,
  armor: 2,
  magicResist: 0,
  gold: 6,
  points: 2,
  leakDamage: 1,
  flying: false,
};

/** Hız kavramını tanıtır: 110 px/sn, kadronun en hızlısı (§5). */
export const KURT_BINICISI: EnemyDef = {
  id: 'kurtBinicisi',
  hp: 60,
  speed: 110,
  armor: 1,
  magicResist: 0,
  gold: 9,
  points: 3,
  leakDamage: 1,
  flying: false,
};

/**
 * **Uçar** — yolu takip etmez, engellenemez (§5).
 *
 * `flyerPaths` üstünde düz gider. Top T1/T2 ve Havan ona vuramaz; harpi
 * dalgasında oyuncunun tahtasının yarısının ölü kalması bilinçli (§4.2).
 */
export const HARPI: EnemyDef = {
  id: 'harpi',
  hp: 70,
  speed: 75,
  armor: 0,
  magicResist: 0,
  gold: 9,
  points: 3,
  leakDamage: 1,
  flying: true,
};

/** Ağır zırh (8) — fiziksele dirençli, Büyü'nün tek temiz cevap olduğu düşman. */
export const ZIRHLI_ORK: EnemyDef = {
  id: 'zirhliOrk',
  hp: 160,
  speed: 38,
  armor: 8,
  magicResist: 0,
  gold: 12,
  points: 4,
  leakDamage: 1,
  flying: false,
};

/** Büyü direnci %40; yakındaki düşmanlara 8 HP/sn iyileştirme (§5). */
export const SAMAN: EnemyDef = {
  id: 'saman',
  hp: 130,
  speed: 42,
  armor: 0,
  magicResist: 0.4,
  gold: 15,
  points: 5,
  leakDamage: 1,
  ability: { kind: 'heal', hps: 8, radius: 90 },
  flying: false,
};

/**
 * 6 HP/sn yenilenme (§5). Sızma cezası **2 can**.
 *
 * HP **400 ⚠️ değil, doğrulandı**: M1'de ölçülen kapsamayla tavanın
 * %38,7'si — boss dışındaki en tank düşman ama duvar değil
 * (`docs/results/M1-SONUC.md`). Harita 3 geometrisiyle yeniden
 * kontrol edilecek (R1b).
 */
export const TROL: EnemyDef = {
  id: 'trol',
  hp: 400,
  speed: 30,
  armor: 4,
  magicResist: 0,
  gold: 24,
  points: 8,
  leakDamage: 2,
  ability: { kind: 'regen', hps: 6 },
  flying: false,
};

/** Ölünce 3× yavru (§5). Sızma cezası **2 can**. */
export const ORUMCEK_ANA: EnemyDef = {
  id: 'orumcekAna',
  hp: 150,
  speed: 50,
  armor: 0,
  magicResist: 0.2,
  gold: 18,
  points: 6,
  leakDamage: 2,
  ability: { kind: 'split', count: 3, childId: 'orumcekYavrusu' },
  flying: false,
};

/**
 * Örümcek yavrusu — **§5'te yalnız HP 30 ve hız 90 yazıyor.**
 *
 * `// GEÇİCİ — S38`: zırh, direnç, altın ve puan dokümanda yok.
 * Uydurulmadı, sıfır bırakıldı. Altın 0 olması bilinçli: yavrudan altın
 * gelseydi Örümcek Ana'yı öldürmek 18 + 3×altın verirdi ve §5'in
 * "altın = 3 × puan" oranı bozulurdu.
 *
 * Dalga bütçesine de girmiyor (puan 0) — anne zaten 6 puan.
 */
export const ORUMCEK_YAVRUSU: EnemyDef = {
  id: 'orumcekYavrusu',
  hp: 30,
  speed: 90,
  armor: 0,
  magicResist: 0,
  gold: 0,
  points: 0,
  leakDamage: 1,
  flying: false,
};

/**
 * Boss. Kışla askerlerini tek vuruşta öldürür (M5'te bağlanacak).
 * Sızma cezası **10 can** — 20 canlık havuzun yarısı (§5).
 *
 * HP **700 — ölçüldü, ama M4'te sınıra dayandı (S65).**
 *
 * M1'de, iki aileli (Top/Okçu) referans tahtayla Kısıt A tavanının
 * **%78,7'siydi** ve hedef band %75-85'in ortasındaydı
 * (`docs/results/M1-SONUC.md`). M4'te üçüncü aile gelince tahta türetici
 * 3'lü döngüye geçti; Büyü T1'in 100 altını (Okçu 70) noktaları
 * doldurmayı pahalılaştırdı ve oran yükseldi:
 *
 *   muhafazakâr tahta → tavan 761, **%92,0** (%15 payı tutmuyor)
 *   gerçekçi tahta    → tavan 818, **%85,6** (bandın 0,6 puan üstü)
 *
 * **Sayı bilerek değiştirilmedi.** Boss canlı oyunda 700 → 18 HP'ye
 * düşüp öldü, yani sınırda ama geçilebilir. Kapsama · tahta · boss HP
 * birbirine bağlı üç büyüklük; yalnız birini oynatmak
 * `docs/research/01-denge-matematigi.md` §12'nin "türetme yönü"
 * uyarısını çiğner. M7'de Harita 2-3 ile birlikte tek seferde bakılacak
 * (`docs/results/M4-SONUC.md` §4).
 */
export const OGRE_SEF: EnemyDef = {
  id: 'ogreSef',
  hp: 700,
  speed: 28,
  armor: 10,
  magicResist: 0.25,
  gold: 60,
  points: 25,
  leakDamage: 10,
  flying: false,
};

/** Dokuz düşman + örümcek yavrusu (kadroda sayılmaz, bölünmeden çıkar). */
export const ENEMIES: readonly EnemyDef[] = [
  GOBLIN,
  ORK_SAVASCI,
  KURT_BINICISI,
  HARPI,
  ZIRHLI_ORK,
  SAMAN,
  TROL,
  ORUMCEK_ANA,
  OGRE_SEF,
  ORUMCEK_YAVRUSU,
];

export function getEnemy(id: EnemyDef['id']): EnemyDef | undefined {
  return ENEMIES.find((e) => e.id === id);
}

/**
 * **Haritaya duyarlı** düşman çözücü — boss haritadan haritaya değişiyor.
 *
 * Boss'un zırhı ve canı `bossScaling.ts` tarafından türetiliyor; diğer
 * düşmanlar §5 tablosunda yazdığı gibi kalıyor. Doğum yolu bu fonksiyondan
 * geçtiği sürece hem oyun hem `simulateWave` **aynı** boss'u görüyor.
 */
/**
 * **Buz kalkanı** — `M10-T03`, yalnız harita 4 (Kar Geçidi).
 *
 * ## Neden var
 *
 * M8'in eklediği harita 4 ve 5 **sıfır** yeni düşman/mekanik tanıtıyordu
 * (kadro ölçüldü: 5 → 7 → 10 → 10 → 10). Kingdom Rush'ı taklitlerinden
 * ayıran madde tam bunun tersi: *"her seviye tam olarak bir yeni mekanik
 * ya da düşman tipi tanıtıyor."* Bu, içerik **miktarı** değil var olan
 * içeriğin derinlik kusuru.
 *
 * ## Neden yeni bir düşman değil, var olanın varyantı
 *
 * Yeni düşman yeni atlas karesi ister; sanat üretimi bu oturumun işi
 * değil. Kalkan bunun yerine **var olan bir düşmana** iliştiriliyor ve
 * görsel ayrım çizimle yapılıyor (halka) — TIER 1 kural 6: ayrım yalnız
 * renge dayanmıyor, halkanın **varlığı/yokluğu** taşıyor.
 *
 * ## Neden Ork Savaşçı — **taşıyıcı ölçülerek seçildi**
 *
 * İlk deneme Kurt Binicisi'ydi ve ölçüm kalkanın **hiçbir şeyi
 * değiştirmediğini** gösterdi: harita 4'ün 80 düşmanının yalnız 5'i
 * Kurt Binicisi (%6). Mekanik oradaydı ama oyuncu neredeyse hiç
 * görmüyordu.
 *
 * Harita 4 doğum sayıları: goblin×25, orkSavasci×18, zirhliOrk×13,
 * trol×6, harpi×5, kurtBinicisi×5, orumcekAna×4, saman×3, ogreSef×1.
 *
 * Ork Savaşçı haritanın **omurgası** (%22) ve on dalgaya yayılıyor,
 * yani mekanik bir kez değil sürekli hissediliyor.
 *
 * Elenenler: Zırhlı Ork (zırh + kalkan üst üste binerdi), Trol
 * (yenilenme + kalkan aynı fikrin tekrarı), Şaman ("önce iyileştiriciyi
 * öldür" cevabını tümden kapatırdı), Goblin (çöp birim; kalkanlı çöp
 * "kalabalık" hissini bozar, tehdit hissini değil).
 *
 * ## Sayı nereden geldi
 *
 * **Ölçüldü, uydurulmadı** (`CLAUDE.md` TIER 2). Harita 4, referans
 * tahtaya karşı, kalkan taraması:
 *
 * | Kalkan | Sızan (gerçekçi) | Sızan (muhafazakâr) | Sızan Ork |
 * |---|---|---|---|
 * | 0 | 10 | 10 | 1 |
 * | 15 | 10 | 10 | 1 |
 * | **25** | **11** | **12** | **2** |
 * | 40 | 11 | 12 | 2 |
 * | 60 | 13 | 13 | 3 |
 *
 * 15 ve altı **hiçbir şeyi değiştirmiyor** — mekanik görünür ama
 * sonuçsuz. 60 sızıntıyı %30 artırıyor; harita 4 zaten zor
 * (kalkansız 10 sızıntı). **25 = eşiğin kendisi:** mekaniğin sonucu
 * değiştirdiği en küçük değer. 40 aynı sızıntı sayısını veriyor,
 * yalnız daha çok sızan HP — yani daha sert ama daha öğretici değil.
 *
 * Tam kayıt: `docs/plan/OPEN-QUESTIONS.md` S79.
 */
const KAR_GECIDI_KALKANI = 25;

export function getEnemyForMap(
  id: EnemyDef['id'],
  map: { id: string; hpMultiplier: number },
): EnemyDef | undefined {
  if (id === 'ogreSef') return bossFor(map);
  const temel = getEnemy(id);
  if (temel === undefined) return undefined;
  if (map.id === 'kar-gecidi' && id === 'orkSavasci') {
    return { ...temel, shield: KAR_GECIDI_KALKANI };
  }
  return temel;
}
