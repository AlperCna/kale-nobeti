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
 * **`M82` (S20) — "GEÇİCİ" etiketi ölçülerek kaldırıldı.** Sayı `M0`'dan
 * beri `GECICI_MERMI_HIZI` adıyla duruyordu: dokümanda yoktu, uydurulmadığı
 * için geçici işaretlenmişti ve on dokuz taş boyunca kimse ölçmemişti.
 * Ölçüm (referans tahta, altı harita, can kaybı):
 *
 * | hız | 1 | 2 | 3 | 4 | 5 | 6 |
 * |---|---|---|---|---|---|---|
 * | 300 | 0 | 0 | 9 | 14 | 12 | 15 |
 * | 450 | 0 | 0 | 9 | 14 | 15 | 15 |
 * | **600** | 0 | 0 | 9 | 14 | 15 | **16** |
 * | 900 | 0 | 0 | 9 | 14 | 14 | 16 |
 * | 1500 | 0 | 0 | 9 | 14 | 15 | 15 |
 *
 * Harita 1-4 **hiç** kıpırdamıyor (200 ile 4000 arasında da denendi), 5-6
 * bir-iki can salınıyor ve yön yok — yani hız bu bantta dengeyi
 * **belirlemiyor**. 600 yerinde kalıyor: en hızlı düşmanın (Kurt Binicisi
 * 110 px/sn) 5,5 katı, menzil 150 px'lik kulede uçuş süresi en fazla
 * 0,25 sn. Adı artık geçici olduğunu iddia etmiyor.
 *
 * **Kullanımı:** aynı sabit hem oyunda (`GameScene`) hem simülasyonda
 * (`waveSim`) okunuyor — ikisi ayrışırsa ölçüm oyunu ölçmeyi bırakır.
 */
export const MERMI_HIZI = 600;

