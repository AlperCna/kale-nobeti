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

function canKaybi(m: MapDef, kullanim: YetenekKullanimi): number {
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
  it('Meteor can kurtarıyor', () => {
    expect(canKaybi(MAP_4, 'meteor')).toBeLessThan(canKaybi(MAP_4, 'yok'));
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
    // Payı en geniş iki harita; Kar Geçidi'nin farkı 1 can (12 → 11).
    expect(canKaybi(MAP_5, 'takviye')).toBeLessThan(canKaybi(MAP_5, 'yok'));
    expect(canKaybi(MAP_6, 'takviye')).toBeLessThan(canKaybi(MAP_6, 'yok'));
  });

  /**
   * S111'in **asıl** kilidi: kurtarılan can geciktirmeden değil
   * öldürmeden geliyor. Takviye bir gün yine erteleyiciye dönerse
   * (`M16`'da olduğu gibi) bu test kırılır, üstteki kırılmayabilir.
   */
  it('kurtarılan can ÖLDÜRMEDEN geliyor — erteleme değil', () => {
    const yok = kosu(MAP_6, 'yok');
    const takviye = kosu(MAP_6, 'takviye');
    // Daha çok düşman ölüyor...
    expect(takviye.oldurulen).toBeGreaterThan(yok.oldurulen);
    // ...ve koşu uzamıyor (erteleme olsaydı süre belirgin artardı).
    expect(Math.abs(takviye.sure - yok.sure)).toBeLessThan(yok.sure * 0.05);
  });

  it('**Takviye, Meteor varken bile katkı ekliyor** — asıl meşruiyet sınavı', () => {
    // İki yetenek ayrı beklemelerde, yani oyuncu birini seçmiyor —
    // ikisini de basıyor. Soru "hangisi daha iyi" değil, "ikincisi
    // birincinin üstüne bir şey koyuyor mu".
    expect(canKaybi(MAP_5, 'ikisi')).toBeLessThan(canKaybi(MAP_5, 'meteor'));
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
  it('ikisi birden EN İYİSİ — yetenekler birbirini yemiyor', () => {
    for (const m of [MAP_5, MAP_6]) {
      const ikisi = canKaybi(m, 'ikisi');
      expect(ikisi, m.id).toBeLessThan(canKaybi(m, 'meteor'));
      expect(ikisi, m.id).toBeLessThan(canKaybi(m, 'takviye'));
      expect(ikisi, m.id).toBeLessThan(canKaybi(m, 'yok'));
    }
    // Kar Geçidi: Meteor'la başa baş, ama ikisinden de kötü değil.
    const ikisi4 = canKaybi(MAP_4, 'ikisi');
    expect(ikisi4).toBeLessThanOrEqual(canKaybi(MAP_4, 'meteor'));
    expect(ikisi4).toBeLessThan(canKaybi(MAP_4, 'yok'));
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
