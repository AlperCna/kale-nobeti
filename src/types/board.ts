/**
 * Referans tahta tipleri. TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * "Referans tahta" = dalga N'de **makul bir oyuncunun** sahip olacağı kule
 * dizilimi. Denge sağlamalarının girdisi; uydurulmaz, ekonomiden türetilir
 * (`M3-T07`, S25).
 */

import type { TowerId } from './tower';

export interface BoardTower {
  readonly spotIndex: number;
  readonly towerId: TowerId;
  /** `0` = T1, `1` = T2. T3 M4'te. */
  readonly tier: 0 | 1;
}

export interface ReferenceBoard {
  /** 1 tabanlı. */
  readonly waveIndex: number;
  readonly towers: readonly BoardTower[];
  /** O dalgaya kadar bu tahtaya harcanan toplam altın. */
  readonly cumulativeCost: number;
}
