/**
 * **Beş hedefleme modu birbirinin kopyası değil** — `M11` Faz 4.
 *
 * `dalKimligi` ve `kislaDali` testlerinin sorduğu soruyu hedefleme
 * moduna soruyor: her modun kazandığı bir durum var mı?
 *
 * ## Ölçülen cevap: hayır, tam olarak değil
 *
 * `M11` Faz 4 ölçümü: yedi senaryoda `weakest` 4, `last` 3, `first` 3,
 * `closest` 1 kez kazandı; **`strongest` hiçbirini tek başına
 * kazanmadı**.
 *
 * **`M14`'te yeniden ölçüldü ve tablo değişti:** aile dengesi (`M11`
 * Faz 5) ve ekonomi düzeltmesi (`M14`) sonrası `strongest` Örümcek
 * Ana'lı dalgayı **açık ara** kazanıyor. S94 böylece kapandı — beş
 * modun beşinin de bir senaryosu var.
 *
 * Bu test o ölçümün **kırılabilir** kısmını bağlıyor: üç modun
 * `first`'ü açık ara yendiği durumlar. Beşinin de kazandığını iddia
 * etmiyor, çünkü ölçüm bunu göstermedi — test, olmayan bir dengeyi
 * iddia etmemeli.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { MAP_3 } from '../data/maps';
import { getEnemyForMap } from '../data/enemies';
import { simulateWave } from './waveSim';
import type { ReferenceBoard } from '../types/board';
import type { EnemyId } from '../types/enemy';
import type { TargetMode, TowerId } from '../types/tower';
import type { Wave, WaveGroup } from '../types/wave';

const NOKTALAR = [...MAP_3.coverage]
  .sort((a, b) => b.coveredPx - a.coveredPx)
  .slice(0, 4)
  .map((c) => c.spotIndex);

function tahta(towerId: TowerId, mod: TargetMode): ReferenceBoard {
  return {
    waveIndex: 10,
    cumulativeCost: 0,
    towers: NOKTALAR.map((spotIndex) => ({
      spotIndex,
      towerId,
      tier: 2 as const,
      targetMode: mod,
    })),
  };
}

type Grup = { enemy: EnemyId; count: number; spawnDelay: number; startAt?: number };

function dalga(gruplar: readonly Grup[]): Wave {
  const g: WaveGroup[] = gruplar.map((x) => ({ startAt: 0, spawnPoint: 0, ...x }));
  return { index: 10, groups: g };
}

/** Sızan düşmanların **can bedeli** — sızıntı sayısı değil (§6). */
function canKaybi(towerId: TowerId, mod: TargetMode, gruplar: readonly Grup[]): number {
  const r = simulateWave(dalga(gruplar), tahta(towerId, mod), MAP_3);
  let can = 0;
  for (const [id, n] of Object.entries(r.leakedByEnemy)) {
    const e = getEnemyForMap(id as EnemyId, MAP_3);
    if (e !== undefined) can += e.leakDamage * (n ?? 0);
  }
  return can;
}

const TROL_VE_CETE: readonly Grup[] = [
  { enemy: 'goblin', count: 24, spawnDelay: 0.3 },
  { enemy: 'trol', count: 5, spawnDelay: 2, startAt: 2 },
];
const ZIRHLI_VE_CETE: readonly Grup[] = [
  { enemy: 'goblin', count: 24, spawnDelay: 0.3 },
  { enemy: 'zirhliOrk', count: 10, spawnDelay: 0.8, startAt: 1 },
];
const ORUMCEK_VE_ORK: readonly Grup[] = [
  { enemy: 'orkSavasci', count: 12, spawnDelay: 0.5 },
  { enemy: 'orumcekAna', count: 5, spawnDelay: 1.5, startAt: 1 },
];
const BOSS_VE_CETE: readonly Grup[] = [
  { enemy: 'goblin', count: 24, spawnDelay: 0.3 },
  { enemy: 'ogreSef', count: 1, spawnDelay: 1, startAt: 2 },
];

