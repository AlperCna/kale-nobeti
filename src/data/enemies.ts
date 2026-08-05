/**
 * Düşman verisi. TIER 1 kural 1: sayı burada.
 *
 * Her sayı `docs/GAME-DESIGN.md` §5 tablosundan **birebir**.
 *
 * **M2 kapsamı:** Goblin ve Ork Savaşçı. İkincisi rastgele seçilmedi —
 * **zırh kavramını tanıtan** düşman o (§5), ve `applyDamage`'ı uydurma bir
 * kurgu düşmanla değil gerçek veriyle sınamak için gerekli.
 * Kalan yedi düşman M3-M4'te ekleniyor.
 */

import type { EnemyDef } from '../types/enemy';

export const GOBLIN: EnemyDef = {
  id: 'goblin',
  hp: 45,
  speed: 60,
  armor: 0,
  magicResist: 0,
  gold: 3,
  points: 1,
  leakDamage: 1,
  flying: false,
};

/** Zırh kavramını tanıtır: Okçu T1 (6 hasar) ona 4 vuruyor (§3, §5). */
export const ORK_SAVASCI: EnemyDef = {
  id: 'orkSavasci',
  hp: 110,
  speed: 45,
  armor: 2,
  magicResist: 0,
  gold: 6,
  points: 2,
  leakDamage: 1,
  flying: false,
};

/** Hız kavramını tanıtır: 110 px/sn, kadronun en hızlısı (§5). */
export const KURT_BINICISI: EnemyDef = {
  id: 'kurtBinicisi',
  hp: 60,
  speed: 110,
  armor: 1,
  magicResist: 0,
  gold: 9,
  points: 3,
  leakDamage: 1,
  flying: false,
};

export const ENEMIES: readonly EnemyDef[] = [GOBLIN, ORK_SAVASCI, KURT_BINICISI];

export function getEnemy(id: EnemyDef['id']): EnemyDef | undefined {
  return ENEMIES.find((e) => e.id === id);
}
