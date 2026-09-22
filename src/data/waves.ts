/**
 * Dalga bütçesi ve Harita 1'in 10 dalgası.
 *
 * `GAME-DESIGN.md` §7: "Dalgalar elle yazılmaz, **bütçe ile üretilir** ve
 * sonra elle rötuşlanır. Bütçe yaklaşımı, oyunun asla yenilemez bir dalga
 * üretmemesini garanti eder."
 *
 * TIER 1 kural 1: sayı burada.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { EnemyId } from '../types/enemy';
import type { Wave, WaveGroup } from '../types/wave';
import { BALANCE, SPAWN_K } from './balance';
import { getEnemy } from './enemies';

/**
 * Dalga `n`'in puan bütçesi. `GAME-DESIGN.md` §7 formülü birebir.
 *
 * `budget(n) = round(10 × 1.20^(n−1) × (nefes ? 0.85 : 1))`
 *
 * @throws Dalga numarası 1'den küçükse — sessizce 0 dönmek dalga üretimini
 *   boş bırakır ve hata çok sonra ortaya çıkar.
 */
export function budget(n: number, elitCarpani = 1): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`budget: dalga numarası ≥ 1 tam sayı olmalı, ${n} geldi`);
  }
  const nefes = BALANCE.breatherWaves.includes(n as 4 | 7);
  return Math.round(
    BALANCE.budgetBase *
      Math.pow(BALANCE.budgetGrowth, n - 1) *
      (nefes ? BALANCE.breatherFactor : 1) *
      elitCarpani,
  );
}

/**
 * **Elit dalgası taşıyan haritalar** — `M21` (S116).
 *
 * Kadrosunda elit (Trol) olan haritalar. Harita 1-2 öğrenme yayı:
 * kadrolarında Trol yok ve orta oyunları zaten öğretme işi yapıyor.
 *
 * **Harita 4 ve 5 ölçümle DIŞARIDA.** Kar Geçidi'nde elit dalgası Okçu'yu
 * S95'in 20 can eşiğinin üstüne atıyor ve **hiçbir çarpanda** ikisi
 * birden sağlanmıyor: hp 5,6→Okçu 23 · 5,8→23 · 6,0→27 · 6,1→27, oysa
 * karışık tahtaya baskı ancak +4 Trol'de doğuyor (+3'te orta pay 0).
 * Kompozisyon da kurtarmıyor (2 Trol + 2 Örümcek Ana → Okçu 23).
 * Sebep haritaya özgü: 12 nokta (harita 5'te 15) ve kadrosundaki
 * **kalkanlı** Ork Savaşçı varyantı (`M10-T03`) tek hedefli, çarpansız
 * aileyi ikinci kez cezalandırıyor. S95'in koruması gevşetilmedi.
 * Kadim Harabe'de de aynısı: elit dalgası Okçu'yu 17 → **27** yapıyor.
 *
 * **Ölçülen sınır şu:** elit dalgası ancak Okçu tahtasının payı olan
 * yerde kaldırılabiliyor. Harita 3'te Okçu 0 → 4 (sınır 20, rahat);
 * harita 4-5'te karışık tahtaya baskı yapacak ağırlık **en zayıf
 * aileyi** eziyor. Yani orta oyunu daha ileri götürmek için önce
 * karışık tahta ile tek aile tahtası arasındaki makasın (S95'in alanı)
 * ya da maliyet/gelir oranının (S117) ele alınması gerekiyor.
 *
 * **Harita 6 `M84`'te İÇERİ ALINDI.** `M21`'in "kaotik" ölçümü
 * `M61`/`M66`/`M79`/`M81` öncesinin tahtasına aitti. Bugün elit dalgası
 * kampanyanın ağırlığını finalden ortaya kaydırıyor ve hiçbir sağlamayı
 * kırmıyor; beste ve bandı dalganın kendi başlığında.
 *
 * **Harita 4 ve 5 `M84`'te YENİDEN ölçüldü — hâlâ dışarıda, ama sebep
 * eskisinden daha net.** Elit dalgasının ağırlığı orta oyuna **hiç
 * yazılmıyor**, doğruca finale gidiyor (doğum dalgasına göre ölçüldü:
 * Kar Geçidi +2 Trol'de dalga 6'nın payı **0**, toplam 14 → 16 ve artışın
 * tamamı dalga 9-10'da). Yeterince büyüdüğünde ise iki sağlamayı birden
 * kırıyor: Kar Geçidi +3 Trol → toplam **21** (harita kaybediliyor) ve
 * Okçu **22**; Kadim Harabe +2 Trol → toplam **23**, Okçu **28**.
 * (+1 Trol ikisinde de toplamı düşürüyor: 14 → 14 ve 15 → 13.)
 * Sebep S95'in alanı: 12-15 noktalı tahtada tek aileye zorlanan Okçu
 * zaten 17-18'de duruyor, elit dalgası onu eşiğin üstüne atıyor.
 *
 * ## `M119` — HARİTA 4 VE 5 İÇERİ ALINDI. Yukarıdaki iki blok bayat.
 *
 * Üstteki ölçümler **doğruydu ama iki varsayımı vardı** ve ikisi de
 * yanlış çıktı.
 *
 * **(1) "Elit birim Trol'dür" — hayır.** Trol'ün hızı **30**, yani
 * dalga 6'da doğan Trol dalga 9'a kadar yolda; bedeli oraya yazılıyor
 * ve orta oyun boş kalıyor (yukarıdaki *"ağırlık orta oyuna hiç
 * yazılmıyor"* gözlemi tam olarak bu). Ölçüldü: dalga 6'ya taşınan iki
 * Trol **sıfır** can ediyor, dördü ise 11 — arada oyun yok, çünkü
 * bedelin düştüğü yer dalga değil **kuyruk**. `M117`'nin dersi
 * ("elit birim haritanın kendi ağır birimi olabilir") burada ikinci kez
 * genişledi: birim **hızlı** da olmalı. Örümcek Ana ölünce **90 hızlı**
 * üç yavru veriyor ve baskı dalganın İÇİNDE düşüyor.
 *
 * **(2) "Çarpan 2,2'dir" — o iki harita için hayır.** 2,2 dalga 6'yı 55
 * puana çıkarıyor ve o ağırlıkta **referans tahtanın kendisi** haritayı
 * kaybediyor (Kar Geçidi 25, Kadim Harabe 27 can). Yani duvar tek
 * başına S95 değildi — `M118`'in ölçümü: o iki haritanın **can payı**
 * yok, zaten 14 ve 15 kaybediyorlar. Çarpan tarandı ve
 * **1,8** (`balance.eliteFactorHafif`) ikisini birden çalıştırıyor.
 *
 * Sonuç (doğum dalgasına göre, referans tahta):
 * Kar Geçidi `…0 0 0 14` → **`0 0 0 0 0 0 4 0 4 4`** (final %57 → %33),
 * Kadim Harabe `…0 0 0 15` → **`0 0 0 0 0 3 0 0 8 3`** (final %53 → %21).
 * Üç aile de 20'nin altında (17 · 18 · 18) ve rampa `0·2·9·12·14·17`.
 * (Kar Geçidi'nin sayıları `M120`'de bir kez daha türetildi — Kolay'ın
 * rampası ters dönmüştü; gerekçe o haritanın dalga 9 başlığında.)
 */