/**
 * Mermi isabet yarıçapı. Birim: px.
 *
 * Greybox düşman 22×22 px; yarı kenarı 11, yarı köşegeni ~15,6. 12 ikisinin
 * arasında.
 *
 * **`M82` — "M6'da sprite gelince yeniden bakılacak" notu kapatıldı.**
 * Tetik çoktan ateşlenmişti: sprite'lar `M10`'dan beri 30 px (boss 46,
 * örümcek yavrusu 22 — `spriteFrames.enemyDisplaySize`), yani 12 artık
 * normal bir düşmanın yarı kenarının (15) **altında**. Ölçüldü: yarıçap
 * 6 → 26 arasında harita 1-5'in can kaybı **birebir aynı** (0 0 9 14 15),
 * yalnız harita 6 15-17 arasında salınıyor. Yani bu sayı denge taşımıyor;
 * işi algısal (vurmuş **görünmek**). Ölçüm gerekçesi olmadan
 * değiştirmek bir denge sayısını boşuna oynatmak olurdu — 12 kalıyor.
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
  /**
   * **Kule sinerjisi** — `M10-T05`: yavaşlatılmış düşman fiziksel
   * hasardan daha çok etkileniyor.
   *
   * GameAnalytics'in en iyi TD'leri ayıran dört kaldıracından
   * dördüncüsü bizde yoktu: kuleler birbirini bilmiyordu. Üç kule
   * etkisi (`burn`, `slow`, `chain`) ve üç düşman yeteneği vardı ama
   * hiçbir **etkileşim** yoktu.
   *
   * Bu en küçük hâli ve bilerek var olan iki şeyi birleştiriyor:
   * Büyü/Buz dalı yavaşlatıyor, Okçu/Top vuruyor. Yeni bir sistem
   * değil, var olan iki sistemin birbirini görmesi.
   *
   * Sayı ölçülerek seçildi — kayıt `OPEN-QUESTIONS.md` S88.
   */
  yavaslatmaFizikselBonus: 1.25,
  /**
   * **Patlamanın kenarındaki hasar oranı** — merkez her zaman %100.
   *
   * `S22` (`M11` Faz 4): patlama bugüne kadar yarıçapın içindeki
   * **herkese tam** hasar veriyordu ve doküman bunu hiç tanımlamamıştı.
   * Ölçüm sonucunu gösterdi: Top ailesi, gerçek haritalarda ve gerçek
   * dalgalarda diğer iki ailenin **hepsini** yeniyordu (ayrıntı
   * `OPEN-QUESTIONS` S95). Alan hasarının bedeli yoktu.
   *
   * Sayı burada; uygulanışı `ProjectileSystem.#patlat`:
   * `oran = kenar + (1 - kenar) × (1 - mesafe / yarıçap)`.
   */
  patlamaKenarOrani: 0.35,
  /** §6 — dalga bitiş bonusu. */
  waveEndBonus: (n: number): number => 30 + n * 5,
  /** §6 — hazırlık sayacı. Birim: saniye. */
  prepSeconds: 20,
  /** §6 — erken başlatma bonusu ilk 3 dalgada **kapalı**, buton dalga 4'te açılır. */
  earlyBonusFrom: 4,
  /**
   * **`focusLoss` KALDIRILDI** — `M83` (S24).
   *
   * §6'nın Kısıt B formülündeki `× 0,75` bir varsayımdı ve formül
   * `S26`/`S27` ile zaten düşmüştü; sabit burada kaldı ama **hiçbir
   * kod onu okumuyordu** — yalnız üretilen belge onu yaşayan bir kural
   * gibi basıyordu (`activityRatio` ile aynı sınıf, `M52`).
   *
   * Ölçüm yerine kondu: `waveSim` artık boşa giden hasarı sayıyor
   * (`SimResult.atilanHasar` / `bosaHasar`). Ölçülen verim altı haritada
   * 0,87-0,97, yani gerçek kayıp %25 değil **%3-13**.
   */
  /** §6 — her iki kısıt için pay: `tavan > gerekenHP × 1.15`. */
  safetyMargin: 1.15,
  /**
   * **`activityRatio` KALDIRILDI** — `M52`.
   *
   * §6'nın "kapsanan düz yol parçası sayısına göre aktiflik" tablosu
   * (`{1: 0,60, 2: 0,80, 3: 0,95}`) buradaydı ve **hiçbir yerde
   * okunmuyordu**: Kısıt B statik formülden `waveSim`'e çevrilince
   * aktiflik artık simülasyonun kendisinden çıkıyor, tablodan değil.
   * `DATA-SCHEMAS.md` bunu "kullanım dışı" diye kaydetmişti ama sabit
   * burada, ayarlanabilir görünerek duruyordu.
   *
   * Silinme gerekçesi `M51`'in dersi: **denge dosyasındaki ölü bir sayı
   * tuzaktır.** Birinin onu "ayarlaması" hiçbir şey değiştirmez ve
   * değiştirmediğini anlaması zordur (`threshold` alanı tam olarak böyle
   * iki başarımda ölü kalmıştı). Kavramın kendisi kayıtta:
   * `research/01-denge-matematigi.md` §6 ve `GAME-DESIGN.md` §6.
   */
  /** §7 — tekdüze rampa yorucu; zirveler ve nefes anları planlanıyor. */
  breatherWaves: [4, 7],
  /** §7 — nefes dalgasının bütçe çarpanı. */
  breatherFactor: 0.85,
  /**
   * **Elit dalgası** — `M21` (S116). Nefes dalgasının aynadaki kardeşi:
   * nefes bütçeyi kısar, elit **büyütür**.
   *
   * Ölçülen gerekçe: orta oyunda hiçbir dalga tehdit etmiyordu (altı
   * haritanın beşinde 1-9 arası sızıntı **sıfır**). Üç yol denendi ve
   * elendi — bütçeyi 5-9 boyunca büyütmek finali şişiriyor (`M16` üst
   * üste binmesi fazlalığı boss dalgasına devrediyor), aynı bütçeyle
   * kalabalığı elite çevirmek hiç sızdırmıyor, elitleri yaymak finali
   * 20 sınırının üstüne çıkarıyor.
   *
   * İşe yarayan **noktasal** olanı: fazlalık tek bir dalgaya toplanıp
   * **tek sert birime** (Trol) verilince orta oyun canlanıyor ve final
   * sabit kalıyor (Kar Geçidi: orta 0 → 4, final 12 → 12).
   *
   * Hangi haritanın elit dalgası taşıdığı ve **hangi çarpanla**
   * taşıdığı tek adreste: `waves.ELIT_CARPANI`. `M119`'a kadar burada
   * *"yalnız kadrosunda elit (Trol) olan haritalar"* yazıyordu; iki kez
   * yanlış çıktı — `M117` birimin Trol olmasının şart olmadığını,
   * `M119` elit birimin **hızlı** da olması gerektiğini ölçtü
   * (Trol'ün hızı 30, bedeli dalgaya değil kuyruğa yazılıyor).
   */
  eliteWaves: [6],
  eliteFactor: 2.2,
  /**
   * **Hafif elit çarpanı — `M119` (S116), harita 4-5.**
   *
   * 2,2 o iki haritada **ölçülerek elendi**: dalga 6'yı 55 puana
   * çıkarmak referans tahtanın *kendisine* haritayı kaybettiriyor
   * (Kar Geçidi **25**, Kadim Harabe **27** can; sınır 20). Sebep
   * `M118`'de yazıldı — o iki harita zaten 14 ve 15 kaybediyor, yani
   * 20'ye 5-6 canlık payları var ve tam elit dalgası tek başına
   * +10-12 getiriyor.
   *
   * Çarpan **taranarak** bulundu, seçilmedi: çalışan kompozisyonlar
   * harita 4'te 43, harita 5'te 50 puan. %15 payı ikisini birden
   * kapsayan çarpan aralığı `[1,74 · 2,02]`; **1,8** onun ortası ve
   * her iki haritayı da rahat içeride bırakıyor (−%4,4 ve +%11,1).
   * 2,0'ın üstü harita 4'ü dışarı atıyor, 1,7'nin altı harita 5'i.
   *
   * Hangi haritanın hangi çarpanı aldığı **tek adreste**:
   * `waves.ELIT_CARPANI`.
   */
  eliteFactorHafif: 1.8,
  /**
   * **Boss dalgasının bütçe çarpanı — `M70` (S135).**
   *
   * §7 boss dalgasını haritanın zirvesi olarak tanımlıyor. Kül
   * Ovası'nda değildi: dalga 10 **sıfır** can kaybettiriyordu, bütün
   * baskı elit dalgasının taşmasındaydı (S135).
   *
   * Sebep yapısal ve ölçüldü: `BOSS_CEILING_RATIO = 0,80` bossun
   * referans tahta tarafından öldürülmesini **garanti ediyor** — yani
   * "boss dalgası zirve" aslında "boss **refakati** zirve" demek. Kül
   * Ovası'nda elit dalgası 51 puanın tamamını refakat sınıfı birime
   * veriyordu; boss dalgası ise 51 puanın 25'ini tek bir bossa
   * harcıyor, geriye 26 puanlık refakat kalıyordu. Elit dalga, boss
   * dalgasının iki katı refakat taşıyordu.
   *
   * Denenip elenenler (hepsi ölçüldü): dalga 10'un kompozisyonunu
   * değiştirmek (beş varyant, hepsi d10 = 0 — tahta bütçe içindeki her
   * şeyi yutuyor) · boss HP'sini `0,80 × tavan` ile yeniden türetmek
   * (d10 yine 0, çünkü kural zaten öldürülmesini garanti ediyor) ·
   * haritanın çarpanını yükseltmek (d10 ancak 4,4'te zirve oluyor ve
   * orada toplam 15, Kolay 11, Top 21 — üç sağlama birden kırılıyor).
   *
   * İşleyen tek yol refakati büyütmek oldu. Çarpan **ölçüldü**: 52
   * puanlık taban bütçede 65 → d10 2 · 75 → d10 4 · **79 → d10 7** ·
   * 113 (elit çarpanı 2,2) → d10 15 ve toplam 20 (bandın dışı).
   * `79 / 52 ≈ 1,52`; 1,5 alındı.
   *
   * `eliteFactor` gibi yalnız elit dalgası taşıyan haritalar için
   * geçerli — liste `waves.ELIT_CARPANI`'den türüyor.
   */
  bossWaveFactor: 1.5,
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
 * **Açık sayı kazanıyor.** Hazırlık her dalgada 20 sn (`BALANCE.prepSeconds`).
 * §7'nin o satırı §6 tarafından geçersizleştirilmiş sayılıyor. S28'in bu
 * yarısı böyle kapandı.
 *
 * **`M103`:** bu karar M3'ten beri `export const REST_K_KULLANILMIYOR = true`
 * diye **kod** olarak duruyordu ve hiçbir yer onu okumuyordu. Bir kararın
 * kaydı yorumdur; `true` dönen bir sabit değil. Sabit kaldırıldı, gerekçe
 * yerinde kaldı.
 */

