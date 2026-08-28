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
  /**
   * Asker (M5). `research/02` §7 tablosu **24** diyor.
   *
   * Sağlaması: 8 yapı noktasının hepsi Haydutlar kışlası olsa 8 × 3 = 24
   * kışla askeri eder — yani tavan tam dolduğunda bile kışlalar
   * karşılanıyor. Takviye'nin 2 geçici askeri bunun **üstüne** geliyor ve
   * havuz doluysa sessizce kısılıyor (`AbilitySystem.castReinforcements`);
   * §8 Takviye'yi bir ek olarak tanımlıyor, garantili bir hak olarak değil.
   */
  soldier: 24,
  /**
   * Altın uçuşu (M6-T10, `GAME-DESIGN.md` §10). Ömrü kısa (~500 ms) —
   * yalnız aynı yarım saniyede ölen düşman sayısı kadarı aynı anda uçuyor.
   * `soldier` ile aynı tavan: alan hasarlı bir kule bir grubu aynı karede
   * bitirebiliyor, bu onu karşılıyor.
   */
  goldFlight: 24,
  /**
   * `G05` — hasar görmüş düşman can çubuğu. Yalnız `hp < maxHp` olan
   * düşmanlarda çıkıyor (seçenek b), yani tavan `enemy`'den çok daha
   * düşük. Doğrulama (görevin kendi tahmini): "tepe dalgada bile aynı
   * anda gösterilen çubuk ~10-15." 20, o tahmine makul bir pay bırakıyor
   * — `enemy`nin (60) tam katı değil çünkü çoğu düşman ya tam canlı ya
   * ölü, ikisi de çubuk göstermiyor.
   */
  enemyHealthBar: 20,
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
 * Ekonomi ve denge sabitleri. Her satırın yanında `GAME-DESIGN.md` atfı var.
 *
 * TIER 1 kural 1: bu sayıların hiçbiri `src/systems/` içinde geçmez.
 */
export const BALANCE = {
  /** §6 */
  startLives: STARTING_LIVES,
  /** §4.5 — harcanan **toplamın** yüzdesi, tek kademenin değil. */
  sellRefund: 0.7,
  /** §3 — hiçbir vuruş tamamen emilmez. */
  damageFloor: 0.15,
  /** §6 — dalga bitiş bonusu. */
  waveEndBonus: (n: number): number => 30 + n * 5,
  /** §6 — hazırlık sayacı. Birim: saniye. */
  prepSeconds: 20,
  /** §6 — erken başlatma bonusu ilk 3 dalgada **kapalı**, buton dalga 4'te açılır. */
  earlyBonusFrom: 4,
  /** §6 Kısıt B — odaklanma kaybı (overkill). */
  focusLoss: 0.75,
  /** §6 — her iki kısıt için pay: `tavan > gerekenHP × 1.15`. */
  safetyMargin: 1.15,
  /** §6 tablosu — kapsanan düz yol parçası sayısına göre aktiflik. */
  activityRatio: { 1: 0.6, 2: 0.8, 3: 0.95 },
  /** §7 — tekdüze rampa yorucu; zirveler ve nefes anları planlanıyor. */
  breatherWaves: [4, 7],
  /** §7 — nefes dalgasının bütçe çarpanı. */
  breatherFactor: 0.85,
  /** §7 — bütçe tabanı ve büyüme oranı. */
  budgetBase: 10,
  budgetGrowth: 1.2,
} as const;

/**
 * `düşmanlarArasıBekleme = SPAWN_K / dalgaBoyu` (`GAME-DESIGN.md` §7).
 *
 * ## `SPAWN_K` aslında **dalganın doğum süresi**
 *
 * Formül düşman sayısına böldüğü için toplam doğum süresi
 * `(n−1) × SPAWN_K / n ≈ SPAWN_K` — yani dalga kaç düşmanlı olursa olsun
 * doğum penceresi **sabit**. §7'nin "kalabalık dalgalar daha sık doğurur"
 * cümlesinin karşılığı bu: aralık kısalıyor, pencere aynı kalıyor.
 *
 * ## Sayı nasıl seçildi (`// GEÇİCİ — S28`)
 *
 * Dokümanda yok. **Uydurulmadı, ölçüldü:** `waveSim` ile 10 dalga, sekiz
 * farklı `SPAWN_K` değerinde koşturuldu (`M3-SONUC.md` §2).
 *
 * | `SPAWN_K` | doğum süresi | sızan dalga | toplam sızan HP |
 * |---|---|---|---|
 * | 8 | 7,2 sn | 6 | 364 |
 * | 15 | 13,5 sn | 5 | 158 |
 * | 18 | 16,2 sn | 3 | 118 |
 * | 20 | 18,0 sn | 4 | 74 |
 * | **24** | **21,6 sn** | **1** | **14** |
 *
 * (gerçekçi referans tahtayla; ayrıntı `M3-SONUC.md`)
 *
 * İlk denenen 8 saniyelik pencere dalga 1'in 10 goblinini 7 saniyeye
 * sıkıştırıyordu ve 3 kule onları kesemiyordu. 24'te pencere 21,6 sn —
 * hazırlık aşamasıyla (20 sn) yaklaşık aynı, yani ritim
 * "20 sn hazırlan → ~22 sn savaş → nefes" oluyor.
 *
 * **M4'te yeniden ölçülmeli:** harita 1 kadrosuna Harpi ve Ogre Şef girince
 * hem gelir hem dalga kompozisyonu değişiyor.
 *
 * Birim: saniye × düşman.
 */
export const SPAWN_K = 24;

/**
 * ## §6 ile §7 arasında çözülmüş bir çelişki
 *
 * §7 `dalgaSonrasıBekleme = REST_K × dalgaBoyu` diyor; §6 ise hazırlık
 * sayacını **açıkça "20 sn"** olarak veriyor ve erken başlatma bonusunu
 * (`kalanSaniye × ceil(dalgaNo/2)`) o 20 saniyenin üstüne kuruyor.
 *
 * İkisi aynı anda geçerli olamaz: `REST_K × dalgaBoyu` dalga büyüdükçe
 * hazırlık süresini uzatır ve bonus formülünün tavanı dalgadan dalgaya
 * değişir — §6'nın "dalga 10'da gerçek bir karar" dediği denge bozulur.
 *
 * **Açık sayı kazanıyor.** Hazırlık her dalgada 20 sn. `REST_K` M3'te
 * **kullanılmıyor**; §7'nin o satırı §6 tarafından geçersizleştirilmiş
 * sayılıyor. S28'in bu yarısı böyle kapandı.
 */
export const REST_K_KULLANILMIYOR = true;

