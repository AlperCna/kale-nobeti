/**
 * Kışla, asker ve engelleme tipleri.
 *
 * Kaynak: `docs/GAME-DESIGN.md` §4.4 (tablo + **9 engelleme kuralı**),
 * `docs/research/03-mekanik-tasarim.md` §1.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz. Engelleme mantığı `systems/` altında
 * ve `node`'da test ediliyor; `entities/Soldier` bu şekilleri uygular.
 * TIER 1 kural 1: burada **şekil** var, sayı yok. Sayılar `src/data/`.
 */

import type { Vec2 } from './common';
import type { EnemyDef } from './enemy';

/** Kışla kademesi. `GAME-DESIGN.md` §4.4 tablosunun bir satırı. */
export interface BarracksTier {
  /** Bu kademeye geçiş maliyeti (kümülatif değil). Birim: altın. */
  readonly cost: number;
  readonly soldierCount: number;
  readonly soldierHp: number;
  /** Askerin düşmana verdiği saniyelik hasar. Fiziksel — S67. */
  readonly soldierDps: number;
  /** Ölen askerin yeniden doğma süresi. Birim: saniye. */
  readonly respawnSeconds: number;
  /**
   * Paladin "kalkan" — **`GAME-DESIGN.md` §4.4'te sayı YOK** (`11 + kalkan`).
   *
   * `// GEÇİCİ — S43`: uydurulmadı, `undefined` bırakıldı. Kalkan
   * uygulanmıyor; Paladin şu an yalnız yüksek HP ve DPS'iyle ayrışıyor.
   */
  readonly shield?: number;
  /**
   * Haydutlar kaçınması, 0..1. §4.4 "kaçınma %25" diyor ama **anlamını
   * söylemiyor** — hasar iptali mi, isabet şansı mı (`S44`).
   *
   * Varsayılan: **%25 ihtimalle gelen hasar tamamen iptal**. Rastgelelik
   * `BarracksSystem`'e dışarıdan verilen `rng` ile geliyor, böylece test
   * belirlenimci kalıyor.
   */
  readonly evasion?: number;
  /** Yalnız T3 dallarında: kullanıcıya görünen dal adı. */
  readonly branchName?: string;
}

/**
 * Kışla ailesi. `TowerDef`'ten **ayrı** bir tip: kışla hasar vermez, menzili
 * ve atış hızı yoktur; asker çıkarır. Aynı `TowerDef` içine sıkıştırmak
 * `damage`/`fireRate`/`range` alanlarını anlamsızca doldurmak olurdu.
 */
export interface BarracksDef {
  readonly id: 'kisla';
  readonly role: string;
  /** `[T1, T2]` — §4.4 tablosunun ilk iki satırı. */
  readonly tiers: readonly [BarracksTier, BarracksTier];
  /** `[Paladin, Haydutlar]`. */
  readonly branches: readonly [BarracksTier, BarracksTier];
}

/** Askerin durum makinesi. §4.4 kural 7 `walking`'i açıkça ayırıyor. */
export type SoldierStateName = 'walking' | 'idle' | 'fighting' | 'dead';

/**
 * `BarracksSystem`'in bir düşmandan gördüğü yüzey.
 *
 * `Targetable`'dan ayrı çünkü engelleme **yazma** da yapıyor: `hp` düşüyor,
 * `blockedBy` atanıyor. `Targetable` salt okunur.
 */
export interface BlockableEnemy {
  readonly x: number;
  readonly y: number;
  hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  readonly def: EnemyDef | null;
  /**
   * §4.4 kural 1. `null` değilse `Mover.step` ilerlemeyi atlıyor —
   * alan M1'de kondu, kullanımı burada (`types/enemy.ts` `EnemyState`).
   */
  blockedBy: object | null;
}

/**
 * `BarracksSystem`'in bir askerden gördüğü yüzey.
 *
 * `entities/Soldier` bunu uygular; testler düz bir nesneyle uygular.
 */
export interface SoldierState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Askerin saniyelik hasarı. */
  dps: number;
  /** §4.4 kural 1. Kilitlendiği düşman. */
  engagedWith: BlockableEnemy | null;
  /** Kışlanın konumu — ölünce burada doğuyor (kural 7). */
  home: Vec2;
  /** Toplanma noktası (kural 6). */
  rally: Vec2;
  state: SoldierStateName;
  /** Ölüyken kalan diriliş süresi. Birim: saniye. */
  respawnLeft: number;
  /** Paladin kalkanı — S43 yüzünden şu an hep `0`. */
  shield: number;
  /** Kaçınma olasılığı 0..1 (S44). */
  evasion: number;
  /**
   * Takviye askerinin kalan ömrü (saniye). Kışla askerinde `Infinity`.
   * §8: Takviye askerleri **20 sn** yaşar.
   */
  lifetimeLeft: number;
  /** Yürüme hızı. Birim: px/sn. */
  speed: number;
  alive: boolean;
}

/** Bir kışlanın çalışma zamanı durumu. */
export interface BarracksRuntime {
  readonly spotIndex: number;
  readonly x: number;
  readonly y: number;
  readonly def: BarracksDef;
  /** `0` = T1, `1` = T2, `2` = Paladin, `3` = Haydutlar. */
  tierIndex: 0 | 1 | 2 | 3;
  /** Toplanma noktası — kural 6 kısıtlarına uymuş hâli. */
  rally: Vec2;
  soldiers: SoldierState[];
}
