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

    // `Y02` adım 1 — tek tahsis: `activeItems()` bir kez çağrılıp hem dış
    // hem iç döngüde paylaşılıyor; canlı/`def` filtresi (eskiden ayrı bir
    // `.filter()` dizisiydi) artık **döngü içinde** uygulanıyor. Davranış
    // birebir aynı (`waveSim` doğruluyor) — sıra hiç değişmedi.
    const aktif = this.pool.activeItems();

    for (const e of aktif) {
      if (!e.alive || e.def === null) continue;
      const y = e.def.ability;
      if (y === undefined) continue;

      if (y.kind === 'enrage') {
        /**
         * **İkinci evre** — `M10-T03`, harita 5.
         *
         * Durum tutulmuyor: hız her karede can oranından **türetiliyor**.
         * Bunun iki faydası var. (1) İdempotent — bayrak tutup "bir kez
         * uygula" deseydik havuza dönen düşmanda sıfırlanması gerekirdi
         * ve bu, bu projede beş kez yaşanmış hata sınıfı (TIER 1 kural 3).
         * (2) **Geri dönebiliyor** — bir Şaman boss'u eşiğin üstüne
         * iyileştirirse hız da normale dönüyor, yani iki sistem
         * birbirini tutarlı biçimde görüyor.
         *
         * `speedFactor`'a dokunulmuyor: o yavaşlatma etkisinin alanı ve
         * `Mover` ikisini **çarparak** kullanıyor — yani yavaşlatma
         * öfkelenmiş boss'ta da çalışıyor.
         */
        const oran = e.maxHp > 0 ? e.hp / e.maxHp : 1;
        e.speed = e.def.speed * (oran <= y.hpRatio ? y.speedMultiplier : 1);
        continue;
      }

      if (y.kind === 'summon') {
        /**
         * **Çağırma** — `M13`, boss'un ikinci verb'ü.
         *
         * Hedef sayı candan **türetiliyor**: `floor((1 − hp/maxHp) / hpStep)`.
         * `summonsDone` ondan küçükse aradaki fark kadar çağırıyor, yani
         * tek karede iki eşik birden geçilse (Meteor) ikisi de işliyor.
         *
         * `enrage`'den farkı tek bir tam sayı taşıması: "eşiği geçtim mi"
         * bilgisi geçmişe bağlı, candan okunamıyor. `resetEnemyState` onu
         * sıfırlıyor (TIER 1 kural 3).
         *
         * **İyileşen boss geri saymıyor.** Şaman boss'u yukarı çekerse
         * `summonsDone` düşmüyor — aksi hâlde iyileştirme + hasar
         * döngüsü sonsuz yandaş üretirdi.
         */
        const kayip = e.maxHp > 0 ? 1 - e.hp / e.maxHp : 0;
        const hedef = y.hpStep > 0 ? Math.floor(kayip / y.hpStep) : 0;
        while (e.summonsDone < hedef) {
          e.summonsDone++;
          this.#cagir(e, y.childId, y.count);
        }
        continue;
      }

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
        for (const hedef of aktif) {
          if (hedef === e) continue;
          if (!hedef.alive || hedef.def === null) continue;
          if (distSq(e, hedef) > yaricapKare) continue;
          this.#iyilestir(hedef, y.hps * dt);
        }
      }
    }
  }

  /**
   * Yandaşları havuzdan doğurur — `splitOnDeath`'in aynı üç satırı.
   *
   * Havuz doluysa **kısılıyor**, sessizce `new` çağrılmıyor (kural 3).
   * Yandaş çağıranın yol ilerlemesini devralıyor: boss'un yanında
   * beliriyorlar, girişte değil.
   */
  #cagir(cagiran: T, childId: EnemyDef['id'], adet: number): number {
    const def = this.lookupEnemy(childId);
    const mover = cagiran.mover;
    if (def === undefined || mover === null) return 0;

    const nerede = cagiran.progress;
    let dogan = 0;
    for (let i = 0; i < adet; i++) {
      const yavru = this.pool.acquire();
      if (yavru === null) break;
      yavru.spawn(mover, def, this.hpMultiplier);
      yavru.progress = nerede;
      dogan++;
    }
    return dogan;
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
