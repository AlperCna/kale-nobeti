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
export function budget(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`budget: dalga numarası ≥ 1 tam sayı olmalı, ${n} geldi`);
  }
  const nefes = BALANCE.breatherWaves.includes(n as 4 | 7);
  return Math.round(
    BALANCE.budgetBase *
      Math.pow(BALANCE.budgetGrowth, n - 1) *
      (nefes ? BALANCE.breatherFactor : 1),
  );
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
  dalgaKur(6, [
    ['goblin', 4],
    ['orkSavasci', 3, 1],
    ['saman', 2],
    ['harpi', 2, 1],
  ]), // 26 ≈ bütçe 25. ŞAMAN tanıtılıyor: hedefleme modunu gerekli kılıyor.
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
    ['orkSavasci', 4],
    ['zirhliOrk', 1, 1],
    ['goblin', 2, 1],
  ]), // 14 = bütçe 14
  dalgaKur(4, [
    ['goblin', 5],
    ['orkSavasci', 5, 1],
  ]), // NEFES, 15 = bütçe 15
  dalgaKur(5, [
    ['orkSavasci', 3],
    ['orumcekAna', 2, 1],
    ['kurtBinicisi', 1],
  ]), // 21 = bütçe 21. ÖRÜMCEK ANA tanıtılıyor: bölünme.
  dalgaKur(6, [
    ['zirhliOrk', 2],
    ['trol', 1, 1],
    ['orkSavasci', 3],
    ['harpi', 1, 1],
  ]), // 25 = bütçe 25. TROL tanıtılıyor: yenilenme + kışla.
  dalgaKur(7, [
    ['goblin', 4],
    ['orkSavasci', 6, 1],
    ['zirhliOrk', 2],
  ]), // NEFES, 24 ≈ bütçe 25
  dalgaKur(8, [
    ['orumcekAna', 3],
    ['zirhliOrk', 2, 1],
    ['saman', 1],
    ['trol', 1, 1],
  ]), // 39 ≈ bütçe 36
  dalgaKur(9, [
    ['trol', 2],
    ['orumcekAna', 2, 1],
    ['zirhliOrk', 2],
    ['saman', 1, 1],
    ['harpi', 2],
  ]), // 45 ≈ bütçe 43
  dalgaKur(
    10,
    [
      ['ogreSef', 1], // 0. kapı
      ['trol', 2, 1], // 1. kapı — refakat AYRI kapıdan
      ['orumcekAna', 1, 1],
      ['zirhliOrk', 1],
    ],
    BOSS_REFAKAT_GECIKMESI_SN,
  ), // 51 ≈ bütçe 52
];

/** Harita kimliğinden dalga listesine. */
export function wavesFor(mapId: string): readonly Wave[] {
  if (mapId === 'tas-kopru') return MAP2_WAVES;
  if (mapId === 'kul-ovasi') return MAP3_WAVES;
  return MAP1_WAVES;
}
