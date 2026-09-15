import { describe, expect, it } from 'vitest';
import { DEFAULT_DIFFICULTY, DIFFICULTY, isDifficulty } from './difficulty';
import { MAPS, COVERAGE_REFERENCE_RANGE } from './maps';
import { wavesFor } from './waves';
import { BALANCE } from './balance';
import { getEnemyForMap } from './enemies';
import {
  buildReferenceBoards,
  ceilingAPerBranch,
  effectiveHp,
} from '../systems/balanceChecks';
import { simulateAllWaves } from '../systems/waveSim';
import { measureCoverage } from '../util/coverage';
import type { EnemyId } from '../types/enemy';
import type { MapDef } from '../types/map';

/**
 * Zorluğun HP çarpanı **doğum anında** uygulanıyor (`WaveManager`), yani
 * `MapDef.hpMultiplier`'ı çarpmakla aynı etkiyi ölçüm için burada
 * kurabiliriz — boss dahil, çünkü `bossFor` bölmeyi aynı çarpanla yapıyor
 * ve ikisi sadeleşmiyor: `spawn` çarpanı ayrı geliyor.
 *
 * Bu yüzden ölçümde **etkin HP'yi** ölçekliyoruz, `map.hpMultiplier`'ı
 * değil — `data/difficulty.ts`'in başlığındaki "boss hiç etkilenmiyordu"
 * bulgusunun sebebi tam olarak bu ayrım.
 */
function enKotuKisitA(m: MapDef, hpScale: number): { oran: number; kim: string } {
  const w = wavesFor(m.id);
  const k = measureCoverage(m.paths, m.buildSpots, COVERAGE_REFERENCE_RANGE);
  const son = buildReferenceBoards(m, w, k, false)[9]!;
  let enKotu = 0;
  let kim = '';
  for (const id of m.enemyRoster) {
    const e = getEnemyForMap(id as EnemyId, m);
    if (e === undefined) continue;
    const tavan = Math.min(...ceilingAPerBranch(son, e, m));
    if (!(tavan > 0)) continue;
    const oran = (effectiveHp(e, m) * hpScale) / tavan;
    if (oran > enKotu) {
      enKotu = oran;
      kim = id;
    }
  }
  return { oran: enKotu, kim };
}

function canKaybi(m: MapDef, hpScale: number): number {
  const harita: MapDef = { ...m, hpMultiplier: m.hpMultiplier * hpScale };
  const w = wavesFor(m.id);
  const k = measureCoverage(harita.paths, harita.buildSpots, COVERAGE_REFERENCE_RANGE);
  const sim = simulateAllWaves(w, buildReferenceBoards(harita, w, k, true), harita);
  let can = 0;
  for (const r of sim) {
    for (const [id, n] of Object.entries(r.leakedByEnemy)) {
      const e = getEnemyForMap(id as EnemyId, harita);
      if (e !== undefined) can += e.leakDamage * (n ?? 0);
    }
  }
  return can;
}

