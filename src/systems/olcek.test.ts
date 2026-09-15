/**
 * **Ölçek sağlaması** — `CLAUDE.md`'nin yazılı mimari eşiği ölçülüyor.
 *
 * `CLAUDE.md` (Teknoloji): *"Eşik: aynı anda düşman sayısı 200'ü aşarsa
 * naif `O(n·m)` mesafe taraması yetmez, uzamsal ızgara gerekir. Mevcut
 * dalga bütçesi ~50 düşman."*
 *
 * Bu cümle M0'dan beri yazılı ve **hiç ölçülmemişti**. Burada ölçülüyor
 * ve kilitleniyor: bir dalga tasarımı ya da sonsuz mod ayarı eşiğe
 * yaklaşırsa test kırılır ve ızgara kararı **ölçümle** verilir, tahminle
 * değil.
 *
 * Ölçülen (referans tahta, gerçek dalgalar):
 *
 * | Harita | Eşzamanlı tepe |
 * |---|---|
 * | Değirmen Geçidi | 11 |
 * | Taş Köprü | 8 |
 * | Kül Ovası | 7 |
 * | Kar Geçidi | 8 |
 * | Kadim Harabe | 10 |
 * | Sisli Bataklık | 11 |
 *
 * Sonsuz modda tepe **25**'te doyuyor (dalga 30+), çünkü `ENDLESS_MAX_ENEMIES`
 * bağlayıcı. Yani en kötü hâl bile havuzun (60) yarısını, eşiğin (200)
 * sekizde birini geçmiyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAPS, MAP_1, COVERAGE_REFERENCE_RANGE } from '../data/maps';
import { wavesFor, MAP1_WAVES } from '../data/waves';
import { POOL_PREALLOC } from '../data/balance';
import { buildReferenceBoards } from './balanceChecks';
import { generateEndlessWave, endlessHpScale } from './endlessWaves';
import { simulateAllWaves, simulateWave } from './waveSim';
import { measureCoverage } from '../util/coverage';

/** `CLAUDE.md` Teknoloji — naif `O(n·m)` taramasının yettiği üst sınır. */
const IZGARA_ESIGI = 200;

describe('Ölçek — eşzamanlı düşman tepesi (CLAUDE.md 200 eşiği)', () => {
  it('kampanya dalgalarının tepesi havuzun ÇOK altında', () => {
    for (const m of MAPS) {
      const w = wavesFor(m.id);
      const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
      const sim = simulateAllWaves(w, buildReferenceBoards(m, w, k, true), m);
      const tepe = Math.max(...sim.map((r) => r.peakEnemies));
      expect(tepe, `${m.id} tepe ${tepe}`).toBeLessThan(POOL_PREALLOC.enemy);
      // Eşiğin yarısına bile yaklaşmıyor — ızgara tartışması açılmıyor.
      expect(tepe, `${m.id} tepe ${tepe}`).toBeLessThan(IZGARA_ESIGI / 4);
    }
  });

  it('sonsuz mod tepesi de havuzun altında — tavan bağlıyor', () => {
    const k = measureCoverage(MAP_1.paths, MAP_1.buildSpots, COVERAGE_REFERENCE_RANGE);
    const tahta = buildReferenceBoards(MAP_1, MAP1_WAVES, k, true)[9]!;
    let enYuksek = 0;
    for (const n of [11, 20, 30, 40]) {
      const w = generateEndlessWave(n, MAP_1.enemyRoster, MAP_1.paths.length);
      const harita = { ...MAP_1, hpMultiplier: MAP_1.hpMultiplier * endlessHpScale(n) };
      enYuksek = Math.max(enYuksek, simulateWave(w, tahta, harita).peakEnemies);
    }
    expect(enYuksek, `sonsuz tepe ${enYuksek}`).toBeLessThan(POOL_PREALLOC.enemy);
    expect(enYuksek).toBeLessThan(IZGARA_ESIGI / 4);
  });

  it('havuz kapasitesinin kendisi eşiğin altında — sözleşme', () => {
    // Havuz dolunca `WaveManager` **erteliyor** (atlamıyor), yani havuz
    // tavanı aynı zamanda eşzamanlı düşmanın sert üst sınırı. Bu satır
    // o zinciri yazıya döküyor: havuz ≤ eşik olduğu sürece naif tarama
    // yeterli kalıyor.
    expect(POOL_PREALLOC.enemy).toBeLessThan(IZGARA_ESIGI);
  });
});
