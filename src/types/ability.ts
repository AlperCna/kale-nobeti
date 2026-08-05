/**
 * Yetenek tipleri. Kaynak: `docs/GAME-DESIGN.md` §8.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 * TIER 1 kural 1: burada **şekil** var, sayı yok. Sayılar `data/abilities.ts`.
 */

import type { DamageType } from './enemy';

export type AbilityId = 'meteor' | 'takviye';

/**
 * İki yetenek iki farklı iş yapıyor: biri hasar veriyor, biri asker
 * çağırıyor. Ayrık birleşim — ortak "value" alanı yok, `kind` kontrolünden
 * sonra derleyici doğru alanları biliyor.
 */
export interface MeteorDef {
  readonly id: 'meteor';
  readonly kind: 'damage';
  readonly cooldownSeconds: number;
  /** Etki yarıçapı. Birim: px. Karesel karşılaştırılır (TIER 1 k.9). */
  readonly radius: number;
  readonly damage: number;
  readonly damageType: DamageType;
  /** Uçanları da vuruyor mu — S48. */
  readonly hitsFlying: boolean;
}

export interface TakviyeDef {
  readonly id: 'takviye';
  readonly kind: 'summon';
  readonly cooldownSeconds: number;
  readonly soldierCount: number;
  readonly soldierHp: number;
  readonly soldierDps: number;
  /** Geçici askerin ömrü. Birim: saniye. */
  readonly lifetimeSeconds: number;
}

/**
 * İki üye ayrı ayrı da dışa veriliyor: `data/abilities.ts` sabitleri
 * birleşim tipiyle işaretlenirse `METEOR.radius` derlenmez — birleşimin
 * ortak alanları dışında hiçbir şeye erişilemez. Sabitler somut tiple
 * yazılıyor, birleşim yalnız "herhangi bir yetenek" alan yerlerde.
 */
export type AbilityDef = MeteorDef | TakviyeDef;

/** Bir yeteneğin çalışma zamanı durumu. */
export interface AbilityState {
  readonly id: AbilityId;
  /** Kalan bekleme. `0` = hazır. Birim: saniye. */
  cooldownLeft: number;
}
