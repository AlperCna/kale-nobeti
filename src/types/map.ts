/**
 * Harita tipleri. Kaynak: `docs/GAME-DESIGN.md` §9.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 * TIER 1 kural 1: bu dosya **şekli** tanımlar, sayıyı değil. Sayılar
 * `src/data/maps.ts` içinde.
 */

import type { Vec2 } from './common';
import type { EnemyId } from './enemy';
import type { SpotCoverage } from '../util/coverage';

export interface MapDef {
  readonly id: string;
  /** Ayrı WebP dosyası, atlas DEĞİL (`CLAUDE.md` Varlık formatları). */
  readonly background: string;
  /**
   * Her giriş için bir waypoint dizisi.
   *
   * **Baştan çoğul** — harita 1 tek elemanlı dizi kullanıyor. Sonradan
   * çoğullaştırmak `PathSystem`'i ve `WaveManager`'ı baştan yazdırırdı
   * (`DEPENDENCIES.md` §1: harita 3'ün iki girişi var).
   */
  readonly paths: readonly (readonly Vec2[])[];
  readonly buildSpots: readonly Vec2[];
  /** Uçanlar için düz hatlar; yolu takip etmezler (`GAME-DESIGN.md` §5). */
  readonly flyerPaths: readonly (readonly Vec2[])[];
  readonly castle: Vec2;
  readonly hpMultiplier: number;
  /** `= hpMultiplier` (`GAME-DESIGN.md` §9). */
  readonly goldMultiplier: number;
  readonly startGold: number;
  readonly enemyRoster: readonly EnemyId[];
  /**
   * `util/coverage.ts` **üretir**, elle yazılmaz (`CLAUDE.md` Mimari).
   * Denge testleri (Kısıt A) bunu kullanıyor.
   */
  readonly coverage: readonly SpotCoverage[];
}

/** `waves` alanı M3'te `MapDef`'e eklenir; M1'de dalga kavramı yok. */