describe('Hedefleme modları — M11 Faz 4', () => {
  it('`weakest` karışık sert dalgada `first`’ü yeniyor', () => {
    // Yaralıyı bitirmek öldürme sayısını artırıyor; can kaybı düşüyor.
    expect(canKaybi('okcu', 'weakest', TROL_VE_CETE)).toBeLessThan(
      canKaybi('okcu', 'first', TROL_VE_CETE),
    );
  });

  it('`last` zırhlı+çete dalgasında `first`’ü yeniyor', () => {
    // Öndekiler zaten ölüyor; arkadan seçmek hasarı erken yayıyor.
    expect(canKaybi('buyu', 'last', ZIRHLI_VE_CETE)).toBeLessThan(
      canKaybi('buyu', 'first', ZIRHLI_VE_CETE),
    );
  });

  /**
   * **S94 YENİDEN AÇILDI (`M66`) — kapanışı kör bir ölçüme dayanıyormuş.**
   *
   * `M14` bu testi "`strongest` artık bir senaryo kazanıyor" diye
   * kapatmıştı: Örümcek Ana'lı dalgada en dayanıklı türe odaklanmak
   * 17'ye 19 kazanıyordu. Gerekçesi de yazılıydı — *"anne ölmeden
   * bölünme hiç durmuyor ve odağı dağıtmak her anneyi yarım bırakıyor"*.
   *
   * Gerekçe bir mekaniği anlatıyordu ama **ölçüm o mekaniği
   * göremiyordu**: `waveSim` hiçbir ölüm yolunda `splitOnDeath`
   * çağırmıyordu, yani o dalgada tek bir yavru bile doğmuyordu (S133).
   * `M66` deliği kapatınca iddia düştü: `strongest` **22**, `first`
   * **20**.
   *
   * Yön şaşırtıcı değil, sadece eski gerekçenin tersi: yavrular gerçekten
   * doğunca en dayanıklıya kilitlenmek tahtayı **yavru selinin dışında**
   * tutuyor; `first` öndekini biçtiği için seli kaleye varmadan
   * eritiyor. Eski cümle mekanizmayı doğru tarif ediyordu ama yarısını —
   * annenin ölmesi bölünmeyi *başlatıyor* da.
   *
   * Test silinmedi, **yönü çevrildi**: reddedilen tasarımın kanıtı olarak
   * duruyor. `strongest` bir gün bir senaryo kazanırsa burası kırılır ve
   * S94 bilinçli olarak yeniden kapatılır.
   */
  it('`strongest` Örümcek Ana dalgasında `first`’ü YENEMİYOR (S94 açık)', () => {
    expect(canKaybi('okcu', 'strongest', ORUMCEK_VE_ORK)).toBeGreaterThan(
      canKaybi('okcu', 'first', ORUMCEK_VE_ORK),
    );
  });

  /**
   * **§5'in boss tavsiyesi ölçümle çelişiyordu (S94).**
   *
   * Karşı-oyun tablosu "Ogre Şef → `strongest` hedefleme" diyordu.
   * Ölçüm tersini söyledi: boss + çete dalgasında `strongest`, `first`
   * dahil bütün modlardan kötü. Sebep: tavan yetmiyorsa boss'a
   * odaklanmak onu yine öldürmüyor, ama 24 goblinin sızmasına izin
   * veriyor. §5 düzeltildi; bu test düzeltmenin dayanağı.
   */
  it('boss dalgasında `strongest` EN İYİ DEĞİL — §5 düzeltildi', () => {
    const s = canKaybi('buyu', 'strongest', BOSS_VE_CETE);
    const enIyi = Math.min(
      canKaybi('buyu', 'first', BOSS_VE_CETE),
      canKaybi('buyu', 'weakest', BOSS_VE_CETE),
      canKaybi('buyu', 'closest', BOSS_VE_CETE),
    );
    expect(s).toBeGreaterThan(enIyi);
  });
});