export const ELIT_CARPANI: Readonly<Record<string, number>> = {
  // `M117` (S116) — harita 2 içeri alındı. Yukarıdaki "harita 1-2 öğrenme
  // yayı, kadrolarında Trol yok" notu doğruydu ama **eksikti**: elit
  // birimin Trol olması şart değil, haritanın **kendi** ağır birimi
  // yetiyor. Taş Köprü'de o birim Zırhlı Ork ve dalga 3 onu zaten
  // tanıtıyor. Ölçüm: profil `0×10` → `0 0 0 0 0 2 0 0 0 0`.
  'tas-kopru': BALANCE.eliteFactor,
  'kul-ovasi': BALANCE.eliteFactor,
  // `M119` (S116) — harita 4-5 **hafif** çarpanla içeri alındı. Tam
  // çarpan ölçülerek elendi (gerekçe `balance.eliteFactorHafif`), ama
  // 1,8'de ikisi de çalışıyor. Birim seçimi de ölçüme dayanıyor: Trol
  // bu iki haritada işe yaramıyor (hızı 30, dalga 6'da doğan Trol
  // dalga 9'a kadar yolda ve bedeli oraya yazılıyor), oysa **Örümcek
  // Ana** bölününce 90 hızlı yavru veriyor ve baskı dalganın içinde
  // düşüyor. Profil (1-8 arası can): harita 4 `0×10` → **4**, harita 5
  // `0×10` → **3**.
  'kar-gecidi': BALANCE.eliteFactorHafif,
  'kadim-harabe': BALANCE.eliteFactorHafif,
  'sisli-bataklik': BALANCE.eliteFactor,
};


/**
 * **Finalin zirve olma kuralından muaf haritalar** — `M117` (S135 × S116).
 *
 * S135 *"boss dalgası haritanın zirvesi"* diyor ve `kisitB` bunu her
 * harita için bağlıyor. Taş Köprü'ye elit dalgası konunca kural kırıldı
 * ve **ikinci kol da işe yaramadı**: harita `BUYUK_REFAKATLI_HARITALAR`'a
 * alınıp refakat 31 → 53 puana (bütçe 52 → 78) çıkarıldığında final yine
 * **0** sızdırdı. Dalga 10 tahtası 78 puanı da yiyor.
 *
 * Sebep yapısal: dalga 6'da tahta henüz **kurulurken**, dalga 10'da
 * **tamamlanmış**. Elit dalgasının ortada işe yaramasının sebebi ile
 * finalin baskıya kapalı olmasının sebebi aynı şey. Yani iki kural,
 * tahtanın bütçeyi aştığı bir haritada aynı anda sağlanamıyor.
 *
 * **Karar (sahibi, `M117`):** öğrenme yayında S116 öncelikli — oyuncunun
 * ikinci haritada bir kararının sonucunu görmesi, finalin zirve olmasından
 * önemli. Muafiyet **liste** olarak duruyor ki kapsamı tek yerden okunsun
 * ve geç haritalara sessizce sızmasın; `kisitB` listedekiler dışında
 * kuralı aynen uyguluyor.
 */
export const FINAL_ZIRVE_MUAF: readonly string[] = ['tas-kopru'];

/**
 * **Büyük refakatli haritalar** — dalga 10 bütçesi `bossWaveFactor` kadar
 * büyüyor (S135, `M70`).
 *
 * `M84`'e kadar bu liste yoktu: `budgetFor` **elit dalgası** bayrağını
 * ikinci bir karar için de kullanıyordu. İki karar aynı turda (`M70`)
 * aynı haritaya konduğu için fark edilmemişti; harita 6'ya elit dalgası
 * eklenince ortaya çıktı: bayrak onun **boss dalgasını da** %50 büyütmek
 * isteyecekti, oysa değişikliğin amacı tam tersiydi — finalin payını
 * azaltmak. İki karar artık iki adreste.
 */
export const BUYUK_REFAKATLI_HARITALAR: readonly string[] = ['kul-ovasi'];

/**
 * Bir haritanın `n`. dalgasının bütçesi. **Tek adres** — hem dalga
 * verisi hem `waves.test`'in ±%10 sağlaması bunu kullanıyor; iki yerde
 * iki ayrı kural yazmak sessizce ayrışırdı.
 */