describe('DIFFICULTY — M8-T11 (S80)', () => {
  it('üç seviye, varsayılan Normal', () => {
    expect(Object.keys(DIFFICULTY).sort()).toEqual(['kolay', 'normal', 'zor']);
    expect(DEFAULT_DIFFICULTY).toBe('normal');
    expect(isDifficulty('normal')).toBe(true);
    expect(isDifficulty('imkansiz')).toBe(false);
  });

  it('Normal hiçbir şeyi değiştirmiyor — bugünkü denge Normal’dir', () => {
    expect(DIFFICULTY.normal.hpScale).toBe(1);
    expect(DIFFICULTY.normal.startLives).toBe(BALANCE.startLives);
  });

  it('**Zor HP’ye DOKUNMUYOR** — hiçbir düşman öldürülemez olmuyor', () => {
    // `difficulty.ts` başlığındaki ölçümün testi: HP çarpanı ×1,10'da
    // harita 1'in bossu referans tahtanın tavanını aşıyordu (%101) ve
    // öğretici harita geçilemez hâle geliyordu. Zor bu yüzden canı
    // kısıyor; Kısıt A oranları Normal ile **birebir aynı** kalmalı.
    expect(DIFFICULTY.zor.hpScale).toBe(1);
    for (const m of MAPS) {
      expect(enKotuKisitA(m, DIFFICULTY.zor.hpScale).oran, m.id).toBeCloseTo(
        enKotuKisitA(m, 1).oran,
        6,
      );
    }
  });

  it('ölçülen dayanak: HP çarpanı ×1,10 haritayı GEÇİLEMEZ yapıyordu', () => {
    // Reddedilen tasarımın kanıtı — sayı iyileşirse bu test bilinçli
    // güncellenir, kötüleşirse kırılır.
    const enKotu = Math.max(...MAPS.map((m) => enKotuKisitA(m, 1.1).oran));
    expect(enKotu).toBeGreaterThan(1);
  });

  it('Zor: can 12 — haritalar 1-3 referans tahtayla HÂLÂ geçiliyor', () => {
    expect(DIFFICULTY.zor.startLives).toBe(12);
    const ogrenmeYayi = MAPS.slice(0, 3);
    for (const m of ogrenmeYayi) {
      expect(canKaybi(m, 1), m.id).toBeLessThan(DIFFICULTY.zor.startLives);
    }
  });

  /**
   * **Bu iddia yeşile boyanmadı, ÖLÇÜLENE bağlandı (S87).**
   *
   * Zor'un tanımı "harita 4 ve 5 referans tahtadan daha iyisini
   * istiyor" (can kaybı ≥ 12) idi. `M10`'da `waveSim`'in üç körlüğü
   * kapanınca (S80/S81/S86) ölçülen değerler **5** ve **10** çıktı,
   * yani tanım karşılanmıyor.
   *
   * Bu yeni bir gevşeme değil: oyun hep böyleydi, simülasyon
   * yanmayı/yavaşlatmayı/yetenekleri görmediği için haritaları olduğundan
   * zor sanıyordu. Düzeltmek dört haritanın çarpanını yükseltmek demek
   * — **oyuncunun deneyimini değiştiren bir tasarım kararı** ve sahibin
   * onayını bekliyor (`OPEN-QUESTIONS.md` S87, tarama verisiyle).
   *
   * O karara kadar burası ölçülen değerleri kilitliyor: denge oynarsa
   * test kırılır ve karar yeniden gündeme gelir.
   */
  it('Zor: harita 4 ve 5’in ölçülen can kaybı — hedef 12, S87’de açık', () => {
    expect(DIFFICULTY.zor.startLives).toBe(12);
    expect(canKaybi(MAPS[3]!, 1), 'kar-gecidi').toBe(5);
    expect(canKaybi(MAPS[4]!, 1), 'kadim-harabe').toBe(10);
  });

  it('Kolay: BEŞ harita da bol payla geçiliyor', () => {
    for (const m of MAPS) {
      expect(canKaybi(m, DIFFICULTY.kolay.hpScale), m.id).toBeLessThanOrEqual(10);
    }
  });

  it('Kolay yıldız kaydetmiyor, diğer ikisi kaydediyor', () => {
    expect(DIFFICULTY.kolay.recordStars).toBe(false);
    expect(DIFFICULTY.normal.recordStars).toBe(true);
    expect(DIFFICULTY.zor.recordStars).toBe(true);
  });

  it('zorluk MONOTON: kolay ≤ normal ≤ zor (pay olarak)', () => {
    // "Pay" = can / beklenen kayıp. Tek bir sayıda toplanamıyor çünkü iki
    // farklı kol var (HP ve can); en kötü haritada karşılaştırılıyor.
    const pay = (d: keyof typeof DIFFICULTY): number => {
      const enKotuKayip = Math.max(...MAPS.map((m) => canKaybi(m, DIFFICULTY[d].hpScale)));
      return DIFFICULTY[d].startLives - enKotuKayip;
    };
    expect(pay('kolay')).toBeGreaterThan(pay('normal'));
    expect(pay('normal')).toBeGreaterThan(pay('zor'));
  });
});
