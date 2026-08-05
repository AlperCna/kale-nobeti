/**
 * Dalga tipleri. Şema `docs/GAME-DESIGN.md` §7'den **birebir**.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { EnemyId } from './enemy';

export interface WaveGroup {
  readonly enemy: EnemyId;
  readonly count: number;
  /** Grup içi düşmanlar arası bekleme. Birim: saniye. */
  readonly spawnDelay: number;
  /** Dalga başından itibaren. Birim: saniye. */
  readonly startAt: number;
  /** Haritada birden fazla giriş varsa hangisi. Harita 1 tek girişli → `0`. */
  readonly spawnPoint: number;
}

export interface Wave {
  /** 1'den başlar. */
  readonly index: number;
  readonly groups: readonly WaveGroup[];
}
