/**
 * Yol ilerleme tipi.
 *
 * `PathSystem`'in içinde değil burada, çünkü `types/enemy.ts` ve
 * `entities/Enemy.ts` de buna bakıyor. Tip katmanının sistem katmanından
 * içeri alması ters yönlü bir bağımlılık olurdu ve ilk dairesel `import`'ta
 * patlardı.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

/**
 * Bir düşmanın yol üzerindeki konumu.
 *
 * `remainingDistance` **türetilmiş** bir alandır — `PathSystem.advance` her
 * seferinde `(segmentIndex, tInSegment)` üzerinden yeniden hesaplar, üstüne
 * eklemez. Kare kare çıkarma yapılsaydı kayan nokta hatası binlerce karede
 * birikirdi ve `first`/`last` hedeflemesi yanlış düşmanı seçmeye başlardı.
 */
export interface PathProgress {
  readonly segmentIndex: number;
  /** Segment içindeki oran, 0..1. */
  readonly tInSegment: number;
  /** Kaleye kalan yol. Birim: px. `DEPENDENCIES.md` §3. */
  readonly remainingDistance: number;
}
