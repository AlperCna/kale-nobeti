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
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { TowerId } from '../types/tower';

function canKaybi(m: MapDef, tekAile?: TowerId): number {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const sim = simulateAllWaves(w, buildReferenceBoards(m, w, k, true, tekAile), m);
  let can = 0;
  for (const r of sim) {
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, m);
      if (e !== undefined) can += e.leakDamage * (n ?? 0);
    }
  }
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

  it('her ailenin parladığı bir harita var', () => {
    // Büyü Taş Köprü'de karışık tahtadan bile iyi (zırhlı kadro);
    // Top geç haritalarda; Okçu hiçbirinde en iyi değil ama artık
    // yarışın içinde (bir önceki testin eşiği).
    expect(canKaybi(MAP_2, 'buyu')).toBeLessThan(canKaybi(MAP_2));
    expect(canKaybi(MAP_4, 'top')).toBeLessThan(canKaybi(MAP_4, 'buyu'));
  });
});