export function budgetFor(mapId: string, n: number): number {
  const elit = ELIT_CARPANI[mapId];
  if (elit !== undefined && BALANCE.eliteWaves.includes(n as 6)) {
    return budget(n, elit);
  }
  // Boss dalgası — gerekçe `balance.bossWaveFactor` (S135). `M84`: artık
  // elit bayrağından AYRI bir liste.
  if (n === 10 && BUYUK_REFAKATLI_HARITALAR.includes(mapId)) {
    return Math.round(budget(n) * BALANCE.bossWaveFactor);
  }
  return budget(n);
}

/** Grup içi doğum aralığı (`GAME-DESIGN.md` §7). Birim: saniye. */
export function spawnDelayFor(waveEnemyCount: number): number {
  if (waveEnemyCount <= 0) return SPAWN_K;
  return SPAWN_K / waveEnemyCount;
}

/**
 * ## Harita 1'in 10 dalgası
 *
 * **Kadro:** yalnız Goblin, Ork Savaşçı, Kurt Binicisi
 * (`GAME-DESIGN.md` §5 harita kadrosu tablosu). Harpi M4'te uçan hareketiyle,
 * Ogre Şef de M4'te geliyor — bu yüzden **dalga 10 burada boss dalgası
 * değil**, yoğun bir Kurt Binicisi dalgası.
 *
 * **Kompozisyon bütçeden üretildi, sonra rötuşlandı** (§7). Rötuş kuralı:
 * - Dalga 1-2 yalnız Goblin (1 puan) — düşman tanıtımı.
 * - Ork Savaşçı (2 puan) dalga 3'te girer: **zırh kavramını tanıtan** düşman.
 * - Kurt Binicisi (3 puan) dalga 5'te girer: hız kavramı.
 * - Nefes dalgalarında (4, 7) yeni tip **tanıtılmaz** — nefes almak demek
 *   yeni şey öğrenmemek demek.
 *
 * Her dalganın puan toplamı `budget(n)` ile ±%10 içinde; `waves.test.ts`
 * bunu sayıya bağlıyor.
 */
function grup(
  enemy: EnemyId,
  count: number,
  startAt: number,
  toplamDusman: number,
  spawnPoint = 0,
): WaveGroup {
  return {
    enemy,
    count,
    spawnDelay: spawnDelayFor(toplamDusman),
    startAt,
    /**
     * **S58 — `spawnPoint` SABİT ve veride yazılı**, rastgele değil.
     *
     * Rastgele dağılım Kısıt A'yı doğrulanamaz yapardı: §9 hesabı kol
     * başına istiyor ve "bu dalga hangi koldan geliyor" bilinmeden hangi
     * kolun tavanına bakılacağı belli olmaz. Dönüşümlü olsaydı da
     * oyuncunun okuyabileceği bir örüntü yerine ezberlenmesi gereken bir
     * sıra çıkardı. Sabit + görünür (dalga telegrafı) = okunabilir.
     */
    spawnPoint,
  };
}

/**
 * `[düşman, adet]` çiftlerinden dalga kurar; `startAt` gruplar arası artar.
 *
 * @param ekGecikme İlk gruptan sonraki gruplara eklenecek gecikme (sn).
 *   Boss dalgasında refakati geciktirmek için (§7).
 */
/** Bir dalga parçası: düşman, adet ve (isteğe bağlı) giriş numarası. */
type Parca = readonly [EnemyId, number] | readonly [EnemyId, number, number];

function dalgaKur(
  index: number,
  parcalar: ReadonlyArray<Parca>,
  ekGecikme = 0,
): Wave {
  const toplamDusman = parcalar.reduce((t, [, c]) => t + c, 0);
  const aralik = spawnDelayFor(toplamDusman);

  let t = 0;
  const groups: WaveGroup[] = [];
  parcalar.forEach(([enemy, count, spawnPoint], i) => {
    groups.push(grup(enemy, count, t, toplamDusman, spawnPoint ?? 0));
    // Sonraki grup, bu grubun son düşmanı doğduktan sonra başlıyor.
    t = Math.round((t + count * aralik + (i === 0 ? ekGecikme : 0)) * 100) / 100;
  });
  return { index, groups };
}

/**
 * Boss dalgasının refakat gecikmesi. Birim: saniye.
 *
 * `GAME-DESIGN.md` §7: "**Boss refakatsiz gelir** veya refakat boss'tan
 * *sonra* gönderilir — aksi halde `first` hedeflemesi bütün ateşi refakate
 * yönlendirir ve boss serbest yürür."
 *
 * **S33: ikinci seçenek uygulandı.** Refakatsiz gelmek dalga bütçesini
 * yarıya düşürürdü (boss 25 puan, bütçe 52) ve dalga 10 dalga 9'dan
 * hafif olurdu. Refakat 8 sn sonra gönderiliyor; boss o sürede 224 px
 * öne geçiyor ve `first` hedeflemesi onu seçiyor.
 *
 * Refakat sonunda boss'u geçiyor (ork 45 px/sn vs boss 28) — o noktadan
 * sonra `strongest` hedeflemesi gerekiyor, ki §5 karşı-oyun tablosu zaten
 * boss için onu söylüyor.
 */
export const BOSS_REFAKAT_GECIKMESI_SN = 8;

