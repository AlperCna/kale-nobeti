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
  /**
   * **`background` alanı KALDIRILDI** — `M52`.
   *
   * Hiçbir yerde okunmuyordu: arka plan yolu **kimlikten türetiliyor**
   * (`PreloadScene`, `assets/bg/${id}.webp` ve `assets/lazy/${id}.webp`).
   * Üstelik ölü değerlerin yarısı **yanlıştı** — harita 1-3 için
   * `bg/map1.webp` yazıyordu, gerçek dosya `bg/degirmen-gecidi.webp` ve
   * harita 2-3 zaten `lazy/` altında. Yani alan bağlansaydı oyun
   * kırılırdı.
   *
   * `activityRatio` ve başarım `threshold`'larıyla aynı sınıf: veri
   * ölüyken sessizce ayrışıyor, sonra "burada yazıyor" diye güvenilen
   * bir yalana dönüşüyor. Türetilen yol tek kaynak.
   */
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
  /**
   * **Kol başına** kapsama — `paths` ile aynı sırada.
   *
   * Ayrık yolda `coverage` (toplam) yanıltıcı: iki kol ortak gövdeyi
   * paylaşıyorsa aynı fiziksel yol iki kez sayılıyor. Ama bir düşman
   * **tek** kol yürüyor, yani Kısıt A'nın tavanı o kolun kapsamasına
   * bağlı. `GAME-DESIGN.md` §9 "ayrık yol uyarısı": *"Kısıt A hesabı her
   * kol için ayrı yapılır. Toplam DPS yanıltıcıdır — kolun yalnızca onu
   * gören kuleleri sayılır."*
   *
   * Tek yollu haritada tek elemanlı ve `coverage` ile aynı.
   */
  readonly branchCoverage: readonly (readonly SpotCoverage[])[];
}

/** `waves` alanı M3'te `MapDef`'e eklenir; M1'de dalga kavramı yok. */
