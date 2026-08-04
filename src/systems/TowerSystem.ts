/**
 * Kule ateş döngüsü. `M2-T05` (yerleştirme) + `M2-T07` (ateş).
 *
 * **Kuleler havuzlanmaz.** TIER 1 kural 3 mermi/düşman/parçacık/hasar sayısı
 * için; kule sayısı sabit ve az (harita başına 8-12), her biri oyun boyunca
 * yaşıyor. Havuzlamak sıfırlanacak alan sayısını artırıp hiçbir şey
 * kazandırmazdı.
 *
 * TIER 1 kural 11: `entities/Tower`'ı tanımaz — `TowerRuntime` şeklini tanır.
 * TIER 1 kural 8: zaman yalnız `scaledDelta` üzerinden.
 * TIER 1 kural 9: menzil karesel, ve **kule ateşe hazır değilken hedef aramaz.**
 */

import type { Targetable } from '../types/enemy';
import type { TowerRuntime, TowerTier } from '../types/tower';
import type { EventBus } from './EventBus';
import { isTargetStillValid, selectTarget } from './TargetingSystem';

const MS_TO_S = 1 / 1000;

/** Ateş anında çağrılır. Mermi üretimi `ProjectileSystem`'in işi. */
export type FireHandler = (tower: TowerRuntime, tier: TowerTier, target: Targetable) => void;

export function currentTier(t: TowerRuntime): TowerTier {
  // noUncheckedIndexedAccess: tiers demeti iki elemanlı, yine de korunuyor.
  return t.def.tiers[t.tierIndex] ?? t.def.tiers[0];
}

export class TowerSystem {
  readonly #towers: TowerRuntime[] = [];

  constructor(
    private readonly onFire: FireHandler,
    private readonly bus?: EventBus,
  ) {}

  get towers(): readonly TowerRuntime[] {
    return this.#towers;
  }

  /**
   * Kuleyi listeye alır ve `tower:placed` yayar.
   *
   * Yapı noktasının **dolu olup olmadığını burada kontrol etmiyoruz** —
   * o `SpotOccupancy`'nin işi ve çağıran taraf onu zaten sormak zorunda
   * (aynı defteri iki yerde tutmak sessizce ayrışır).
   */
  add(tower: TowerRuntime): void {
    this.#towers.push(tower);
    this.bus?.emit('tower:placed', { spotIndex: tower.spotIndex });
  }

  remove(spotIndex: number): void {
    const i = this.#towers.findIndex((t) => t.spotIndex === spotIndex);
    if (i >= 0) this.#towers.splice(i, 1);
  }

  /** @param scaledDelta `GameClock.scaledDelta`, birim ms. */
  update(scaledDelta: number, enemies: readonly Targetable[]): void {
    const saniye = scaledDelta * MS_TO_S;

    for (const t of this.#towers) {
      t.cooldownLeft -= saniye;

      // TIER 1 kural 9: hazır değilse hedef ARAMA. Bu tek satır hedef arama
      // maliyetini ~10 kat düşürüyor (`research/02` §8) — 8 kule × 40 düşman
      // her karede 320 mesafe hesabı demekti, artık yalnız ateş karesinde.
      if (t.cooldownLeft > 0) continue;

      const tier = currentTier(t);
      const kuleKapsami = {
        x: t.x,
        y: t.y,
        rangeSq: tier.range * tier.range,
        airMultiplier: tier.airMultiplier,
      };

      // Mevcut hedef hâlâ geçerliyse yeniden arama yok.
      if (!isTargetStillValid(t.target, kuleKapsami)) {
        t.target = selectTarget(t.targetMode, enemies, kuleKapsami);
      }
      if (t.target === null) continue;

      this.onFire(t, tier, t.target);

      // `=` değil `+=`: kalan kesir korunuyor, yani uzun vadede atış hızı
      // tam olarak `fireRate`. Ama sonuç negatifse sıfırlanıyor — aksi
      // hâlde bir takılma sonrası kule biriken atışları peş peşe boşaltırdı.
      // Kayıp yalnız kare süresi atış periyodunu aşarsa oluşur; en yavaş
      // kule Top T1 (periyot 2 sn) ve kare hiç o kadar uzun olmuyor.
      const periyot = tier.fireRate > 0 ? 1 / tier.fireRate : Infinity;
      t.cooldownLeft += periyot;
      if (t.cooldownLeft < 0) t.cooldownLeft = 0;
    }
  }
}
