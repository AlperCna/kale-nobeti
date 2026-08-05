/**
 * Mermi durumu. TIER 1 kural 11: Phaser'a dokunmaz.
 *
 * `entities/Projectile` bunu uygular; `ProjectileSystem` **bu şekli** tanır,
 * sınıfı değil. Testler düz nesneyle koşuyor.
 */

import type { DamageType, Targetable } from './enemy';
import type { TowerEffect } from './tower';

export interface ProjectileState<E extends Targetable = Targetable> {
  x: number;
  y: number;
  /**
   * Takip edilen düşman. Havadayken ölürse `null`'lanmaz — mermi son bilinen
   * konuma gider (`// GEÇİCİ — S21`); alan hasarlı mermilerde fark yaratıyor.
   */
  target: E | null;
  /** Ham hasar; zırh/direnç `applyDamage`'ta uygulanıyor. */
  damage: number;
  damageType: DamageType;
  /** Birim: px/sn. */
  speed: number;
  /** `0` = tek hedef. Birim: px. */
  splashRadius: number;
  /** Birim: px. */
  hitRadius: number;
  /** Kule kademesinin etkisi (yanma/yavaşlatma/zincirleme). */
  effect: TowerEffect | undefined;
  alive: boolean;
  /** Hedef ölürse mermi buraya gidip sönümlenir (S21). */
  lastKnownX: number;
  lastKnownY: number;
}