export const MAP1_WAVES: readonly Wave[] = [
  dalgaKur(1, [['goblin', 10]]), // bütçe 10 → 10 puan
  dalgaKur(2, [['goblin', 12]]), // bütçe 12 → 12 puan
  dalgaKur(3, [
    ['goblin', 8],
    ['orkSavasci', 3],
  ]), // bütçe 14 → 14 puan
  dalgaKur(4, [
    ['goblin', 9],
    ['orkSavasci', 3],
  ]), // NEFES, bütçe 15 → 15 puan
  dalgaKur(5, [
    ['goblin', 6],
    ['orkSavasci', 4],
    ['kurtBinicisi', 3],
  ]), // bütçe 21 → 23 puan (+%9,5)
  dalgaKur(6, [
    ['goblin', 5],
    ['orkSavasci', 4],
    ['kurtBinicisi', 2],
    ['harpi', 2],
  ]), // bütçe 25 → 25 puan. HARPİ tanıtılıyor: uçan kavramı.
  dalgaKur(7, [
    ['goblin', 8],
    ['orkSavasci', 5],
    ['kurtBinicisi', 2],
  ]), // NEFES, bütçe 25 → 24 puan. Yeni tip yok.
  dalgaKur(8, [
    ['goblin', 6],
    ['orkSavasci', 7],
    ['kurtBinicisi', 3],
    ['harpi', 2],
  ]), // bütçe 36 → 35 puan
  dalgaKur(9, [
    ['goblin', 8],
    ['orkSavasci', 8],
    ['kurtBinicisi', 4],
    ['harpi', 3],
  ]), // bütçe 43 → 45 puan (+%4,7)
  // BOSS DALGASI — boss ÖNCE, refakat 8 sn sonra (§7, S33).
  dalgaKur(
    10,
    [
      ['ogreSef', 1],
      ['orkSavasci', 4],
      ['kurtBinicisi', 4],
      ['harpi', 2],
    ],
    BOSS_REFAKAT_GECIKMESI_SN,
  ), // bütçe 52 → 51 puan (boss 25 + refakat 26)
];

/** Bir dalganın puan toplamı — `budget(n)` ile karşılaştırılıyor. */
export function wavePoints(wave: Wave): number {
  return wave.groups.reduce((t, g) => t + (getEnemy(g.enemy)?.points ?? 0) * g.count, 0);
}

/** Bir dalgadaki toplam düşman sayısı — havuz kapasitesiyle karşılaştırılıyor. */
export function waveEnemyCount(wave: Wave): number {
  return wave.groups.reduce((t, g) => t + g.count, 0);
}

/**
 * ## Harita 2'nin 10 dalgası — "Taş Köprü"
 *
 * Kadro: harita 1 + **Zırhlı Ork** (ağır zırh 8) ve **Şaman** (%40 büyü
 * direnci + iyileştirme). §5 kalıbı: mekanik erken, uç örneği geç.
 *
 * Tanıtım sırası harita 1'inkini tekrarlıyor: yeni tip **nefes olmayan**
 * bir dalgada, tek başına birkaç adetle giriyor, sonraki dalgada kalabalığa
 * karışıyor. Zırhlı Ork dalga 3'te (Büyü kulesini gerekli kılıyor), Şaman
 * dalga 6'da (hedefleme modunu gerekli kılıyor).
 *
 * **Y ayrımı:** iki kol da kullanılıyor. `spawnPoint` burada 0/1 değil —
 * harita 2'nin **tek girişi** var (§9), ayrım yolun kendisinde. Yani
 * `paths` iki eleman ama ikisi de aynı girişten çıkıyor ve `spawnPoint`
 * hangi **kolu** seçtiğini söylüyor.
 */
export const MAP2_WAVES: readonly Wave[] = [
  dalgaKur(1, [['goblin', 10]]), // 10
  dalgaKur(2, [
    ['goblin', 7],
    ['orkSavasci', 2, 1], // alt kol
  ]), // 11 ≈ bütçe 12
  dalgaKur(3, [
    ['goblin', 6],
    ['zirhliOrk', 2, 1],
  ]), // 14 = bütçe 14. ZIRHLI ORK tanıtılıyor: Büyü’yü gerekli kılıyor.
  dalgaKur(4, [
    ['goblin', 7],
    ['orkSavasci', 4, 1],
  ]), // NEFES, 15 = bütçe 15
  dalgaKur(5, [
    ['goblin', 4],
    ['kurtBinicisi', 3, 1],
    ['zirhliOrk', 2],
  ]), // 21 = bütçe 21
  /**
   * **ELİT dalgası** — `M117` (S116). Elit birim haritanın **kendi** ağır
   * birimi: dalga 3 Zırhlı Ork'u tanıtıyor (*"Büyü'yü gerekli kılıyor"*),
   * dalga 6 onu yığıyor. İki kola bölünüyor ki bir şeridi boş bırakan
   * tahta cezasını görsün.
   *
   * **Sızan şey Zırhlı Ork DEĞİL — Harpi (ölçüldü).** Zırhlı duvar
   * kuleleri **meşgul ediyor**, o sırada iki Harpi geçiyor. Yani dalga
   * "zırha karşı ne aldın" sorusunu tek başına sormuyor; **yük
   * altında kapsaman yetiyor mu** diye soruyor ve cevabı uçan tarafta
   * alıyor. Bu, dalganın ikinci dersini (Harpi dalga 6'da kadroda) ilk
   * kez **sonuçlu** hale getiriyor.
   *
   * **Goblinler bilerek duruyor ve sayıları ölçüldü.** Aynı bütçe
   * tamamen zırhlı orka verilince (`zirhliOrk×8`, 54 puan) sızıntı
   * **0**'a düşüyor: baskıyı yaratan şey yalnız ağırlık değil, kulelerin
   * **meşgul edilmesi**. Tarama (hepsi bütçe içinde):
   * `4g+7z → 1` · **`6g+7z → 2`** · `8g+7z → 1` · `4g+8z → 1`.
   * Monoton değil — S145'in ±2 çözünürlüğü; 6+7 bandın ortası.
   */
  dalgaKur(6, [
    ['goblin', 6],
    ['orkSavasci', 3, 1],
    ['saman', 2],
    ['harpi', 2, 1],
    ['zirhliOrk', 4],
    ['zirhliOrk', 3, 1],
  ]), // ELİT, 56 ≈ bütçe 55. ŞAMAN tanıtılıyor: hedefleme modunu gerekli kılıyor.
  dalgaKur(7, [
    ['goblin', 6],
    ['orkSavasci', 5, 1],
    ['zirhliOrk', 2],
  ]), // NEFES, 24 ≈ bütçe 25. Yeni tip yok.
  dalgaKur(8, [
    ['orkSavasci', 5],
    ['kurtBinicisi', 3, 1],
    ['zirhliOrk', 2],
    ['saman', 1, 1],
  ]), // 36 = bütçe 36
  dalgaKur(9, [
    ['orkSavasci', 6],
    ['kurtBinicisi', 4, 1],
    ['zirhliOrk', 3],
    ['saman', 1, 1],
    ['harpi', 2],
  ]), // 43 = bütçe 43
  dalgaKur(
    10,
    [
      ['ogreSef', 1],
      ['zirhliOrk', 3, 1],
      ['saman', 2],
      ['kurtBinicisi', 3, 1],
    ],
    BOSS_REFAKAT_GECIKMESI_SN,
  ), // 56 ≈ bütçe 52 (boss 25 + refakat 31)
];

