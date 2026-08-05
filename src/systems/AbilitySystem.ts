/**
 * İki aktif yetenek — `GAME-DESIGN.md` §8.
 *
 * "Oyuncuyu izleyici olmaktan çıkarır ama odağı yol yapısından almaz."
 *
 * TIER 1 kural 11: Phaser'a dokunmaz. HUD'daki dairesel dolum bu sistemin
 * `progress()` çıktısını okuyor; sistem çizim yapmıyor.
 * TIER 1 kural 8: bekleme `scaledDelta` ile azalıyor — 2× hızda da doğru.
 * TIER 1 kural 9: Meteor yarıçapı karesel karşılaştırılıyor.
 */

import type { AbilityDef, AbilityId, AbilityState } from '../types/ability';
import type { BlockableEnemy, SoldierState } from '../types/barracks';
import type { Vec2 } from '../types/common';
import { ABILITIES, getAbility } from '../data/abilities';
import { applyDamage } from './combat';
import { spawnSoldier } from './BarracksSystem';
import { SOLDIER_SPEED } from '../data/barracks';
import { distSq } from '../util/math';

export interface MeteorResult {
  /** Hasar alan düşman sayısı — geri bildirim ve ölçüm için. */
  readonly hit: number;
  /** Toplam verilen hasar. */
  readonly totalDamage: number;
}

export class AbilitySystem {
  readonly #durum = new Map<AbilityId, AbilityState>();

  constructor() {
    this.reset();
  }

  /**
   * Tüm beklemeleri sıfırlar — **hazır** durumda başlar.
   *
   * `// GEÇİCİ — S49`: §8 haritalar arası davranışı söylemiyor.
   * **Sıfırlanıyor** kabul edildi; aksi hâlde bir haritayı yetenek
   * harcamadan bitiren oyuncu bir sonrakine avantajla girerdi ve
   * "her harita kendi içinde dengeli" varsayımı bozulurdu.
   */
  reset(): void {
    this.#durum.clear();
    for (const a of ABILITIES) this.#durum.set(a.id, { id: a.id, cooldownLeft: 0 });
  }

  /** @param scaledDelta `GameClock.scaledDelta`, birim **ms** (TIER 1 k.8). */
  tick(scaledDelta: number): void {
    const dt = scaledDelta / 1000;
    for (const s of this.#durum.values()) {
      if (s.cooldownLeft > 0) {
        s.cooldownLeft -= dt;
        if (s.cooldownLeft < 0) s.cooldownLeft = 0;
      }
    }
  }

  ready(id: AbilityId): boolean {
    return (this.#durum.get(id)?.cooldownLeft ?? 0) <= 0;
  }

  cooldownLeft(id: AbilityId): number {
    return this.#durum.get(id)?.cooldownLeft ?? 0;
  }

  /**
   * Dairesel dolum oranı, `0`…`1`. HUD bunu okuyor.
   * `1` = hazır. `GAME-DESIGN.md` §8: hazır olunca altın kenar bir kez parlar.
   */
  progress(id: AbilityId): number {
    const def = getAbility(id);
    if (def === undefined) return 1;
    const kalan = this.cooldownLeft(id);
    if (kalan <= 0) return 1;
    return 1 - kalan / def.cooldownSeconds;
  }

  #tuket(def: AbilityDef): boolean {
    const s = this.#durum.get(def.id);
    if (s === undefined || s.cooldownLeft > 0) return false;
    s.cooldownLeft = def.cooldownSeconds;
    return true;
  }

  /**
   * Meteor — hedeflenen noktada `radius` yarıçapta `damage` gerçek hasar.
   *
   * **Gerçek hasar hiçbir şeyle azalmaz** (§3): zırh ve direnç yok sayılır.
   * `applyDamage` yine de çağrılıyor — hasar kuralının tek adresi orası
   * (`CLAUDE.md` Mimari); `'true'` dalı zaten hiçbir azaltma yapmıyor ve
   * ileride §3 değişirse bu yol kendiliğinden takip ediyor.
   *
   * @returns Bekleme dolmamışsa `null`.
   */
  castMeteor(target: Vec2, enemies: readonly BlockableEnemy[]): MeteorResult | null {
    const def = getAbility('meteor');
    if (def === undefined || def.kind !== 'damage') return null;
    if (!this.#tuket(def)) return null;

    const yaricapKare = def.radius * def.radius;
    let hit = 0;
    let totalDamage = 0;

    for (const e of enemies) {
      if (!e.alive || e.def === null || e.hp <= 0) continue;
      if (e.def.flying && !def.hitsFlying) continue; // S48
      if (distSq(target, e) > yaricapKare) continue;

      const r = applyDamage(def.damage, def.damageType, e.def);
      e.hp -= r.dealt;
      if (e.hp < 0) e.hp = 0;
      hit++;
      totalDamage += r.dealt;
    }
    return { hit, totalDamage };
  }

  /**
   * Takviye — hedeflenen noktaya `soldierCount` geçici asker.
   *
   * Askerler **havuzdan** alınıyor (TIER 1 kural 3): `acquire` `null`
   * dönerse o asker **çağrılmıyor**, `new` yapılmıyor. Havuz doluyken
   * yetenek kısılıyor ama bekleme yine de tükeniyor — aksi hâlde havuz
   * dolu olduğu sürece yetenek bedava kalırdı.
   *
   * `// GEÇİCİ — S47`: §8 geçici askerlerin engelleme yapıp yapmadığını
   * söylemiyor. **Kışla askeriyle aynı kurallara tabi** kabul edildi —
   * ayrı bir "engellemeyen asker" kavramı 9 kuralın hepsine dal eklerdi.
   *
   * @returns Çağrılan askerler; bekleme dolmamışsa `null`.
   */
  castReinforcements(
    target: Vec2,
    acquire: () => SoldierState | null,
  ): readonly SoldierState[] | null {
    const def = getAbility('takviye');
    if (def === undefined || def.kind !== 'summon') return null;
    if (!this.#tuket(def)) return null;

    const cikanlar: SoldierState[] = [];
    for (let i = 0; i < def.soldierCount; i++) {
      const s = acquire();
      if (s === null) break; // havuz doldu — sessizce kısılıyor, `new` yok

      // Geçici askerler hedef noktada doğuyor ve orada kalıyor: `home` ve
      // `rally` aynı. Kışla askerinden farkı yalnız `lifetimeSeconds`.
      spawnSoldier(s, target, target, {
        hp: def.soldierHp,
        dps: def.soldierDps,
        evasion: 0,
        speed: SOLDIER_SPEED,
        lifetimeSeconds: def.lifetimeSeconds,
      });
      // Hedefte doğdukları için yürümeleri gerekmiyor; doğrudan
      // engellemeye hazırlar (kural 7 yalnız *dirilen* askeri bağlıyor).
      s.state = 'idle';
      cikanlar.push(s);
    }
    return cikanlar;
  }
}
