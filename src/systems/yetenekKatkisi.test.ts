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
 * Ölçülen (referans tahta, Zor/Normal, can kaybı):
 *
 * | Harita | yok | Meteor | Takviye | ikisi |
 * |---|---|---|---|---|
 * | Taş Köprü | 4 | 1 | 2 | 0 |
 * | Kül Ovası | 7 | 5 | 7 | 3 |
 * | Kar Geçidi | 13 | 8 | 11 | 5 |
 * | Kadim Harabe | 15 | 12 | **10** | 6 |
 *
 * İkisi de can kurtarıyor ve **harita 5'te Takviye, Meteor'dan iyi** —
 * yani "Meteor'un gölgesinde" değil. Politika muhafazakâr (bekleme
 * dolar dolmaz en iyi hedefe), yani bunlar **alt sınır**.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAP_4, MAP_5, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor } from '../data/waves';
import { getEnemyForMap } from '../data/enemies';
import { buildReferenceBoards } from './balanceChecks';
import { simulateAllWaves } from './waveSim';
import type { YetenekKullanimi } from './waveSim';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';

function canKaybi(m: MapDef, kullanim: YetenekKullanimi): number {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const sim = simulateAllWaves(w, buildReferenceBoards(m, w, k, true), m, undefined, 1, kullanim);
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

  it('**Takviye de** can kurtarıyor — gölgede değil', () => {
    expect(canKaybi(MAP_5, 'takviye')).toBeLessThan(canKaybi(MAP_5, 'yok'));
  });

  it('harita 5’te Takviye Meteor’dan İYİ — iki yetenek farklı işe yarıyor', () => {
    expect(canKaybi(MAP_5, 'takviye')).toBeLessThan(canKaybi(MAP_5, 'meteor'));
  });

  it('ikisi birden en iyisi — yetenekler birbirini yemiyor', () => {
    const ikisi = canKaybi(MAP_5, 'ikisi');
    expect(ikisi).toBeLessThan(canKaybi(MAP_5, 'meteor'));
    expect(ikisi).toBeLessThan(canKaybi(MAP_5, 'takviye'));
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
