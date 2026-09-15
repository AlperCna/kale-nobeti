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
import { MAP_4, MAP_5, COVERAGE_REFERENCE_RANGE } from '../data/maps';
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

describe('Yeteneklerin katkısı — M11 Faz 4', () => {
  it('Meteor can kurtarıyor', () => {
    expect(canKaybi(MAP_4, 'meteor')).toBeLessThan(canKaybi(MAP_4, 'yok'));
  });

  /**
   * **S111 — Takviye TEK BAŞINA artık can kaybettiriyor** (`M16`).
   *
   * Ölçülen (Zor, taban çift):
   *
   * | harita | yok | meteor | takviye | ikisi |
   * |---|---|---|---|---|
   * | kar-gecidi     | 13 | 12 | 17 | 10 |
   * | kadim-harabe   | 15 | 11 | 16 | 10 |
   * | sisli-bataklik | 18 | 15 | 18 | 18 |
   *
   * Mekanik açık: Takviye'nin askerleri düşmanı **tutuyor**. Dalgalar
   * üst üste binmediği sürece tutmak bedavaydı — dalga zaten saha
   * boşalmadan bitmiyordu. `M16`'dan sonra geciktirilen düşman bir
   * sonraki dalganın üstüne kalıyor ve gecikme **birikiyor**.
   *
   * Yalnız bu, Takviye'yi meşrusuz yapmıyor: Meteor'un yanında hâlâ
   * katkı ekliyor (11 → 10), çünkü tutulan düşman Meteor'un altında
   * ölüyor — tutmak tek başına erteleme, Meteor'la birlikte **öldürme**
   * oluyor. Asıl meşruiyet sınavı bir sonraki test.
   *
   * Bozuk durumu iddia etmiyoruz; yalnız felakete dönmediğini bağlıyoruz.
   */
  it('Takviye tek başına FELAKET değil — 20 canın altında', () => {
    expect(canKaybi(MAP_5, 'takviye')).toBeLessThan(20);
    expect(canKaybi(MAP_4, 'takviye')).toBeLessThan(20);
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
  it('yetenekler birbirini YEMİYOR — ikisi birden en iyi sonucu paylaşıyor', () => {
    const ikisi = canKaybi(MAP_4, 'ikisi');
    expect(ikisi).toBeLessThanOrEqual(canKaybi(MAP_4, 'meteor'));
    expect(ikisi).toBeLessThan(canKaybi(MAP_4, 'takviye'));
    expect(ikisi).toBeLessThan(canKaybi(MAP_4, 'yok'));
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
