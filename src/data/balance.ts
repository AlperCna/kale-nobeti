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
  projectile: 200,
  damageText: 60,
} as const;

/**
 * Mermi uçuş hızı. Birim: px/sn.
 *
 * `// GEÇİCİ — S20`: **dokümanda hiçbir yerde yok.** Uydurulmadı, geçici
 * işaretlendi. Denge etkisi var — yavaş mermi hızlı düşmanı (Kurt Binicisi
 * 110 px/sn) ıskalar ve kulenin etkin DPS'i düşer.
 *
 * 600, en hızlı düşmanın 5,5 katı; menzil 150 px'lik bir kulede uçuş süresi
 * en fazla 0,25 sn.
 */
export const GECICI_MERMI_HIZI = 600;

/**
 * Mermi isabet yarıçapı. Birim: px.
 *
 * Greybox düşman 22×22 px; yarı kenarı 11, yarı köşegeni ~15,6. 12 ikisinin
 * arasında. **M6'da sprite gelince yeniden bakılacak** — o zamana kadar
 * görsel boyutla bağlantısı elle korunuyor.
 *
 * Tünellemeye karşı asıl koruma bu sayı değil, `ProjectileSystem`'deki
 * **süpürülmüş** isabet kontrolü.
 */
export const MERMI_ISABET_YARICAPI = 12;

/** Başlangıç canı. Kaynak: `GAME-DESIGN.md` §6. Yıldız eşikleri buna göre (§9). */
export const STARTING_LIVES = 20;

/**
 * M1'in geçici doğurma aralığı. Birim: saniye.
 *
 * Dalga temposu `GAME-DESIGN.md` §7'de formülle tanımlı ama sabitleri
 * (`SPAWN_K`, `REST_K`) henüz yok — S28. Bu sayı o formülden gelmiyor;
 * yalnız "20 düşman aynı anda ekranda" kabul kriterini gözlemlenebilir
 * kılmak için seçildi. `// GEÇİCİ — M3-T05 devralacak`
 */
export const M1_GECICI_DOGMA_ARALIGI_SN = 0.8;
