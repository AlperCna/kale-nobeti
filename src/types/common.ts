/**
 * Ortak birlik tipleri.
 *
 * TIER 1 kural 11: bu dosya Phaser'a hiç dokunmaz — ne `import` ne
 * `import type`. Testler `node` ortamında koşuyor.
 */

/** Mantıksal ekran koordinatı. Birim: px (1280×720 ölçeğinde). */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/**
 * Oyun hızı. GAME-DESIGN §1 Kontroller.
 * `0` yok — duraklatma `scene.pause()` ile yapılır, saat ölçeğiyle değil
 * (research/02 §3: sıfıra bölme riski).
 */
export type Speed = 1 | 2;
