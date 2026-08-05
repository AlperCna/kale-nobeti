/**
 * Referans tahta tipleri. TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * "Referans tahta" = dalga N'de **makul bir oyuncunun** sahip olacağı kule
 * dizilimi. Denge sağlamalarının girdisi; uydurulmaz, ekonomiden türetilir
 * (`M3-T07`, S25).
 */

import type { TargetMode, TowerId } from './tower';

export interface BoardTower {
  readonly spotIndex: number;
  readonly towerId: TowerId;
  /** `0` = T1, `1` = T2. T3 M4'te. */
  readonly tier: 0 | 1;
  /**
   * Hedefleme modu. Verilmezse `first` (oyunun varsayılanı, §4.5).
   *
   * **M4'ten taşınan borç.** Karşı-oyun tablosunun "Şaman → Keskin Nişancı
   * (`last` ile arkadan seç)" satırı uçtan uca ölçülemiyordu, çünkü tahta
   * hedefleme modu taşımıyordu ve simülasyon her kuleyi `first` yapıyordu.
   * Şaman grubun **arkasında** duruyor; `first` ona hiç ulaşamıyor.
   */
  readonly targetMode?: TargetMode;
}

/**
 * Tahtadaki bir kışla. `BoardTower`'dan ayrı: kışla hasar vermiyor,
 * menzili yok, `TowerSystem`'e girmiyor (`data/barracks.ts` başlığı).
 *
 * **M5'ten taşınan borç.** `simulateWave` kışlayı bilmiyordu, yani Kısıt B
 * kışlalı bir tahtayı modelleyemiyordu — oysa M5 canlı ölçümde kışlanın
 * **yerinin** sonucu 20/20'den 0/20'ye çevirebildiğini gösterdi (S69).
 * Harita 2-3'ün dengesi bu olmadan doğrulanamaz.
 */
export interface BoardBarracks {
  readonly spotIndex: number;
  /** `0` = T1, `1` = T2, `2` = Paladin, `3` = Haydutlar. */
  readonly tier: 0 | 1 | 2 | 3;
}

export interface ReferenceBoard {
  /** 1 tabanlı. */
  readonly waveIndex: number;
  readonly towers: readonly BoardTower[];
  /** Kışlalar. Boş bırakılabilir — M3/M4 tahtalarında kışla yoktu. */
  readonly barracks?: readonly BoardBarracks[];
  /** O dalgaya kadar bu tahtaya harcanan toplam altın. */
  readonly cumulativeCost: number;
}
