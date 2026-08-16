import type Phaser from 'phaser';

/**
 * Nihai sayı **bitmap fontu** (M6-T01, TIER 1 kural 7).
 *
 * `numbers.png` + `numbers.xml`, Inter Tight'tan `scripts/prep-assets.mjs`
 * (`sayiFontuUret`) ile üretiliyor — web fontu olarak **indirilmiyor**,
 * yalnız üretim aracı olarak kullanılıyor (`assets-src/fonts/`, pakete
 * girmiyor). Gerçek AngleCode BMFont XML'i; eski yer tutucunun
 * `RetroFont.Parse`'ı burada yok, `scene.load.bitmapFont` kullanılıyor.
 *
 * `NUMBER_FONT_KEY` yer tutucudan beri aynı kaldı — kullanan taraf hiç
 * değişmedi.
 */

export const NUMBER_FONT_KEY = 'sayilar';

/**
 * Yüklemeyi kuyruğa alır. `preload()` içinden çağrılır (`PreloadScene`
 * deseni) — `ensureNumberFont`'un aksine artık **eşzamansız** bir ağ/önbellek
 * yüklemesi, `create()`'te değil `preload()`'da olmalı.
 */
export function queueNumberFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.has(NUMBER_FONT_KEY)) return;
  scene.load.bitmapFont(NUMBER_FONT_KEY, 'assets/fonts/numbers.png', 'assets/fonts/numbers.xml');
}
