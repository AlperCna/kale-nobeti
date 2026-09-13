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
/**
 * **İki sahne aynı fontu kuyruğa atabilir — bu KASITLI.**
 *
 * `Game` ve `Hud` aynı tikte `preload` ediyor; her sahnenin kendi
 * `LoaderPlugin`'i var, o yüzden ikisi de `cache.has` kontrolünde `false`
 * görüp aynı fontu istiyor. Sonuç: Phaser'ın `Texture key already in use:
 * sayilar` uyarısı (dev'de görünür; gerçek akışta `LevelSelect` önce
 * yüklediği için çıkmıyor).
 *
 * `M8-T01`'de bu uyarıyı susturmak için modül düzeyinde bir "yükleniyor"
 * bayrağı denendi ve **oyunu çökertti**: `Hud` kuyruğa atmayı atlayınca
 * *beklemeyi* de atlıyor, `create()` font gelmeden koşuyor,
 * `Invalid BitmapText key: sayilar`. Çift kuyruk zararsız; her sahnenin
 * kendi yükleyicisini beklemesi ise **zorunlu**.
 */
export function queueNumberFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.has(NUMBER_FONT_KEY)) return;
  scene.load.bitmapFont(NUMBER_FONT_KEY, 'assets/fonts/numbers.png', 'assets/fonts/numbers.xml');
}
