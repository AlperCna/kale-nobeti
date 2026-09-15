/**
 * **Üç kule ailesinden hiçbiri baskın değil** — `M11` Faz 5 (S95).
 *
 * `dalKimligi` dal seçimini, `kislaDali` kışla dalını sınıyordu; bu da
 * oyunun en üstteki seçimini: **hangi aileyi kuracağım?**
 *
 * ## Ölçüm neden "aynı noktaya aynı kademe" DEĞİL
 *
 * Aileler farklı fiyatta (Okçu T3'e 350, Büyü 480, Top 510 altın).
 * Tahtayı sabitleyip yalnız aile değiştirmek ucuz aileyi haksız yere
 * cezalandırır — ona hak ettiği **fazladan kuleyi** vermez. Bu yüzden
 * tahta her aile için **yeniden türetiliyor** (`buildReferenceBoards`'ın
 * `tekAile` parametresi): ekonomi, kademe sırası ve kışla kuralı aynen
 * işliyor, yalnız hangi kulenin alındığı değişiyor.
 *
 * ## Ölçülen (can kaybı, gerçek dalgalar, Zor/Normal)
 *
 * | Harita | karışık | Okçu | Top | Büyü |
 * |---|---|---|---|---|
 * | Taş Köprü | 4 | 6 | 8 | **2** |
 * | Kül Ovası | **5** | 11 | 12 | 23 |
 * | Kar Geçidi | **12** | 17 | 11 | 29 |
 * | Kadim Harabe | **14** | 17 | 12 | 39 |
 *
 * Faz 5 **öncesi** aynı ölçüm: karışık 4/7/13/15 · Okçu **14/23/28/33**
 * · Top **6/7/7/8** · Büyü 1/19/17/34. Yani Top her haritada karışık
 * tahtadan iyiydi (oyuncu tek aileye yığarak modeli yeniyordu) ve Okçu
 * her haritada açık farkla ölüydü.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAP_2, MAP_3, MAP_4, MAP_5, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { getEnemyForMap } from '../data/enemies';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import { REFERANS_ERKEN_BONUSU, REFERANS_POLITIKA } from './referansOlcum';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { TowerId } from '../types/tower';

/**
 * **Bellekleme (`M15`).** Bu dosya aynı `(harita, aile)` ölçümünü
 * birden çok testte ve tek bir testin içinde birden çok kez istiyor —
 * karışık tahta örneğin her aile karşılaştırmasında yeniden
 * hesaplanıyordu. Ölçüm **deterministik**, yani bellekleme sonucu
 * değiştirmiyor; yalnız 24 tam simülasyonu 10'a indiriyor.
 *
 * Sebebi konfor değil **kararlılık**: test bu oturumda üç kez yalnız
 * paralel yük altında düştü ve sebebi `Test timed out in 5000ms`'ti.
 * Kararsız bir test bozuk bir korumadır — süreyi büyütmek yerine işi
 * küçültmek doğru cevap (eşik yine de açıkça veriliyor, aşağıda).
 */
const bellek = new Map<string, number>();

function canKaybi(m: MapDef, tekAile?: TowerId): number {
  const anahtar = `${m.id}:${tekAile ?? 'karisik'}`;
  const hazir = bellek.get(anahtar);
  if (hazir !== undefined) return hazir;

  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  // S109 — tahta ile simülasyon aynı oyuncuyu varsayıyor (`referansOlcum`).
  const sim = simulateAllWaves(
    w,
    buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU, tekAile),
    m,
    undefined,
    1,
    'yok',
    REFERANS_POLITIKA,
  );
  let can = 0;
  for (const r of sim) {
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, m);
      if (e !== undefined) can += e.leakDamage * (n ?? 0);
    }
  }
  bellek.set(anahtar, can);
  return can;
}

const HARITALAR = [MAP_2, MAP_3, MAP_4, MAP_5];
const AILELER: readonly TowerId[] = ['okcu', 'top', 'buyu'];

