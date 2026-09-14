import type { TowerId, TowerEffect } from '../types/tower';

/**
 * Mermi görünümü — aileye ve dal etkisine göre. Oyuncu geri bildirimi
 * (2026-09-14): "kule tipini değiştirince atış şekli hiç değişmiyor, hep
 * aynı" — tek havuz, tek `new Projectile(radius 5, GOLD)`; `Projectile.ts`
 * başlığı hâlâ "greybox mermi" diyordu, M6 sanat turu mermiye hiç
 * gelmemişti.
 *
 * Ucuz yol (karar: 2026-09-14): sprite yok, ama **renk + ölçek + yön**
 * aileyi ve dal etkisini ayırıyor. Ok ince/uzun ve hedefe dönük; gülle
 * büyük ve koyu; büyü lapis. Dal etkileri rengi eziyor — yanan ok
 * vermilyon, buz açık mavi, yıldırım sarı. Sprite üretilirse
 * (`assets-src/`, P04 süreciyle) yalnız bu dosya ve `Projectile.setLook`
 * değişir.
 *
 * TIER 1 kural 11: Phaser yok. Sayılar denge değil, salt görsel.
 */

export interface ProjectileLook {
  readonly color: number;
  readonly scaleX: number;
  readonly scaleY: number;
  /** Uzun mermiler (ok) hedefe dönük çizilir; yuvarlaklar için anlamsız. */
  readonly rotateToTarget: boolean;
  /**
   * `M8-T08` — uçuşta nabız gibi kabarma (gülle). Tepeden bakışta yükseklik
   * gösterilemiyor; ölçek nabzı "havada bir yay çiziyor" hissini veren en
   * ucuz ipucu. Ok ve büyü düz gidiyor, onlarda kapalı.
   */
  readonly arc?: boolean;
  /**
   * `M8-T08` — arkasında parçacık izi (büyü). Okun izi olsaydı ekran
   * kalabalıklaşırdı: okçu en hızlı ateş eden aile.
   */
  readonly trail?: boolean;
}

const GOLD = 0xd4a032;
const INK = 0x1c1c24;
const LAPIS = 0x3e5ca8;
const VERMILION = 0xb03a2e;
const BUZ = 0xa9dcf5;
const YILDIRIM = 0xf6e27a;

const AILE: Readonly<Record<TowerId, ProjectileLook>> = {
  okcu: { color: GOLD, scaleX: 1.8, scaleY: 0.55, rotateToTarget: true },
  top: { color: INK, scaleX: 1.7, scaleY: 1.7, rotateToTarget: false, arc: true },
  buyu: { color: LAPIS, scaleX: 1.15, scaleY: 1.15, rotateToTarget: false, trail: true },
  /** Kışla mermi atmıyor; tip tamlığı için — hiç okunmaz. */
  kisla: { color: GOLD, scaleX: 1, scaleY: 1, rotateToTarget: false },
};

const ETKI_RENGI: Readonly<Record<TowerEffect['kind'], number>> = {
  burn: VERMILION,
  slow: BUZ,
  chain: YILDIRIM,
};

/**
 * Kademe büyümesi — `tierIndex` 0=T1, 1=T2, 2/3=T3'ün iki dalı.
 *
 * Oyuncu geri bildirimi: "kulelerin tiplerini değiştirince atış şekilleri
 * hiç değişmiyor, hep aynı". Doğruydu: bu dosya yalnız **aileye** ve
 * varsa **etkiye** bakıyordu, yani T1 → T2 → T3 birebir aynı mermiydi.
 * Yükseltmenin oynanışta hiçbir görsel karşılığı yoktu.
 *
 * Boyut seçildi, renk değil: TIER 1 kural 6 "yalnız renge dayanmaz"
 * diyor ve renk zaten **etkiye** ayrılmış durumda (yanma/yavaşlatma/
 * zincir). Ölçek siluet değiştiriyor, yani renk körlüğünde de okunuyor
 * ve "daha büyük mermi = daha çok hasar" hiçbir açıklama gerektirmiyor.
 */
const KADEME_BUYUME = [1, 1.22, 1.5, 1.5] as const;

/** Bu kademeden itibaren merminin izi var — son kademenin imzası. */
const IZ_KADEMESI = 2;

export function projectileLook(
  family: TowerId,
  effect?: TowerEffect['kind'],
  tierIndex: 0 | 1 | 2 | 3 = 0,
): ProjectileLook {
  const taban = AILE[family];
  const buyume = KADEME_BUYUME[tierIndex];
  return {
    ...taban,
    color: effect === undefined ? taban.color : ETKI_RENGI[effect],
    scaleX: taban.scaleX * buyume,
    scaleY: taban.scaleY * buyume,
    trail: taban.trail === true || tierIndex >= IZ_KADEMESI,
  };
}
