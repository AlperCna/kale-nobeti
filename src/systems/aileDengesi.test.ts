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
import { MAP_2, MAP_3, MAP_4, MAP_5, MAP_6, COVERAGE_REFERENCE_RANGE } from '../data/maps';
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

/**
 * **`M22` (S119): harita 6 listeye EKLENDİ.**
 *
 * Liste `M11` Faz 5'te yazıldığında harita 6 yoktu (`M12`'de geldi) ve
 * kimse büyütmedi — S114'ün birebir ikizi. Sonuç: Okçu Sisli
 * Bataklık'ta **29 can** kaybettiriyordu (sınır 20, Top 6, Büyü 5) ve
 * tahtası bossu bile sızdırıyordu, ama hiçbir test bakmıyordu.
 */
const HARITALAR = [MAP_2, MAP_3, MAP_4, MAP_5, MAP_6];
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
    //
    // **S131 KAPANDI (`M61`) — ve kusur ailenin sayılarında değildi.**
    //
    // `M60`'ta harita 6'nın Okçu'su bu eşiği şansla geçiyordu: üretim
    // adımında 12, bant ortancası **21**. Sebep tahtanın kendisiydi —
    // referans tahta harita 6'da **on dört tane aynı Keskin Nişancı**
    // kuruyordu, çünkü T3 dal kuralı Top ve Büyü'yü sayıp Okçu'yu
    // saymıyordu. Gömülü Tünelci'ye değen tek Okçu cevabı (Kundakçı'nın
    // yanması, `gomuluMu` notu) tahtada hiç yoktu.
    //
    // `M22` teşhisi doğru koymuştu ("Okçu'nun hiçbir çarpanı yok") ama
    // çareyi kule sayısında aradı (T3a 34 → 41). Eksik olan sayı değil
    // **dal seçimiydi**. Kural düzeltildi: 21 → **11** (ortanca), üretim
    // adımında 11. Eşik gevşetilmedi.
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
   * Okçu ve Büyü karışık tahtayı da geçiyor; Top yalnız **tek aileler
   * arasında** birinci. Bu bilinçli: S95'in istediği şey hiçbir ailenin
   * karışık tahtayı her yerde yenmemesi ve Top eskiden onu yapıyordu.
   *
   * ## `M66` (S133) — tablo yeniden türetildi, TOP'UN EVİ TAŞINDI
   *
   * Simülasyon Örümcek Ana'nın bölünmesini hiç işletmiyordu; düzeltilince
   * (`waveSim.oldur`) örümcekli haritalar belirgin biçimde zorlaştı ve
   * makas yeniden açıldı. Yeni tablo (taban çift):
   *
   * | harita | karışık | Okçu | Top | Büyü |
   * |---|---|---|---|---|
   * | Kül Ovası | 7 | **0** | 8 | 7 |
   * | Kar Geçidi | 16 | **16** | 19 | 21 |
   * | Kadim Harabe | 18 | 19 | 22 | **16** |
   * | Sisli Bataklık | 12 | 13 | **7** | 11 |
   *
   * İddia duruyor ama dayanağı değişti: Top'un parladığı yer artık Kar
   * Geçidi değil **Sisli Bataklık** ve orada açık ara birinci (7'ye 11 ve
   * 13). Kar Geçidi bölünmeyle birlikte Okçu'nun haritası oldu.
   *
   * Sebep mekanik: Örümcek Ana ölünce yavru veriyor ve Top'un patlaması
   * yavru kümesini biçmek için en iyi araç olmalıydı — ama Kar Geçidi'nde
   * Harpi var ve Top'un T1/T2/Havan'ı **uçana vuramıyor** (§4.2). Örümcek
   * baskısı artınca o kategorik delik ağır bastı. Sisli Bataklık'ta Harpi
   * baskısı düşük, örümcek yok, ve Top'un patlaması Tünelci penceresinde
   * de değiyor (`gomuluMu` notu) — bu yüzden orada birinci.
   *
   * **Kayda değer:** Kadim Harabe'de Top 22, Kar Geçidi'nde Büyü 21, yani
   * ikisi 20 canın üstünde. `aileDengesi`'nin 20 eşiği yalnız Okçu'ya
   * konmuş durumda (S119'un kapanışı) ve o geçiyor (16 · 19 · 13). Top ve
   * Büyü için de eşik konmalı mı — sahibinin kararı, S134.
   */
  it('her ailenin parladığı bir harita var', () => {
    // Okçu — Kül Ovası'nda karışık tahtadan bile iyi.
    expect(canKaybi(MAP_3, 'okcu')).toBeLessThan(canKaybi(MAP_3));
    // Büyü — Kadim Harabe'de karışık tahtadan iyi (S110'un kapanışı).
    expect(canKaybi(MAP_5, 'buyu')).toBeLessThan(canKaybi(MAP_5));
    // Top — **Sisli Bataklık'ta** açık ara birinci (`M66`). `M22`-`M66`
    // arasında evi Kar Geçidi'ydi ve orada "berabere birinci"ye düşmüştü
    // (S120); bölünme simüle edilmeye başlayınca Kar Geçidi'ni Okçu aldı
    // ve Top'un üstünlüğü Sisli Bataklık'ta netleşti. Gerekçe üstteki
    // notta: Kar Geçidi'nde Harpi var ve Top'un çoğu kademesi uçana
    // vuramıyor.
    expect(canKaybi(MAP_6, 'top')).toBeLessThan(canKaybi(MAP_6, 'okcu'));
    expect(canKaybi(MAP_6, 'top')).toBeLessThan(canKaybi(MAP_6, 'buyu'));
    expect(canKaybi(MAP_6, 'top')).toBeLessThan(canKaybi(MAP_6));
  });
});
