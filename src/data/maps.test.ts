import { describe, it, expect } from 'vitest';
import { MAP_1, MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
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
  it('M1 sonunda tek harita var', () => {
    expect(MAPS).toHaveLength(1);
    expect(MAPS[0]).toBe(MAP_1);
  });
});