describe('Aile dengesi — M11 Faz 5 (S95)', () => {
  it('**hiçbir aile her haritada karışık tahtadan iyi değil**', () => {
    for (const aile of AILELER) {
      const kazandigi = HARITALAR.filter((m) => canKaybi(m, aile) < canKaybi(m)).length;
      expect(kazandigi, `${aile} ${kazandigi}/4 haritada karışıktan iyi`).toBeLessThan(
        HARITALAR.length,
      );
    }
  });

  it('Top artık BASKIN değil — karışık tahta çoğu haritada daha iyi', () => {
    // Faz 5 öncesi Top dört haritanın dördünde de karışıktan iyiydi.
    const topIyi = HARITALAR.filter((m) => canKaybi(m, 'top') < canKaybi(m)).length;
    expect(topIyi).toBeLessThanOrEqual(2);
  });

  it('Okçu artık ÖLÜ aile değil — en kötü harita 20 canın altında', () => {
    // Faz 5 öncesi: 14 / 23 / 28 / 33. Bu eşik o hâlin geri gelmesini
    // yakalar; Okçu'nun en iyi aile olmasını iddia etmiyor.
    for (const m of HARITALAR) {
      expect(canKaybi(m, 'okcu'), m.id).toBeLessThan(20);
    }
  });

  /**
   * **S110 — Büyü ekonomiye BAĞLI, ölü değil** (`M16` Faz 3).
   *
   * Bu test eskiden "Büyü Taş Köprü'de karışık tahtadan bile iyi"
   * diyordu ve iki sebeple düştü. Birincisi teknik: düzeltilmiş tabanda
   * harita 2'nin karışık tahtası **0** sızdırıyor, yani hiçbir aile
   * ondan iyi olamaz — tabanda karşılaştırma anlamsız.
   *
   * İkincisi gerçek bir bulgu. Taban çifti (`withEarlyBonus = false`)
   * erken başlatma altınını saymıyor ve **Büyü pahalı aile**; ölçüm
   * onu aç bırakıyor:
   *
   * | harita | taban | zengin tahta |
   * |---|---|---|
   * | tas-kopru    |  4 |  2 |
   * | kul-ovasi    | 18 |  2 |
   * | kar-gecidi   | 24 | 12 |
   * | kadim-harabe | 23 | 24 |
   *
   * Yani Büyü'nün yaşayabilirliği **erken başlatma ekonomisine**
   * bağlı — S95'in Okçu'da düzelttiği kusurun aynadaki hâli değil,
   * ondan farklı bir şey: aile ölü değil, *kapısı altına bakıyor*.
   * Dengeyi burada düzeltmek Faz 3'ün işi değil (o bir kule geçişi,
   * `M11` Faz 5 gibi); bulgu `OPEN-QUESTIONS` S110'da kayıtlı.
   *
   * Bu test bu yüzden **bozuk durumu iddia etmiyor** — yalnız ölçülen
   * ve sağlam olan iki şeyi bağlıyor.
   */
  /**
   * **`M18` — S110 KAPANDI, iddia geri kondu.**
   *
   * `M16`'da bu test ikiye bölünmüştü çünkü Büyü hiçbir haritada
   * parlamıyordu. Sebep ailenin sayıları değil **tahtanın kendisiydi**
   * (S112: dalga başına bir Buz) ve Yıldırım'ın fiyat/çıktı dengesi
   * (S110: 30 → 36). İkisi de düzelince üç ailenin üçü de bir haritada
   * en iyisi oluyor.
   *
   * Ölçülen (taban çift, Zor): Kül Ovası karışık 3 · Okçu **0** ·
   * Top 4 · Büyü 2 | Kar Geçidi karışık 12 · Okçu 19 · Top **13** ·
   * Büyü 18 | Kadim Harabe karışık 13 · Okçu 19 · Top 14 · Büyü **7**.
   *
   * Okçu ve Büyü karışık tahtayı da geçiyor; Top yalnız **tek aileler
   * arasında** birinci. Bu bilinçli: S95'in istediği şey hiçbir ailenin
   * karışık tahtayı her yerde yenmemesi ve Top eskiden onu yapıyordu.
   */
  it('her ailenin parladığı bir harita var', () => {
    // Okçu — Kül Ovası'nda karışık tahtadan bile iyi.
    expect(canKaybi(MAP_3, 'okcu')).toBeLessThan(canKaybi(MAP_3));
    // Büyü — Kadim Harabe'de karışık tahtadan iyi (S110'un kapanışı).
    expect(canKaybi(MAP_5, 'buyu')).toBeLessThan(canKaybi(MAP_5));
    // Top — Kar Geçidi'nde en iyi TEK aile.
    expect(canKaybi(MAP_4, 'top')).toBeLessThan(canKaybi(MAP_4, 'buyu'));
    expect(canKaybi(MAP_4, 'top')).toBeLessThan(canKaybi(MAP_4, 'okcu'));
  });
});