/**
 * ## Harita 3'ün 10 dalgası — "Kül Ovası"
 *
 * Kadro: + **Trol** (yenilenme) ve **Örümcek Ana** (bölünme).
 *
 * **İki AYRI giriş.** `spawnPoint` burada gerçekten iki farklı kapı
 * demek (§9). Dağılım S58 gereği **sabit ve veride yazılı**; oyuncu dalga
 * telegrafından hangi kapının yükleneceğini okuyabiliyor.
 *
 * Tasarım kararı: **boss tek kapıdan, refakati diğerinden.** Oyuncuyu
 * bütün savunmasını tek yere yığmaktan alıkoyan tek şey bu.
 */
export const MAP3_WAVES: readonly Wave[] = [
  dalgaKur(1, [
    ['goblin', 6],
    ['goblin', 4, 1],
  ]), // 10 = bütçe 10. İki kapı ilk dalgada tanıtılıyor.
  dalgaKur(2, [
    ['goblin', 6],
    ['orkSavasci', 3, 1],
  ]), // 12 = bütçe 12
  dalgaKur(3, [
    ['orkSavasci', 3],
    ['zirhliOrk', 1, 1],
    ['goblin', 2, 1],
  ]), // 14 = bütçe 14
  dalgaKur(4, [
    ['goblin', 5],
    ['orkSavasci', 4, 1],
  ]), // NEFES, 15 = bütçe 15
  dalgaKur(5, [
    ['orkSavasci', 3],
    ['orumcekAna', 2, 1],
    ['kurtBinicisi', 1],
  ]), // 21 = bütçe 21. ÖRÜMCEK ANA tanıtılıyor: bölünme.
  // **ELİT DALGASI** (`M21`, S116) — bütçe ×2,2 ve fazlalık tek sert
  // birime gidiyor. Gerekçe `balance.eliteWaves`'te.
  // **`M70` (S135): trol ×4 → ×3 + goblin ×5.** Puan korundu (51 → 48,
  // elit bütçe 55, pay içinde) ama yük bir sert birimden kalabalığa
  // kaydırıldı: dört Trol'ün taşması dalga 7-8'e 5 can bindiriyordu ve
  // boss dalgasını gölgede bırakıyordu. Şimdi taşma 2 can.
  dalgaKur(6, [
    ['zirhliOrk', 2],
    ['trol', 3, 1],
    ['orkSavasci', 4],
    ['harpi', 1, 1],
    ['goblin', 5],
  ]), // 51 ≈ elit bütçe 55. TROL tanıtılıyor: yenilenme + kışla.
  dalgaKur(7, [
    ['goblin', 4],
    ['orkSavasci', 5, 1],
    ['zirhliOrk', 2],
  ]), // NEFES, 24 ≈ bütçe 25
  dalgaKur(8, [
    ['orumcekAna', 2],
    ['zirhliOrk', 2, 1],
    ['saman', 1],
    ['trol', 1, 1],
  ]), // 39 ≈ bütçe 36
  dalgaKur(9, [
    ['trol', 2],
    ['orumcekAna', 1, 1],
    ['zirhliOrk', 2],
    ['saman', 1, 1],
    ['harpi', 2],
  ]), // 45 ≈ bütçe 43
  dalgaKur(
    10,
    [
      // **`M70` (S135): refakat BÜYÜDÜ** — 51 → 79 puan. Boss dalgası
      // §7'nin dediği gibi zirve değildi (sıfır can kaybettiriyordu),
      // çünkü 51 puanın 25'i tek bir bossa gidiyor ve `BOSS_CEILING_RATIO`
      // zaten onun öldürülmesini garanti ediyor. Yeni bütçe çarpanı
      // `balance.bossWaveFactor` (1,5) ve gerekçesi orada.
      ['ogreSef', 1], // 0. kapı
      ['trol', 4, 1], // 1. kapı — refakat AYRI kapıdan
      ['orumcekAna', 2, 1],
      ['zirhliOrk', 2],
      ['orkSavasci', 1],
    ],
    BOSS_REFAKAT_GECIKMESI_SN,
  ), // 51 ≈ bütçe 52
];

