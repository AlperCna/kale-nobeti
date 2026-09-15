/**
 * **Kışlanın iki dalı da kazandığı bir senaryoya sahip** — `M11` Faz 3.
 *
 * `systems/dalKimligi.test.ts`'in kule için sorduğu soruyu kışlaya
 * soruyor. Aradaki fark ölçüm biçiminde: kule doğrudan hasar veriyor,
 * kışla **zaman kazandırıyor** — sızıntıya katkısı ancak kulelerle
 * birlikte görünür. Bu yüzden her senaryo **üç kez** koşuyor:
 * kışlasız taban, Paladin, Haydutlar. Ölçülen şey **katkı**
 * (`kışlasız − dallı`), ham sızıntı değil; ham sayı kulelerin payını
 * da taşıdığı için iki dal arasındaki farkı gizliyor (`M5-T06`'nın
 * "metrik kışla işini iyi yaptıkça kötüleşiyordu" dersinin aynısı).
 *
 * ## S43 burada kapandı — **kalkan YOK**
 *
 * `GAME-DESIGN` §4.4 Paladin'i `11 + kalkan` diye yazıyordu ve sayı
 * hiç verilmemişti. `M11` Faz 3 kalkanı ölçtü ve **koymamaya** karar
 * verdi; ayrıntı `data/barracks.ts` başlığında ve `OPEN-QUESTIONS`
 * S43'te. Bu testin gösterdiği şey o kararın dayanağı: iki dal
 * **kalkansız da** gerçek bir seçim.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAP_3 } from '../data/maps';
import { simulateWave } from './waveSim';
import type { ReferenceBoard } from '../types/board';
import type { EnemyId } from '../types/enemy';
import type { Wave, WaveGroup } from '../types/wave';

/** Kışla **en düşük** kapsamalı noktada — referans tahtanın kuralı (S69). */
const KISLA_NOKTA = [...MAP_3.coverage].sort((a, b) => a.coveredPx - b.coveredPx)[0]!.spotIndex;
/** Kuleler kapsaması en yüksek üç noktada; kışlanınki hariç. */
const KULE_NOKTALARI = [...MAP_3.coverage]
  .sort((a, b) => b.coveredPx - a.coveredPx)
  .map((c) => c.spotIndex)
  .filter((i) => i !== KISLA_NOKTA)
  .slice(0, 3);

/** `null` → kışlasız taban. `2` → Paladin, `3` → Haydutlar. */
function tahta(kislaTier: 2 | 3 | null): ReferenceBoard {
  return {
    waveIndex: 10,
    cumulativeCost: 0,
    towers: KULE_NOKTALARI.map((spotIndex) => ({
      spotIndex,
      towerId: 'okcu' as const,
      tier: 1 as const,
      targetMode: 'first' as const,
    })),
    ...(kislaTier === null ? {} : { barracks: [{ spotIndex: KISLA_NOKTA, tier: kislaTier }] }),
  };
}

type Grup = { enemy: EnemyId; count: number; spawnDelay: number; startAt?: number };

const SENARYO: Readonly<Record<string, readonly Grup[]>> = {
  // Kesintisiz baskı: tek gövde ama yüksek canlı, kilit hiç kopmuyor.
  'kesintisiz (ork ×12)': [{ enemy: 'orkSavasci', count: 12, spawnDelay: 0.6 }],
  // Zırhlı: askerin fiziksel DPS'i zırhla eziliyor, hayatta kalmak belirleyici.
  'zırhlı (zırhlı ork ×8)': [{ enemy: 'zirhliOrk', count: 8, spawnDelay: 0.8 }],
  // Sürü: aynı anda çok gövde — üç asker üç şeridi birden tutuyor.
  'sürü (goblin ×20)': [{ enemy: 'goblin', count: 20, spawnDelay: 0.4 }],
  // Dalgalı: üç ayrı grup, aralarında nefes payı.
  'dalgalı (ork ×4 · üç grup)': [
    { enemy: 'orkSavasci', count: 4, spawnDelay: 0.5, startAt: 0 },
    { enemy: 'orkSavasci', count: 4, spawnDelay: 0.5, startAt: 14 },
    { enemy: 'orkSavasci', count: 4, spawnDelay: 0.5, startAt: 28 },
  ],
};

function dalga(ad: string): Wave {
  const gruplar: WaveGroup[] = SENARYO[ad]!.map((g) => ({
    startAt: 0,
    spawnPoint: 0,
    ...g,
  }));
  return { index: 10, groups: gruplar };
}

/** Bu dalın **katkısı**: kışlasız tabana göre engellediği sızıntı canı. */
function katki(kislaTier: 2 | 3, senaryo: string): number {
  const w = dalga(senaryo);
  const taban = simulateWave(w, tahta(null), MAP_3).leakedHp;
  return taban - simulateWave(w, tahta(kislaTier), MAP_3).leakedHp;
}

const IDDIA: readonly { senaryo: string; kazanan: 2 | 3; ad: string }[] = [
  // Paladin: iki gövde ama 140 can — kilit uzun sürüyor.
  { senaryo: 'kesintisiz (ork ×12)', kazanan: 2, ad: 'Paladin' },
  { senaryo: 'zırhlı (zırhlı ork ×8)', kazanan: 2, ad: 'Paladin' },
  // Haydutlar: üç gövde — aynı anda üç düşman tutuyor.
  { senaryo: 'sürü (goblin ×20)', kazanan: 3, ad: 'Haydutlar' },
  { senaryo: 'dalgalı (ork ×4 · üç grup)', kazanan: 3, ad: 'Haydutlar' },
];

describe('Kışla dalları — Paladin / Haydutlar (S43)', () => {
  it.each(IDDIA)('$senaryo → $ad kazanıyor', ({ senaryo, kazanan, ad }) => {
    const kaybeden = kazanan === 2 ? 3 : 2;
    const k = katki(kazanan, senaryo);
    const y = katki(kaybeden, senaryo);
    expect(k, `${ad} ${k.toFixed(0)} vs öteki ${y.toFixed(0)}`).toBeGreaterThan(y);
  });

  it('**iki dal da** en az bir senaryo kazanıyor', () => {
    expect([...new Set(IDDIA.map((i) => i.kazanan))].sort()).toEqual([2, 3]);
  });

  it('kışla HER İKİ dalda da kışlasız tabandan iyi — kışla işe yarıyor', () => {
    // `M5-T06`'nın iddiası: kışla zaman kazandırıyor. Dal tartışması
    // ayrı; ikisi de **pozitif** katkı vermeli.
    for (const s of Object.keys(SENARYO)) {
      expect(katki(2, s), `Paladin ${s}`).toBeGreaterThan(0);
      expect(katki(3, s), `Haydutlar ${s}`).toBeGreaterThan(0);
    }
  });
});
