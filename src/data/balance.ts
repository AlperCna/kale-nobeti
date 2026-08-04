/**
 * Teknik bütçeler ve denge sabitleri. TIER 1 kural 1: sayı burada, sistemde değil.
 *
 * Kule/düşman/dalga tabloları kendi dosyalarında (`towers.ts`, `enemies.ts`,
 * `waves.ts`); bu dosya hiçbirine sığmayan, sistemler arası sabitleri taşır.
 */

/**
 * Nesne havuzu ön ayırma boyutları (TIER 1 kural 3).
 *
 * Havuz **sessizce büyümez** — dolduğunda `acquire` `null` döner. Yani bu
 * sayılar aynı zamanda sert tavanlar. Kaynak: `research/02-phaser-teknik.md`
 * §7 havuz tablosu.
 *
 * Mevcut dalga bütçesi ~50 düşman (`CLAUDE.md` Teknoloji). 60 bunun üstünde
 * pay bırakıyor; 200'ü aşarsa naif `O(n·m)` mesafe taraması yetmez ve uzamsal
 * ızgara gerekir — o eşik `CLAUDE.md`'de yazılı.
 */
export const POOL_PREALLOC = {
  enemy: 60,
} as const;
