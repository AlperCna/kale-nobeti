/**
 * **Altı T3 dalının her birinin KAZANDIĞI bir senaryo var.**
 *
 * `M11` Faz 2'nin bütün mesele bu: oyunun en derin kararı (dalga 7-8'de
 * "hangi dal?") gerçek bir takas olmalı. Faz 1'in ölçümü o kararın
 * **sahte** olduğunu gösterdi — altı dalın üçü hiçbir senaryoda
 * kazanmıyordu, yani oyuncu her seferinde aynı düğmeye basıyordu.
 *
 * Bu test o iddiayı kilitler: bir dalın kimliği sessizce silinirse
 * (örneğin bir denge turunda hasar eşitlenirse) burası kırılır.
 *
 * ## Ölçüm baskı altında yapılıyor
 *
 * Senaryolar bilerek ağır: harita 3'ün normal dalgalarında dört T3 Top
 * kulesi kalabalığı **sıfır sızıntıyla** siliyor ve iki dal berabere
 * kalıyor. Berabere bir ayrım kanıtı değil. Sayılar, iki dalın
 * ayrıştığı en küçük baskıya göre seçildi.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz — `waveSim` saf.
 */
import { describe, expect, it } from 'vitest';
import { MAP_3 } from '../data/maps';
import { simulateWave } from './waveSim';
import type { ReferenceBoard } from '../types/board';
import type { TierIndex, TowerId } from '../types/tower';
import type { EnemyId } from '../types/enemy';
import type { Wave } from '../types/wave';

/** Kapsaması en yüksek dört nokta — oyuncunun da dolduracağı yerler. */
const NOKTALAR = [...MAP_3.coverage]
  .sort((a, b) => b.coveredPx - a.coveredPx)
  .slice(0, 4)
  .map((c) => c.spotIndex);

function tahta(towerId: TowerId, tier: TierIndex): ReferenceBoard {
  return {
    waveIndex: 10,
    cumulativeCost: 0,
    towers: NOKTALAR.map((spotIndex) => ({ spotIndex, towerId, tier, targetMode: 'first' })),
  };
}

const SENARYO: Readonly<Record<string, { enemy: EnemyId; count: number; spawnDelay: number }>> = {
  'kalabalık (ork ×60)': { enemy: 'orkSavasci', count: 60, spawnDelay: 0.15 },
  'zırhlı (zırhlı ork ×30)': { enemy: 'zirhliOrk', count: 30, spawnDelay: 0.25 },
  'uçan (harpi ×30)': { enemy: 'harpi', count: 30, spawnDelay: 0.3 },
  'tek sert (trol ×6)': { enemy: 'trol', count: 6, spawnDelay: 1.0 },
  'hızlı (kurt binicisi ×40)': { enemy: 'kurtBinicisi', count: 40, spawnDelay: 0.2 },
};

function dalga(ad: string): Wave {
  const g = SENARYO[ad]!;
  return { index: 10, groups: [{ ...g, startAt: 0, spawnPoint: 0 }] };
}

/** Sızan toplam can — düşük olan kazanır. */
function sizinti(towerId: TowerId, tier: TierIndex, senaryo: string): number {
  return simulateWave(dalga(senaryo), tahta(towerId, tier), MAP_3).leakedHp;
}

/**
 * Her satır: bu senaryoda **kazanan** dal ve kaybeden kardeşi.
 *
 * `T3a` = `tier 2`, `T3b` = `tier 3` (`BoardTower.tier` sözleşmesi).
 * Ölçülen değerler yorumda; test yalnız **sıralamayı** bağlıyor, sayıyı
 * değil — sayı kilitlemek her denge turunda bu dosyayı güncellemek olurdu.
 */
const IDDIA: readonly {
  aile: TowerId;
  senaryo: string;
  kazanan: { ad: string; tier: TierIndex };
  kaybeden: { ad: string; tier: TierIndex };
}[] = [
  // Okçu — Kundakçı'nın yanması hedef başına sabit, yani **çok hedefte**
  // öne geçiyor; Keskin Nişancı'nın 26 hasarı **tek sert** hedefte.
  {
    aile: 'okcu',
    senaryo: 'uçan (harpi ×30)',
    kazanan: { ad: 'Kundakçı', tier: 3 },
    kaybeden: { ad: 'Keskin Nişancı', tier: 2 },
  },
  {
    aile: 'okcu',
    senaryo: 'tek sert (trol ×6)',
    kazanan: { ad: 'Keskin Nişancı', tier: 2 },
    kaybeden: { ad: 'Kundakçı', tier: 3 },
  },
  // Top — aynı DPS (21,6), takas **menzil ↔ patlama yarıçapı**.
  // Havan 230 menzil / 55 yarıçap, Barut Fıçısı 150 / 85.
  {
    aile: 'top',
    senaryo: 'hızlı (kurt binicisi ×40)',
    kazanan: { ad: 'Barut Fıçısı', tier: 3 },
    kaybeden: { ad: 'Havan', tier: 2 },
  },
  {
    aile: 'top',
    senaryo: 'zırhlı (zırhlı ork ×30)',
    kazanan: { ad: 'Havan', tier: 2 },
    kaybeden: { ad: 'Barut Fıçısı', tier: 3 },
  },
  // Büyü — Buz'un hasarı düşük (8) ama yavaşlatma **bütün tahtayı**
  // çarpıyor (Kısıt A'da hız BÖLEN); kalabalıkta ezici. Yıldırım tek
  // sert hedefte ve uçanda önde.
  {
    aile: 'buyu',
    senaryo: 'kalabalık (ork ×60)',
    kazanan: { ad: 'Buz', tier: 3 },
    kaybeden: { ad: 'Yıldırım', tier: 2 },
  },
  {
    aile: 'buyu',
    senaryo: 'tek sert (trol ×6)',
    kazanan: { ad: 'Yıldırım', tier: 2 },
    kaybeden: { ad: 'Buz', tier: 3 },
  },
];

describe('T3 dal kimlikleri — M11 Faz 2', () => {
  it.each(IDDIA)('$senaryo → $kazanan.ad kazanıyor', ({ aile, senaryo, kazanan, kaybeden }) => {
    const k = sizinti(aile, kazanan.tier, senaryo);
    const y = sizinti(aile, kaybeden.tier, senaryo);
    expect(k, `${kazanan.ad} ${k} vs ${kaybeden.ad} ${y}`).toBeLessThan(y);
  });

  it('**altı dalın HEPSİ** en az bir senaryo kazanıyor', () => {
    const kazananlar = new Set(IDDIA.map((i) => `${i.aile}:${i.kazanan.tier}`));
    expect([...kazananlar].sort()).toEqual([
      'buyu:2',
      'buyu:3',
      'okcu:2',
      'okcu:3',
      'top:2',
      'top:3',
    ]);
  });
});
