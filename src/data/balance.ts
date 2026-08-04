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

/** Başlangıç canı. Kaynak: `GAME-DESIGN.md` §6. Yıldız eşikleri buna göre (§9). */
export const STARTING_LIVES = 20;

/**
 * M1'in geçici doğurucusu için düşman değerleri.
 *
 * Kaynak: `GAME-DESIGN.md` §5 tablosu, **Goblin** satırı (HP 45, hız 60).
 * Uydurulmadı — kadronun en basit üyesi seçildi.
 *
 * **M3'te `src/data/enemies.ts` bunu tamamen değiştirecek** ve `SpawnSystem`
 * yerini `WaveManager`'a bırakacak. O noktada bu sabit silinir.
 */
export const M1_GECICI_DUSMAN = {
  hp: 45,
  /** Birim: px/sn. */
  speed: 60,
} as const;

/**
 * M1'in geçici doğurma aralığı. Birim: saniye.
 *
 * Dalga temposu `GAME-DESIGN.md` §7'de formülle tanımlı ama sabitleri
 * (`SPAWN_K`, `REST_K`) henüz yok — S28. Bu sayı o formülden gelmiyor;
 * yalnız "20 düşman aynı anda ekranda" kabul kriterini gözlemlenebilir
 * kılmak için seçildi. `// GEÇİCİ — M3-T05 devralacak`
 */
export const M1_GECICI_DOGMA_ARALIGI_SN = 0.8;