/**
 * ## Harita 4'ün 10 dalgası — "Kar Geçidi"
 *
 * Kadro **tam** (boss dahil dokuz tip) ve **yeni tanıtım yok**: bütün
 * mekanikler harita 1-3'te tanıtıldı (§5 "mekanik erken, uç örneği geç").
 * Zorluk kaynağı bu yüzden yalnız çarpanlar ve geometri — oyuncu yeni bir
 * kural değil, bildiği kuralların daha sıkı bir sınavını görüyor.
 *
 * **Tek giriş** (S kıvrımı): tüm gruplar `spawnPoint` 0. Harita 3'ün iki
 * kapısından sonra bu bir sadeleşme gibi görünüyor ama kıvrım kapsamayı
 * noktalara eşit dağıtıyor, yani "hangi kolu savunayım" kararı yerine
 * "hangi noktayı önce doldurayım" kararı geliyor.
 *
 * Nefes dalgaları 4 ve 7 (§7), boss 10'da refakatiyle.
 */
export const MAP4_WAVES: readonly Wave[] = [
  dalgaKur(1, [['goblin', 10]]), // 10 = bütçe 10
  dalgaKur(2, [
    ['goblin', 6],
    ['orkSavasci', 3],
  ]), // 12 = bütçe 12
  dalgaKur(3, [
    ['orkSavasci', 3],
    ['zirhliOrk', 2],
  ]), // 14 = bütçe 14
  dalgaKur(4, [
    ['goblin', 5],
    ['orkSavasci', 5],
  ]), // NEFES, 15 = bütçe 15
  dalgaKur(5, [
    ['kurtBinicisi', 3],
    ['orumcekAna', 2],
  ]), // 21 = bütçe 21
  dalgaKur(6, [
    ['zirhliOrk', 3],
    ['harpi', 2],
    ['saman', 1],
    ['orkSavasci', 1],
    // `M119` (S116) ELİT (hafif). Birim **Örümcek Ana**, Trol değil:
    // ölçüldü, Trol'ün hızı 30 ve dalga 6'da doğan Trol dalga 9'a kadar
    // yolda — bedeli oraya yazılıyor, orta oyun boş kalıyor. Ana ölünce
    // **90 hızlı** yavru veriyor, yani baskı dalganın İÇİNDE düşüyor.
    // Harpi ikinci kanal: Top'un taban kademeleri uçana vuramıyor (§4.2),
    // böylece dalga tek bir aileyi değil **kompozisyonu** sınıyor.
    // İkinci harpi grubu ayrı duruyor — `dalgaKur` `startAt`'i gruptan
    // türetiyor, birleştirmek ölçülen zamanlamayı değiştirirdi.
    ['orumcekAna', 2],
    ['harpi', 2],
    // `M120`: Şaman eklendi (43 → 48). Gerekçe aşağıdaki dalga 9 notunda —
    // Örümcek Ana **Normal**'i, Trol **Kolay**'ı besliyor ve ikisi ters
    // yönlü; bu Şaman, dalga 9'da Ana'dan Trol'e geçerken kaybedilen
    // Normal baskısını geri veriyor.
    ['saman', 1],
  ]), // ELİT, 48 ≈ bütçe 45 (×1,8). ÖRÜMCEK ANA orta oyuna taşındı.
  dalgaKur(7, [
    ['goblin', 4],
    ['orkSavasci', 6],
    ['zirhliOrk', 2],
  ]), // NEFES, 24 ≈ bütçe 25
  dalgaKur(8, [
    ['trol', 2],
    ['zirhliOrk', 3],
    ['kurtBinicisi', 2],
    ['harpi', 1],
  ]), // 38 ≈ bütçe 36
  /**
   * **`M120` — KOLAY'IN RAMPASI DÜZELTİLDİ.** `M119` finalden bir Trol
   * alınca Kolay'da harita 4 **0** cana düştü ve harita 3'ün (2) altına
   * indi — Kolay profili `0 0 2 0 5 8` olmuştu.
   *
   * Mekanizma ölçüldü: **Kolay'da (×0,8 HP) yalnız Trol hayatta kalıyor**
   * — harita 3'te 1, harita 5'te 2, harita 6'da 1 sızan var, hepsi Trol.
   * `M119` öncesi harita 4'ün geç oyununda dört Trol vardı (d9'da iki,
   * d10'da iki), sonra üçe düştü ve eşik altında kaldı.
   *
   * **Denenip elenenler (hepsi ölçüldü):** Trol'ü finale geri koymak —
   * mono-Büyü 19 → **30**, çünkü `M118` Trol'e %15 büyü direnci verdi ve
   * boss dalgasında iki Trol o tahtayı bitiriyor · Kolay'ın `hpScale`'ini
   * oynatmak — 0,78'den 0,88'e kadar **hiçbir değerde** harita 4 harita
   * 3'ü geçmiyor, yani kusur eşik gürültüsü değil yapısal · kalkanlı Ork
   * Savaşçı (kalkan `hpScale`'den etkilenmiyor, Kolay'da orantılı olarak
   * daha sert) — işe yarıyor ama mono tahtaları 26-32'ye atıyor · Kurt
   * Binicisi — her şeyi kolaylaştırıyor, Kolay yine 0.
   *
   * **İşleyen kol, iki ters yönlü kaldıraç:** Örümcek Ana **Normal**'i
   * besliyor (yavruları orada sızıyor, Kolay'da ölüyor), Trol **Kolay**'ı
   * besliyor (tek tanklı birim). Dalga 9'da Ana ↔ Trol takası Kolay'ı
   * kaldırıp Normal'i düşürüyor; kaybedilen Normal baskısı elit dalgaya
   * bir Şaman olarak geri konuyor. Harpi 2 → 1: iki kanalda birden hava
   * yükü mono-Top'u 20'ye atıyordu (§4.2, taban kademeler uçana vuramaz).
   *
   * Sonuç: Kolay `0 0 2 0 5 8` → **`0 0 2 4 5 8`** (artan), Normal
   * 13 → 12 (taban 12), üç aile 17 · 18 · 18.
   */
  dalgaKur(9, [
    ['trol', 3],
    ['saman', 1],
    ['zirhliOrk', 2],
    ['harpi', 1],
    ['goblin', 6],
  ]), // 46 ≈ bütçe 43 (+%7)
  dalgaKur(
    10,
    [
      ['ogreSef', 1],
      // `M119`: iki Trol yerine **bir** — taşınan ağırlığın karşılığı.
      ['trol', 1],
      ['zirhliOrk', 2],
      ['saman', 1],
    ],
    BOSS_REFAKAT_GECIKMESI_SN,
  ), // 46 ≈ bütçe 52 (−%11,5)
];

