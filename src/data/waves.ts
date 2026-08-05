/**
 * Dalga bütçesi ve Harita 1'in 10 dalgası.
 *
 * `GAME-DESIGN.md` §7: "Dalgalar elle yazılmaz, **bütçe ile üretilir** ve
 * sonra elle rötuşlanır. Bütçe yaklaşımı, oyunun asla yenilemez bir dalga
 * üretmemesini garanti eder."
 *
 * TIER 1 kural 1: sayı burada.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { EnemyId } from '../types/enemy';
import type { Wave, WaveGroup } from '../types/wave';
import { BALANCE, SPAWN_K } from './balance';
import { getEnemy } from './enemies';

/**
 * Dalga `n`'in puan bütçesi. `GAME-DESIGN.md` §7 formülü birebir.
 *
 * `budget(n) = round(10 × 1.20^(n−1) × (nefes ? 0.85 : 1))`
 *
 * @throws Dalga numarası 1'den küçükse — sessizce 0 dönmek dalga üretimini
 *   boş bırakır ve hata çok sonra ortaya çıkar.
 */
export function budget(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`budget: dalga numarası ≥ 1 tam sayı olmalı, ${n} geldi`);
  }
  const nefes = BALANCE.breatherWaves.includes(n as 4 | 7);
  return Math.round(
    BALANCE.budgetBase *
      Math.pow(BALANCE.budgetGrowth, n - 1) *
      (nefes ? BALANCE.breatherFactor : 1),
  );
}

/** Grup içi doğum aralığı (`GAME-DESIGN.md` §7). Birim: saniye. */
export function spawnDelayFor(waveEnemyCount: number): number {
  if (waveEnemyCount <= 0) return SPAWN_K;
  return SPAWN_K / waveEnemyCount;
}

/**
 * ## Harita 1'in 10 dalgası
 *
 * **Kadro:** yalnız Goblin, Ork Savaşçı, Kurt Binicisi
 * (`GAME-DESIGN.md` §5 harita kadrosu tablosu). Harpi M4'te uçan hareketiyle,
 * Ogre Şef de M4'te geliyor — bu yüzden **dalga 10 burada boss dalgası
 * değil**, yoğun bir Kurt Binicisi dalgası.
 *
 * **Kompozisyon bütçeden üretildi, sonra rötuşlandı** (§7). Rötuş kuralı:
 * - Dalga 1-2 yalnız Goblin (1 puan) — düşman tanıtımı.
 * - Ork Savaşçı (2 puan) dalga 3'te girer: **zırh kavramını tanıtan** düşman.
 * - Kurt Binicisi (3 puan) dalga 5'te girer: hız kavramı.
 * - Nefes dalgalarında (4, 7) yeni tip **tanıtılmaz** — nefes almak demek
 *   yeni şey öğrenmemek demek.
 *
 * Her dalganın puan toplamı `budget(n)` ile ±%10 içinde; `waves.test.ts`
 * bunu sayıya bağlıyor.
 */
function grup(
  enemy: EnemyId,
  count: number,
  startAt: number,
  toplamDusman: number,
): WaveGroup {
  return {
    enemy,
    count,
    spawnDelay: spawnDelayFor(toplamDusman),
    startAt,
    spawnPoint: 0, // harita 1 tek girişli
  };
}

/** `[düşman, adet]` çiftlerinden dalga kurar; `startAt` gruplar arası artar. */
function dalgaKur(index: number, parcalar: ReadonlyArray<readonly [EnemyId, number]>): Wave {
  const toplamDusman = parcalar.reduce((t, [, c]) => t + c, 0);
  const aralik = spawnDelayFor(toplamDusman);

  let t = 0;
  const groups: WaveGroup[] = [];
  for (const [enemy, count] of parcalar) {
    groups.push(grup(enemy, count, t, toplamDusman));
    // Sonraki grup, bu grubun son düşmanı doğduktan sonra başlıyor.
    t = Math.round((t + count * aralik) * 100) / 100;
  }
  return { index, groups };
}

export const MAP1_WAVES: readonly Wave[] = [
  dalgaKur(1, [['goblin', 10]]), // bütçe 10 → 10 puan
  dalgaKur(2, [['goblin', 12]]), // bütçe 12 → 12 puan
  dalgaKur(3, [
    ['goblin', 8],
    ['orkSavasci', 3],
  ]), // bütçe 14 → 14 puan
  dalgaKur(4, [
    ['goblin', 9],
    ['orkSavasci', 3],
  ]), // NEFES, bütçe 15 → 15 puan
  dalgaKur(5, [
    ['goblin', 6],
    ['orkSavasci', 4],
    ['kurtBinicisi', 3],
  ]), // bütçe 21 → 23 puan (+%9,5)
  dalgaKur(6, [
    ['goblin', 7],
    ['orkSavasci', 6],
    ['kurtBinicisi', 2],
  ]), // bütçe 25 → 25 puan
  dalgaKur(7, [
    ['goblin', 8],
    ['orkSavasci', 5],
    ['kurtBinicisi', 2],
  ]), // NEFES, bütçe 25 → 24 puan
  dalgaKur(8, [
    ['goblin', 8],
    ['orkSavasci', 8],
    ['kurtBinicisi', 4],
  ]), // bütçe 36 → 36 puan
  dalgaKur(9, [
    ['goblin', 9],
    ['orkSavasci', 9],
    ['kurtBinicisi', 5],
  ]), // bütçe 43 → 42 puan
  dalgaKur(10, [
    ['goblin', 8],
    ['orkSavasci', 10],
    ['kurtBinicisi', 8],
  ]), // bütçe 52 → 52 puan
];

/** Bir dalganın puan toplamı — `budget(n)` ile karşılaştırılıyor. */
export function wavePoints(wave: Wave): number {
  return wave.groups.reduce((t, g) => t + (getEnemy(g.enemy)?.points ?? 0) * g.count, 0);
}

/** Bir dalgadaki toplam düşman sayısı — havuz kapasitesiyle karşılaştırılıyor. */
export function waveEnemyCount(wave: Wave): number {
  return wave.groups.reduce((t, g) => t + g.count, 0);
}
