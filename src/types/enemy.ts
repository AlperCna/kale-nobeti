/**
 * Düşman durumu ve hareket stratejisi arayüzleri.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz. Bu ayrım sayesinde hareket mantığı
 * `node` ortamında test edilebiliyor — `Enemy` bir `Phaser.GameObjects`
 * alt sınıfı olduğu için kendisi test edilemez.
 */

import type { Vec2 } from './common';
import type { PathProgress } from './path';

/**
 * Düşman türleri. Kaynak: `GAME-DESIGN.md` §5 tablosu (9 satır).
 *
 * `types/map.ts` içindeydi (`MapDef.enemyRoster` için gerekiyordu);
 * M2'de düşman verisi gelince asıl yerine taşındı.
 */
export type EnemyId =
  | 'goblin'
  | 'orkSavasci'
  | 'zirhliOrk'
  | 'harpi'
  | 'kurtBinicisi'
  | 'saman'
  | 'trol'
  | 'orumcekAna'
  | 'ogreSef';

/**
 * `GAME-DESIGN.md` §3: iki hasar tipi, iki savunma tipi. Kule
 * çeşitliliğinin **tek** kaynağı bu.
 *
 * `true` yalnız yeteneklerde — hiçbir şeyle azalmaz.
 */
export type DamageType = 'physical' | 'magic' | 'true';

/** Düşman tanımı. Kaynak: `GAME-DESIGN.md` §5 tablosu, `DATA-SCHEMAS.md`. */
export interface EnemyDef {
  readonly id: EnemyId;
  /** **Temel** can; harita `hpMultiplier` ile çarpılır (§9). */
  readonly hp: number;
  /** Yol üstünde ilerleme hızı. Birim: px/sn. */
  readonly speed: number;
  /** Fiziksel hasardan **sabit miktar** düşer (§3). */
  readonly armor: number;
  /** Büyü hasarını **yüzde** azaltır, 0..1 (§3). */
  readonly magicResist: number;
  /** **Temel** öldürme altını; harita `goldMultiplier` ile çarpılır (§9). */
  readonly gold: number;
  /** Dalga bütçesi maliyeti. Birim: puan (§7). */
  readonly points: number;
  /** Sızdığında düşen can. §5: normal 1, Trol/Örümcek Ana 2, boss 10. */
  readonly leakDamage: number;
  /** Uçar mı — yolu takip etmez, engellenemez (§5). */
  readonly flying: boolean;
}

/**
 * Hareketin ihtiyaç duyduğu düşman durumu.
 *
 * `Enemy` bunu uygular ama testler düz bir nesneyle de uygulayabilir —
 * `Mover`'lar `Enemy` sınıfını değil bu şekli tanır.
 */
export interface EnemyState {
  hp: number;
  maxHp: number;
  /** Birim: px/sn. */
  speed: number;
  progress: PathProgress;
  /**
   * Kışla askeri tarafından engellenmiş mi (`DEPENDENCIES.md` §7).
   *
   * **Alan M1'de tanımlanıyor, kullanımı M5'te.** `null` değilse `step`
   * ilerlemeyi atlar. Sonradan eklemek `PathSystem`'e ve her `Mover`'a
   * geri dönmek demekti; şimdi bir satır, sonra üç dosya.
   */
  blockedBy: object | null;
  alive: boolean;
}

/**
 * Hareket stratejisi. `Enemy`'den **ayrık** (`DEPENDENCIES.md` §2).
 *
 * `PathMover` M1'de, `LineMover` (uçanlar) M4'te aynı arayüzü uygular.
 * Ayrılmasaydı M4'te entity'yi yarmak gerekirdi.
 */
/**
 * `SpawnSystem`'in bir düşmandan beklediği yüzey.
 *
 * `Enemy` sınıfı değil **bu şekil** talep ediliyor: `SpawnSystem` `systems/`
 * altında ve `entities/Enemy`'yi çalışma zamanında içeri alsaydı TIER 1
 * kural 11'i delerdi. Testler bu arayüzü uygulayan düz bir nesne kullanıyor.
 */
export interface SpawnableEnemy extends EnemyState {
  spawn(mover: Mover, hp: number, speed: number): void;
  step(scaledDelta: number): void;
  reachedEnd(): boolean;
}

export interface Mover {
  /** @param scaledDelta `GameClock.scaledDelta`, birim ms (TIER 1 kural 8). */
  step(e: EnemyState, scaledDelta: number): void;
  /** Hedeflemenin (`first`/`last`) bakacağı sayı. Birim: px. */
  remainingDistance(e: EnemyState): number;
  /** Dünya koordinatı — çizim bunu kullanır. */
  positionAt(e: EnemyState): Vec2;
  /** Yolun/hattın sonuna vardı mı (kale). */
  reachedEnd(e: EnemyState): boolean;
  /** Doğum anındaki ilerleme durumu. */
  spawnProgress(): PathProgress;
}