/**
 * ## Harita 5'in 10 dalgası — "Kadim Harabe"
 *
 * Kadro yine **tam**, yeni tanıtım yok. İki kapı, ama harita 3'ten farklı
 * bir sebeple: orada kapılar sona kadar ayrıydı, burada erken birleşiyor.
 * Bu yüzden `spawnPoint` dağılımı "hangi kapı yükleniyor" bilgisinden çok
 * **ne kadar süre ayrı yürüyor** bilgisini taşıyor — uzun gövde ikisini de
 * aynı kulelerin önüne getiriyor.
 *
 * Boss yine tek kapıdan, refakati diğerinden (harita 3 kararı).
 */
export const MAP5_WAVES: readonly Wave[] = [
  dalgaKur(1, [
    ['goblin', 5],
    ['goblin', 5, 1],
  ]), // 10 = bütçe 10. İki kapı ilk dalgada tanıtılıyor.
  dalgaKur(2, [
    ['goblin', 4],
    ['orkSavasci', 4, 1],
  ]), // 12 = bütçe 12
  dalgaKur(3, [
    ['orkSavasci', 3],
    ['zirhliOrk', 2, 1],
  ]), // 14 = bütçe 14
  dalgaKur(4, [
    ['goblin', 5],
    ['orkSavasci', 5, 1],
  ]), // NEFES, 15 = bütçe 15
  dalgaKur(5, [
    ['kurtBinicisi', 3],
    ['orumcekAna', 2, 1],
  ]), // 21 = bütçe 21
  dalgaKur(6, [
    ['zirhliOrk', 3],
    ['harpi', 1, 1],
    ['saman', 2, 1],
    // `M119` (S116) ELİT (hafif). Harita 4'ten farklı bir karışım ve
    // sebebi ölçüm: saf Örümcek Ana burada Okçu'yu 20'ye atıyor (yavru
    // onun bilinen zayıflığı), saf Trol hiç sızmıyor. Yük üç aileye
    // **dağıtılıyor** — Şaman büyü direnciyle (%40) Büyü'yü, Harpi
    // uçarak Top'u, Örümcek Ana yavrularıyla Okçu'yu sınıyor.
    ['saman', 2, 1],
    ['orumcekAna', 1],
    ['harpi', 2, 1],
  ]), // ELİT, 47 ≈ bütçe 45 (×1,8). Yük üç aileye dağıtılmış.
  // Üçüncü harpi **ölçülerek** çıkarıldı: 50 puanda harita 15'te kalıyor
  // ama Meteor ve Takviye orada **sıfır** can kurtarıyor (15/15/15) —
  // yani karar katmanı ölüyor. 47'de toplam 14 ve yetenekler geri
  // geliyor (12/12/11). `yetenekKatkisi` bunu bağlıyor.
  dalgaKur(7, [
    ['goblin', 6],
    ['orkSavasci', 6, 1],
    ['zirhliOrk', 1],
    ['harpi', 1, 1],
  ]), // NEFES, 25 = bütçe 25
  dalgaKur(8, [
    ['trol', 2],
    ['orumcekAna', 2, 1],
    ['zirhliOrk', 2, 1],
  ]), // 36 = bütçe 36
  dalgaKur(9, [
    ['trol', 1],
    ['zirhliOrk', 4, 1],
    ['saman', 2],
    ['harpi', 2, 1],
    ['kurtBinicisi', 1],
  ]), // 43 = bütçe 43
  dalgaKur(
    10,
    [
      ['ogreSef', 1], // 0. kapı
      ['trol', 2, 1], // 1. kapı — refakat AYRI kapıdan
      // `M119`: Örümcek Ana finalden alındı, orta oyuna verildi.
      ['zirhliOrk', 1, 1],
    ],
    BOSS_REFAKAT_GECIKMESI_SN,
  ), // 45 ≈ bütçe 52 (−%13,5)

];

/**
 * **Harita 6 — Sisli Bataklık** (`M12` Faz 2).
 *
 * Tek yol, tek kapı. Kadro **Tünelci'nin etrafında** kuruluyor: dalga
 * 2'de iki tane ile tanıtılıyor (oyuncu ilk kez bir düşmanın gözden
 * kaybolduğunu görüyor), sonra her dalgada var ve boss dalgasında
 * dört tane refakat ediyor.
 *
 * Her dalganın puan toplamı `budget(n)` ile birebir ya da ±%3 içinde —
 * `waves.test.ts` bunu bağlıyor.
 */
