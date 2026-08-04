/**
 * Kule tipleri. Kaynak: `docs/GAME-DESIGN.md` §4, `DATA-SCHEMAS.md`.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 * TIER 1 kural 1: burada **şekil** var, sayı yok. Sayılar `src/data/towers.ts`.
 */

import type { DamageType } from './enemy';

/** `GAME-DESIGN.md` §4 — dört aile. M2'de yalnız ilk ikisi kuruluyor. */
export type TowerId = 'okcu' | 'top' | 'buyu' | 'kisla';

/**
 * Hedefleme önceliği. `GAME-DESIGN.md` §4.5 tablosu.
 *
 * Tanımlar bilerek belirsiz bırakılmadı — özellikle `strongest`
 * **maksimum** HP'ye bakar, mevcut HP'ye değil. Mevcut HP'ye bakarsa hedef
 * her karede değişir ve kule dönüş animasyonu titrer.
 */
export type TargetMode = 'first' | 'last' | 'strongest' | 'weakest' | 'closest';

/** Tek bir kule kademesi. `GAME-DESIGN.md` §4.1-§4.4 tablolarının bir satırı. */
export interface TowerTier {
  /** Bu kademeye geçiş maliyeti (kümülatif değil). Birim: altın. */
  readonly cost: number;
  /** Atış başına ham hasar, zırh/direnç uygulanmadan. */
  readonly damage: number;
  /** Saniyedeki atış sayısı. Birim: 1/sn. `DPS = damage × fireRate`. */
  readonly fireRate: number;
  /** Menzil yarıçapı. Birim: px (1280×720 mantıksal ölçek). */
  readonly range: number;
  /** Patlama yarıçapı; yalnız Top ailesinde. Birim: px. */
  readonly splashRadius?: number;
  /**
   * Uçanlara vurabilir mi ve vurursa hasar çarpanı.
   * `0` = hiç vuramaz ve hedef listesinden **elenir** (`GAME-DESIGN.md` §4.2).
   */
  readonly airMultiplier: 0 | 0.5 | 1;
}

export interface TowerDef {
  readonly id: TowerId;
  /** İnsan okunur rol. §4: "hiçbir kule diğerinin düpedüz üstünü değildir". */
  readonly role: string;
  readonly damageType: DamageType;
  /** `[T1, T2]` — §4.x tablolarının ilk iki satırı. */
  readonly tiers: readonly [TowerTier, TowerTier];
  /** `[T3a, T3b]` — iki dallı uzmanlaşma. M4'te doluyor. */
  readonly branches: readonly [TowerTier, TowerTier];
}
