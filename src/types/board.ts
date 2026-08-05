/**
 * Referans tahta tipleri. TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * "Referans tahta" = dalga N'de **makul bir oyuncunun** sahip olacağı kule
 * dizilimi. Denge sağlamalarının girdisi; uydurulmaz, ekonomiden türetilir
 * (`M3-T07`, S25).
 */

import type { TargetMode, TierIndex, TowerId } from './tower';

export interface BoardTower {
  readonly spotIndex: number;
  readonly towerId: TowerId;
  /**
   * `0` = T1, `1` = T2, `2` = T3a, `3` = T3b.
   *
   * **M7'de T3'e açıldı.** M3-M6 boyunca `0 | 1` idi ve Kısıt A harita
   * 2-3'te **kimsenin sahip olmayacağı** bir tahtayı ölçüyordu: oyuncunun
   * elinde 2129/2959 altın varken tahta T2'de kalıyordu. Sonuç boss'un
   * tavanın %192'si (harita 2) ve %292'si (harita 3) çıkmasıydı —
   * ölçüm hatası, denge hatası değil.
   */
  readonly tier: TierIndex;
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