export const MAP6_WAVES: readonly Wave[] = [
  dalgaKur(1, [['goblin', 10]]), // 10 = bütçe 10
  dalgaKur(2, [
    ['goblin', 6],
    ['tunelci', 2],
  ]), // 12 = bütçe 12 — **Tünelci tanıtılıyor**
  dalgaKur(3, [
    ['goblin', 5],
    ['tunelci', 3],
  ]), // 14 = bütçe 14
  /**
   * **S127 KAPANDI (`M62`) — §7 ihlali düzeltildi.**
   *
   * Nefes dalgası (4) harita 6'da `orkSavasci`yi **ilk kez** tanıtıyordu;
   * §7 ise *"nefes dalgalarında yeni tip tanıtılmaz — nefes almak yeni
   * şey öğrenmemek demek"* diyor. Kusur `M12`'den beri duruyordu çünkü
   * harita 6 `waves.test`'in harita listesine hiç girmemişti (`M27`
   * ekledi, S114/S119 ile aynı sınıf), ve `M27`-`M61` arasında
   * "düzeltmesi denge turu ister" diye kayda geçirilip bırakılmıştı.
   *
   * **Denge turu `M62`'de sahibi tarafından istendi** (*"harita 6'yı
   * kadrodan zorlaştır"*), ve düzeltme o turun bir parçası oldu: dalga
   * 4 artık **yalnız görülmüş tiplerle** doluyor — goblin (dalga 1) ve
   * Tünelci (dalga 2). Puan aynı: `3×3 + 6×1 = 15`.
   *
   * `M27`'nin ölçtüğü tablo (goblin6+tünelci3 → 19) bugün geçerli değil;
   * o ölçüm `M61` öncesinin zayıf tahtasıyla alınmıştı. Güncel değeri
   * dalga 9'un değişikliğiyle birlikte `maps.ts`'in S131 notunda.
   */
  dalgaKur(4, [
    ['tunelci', 3],
    ['goblin', 6],
  ]), // NEFES, 15 = bütçe 15 — yalnız görülmüş tipler (§7)
  dalgaKur(5, [
    ['tunelci', 3],
    ['zirhliOrk', 3],
  ]), // 21 = bütçe 21
  /**
   * **ELİT DALGASI** (`M84`, S116) — bütçe ×2,2; fazlalık iki Trol ve
   * yedi goblin.
   *
   * `M21` bu haritayı "kaotik" diye dışarıda bırakmıştı ama o ölçüm
   * `M61`/`M66`/`M79`/`M81` öncesinin tahtasıyla alınmıştı. Bugün
   * ölçüldü: elit dalgası kampanyanın ağırlığını **finalden ortaya**
   * kaydırıyor. Doğum dalgasına göre can kaybı `[0 0 0 2 0 1 0 0 6 9]`,
   * yani artık 6. dalga da bir can götürüyor ve toplam 16 → **18**.
   *
   * Beste taranarak seçildi (Trol/goblin → toplam | Kolay | Okçu):
   * 3/2 → 15|10|17 (rampa harita 5'e **eşitleniyor**, iddia düşüyor) ·
   * 2/2 → 16|10|14 · 2/6 → 17|9|16 · **2/7 → 18|7|16** · 2/8 → 14|7|16 ·
   * 4/2 → 20|10|20 (harita kaybediliyor). Seçimi belirleyen şey **band**:
   * mermi hızı 300-1500 arasında oynatıldığında 2/6 Kolay'ı **11**'e
   * çıkarıyor (sınır 10), 2/7 ise 7-9 bandında kalıyor ve toplam 16-18,
   * Okçu 15-18 — hiçbir sağlamaya değmiyor (`M82`'nin dersi).
   *
   * Goblin'in işi kalabalık değil **nefes**: tek hedefli aileye (Okçu)
   * Trol arasında vurabileceği ucuz hedef veriyor. Goblin'siz 49 puanlık
   * hal Okçu'yu 20'ye çıkarıp S95'in eşiğini kırıyordu.
   */
  dalgaKur(6, [
    ['kurtBinicisi', 3],
    ['tunelci', 2],
    ['harpi', 2],
    ['orkSavasci', 2],
    ['trol', 2],
    ['goblin', 7],
  ]), // 48 ≈ elit bütçe 55
  dalgaKur(7, [
    ['goblin', 6],
    ['tunelci', 3],
    ['orkSavasci', 5],
  ]), // NEFES, 25 = bütçe 25
  dalgaKur(8, [
    ['trol', 2],
    ['tunelci', 4],
    ['zirhliOrk', 2],
  ]), // 36 = bütçe 36
  /**
   * **`M62` (S131): Zırhlı Ork ×2 → Trol ×1.** Puan aynı (8), baskı
   * değil. Sahibin isteği haritayı **kadrodan** zorlaştırmaktı ve
   * tarama şunu gösterdi: sabit puan bütçesinde tip değiştirmek karışık
   * tahtayı zor kıpırdatıyor (bütün denenen kompozisyonlar 9-12
   * arasında kaldı), çünkü hangi tipi getirirsen bir aile ona cevap
   * veriyor. Kıpırdatan tek şey **sızıntı başına bedel**: Trol'ün
   * `leakDamage` değeri 2, Zırhlı Ork'unki 1. Yani aynı puan, aynı
   * sayıda sızıntı, iki katı can.
   *
   * Zırhlı Ork haritadan çıkmıyor (dalga 5, 8 ve 10'da duruyor), Trol
   * de zaten dalga 8'den beri sahada — kadroya yeni tip girmiyor,
   * ağırlık kayıyor. §5'in "uç örneği geç" kuralıyla uyumlu: haritanın
   * en ağır tipi son dalgalarda yoğunlaşıyor.
   */
  dalgaKur(9, [
    ['trol', 3],
    ['saman', 1],
    ['tunelci', 3],
    ['harpi', 2],
  ]), // 44 ≈ bütçe 43
  dalgaKur(
    10,
    [
      ['ogreSef', 1],
      ['tunelci', 4],
      ['trol', 1],
      ['zirhliOrk', 2],
    ],
    BOSS_REFAKAT_GECIKMESI_SN,
  ), // 53 ≈ bütçe 52
];

/** Harita kimliğinden dalga listesine. */
export function wavesFor(mapId: string): readonly Wave[] {
  if (mapId === 'tas-kopru') return MAP2_WAVES;
  if (mapId === 'kul-ovasi') return MAP3_WAVES;
  if (mapId === 'kar-gecidi') return MAP4_WAVES;
  if (mapId === 'kadim-harabe') return MAP5_WAVES;
  if (mapId === 'sisli-bataklik') return MAP6_WAVES;
  return MAP1_WAVES;
}
