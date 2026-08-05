/**
 * Yetenek verisi. TIER 1 kural 1: sayı burada, sistemde değil.
 *
 * Her sayı `docs/GAME-DESIGN.md` §8'den **birebir**:
 * - Meteor — hedeflenen **90 px** yarıçapta **180 gerçek hasar**, bekleme **45 sn**.
 * - Takviye — hedeflenen noktaya **2 geçici asker** (HP **60**, DPS **7**,
 *   **20 sn** ömür), bekleme **20 sn**.
 */

import type { AbilityDef, MeteorDef, TakviyeDef } from '../types/ability';

/**
 * §8 + §3: hasar tipi **`true`** — hiçbir şeyle azalmaz.
 *
 * §3 `true` tipini "yalnız yeteneklerde" diye tanımlıyor; Meteor onun tek
 * kullanıcısı. Zırh 10 ve %25 büyü direnci olan Ogre Şef'e de tam 180
 * giriyor — boss'a karşı yeteneğin varlık sebebi bu.
 */
export const METEOR: MeteorDef = {
  id: 'meteor',
  cooldownSeconds: 45,
  kind: 'damage',
  radius: 90,
  damage: 180,
  damageType: 'true',
  /**
   * `// GEÇİCİ — S48`: §8 uçanları söylemiyor. **Vuruyor** kabul edildi.
   * Vurmasaydı harpi sürüsüne karşı elde yalnız iki kule ailesi kalırdı ve
   * §5'in "Harpi sürüsü → Okçu + Büyü" satırı tek cevaba düşerdi.
   */
  hitsFlying: true,
};

export const TAKVIYE: TakviyeDef = {
  id: 'takviye',
  cooldownSeconds: 20,
  kind: 'summon',
  soldierCount: 2,
  soldierHp: 60,
  soldierDps: 7,
  lifetimeSeconds: 20,
};

export const ABILITIES: readonly AbilityDef[] = [METEOR, TAKVIYE];

export function getAbility(id: AbilityDef['id']): AbilityDef | undefined {
  return ABILITIES.find((a) => a.id === id);
}
