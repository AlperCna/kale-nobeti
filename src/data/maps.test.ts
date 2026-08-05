import { describe, it, expect } from 'vitest';
import { MAP_1, MAP_2, MAP_3, MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { measureCoverage, pathLength, spotsCoveringFlyerPaths } from '../util/coverage';

describe('MAP_1 — GAME-DESIGN §9 tablosuna uygunluk', () => {
  it('§9 tablosundaki sayılar birebir', () => {
    expect(MAP_1.buildSpots).toHaveLength(8);
    expect(MAP_1.paths).toHaveLength(1); // 1 giriş
    expect(MAP_1.hpMultiplier).toBe(1.0);
    expect(MAP_1.goldMultiplier).toBe(MAP_1.hpMultiplier); // §9: altın çarpanı = HP çarpanı
    expect(MAP_1.startGold).toBe(280);
  });

  it('§5 kadrosu: harita 1 beş düşman tanıtıyor', () => {
    expect([...MAP_1.enemyRoster].sort()).toEqual(
      ['goblin', 'harpi', 'kurtBinicisi', 'ogreSef', 'orkSavasci'].sort(),
    );
  });

  it('yolun son waypointi kale', () => {
    const yol = MAP_1.paths[0];
    expect(yol?.[yol.length - 1]).toEqual(MAP_1.castle);
  });

  it('yapı noktası yolun üstünde değil', () => {
    // Yol üstüne kule konamaz. En yakın nokta bile yol merkezinden ≥ 40 px.
    const yol = MAP_1.paths[0] ?? [];
    for (const spot of MAP_1.buildSpots) {
      let enYakinKare = Infinity;
      for (let i = 0; i < yol.length - 1; i++) {
        const a = yol[i];
        const b = yol[i + 1];
        if (a === undefined || b === undefined) continue;
        // Segmentin ekseni ya yatay ya dikey; dik uzaklık yeterli.
        const dx = b.x - a.x;
        const d =
          dx !== 0
            ? spot.x >= Math.min(a.x, b.x) && spot.x <= Math.max(a.x, b.x)
              ? Math.abs(spot.y - a.y)
              : Infinity
            : spot.y >= Math.min(a.y, b.y) && spot.y <= Math.max(a.y, b.y)
              ? Math.abs(spot.x - a.x)
              : Infinity;
        enYakinKare = Math.min(enYakinKare, d);
      }
      expect(enYakinKare).toBeGreaterThanOrEqual(40);
    }
  });

  it('her şey mantıksal ekran içinde (kale ve doğum hariç)', () => {
    for (const spot of MAP_1.buildSpots) {
      expect(spot.x).toBeGreaterThanOrEqual(0);
      expect(spot.x).toBeLessThanOrEqual(1280);
      expect(spot.y).toBeGreaterThanOrEqual(0);
      expect(spot.y).toBeLessThanOrEqual(720);
    }
    expect(MAP_1.castle.x).toBeLessThanOrEqual(1280);
    expect(MAP_1.castle.y).toBeLessThanOrEqual(720);
  });
});

describe('MAP_1.coverage — elle yazılmadığının kanıtı', () => {
  it('measureCoverage çıktısıyla birebir eşleşiyor', () => {
    // Biri elle bir sayıyı "düzeltirse" bu test kırılır.
    const beklenen = measureCoverage(
      MAP_1.paths,
      MAP_1.buildSpots,
      COVERAGE_REFERENCE_RANGE,
    );
    expect(MAP_1.coverage).toEqual(beklenen);
  });

  it('her yapı noktası için bir kayıt, sırayla', () => {
    expect(MAP_1.coverage).toHaveLength(MAP_1.buildSpots.length);
    MAP_1.coverage.forEach((c, i) => expect(c.spotIndex).toBe(i));
  });

  it('hiçbir nokta ölü değil — hepsi yolu görüyor', () => {
    for (const c of MAP_1.coverage) expect(c.coveredPx).toBeGreaterThan(0);
  });
});

describe('MAP_1 — denge hedefleri', () => {
  it('ortalama kapsama boss 700 için gereken banda düşüyor', () => {
    // maps.ts başlığındaki türetme: boss 700 tavanın %75-85'i olacaksa
    // gereken tavan 824-933, tavan = 3C → C ∈ [275, 311].
    const ortalama =
      MAP_1.coverage.reduce((t, c) => t + c.coveredPx, 0) / MAP_1.coverage.length;
    expect(ortalama).toBeGreaterThanOrEqual(275);
    expect(ortalama).toBeLessThanOrEqual(311);
  });

  it('viraj noktaları düz noktalardan belirgin değerli', () => {
    // Oyuncunun yerleşim kararı anlamlı olsun diye: en iyi nokta en kötünün
    // en az 1.5 katı. Hepsi eşitse yerleşim kararı yok demektir.
    const degerler = MAP_1.coverage.map((c) => c.coveredPx);
    expect(Math.max(...degerler)).toBeGreaterThan(1.5 * Math.min(...degerler));
  });

  it('uçan hattını gören nokta oranı ≥ %40 (GAME-DESIGN §5, risk R4)', () => {
    const goren = spotsCoveringFlyerPaths(
      MAP_1.flyerPaths,
      MAP_1.buildSpots,
      COVERAGE_REFERENCE_RANGE,
    );
    expect(goren / MAP_1.buildSpots.length).toBeGreaterThanOrEqual(0.4);
  });

  it('yol uzunluğu ölçüldü — S16', () => {
    // Doküman bir L dayatmıyor; research/01 §3'teki 1800 bir örnekti.
    // Bu iddia yalnızca uzunluğun makul bir bantta kaldığını sabitliyor;
    // yol yeniden çizilirse burası bilinçli güncellenir.
    const L = pathLength(MAP_1.paths[0] ?? []);
    expect(L).toBe(1700);
  });
});

describe('MAPS', () => {
  it('M7 sonunda ÜÇ harita var, §9 sırasında', () => {
    // M1'de bu test "tek harita" diyordu — o bir taş durumuydu, kalıcı
    // bir kural değil. M7 üçünü de getiriyor (§9 tablosu).
    expect(MAPS).toHaveLength(3);
    expect(MAPS[0]).toBe(MAP_1);
    expect(MAPS[1]).toBe(MAP_2);
    expect(MAPS[2]).toBe(MAP_3);
  });

  it('kimlikler benzersiz — kayıt anahtarı bunlara dayanıyor', () => {
    expect(new Set(MAPS.map((m) => m.id)).size).toBe(MAPS.length);
  });
});

// ---------------------------------------------------------------------
// M7 — Harita 2 ve 3
// ---------------------------------------------------------------------

describe('Harita 2 ve 3 — GAME-DESIGN.md §9 tablosu', () => {
  it('§9 tablosunun her hücresi', () => {
    expect(MAP_2.id).toBe('tas-kopru');
    expect(MAP_2.buildSpots).toHaveLength(10);
    expect(MAP_2.paths).toHaveLength(2); // Y ayrımı
    expect(MAP_2.hpMultiplier).toBe(1.6);
    expect(MAP_2.goldMultiplier).toBe(1.6);
    // S72 — §9 tablosu 340/400 diyor ama altın çarpanını izlemiyordu.
    // §9'un kendi gerekçesi ("altın/HP oranı düşmesin") başlangıç altınına
    // da uygulandı: 280 × çarpan. Ölçülen etki: dalga 1 sızıntısı
    // harita 2'de 4→0, harita 3'te 7→0.
    expect(MAP_2.startGold).toBe(448);

    expect(MAP_3.id).toBe('kul-ovasi');
    expect(MAP_3.buildSpots).toHaveLength(12);
    expect(MAP_3.paths).toHaveLength(2); // iki giriş
    expect(MAP_3.hpMultiplier).toBe(2.6);
    expect(MAP_3.goldMultiplier).toBe(3.8); // S73 — HP çarpanından ayrıştı
    expect(MAP_3.startGold).toBe(1064); // 280 × 3,8
  });

  it('S73 — altın çarpanı HP çarpanından AZ OLAMAZ', () => {
    // §9 "eşit" diyordu; gerekçesi "altın/HP oranı düşmesin". Ölçüm harita
    // 3'te eşitliğin bu gerekçeyi karşılamadığını gösterdi (12 nokta tam
    // yükseltilemiyordu). Kural gevşetildi: **en az** eşit.
    for (const m of MAPS) expect(m.goldMultiplier).toBeGreaterThanOrEqual(m.hpMultiplier);
  });

  it('kadrolar §5 tablosuyla eşleşiyor — mekanik erken, uç örneği geç', () => {
    // Harita 2 = harita 1 + Zırhlı Ork, Şaman
    for (const e of MAP_1.enemyRoster) expect(MAP_2.enemyRoster).toContain(e);
    expect(MAP_2.enemyRoster).toContain('zirhliOrk');
    expect(MAP_2.enemyRoster).toContain('saman');
    expect(MAP_2.enemyRoster).not.toContain('trol');
    expect(MAP_2.enemyRoster).not.toContain('orumcekAna');

    // Harita 3 = harita 2 + Trol, Örümcek Ana
    for (const e of MAP_2.enemyRoster) expect(MAP_3.enemyRoster).toContain(e);
    expect(MAP_3.enemyRoster).toContain('trol');
    expect(MAP_3.enemyRoster).toContain('orumcekAna');
    // Yavru kadroda sayılmaz ama bölünmeden doğabilmesi için listede olmalı.
    expect(MAP_3.enemyRoster).toContain('orumcekYavrusu');
  });

  it('S72 — başlangıç altını çarpanı İZLİYOR', () => {
    for (const m of MAPS) {
      expect(m.startGold, m.id).toBe(Math.round(MAP_1.startGold * m.goldMultiplier));
    }
  });

  it('zorluk MONOTON artıyor', () => {
    expect(MAP_1.hpMultiplier).toBeLessThan(MAP_2.hpMultiplier);
    expect(MAP_2.hpMultiplier).toBeLessThan(MAP_3.hpMultiplier);
    expect(MAP_1.buildSpots.length).toBeLessThan(MAP_2.buildSpots.length);
    expect(MAP_2.buildSpots.length).toBeLessThan(MAP_3.buildSpots.length);
    expect(MAP_1.startGold).toBeLessThan(MAP_2.startGold);
    expect(MAP_2.startGold).toBeLessThan(MAP_3.startGold);
  });
});

describe('§9 kapsama bandı — KOL BAŞINA (ayrık yol uyarısı)', () => {
  /**
   * §9: geçerli aralık geometri bandı (285-315) ile boss bandının
   * (275-311) kesişimi = **285-311 px**.
   *
   * Ayrık yolda **kol başına** ölçülüyor: iki kol ortak gövdeyi
   * paylaşıyorsa toplam ölçüm aynı fiziksel yolu iki kez sayıyor. İlk
   * tasarımda harita 2 toplamda 487,5 çıkmıştı — kol başına 299,8.
   */
  const kolOrtalamasi = (kaps: readonly { coveredPx: number }[]): number => {
    // O kolu **hiç görmeyen** noktalar ortalamaya girmiyor: bir kolun
    // savunmasız kalması yerleşim kararı, geometri hatası değil.
    const goren = kaps.filter((c) => c.coveredPx > 0);
    return goren.reduce((a, c) => a + c.coveredPx, 0) / goren.length;
  };

  it('üç haritanın HER KOLU 285-311 px bandında', () => {
    for (const m of MAPS) {
      m.branchCoverage.forEach((kol, i) => {
        const ort = kolOrtalamasi(kol);
        expect(ort, `${m.id} kol ${i}: ${ort.toFixed(1)}`).toBeGreaterThanOrEqual(285);
        expect(ort, `${m.id} kol ${i}: ${ort.toFixed(1)}`).toBeLessThanOrEqual(311);
      });
    }
  });

  it('ölçülen değerler — değişirse M7-SONUC güncellenmeli', () => {
    expect(kolOrtalamasi(MAP_1.branchCoverage[0]!)).toBeCloseTo(296.3, 0);
    expect(kolOrtalamasi(MAP_2.branchCoverage[0]!)).toBeCloseTo(299.8, 0);
    expect(kolOrtalamasi(MAP_2.branchCoverage[1]!)).toBeCloseTo(299.8, 0);
    expect(kolOrtalamasi(MAP_3.branchCoverage[0]!)).toBeCloseTo(291.3, 0);
    expect(kolOrtalamasi(MAP_3.branchCoverage[1]!)).toBeCloseTo(291.3, 0);
  });

  it('Y ayrımında iki kol SİMETRİK — biri diğerinden kolay değil', () => {
    expect(kolOrtalamasi(MAP_2.branchCoverage[0]!)).toBeCloseTo(
      kolOrtalamasi(MAP_2.branchCoverage[1]!),
      3,
    );
    expect(kolOrtalamasi(MAP_3.branchCoverage[0]!)).toBeCloseTo(
      kolOrtalamasi(MAP_3.branchCoverage[1]!),
      3,
    );
  });

  it('kollar 150 px menzille aynı anda GÖRÜLEMİYOR — gerçek bir seçim', () => {
    // Harita 2: üst kol köşesini gören nokta alt kolu görmemeli.
    const ust = MAP_2.branchCoverage[0]!;
    const alt = MAP_2.branchCoverage[1]!;
    const ikisiniDeGoren = ust.filter(
      (c, i) => c.coveredPx > 0 && (alt[i]?.coveredPx ?? 0) > 0,
    );
    // Yalnız ortak gövde/kuyruk noktaları ikisini de görüyor (0,1,8,9).
    expect(ikisiniDeGoren).toHaveLength(4);
  });

  it('coverage ELLE YAZILMADI — measureCoverage ile aynı', () => {
    for (const m of MAPS) {
      const yeniden = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
      expect(m.coverage).toEqual(yeniden);
    }
  });
});

describe('Uçan hattı — M4-T06 kriteri (≥ %40 nokta)', () => {
  it('üç harita da kriteri geçiyor', () => {
    for (const m of MAPS) {
      const kesen = measureCoverage(m.flyerPaths, m.buildSpots, COVERAGE_REFERENCE_RANGE).filter(
        (c) => c.coveredPx > 0,
      );
      const oran = kesen.length / m.buildSpots.length;
      expect(oran, `${m.id}: %${(oran * 100).toFixed(0)}`).toBeGreaterThanOrEqual(0.4);
    }
  });

  it('her girişin bir uçan hattı var — harita 3’te iki giriş, iki hat', () => {
    expect(MAP_2.flyerPaths).toHaveLength(1);
    expect(MAP_3.flyerPaths).toHaveLength(2);
  });
});
