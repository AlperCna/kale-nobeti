/**
 * Düşman yetenekleri: Şaman iyileştirmesi, Trol yenilenmesi, Örümcek Ana
 * bölünmesi. `GAME-DESIGN.md` §5.
 *
 * TIER 1 kural 8: süreler `scaledDelta` ile — 2× hızda iyileştirme de
 * iki kat hızlı.
 * TIER 1 kural 9: yarıçap kontrolü **karesel**.
 * TIER 1 kural 3: yavrular **havuzdan** alınıyor; havuz doluysa bölünme
 * kısılıyor, sessizce `new` çağrılmıyor.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { EnemyDef, Mover, SpawnableEnemy } from '../types/enemy';
import type { Poolable } from '../util/pool';
import type { Pool } from '../util/pool';
import { distSq } from '../util/math';

const MS_TO_S = 1 / 1000;

/** Yetenek sisteminin bir düşmandan gördüğü yüzey. */
export interface AbilityEnemy extends SpawnableEnemy {
  readonly x: number;
  readonly y: number;
  mover: Mover | null;
}

export class EnemyAbilitySystem<T extends AbilityEnemy & Poolable> {
  constructor(
    private readonly pool: Pool<T>,
    private readonly hpMultiplier: number,
    private readonly lookupEnemy: (id: EnemyDef['id']) => EnemyDef | undefined,
  ) {}

  /** @param scaledDelta `GameClock.scaledDelta`, birim ms. */
  update(scaledDelta: number): void {
    const dt = scaledDelta * MS_TO_S;
    if (!(dt > 0)) return;

    const canlilar = this.pool.activeItems().filter((e) => e.alive && e.def !== null);

    for (const e of canlilar) {
      const y = e.def?.ability;
      if (y === undefined) continue;

      if (y.kind === 'regen') {
        // §5: Trol 6 HP/sn. **Harita çarpanıyla ölçeklenmiyor (S39)** —
        // §5 mutlak bir hız veriyor, oran değil. Sonuç: harita 3'te
        // (HP ×2,6) yenilenme oransal olarak zayıflıyor. Bilinçli:
        // ölçeklenseydi Trol her haritada aynı oranda iyileşir ve
        // HP çarpanının zorluk etkisi yenilenmeyle nötrlenirdi.
        this.#iyilestir(e, y.hps * dt);
        continue;
      }

      if (y.kind === 'heal') {
        // §5: "Yakındaki **düşmanlara**" — Şaman kendini iyileştirmiyor.
        // Yarıçap dokümanda yok (`// GEÇİCİ — S37`, `enemies.ts`).
        const yaricapKare = y.radius * y.radius;
        for (const hedef of canlilar) {
          if (hedef === e) continue;
          if (distSq(e, hedef) > yaricapKare) continue;
          this.#iyilestir(hedef, y.hps * dt);
        }
      }
    }
  }

  /** İyileştirme **maksimum HP'yi aşmıyor.** */
  #iyilestir(e: T, miktar: number): void {
    if (miktar <= 0) return;
    e.hp = Math.min(e.maxHp, e.hp + miktar);
  }

  /**
   * Ölen düşmanın bölünmesi (`M4-T08`).
   *
   * Havuza **dönmeden önce** çağrılmalı — yavrular annenin `progress`'ini
   * devralıyor ve havuza dönen anne onu sıfırlar.
   *
   * @returns Gerçekten doğan yavru sayısı. Havuz doluysa `count`'tan az.
   */
  splitOnDeath(parent: T): number {
    const y = parent.def?.ability;
    if (y === undefined || y.kind !== 'split') return 0;

    const yavruDef = this.lookupEnemy(y.childId);
    const mover = parent.mover;
    if (yavruDef === undefined || mover === null) return 0;

    const anneProgress = parent.progress;
    let dogan = 0;

    for (let i = 0; i < y.count; i++) {
      const yavru = this.pool.acquire();
      // Havuz dolu — bölünme **kısılıyor**, sessizce `new` çağrılmıyor
      // (TIER 1 kural 3). Yoğun dalgada bu bir güvenlik supabı.
      if (yavru === null) break;

      yavru.spawn(mover, yavruDef, this.hpMultiplier);
      // Annenin yol ilerlemesini devral — aynı noktadan devam ediyorlar.
      yavru.progress = anneProgress;
      dogan++;
    }
    return dogan;
  }
}
