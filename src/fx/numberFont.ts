import Phaser from 'phaser';

/**
 * Yer tutucu **bitmap font** — hasar sayıları için (TIER 1 kural 7).
 *
 * ## Plandan sapma ve gerekçesi
 *
 * `M2-T08` "SnowB BMF ile `numbers.png` + `.xml` üret" diyordu. Bu oturumda
 * o araç çalıştırılamıyor ve **doğrulayamadığım ikili bir dosya uydurmak**
 * en kötü seçenek olurdu — bozuk bir atlas M6'ya kadar fark edilmezdi.
 *
 * Onun yerine doku **bir kez**, `Preload` sırasında üretilip
 * `RetroFont.Parse` ile gerçek bir bitmap font olarak kaydediliyor.
 * Kuralın önlemek istediği şey bu yolla tamamen karşılanıyor:
 * sayı her değiştiğinde canvas yeniden üretilip GPU'ya yüklenmiyor —
 * doku bir kez yükleniyor, `BitmapText` yalnız glif dizilimini değiştiriyor.
 *
 * **M6'da gerçek dosyayla değişecek** (`CLAUDE.md` Varlık formatları:
 * bitmap font PNG-8 + `.xml`). O noktada bu dosya silinir; `NUMBER_FONT_KEY`
 * aynı kaldığı için kullanan taraf değişmez.
 */

export const NUMBER_FONT_KEY = 'sayilar';
const TEXTURE_KEY = 'sayilar-doku';

/** `GAME-DESIGN.md` §3 hasar sayıları + M3'te altın/yüzde için. S18. */
const CHARS = '0123456789+-.%';

/** Glif kutusu. 1280×720 ölçeğinde okunur, Poki'nin 640×360'ında da. */
const GLYPH_W = 20;
const GLYPH_H = 28;
const FONT_PX = 24;

/**
 * Fontu (yoksa) üretir. Aynı sahnede birden çok kez çağrılabilir.
 *
 * @returns Üretilebildiyse `true`. `CanvasTexture` desteklenmiyorsa `false`
 *   döner ve çağıran taraf sayıyı hiç çizmez — sessizce `Text`'e düşmek
 *   kural 7'yi delerdi.
 */
export function ensureNumberFont(scene: Phaser.Scene): boolean {
  if (scene.cache.bitmapFont.has(NUMBER_FONT_KEY)) return true;

  if (!scene.textures.exists(TEXTURE_KEY)) {
    const doku = scene.textures.createCanvas(TEXTURE_KEY, GLYPH_W * CHARS.length, GLYPH_H);
    if (doku === null) return false;

    const ctx = doku.getContext();
    ctx.clearRect(0, 0, doku.width, doku.height);
    ctx.font = `bold ${FONT_PX}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF'; // beyaz: renk `setTint` ile veriliyor
    for (let i = 0; i < CHARS.length; i++) {
      ctx.fillText(CHARS[i] ?? '', i * GLYPH_W + GLYPH_W / 2, GLYPH_H / 2);
    }
    doku.refresh();
  }

  const config: Phaser.Types.GameObjects.BitmapText.RetroFontConfig = {
    image: TEXTURE_KEY,
    width: GLYPH_W,
    height: GLYPH_H,
    chars: CHARS,
    charsPerRow: CHARS.length,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 0,
  };
  scene.cache.bitmapFont.add(NUMBER_FONT_KEY, Phaser.GameObjects.RetroFont.Parse(scene, config));
  return true;
}
