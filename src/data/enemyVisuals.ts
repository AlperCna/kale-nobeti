/**
 * Düşman görsel "juice" sabitleri — denge verisi değil ama TIER 1 kural 1'in
 * disiplini burada da geçerli: ayarlanabilir görsel sabitler koda gömülmez.
 *
 * `entities/Enemy.ts` `Poolable` (Phaser'a bağlı) olduğu için bu sabitler
 * `entities/` yerine burada duruyor — TIER 1 kural 11 zaten `data/`'nın
 * yalnız `import type` ile Phaser alabileceğini şart koşuyor, ve bu dosya
 * hiç Phaser importu yapmıyor (sayı ve hex renk).
 */

/** `G08` — vuruş flaşının süresi. `GameClock.scaledDelta` ile azalıyor,
 * yani 2× hızda gerçek süre yarıya iner (TIER 1 kural 8). */
export const HIT_FLASH_MS = 80;

/** `G08` — flaş rengi parşömen/altın tonu, Kingdom Rush'ın beyaz flaşı değil
 * (`GAME-DESIGN.md` §2: "parlak çizgi film paletine kaçılmaz"). */
export const HIT_FLASH_COLOR = 0xf2d98a;
