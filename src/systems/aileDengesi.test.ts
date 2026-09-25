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
import { MAPS, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { getEnemyForMap } from '../data/enemies';
import { TOWERS } from '../data/towers';
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
/**
 * **`M118` (S95): İKİ LİSTE DE TÜRETİLİYOR — elle sayılmıyor.**
 *
 * Üstteki `M22` notu listeyi bir kez büyüttü ama listeyi **elle
 * yazılı** bıraktı, ve elle sayılan liste bu projede sessizce yalan
 * söylüyor (CLAUDE.md TIER 2). Ölçüldü: liste altı haritanın **beşini**
 * sayıyordu — **harita 1 hiç denetlenmemişti** ve orada oyunun en büyük
 * aile farkı duruyor (karışık **0**, Okçu **10**, Top **9**).
 *
 * Harita 1'in ölçülen tablosu artık kayıtta ve iki kategorik delik
 * gösteriyor — **ikisi de kusur değil, tasarımın kendisi:**
 * - Okçu T2 bossa **5,2** DPS veriyor (Top 13,2 · Büyü 13,5), çünkü
 *   zırh 10 vuruş başına düşüyor ve T2'nin hasarı 14. §4.1'in yazılı
 *   kimliği: *"Zırha karşı zayıf."*
 * - Top T1/T2 harpiye **0,0** DPS veriyor (`airMultiplier: 0`), yani
 *   mono-Top tahtası harpiyi hedefleyemiyor bile. Harita 1'de hiçbir
 *   aile T3'e ulaşamıyor (ekonomi birimi, çarpan 1,0), yani iki deliğin
 *   T3'teki cevapları (Kundakçı · Barut Fıçısı) burada yok. Dalga 6
 *   harpiyi **uçan kavramını öğretmek için** tanıtıyor; 9 can tam olarak
 *   o dersin bedeli.
 *
 * İkisi de 20 eşiğinin altında — "ceza var ama duvar yok" (§3).
 */
const HARITALAR = MAPS;
const AILELER: readonly TowerId[] = TOWERS.map((t) => t.id);

describe('Aile dengesi — M11 Faz 5 (S95)', () => {
  it('**hiçbir aile her haritada karışık tahtadan iyi değil**', () => {
    for (const aile of AILELER) {
      const kazandigi = HARITALAR.filter((m) => canKaybi(m, aile) < canKaybi(m)).length;
      expect(kazandigi, `${aile} ${kazandigi}/${HARITALAR.length} karışıktan iyi`).toBeLessThan(
        HARITALAR.length,
      );
    }
  });

  /**
   * **`M118` (S95) — "baskın değil" artık ÜÇ AİLENİN kuralı.**
   *
   * Alttaki iddia `M11` Faz 5'te yazıldı ve **Top'un adını taşıyor**,
   * çünkü o gün baskın olan Top'tu. Aradan geçen her denge turunda
   * (M18 · M47 · M66 · M75 · M81 · M84 · M117) tablo değişti ama iddia
   * hep Top'a baktı. Ölçüldü: bugün baskın aile **Büyü** ve ona bakan
   * hiçbir test yoktu — karışık tahtayı altı haritanın **dördünde**
   * geçiyor ve en kötü haritası **13**, referans tahtanın **18**'i.
   * Yani "yalnız Büyü kur" modelin oynadığı oyundan **her ölçüte göre**
   * daha güvenliydi ve oyunun en üstteki kararının hazır bir cevabı
   * vardı.
   *
   * S114 · S119 · S128 · M26 · M67 ile aynı sınıf, **altıncı kez**:
   * sistem doğru, onu *numaralayan* eski yer güncellenmiyor. Bu kez
   * numaralanan şey harita değil **aile**.
   *
   * Eşik elle seçilmedi, harita sayısından türüyor: bir aile
   * haritaların yarısından fazlasında referans tahtayı geçiyorsa
   * "hangi aileyi kuracağım" sorusunun varsayılan bir cevabı var
   * demektir.
   */
  it('hiçbir aile haritaların YARISINDAN fazlasında karışık tahtayı geçmiyor', () => {
    const sinir = Math.floor(HARITALAR.length / 2);
    for (const aile of AILELER) {
      const kazandigi = HARITALAR.filter((m) => canKaybi(m, aile) < canKaybi(m)).length;
      expect(kazandigi, `${aile} ${kazandigi}/${HARITALAR.length}`).toBeLessThanOrEqual(sinir);
    }
  });

  /**
   * **En kötü hâl ölçütü — sayma ölçütünün göremediği.**
   *
   * Yukarıdaki sayma ölçütü gürültüye duyarlı (bir haritada 1 canlık
   * fark bir "ev" sayılıyor, oysa ölçüm çözünürlüğü ±2). Bu ölçüt
   * kampanyanın tamamına bakıyor: bir ailenin **en kötü haritası**
   * referans tahtanınkinden iyiyse, o aileyi kurmak modelin oynadığı
   * oyundan düpedüz daha az riskli demektir.
   *
   * `M118`'de ikisi birden ihlal ediliyordu: Büyü 13 ve Top 17,
   * referans tahta 18.
   */
  it('hiçbir ailenin EN KÖTÜ haritası referans tahtanınkinden iyi değil', () => {
    const karisikEnKotu = Math.max(...HARITALAR.map((m) => canKaybi(m)));
    for (const aile of AILELER) {
      const enKotu = Math.max(...HARITALAR.map((m) => canKaybi(m, aile)));
      expect(enKotu, `${aile} en kötü ${enKotu} / karışık ${karisikEnKotu}`).toBeGreaterThanOrEqual(
        karisikEnKotu,
      );
    }
  });

  /**
   * Top'un **tarihsel ve daha dar** sınırı. Üstteki genel kural 3'e izin
   * veriyor, bu 2'de tutuyor — gevşetilmedi, çünkü `M11` Faz 5'te
   * baskın olan aile buydu ve koruma o ölçümün kendisi.
   */
  it('Top artık BASKIN değil — tarihsel DAHA DAR sınır korunuyor', () => {
    // Faz 5 öncesi Top dört haritanın dördünde de karışıktan iyiydi.
    const topIyi = HARITALAR.filter((m) => canKaybi(m, 'top') < canKaybi(m)).length;
    expect(topIyi).toBeLessThanOrEqual(2);
  });

  /**
   * **`M67` (S134) — eşik ÜÇ AİLEYE birden kondu.**
   *
   * Buraya kadar yalnız Okçu'ya bakıyordu, çünkü S119'da ölü aile olan
   * oydu. `M66`'nın bölünme düzeltmesi geç haritaları sertleştirince
   * ölçüm Top'un Kadim Harabe'de **22**, Büyü'nün Kar Geçidi'nde **21**
   * can kaybettirdiğini gösterdi — ikisi de 20'nin üstünde, yani o
   * haritayı tek başlarına kaybediyorlardı ve kimse bakmıyordu.
   * S119'un birebir tekrarı, bu kez iki ailede.
   *
   * Eşiği üç aileye koymak bir denge turu gerektirdi (`maps.ts` ve
   * `towers.ts`'teki S134 notları). Bugünkü tablo:
   *
   * | harita | karışık | Okçu | Top | Büyü |
   * |---|---|---|---|---|
   * | Değirmen Geçidi | 0 | 10 | 9 | 0 |
   * | Taş Köprü | 0 | 1 | 4 | 0 |
   * | Kül Ovası | 5 | **0** | 8 | 4 |
   * | Kar Geçidi | 14 | 15 | 16 | 19 |
   * | Kadim Harabe | 15 | 18 | 19 | **10** |
   * | Sisli Bataklık | 15 | 13 | **7** | 8 |
   *
   * En dar pay Büyü'de (Kar Geçidi 19). Bu bilinçli: daha fazla
   * yükseltmek Büyü'yü karışık tahtanın üstüne çıkarıyor ve S95'in
   * "hiçbir aile her yerde karışıktan iyi olmasın" şartını zorluyordu.
   *
   * **`M143` — YUKARIDAKİ TABLO BAYATMIŞ, yeniden ölçüldü.** `M118`'de
   * yazıldı; aradan `M119` (dalga verisi), `M140` ve `M143` (susturma)
   * geçti ve tablo güncellenmedi — ör. Kül Ovası/Büyü **4** diyordu,
   * gerçek **13**. Değirmen Geçidi satırı hiç yoktu. Güncel ölçüm:
   *
   * | harita | karışık | Okçu | Top | Büyü |
   * |---|---|---|---|---|
   * | Değirmen Geçidi | 0 | 10 | 9 | 0 |
   * | Taş Köprü | 2 | 1 | 3 | 0 |
   * | Kül Ovası | 9 | 6 | 8 | 13 |
   * | Kar Geçidi | 13 | **18** | **19** | **19** |
   * | Kadim Harabe | 14 | 16 | 15 | 18 |
   * | Sisli Bataklık | 17 | 16 | 9 | 13 |
   *
   * **En dar pay artık Kar Geçidi'nde ve İKİ ailede:** Top ve Büyü
   * 19/20. `M143` harpinin susturma sayılarını tam bu yüzden taradı —
   * 2 sn'lik susturma Büyü'yü 21'e çıkarıp haritayı düşürüyordu. Sınır
   * susturmadan değil, **önceden var olan 1 canlık paydan** geliyor.
   *
   * Sayılar yine elle; aşağıdaki testler onları değil **özellikleri**
   * bağlıyor (ölü aile yok, hiçbiri karışıktan sürekli iyi değil).
   */
  it('HİÇBİR aile ölü değil — üç ailenin de en kötü haritası 20 canın altında', () => {
    for (const aile of AILELER) {
      for (const m of HARITALAR) {
        expect(canKaybi(m, aile), `${aile} / ${m.id}`).toBeLessThan(20);
      }
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
  /**
   * **`M75` (S137/S138) — OKÇU'NUN EVİ KAYBOLDU, sahibi bilerek kabul etti.**
   *
   * Boss HP'leri dalga baskısı eşiğinden yeniden türetilince
   * (`bossScaling`, S137) tablo bir kez daha oynadı:
   *
   * | harita | karışık | Okçu | Top | Büyü |
   * |---|---|---|---|---|
   * | Kül Ovası | 6 | **6** | 8 | 9 |
   * | Kar Geçidi | 12 | 15 | 14 | **9** |
   * | Kadim Harabe | 15 | 18 | 19 | **10** |
   * | Sisli Bataklık | 13 | 14 | **12** | 11 |
   *
   * Büyü üç haritada, Top bir haritada karışık tahtayı **geçiyor**;
   * Okçu Kül Ovası'nda 6'ya 6 **berabere** kalıyor, yani hiçbir yerde
   * tek başına en iyi seçim değil. İddia bu yüzden "geçiyor"dan
   * "**geri kalmıyor**"a çekildi — Okçu ölü değil (üstteki 20 eşiği
   * onu bağlıyor) ama evi yok.
   *
   * Bu bir ölçüm kazası değil, **kabul edilmiş bir bedel**: S137'nin
   * boss türetmesi uygulanırken iki sonucu sahibine önceden ölçülük
   * olarak söylendi ve onaylandı. İkincisi `yetenekKatkisi`'nde.
   * Açık kol **S138** olarak kayıtlı: Okçu'ya bir ev geri verilmeli mi?
   *
   * **`M118`: bu satır bayat** — S138 `M76`'da kapandı (Yıldırım'ın
   * zincir sönümü 0,7 → 0,45) ve Okçu evini geri aldı. Silinmiyor,
   * çünkü altındaki testin neden dört kez yeniden yazıldığını
   * anlatıyor; düzeltmesi hemen altında.
   *
   * ## `M118` (S95) — ÖLÇÜLEN TABLO, altı harita
   *
   * Karışık sütunu aynı zamanda **rampanın kendisi**.
   *
   * | harita | karışık | Okçu | Top | Büyü |
   * |---|---|---|---|---|
   * | Değirmen Geçidi | 0 | 10 | 9 | 0 |
   * | Taş Köprü | 2 | **1** | 3 | **0** |
   * | Kül Ovası | 9 | **6** | 8 | 13 |
   * | Kar Geçidi | 14 | 17 | 15 | 17 |
   * | Kadim Harabe | 15 | 18 | 17 | 15 |
   * | Sisli Bataklık | 17 | **16** | **9** | **13** |
   *
   * Ev sayısı **Okçu 3 · Top 2 · Büyü 2**; en kötü hâller
   * **18 · 17 · 17**, referans tahta **17**. `M76` öncesi Okçu evsizdi,
   * `M118` öncesi Büyü dört eve ve 13'lük bir en kötüye sahipti.
   */
  it('her ailenin parladığı bir harita var', () => {
    // **`M118`: iddia artık TÜRETİLİYOR.** Yukarıdaki üç not bu testin
    // dört kez (M18 · M66 · M75 · M91) yeniden yazıldığını gösteriyor ve
    // sebebi hep aynı: hangi ailenin hangi haritada parladığı **elle
    // pinlenmişti**, oysa testin adı zaten "bir harita var" diyor — yani
    // niyet varoluşsal, adres değil. Pinlenmiş adres her denge turunda
    // bayatlıyor; varoluşsal iddia bayatlamıyor.
    //
    // İddia aynı zamanda **sıkılaştı**: `M75` Okçu'yu "geri kalmıyor"a
    // (`<=`) çekmişti çünkü evi kaybolmuştu (S138). `M118`'den sonra üç
    // ailenin üçü de en az bir haritada **kesin** öne geçiyor, yani
    // eşitlik payına gerek kalmadı (S138 zaten `M76`'da kapanmıştı).
    for (const aile of AILELER) {
      const evler = HARITALAR.filter((m) => canKaybi(m, aile) < canKaybi(m)).map((m) => m.id);
      expect(evler.length, `${aile} hiçbir haritada karışık tahtayı geçmiyor`).toBeGreaterThan(0);
    }
  });
});
