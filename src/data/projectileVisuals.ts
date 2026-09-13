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
}

const GOLD = 0xd4a032;
const INK = 0x1c1c24;
const LAPIS = 0x3e5ca8;
const VERMILION = 0xb03a2e;
const BUZ = 0xa9dcf5;
const YILDIRIM = 0xf6e27a;

const AILE: Readonly<Record<TowerId, ProjectileLook>> = {
  okcu: { color: GOLD, scaleX: 1.8, scaleY: 0.55, rotateToTarget: true },
  top: { color: INK, scaleX: 1.7, scaleY: 1.7, rotateToTarget: false },
  buyu: { color: LAPIS, scaleX: 1.15, scaleY: 1.15, rotateToTarget: false },
  /** Kışla mermi atmıyor; tip tamlığı için — hiç okunmaz. */
  kisla: { color: GOLD, scaleX: 1, scaleY: 1, rotateToTarget: false },
};

const ETKI_RENGI: Readonly<Record<TowerEffect['kind'], number>> = {
  burn: VERMILION,
  slow: BUZ,
  chain: YILDIRIM,
};

export function projectileLook(family: TowerId, effect?: TowerEffect['kind']): ProjectileLook {
  const taban = AILE[family];
  if (effect === undefined) return taban;
  return { ...taban, color: ETKI_RENGI[effect] };
}
