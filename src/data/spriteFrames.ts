/**
 * Kule/düşman kimliğini `atlas.png` kare adına çeviren tek kaynak.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz, yalnız isim eşleşmesi. Kare adları
 * `scripts/prep-assets.mjs`'teki manifest ile **birebir** aynı olmalı —
 * biri değişirse diğeri de değişir.
 *
 * Önceden üç ayrı dosyada (`GameScene.ts` `TOWER_COLORS`/`ENEMY_COLOR`,
 * `WaveTelegraph.ts` `ICON_COLOR`, `TowerInfoPanel.ts` `ikonRengi()`)
 * tekrar eden düşman/kule → görsel eşlemesinin yerini alıyor — gerçek
 * sanat kendi rengini taşıdığı için ayrı bir renk ataması gerekmiyor.
 */

import type { TierIndex, TowerId } from '../types/tower';
import type { EnemyId } from '../types/enemy';

const TOWER_TIER_SUFFIX: Readonly<Record<TierIndex, string>> = {
  0: 't1',
  1: 't2',
  2: 't3a',
  3: 't3b',
};

/**
 * Kademe 2/3 (T3a/T3b) dal adı taşıyor (`okcu_t3a_keskin-nisanci` gibi);
 * kademe 0/1 taşımıyor (`okcu_t1`). Aile+kademe → tam kare adı burada.
 */
const TOWER_BRANCH_SUFFIX: Readonly<Record<TowerId, Readonly<Record<2 | 3, string>>>> = {
  okcu: { 2: '_keskin-nisanci', 3: '_kundakci' },
  top: { 2: '_havan', 3: '_barut-ficisi' },
  buyu: { 2: '_yildirim', 3: '_buz' },
  kisla: { 2: '_paladin', 3: '_haydutlar' },
};

export function towerFrameKey(familyId: TowerId, tierIndex: TierIndex): string {
  const dal = tierIndex === 2 || tierIndex === 3 ? TOWER_BRANCH_SUFFIX[familyId][tierIndex] : '';
  return `${familyId}_${TOWER_TIER_SUFFIX[tierIndex]}${dal}`;
}

const ENEMY_FRAME: Readonly<Record<EnemyId, string>> = {
  goblin: 'goblin',
  orkSavasci: 'ork_savasci',
  kurtBinicisi: 'kurt_binicisi',
  harpi: 'harpi',
  zirhliOrk: 'zirhli_ork',
  saman: 'saman',
  trol: 'trol',
  orumcekAna: 'orumcek_ana',
  orumcekYavrusu: 'orumcek_yavrusu',
  ogreSef: 'ogre_sef_boss',
};

export function enemyFrameKey(id: EnemyId): string {
  return ENEMY_FRAME[id];
}

/** Kışla askeri düşman değil — kadroda yok, ayrı sabit. */
export const SOLDIER_FRAME = 'kisla_askeri';

/** Yetenek HUD ikonları (`AbilityButtons`). */
export const METEOR_FRAME = 'meteor_icon';
export const TAKVIYE_FRAME = 'takviye_icon';

/** P02 HUD çerçeve kareleri (`ParchmentFrame`, kartuş). */
export const FRAME_CORNER = 'corner';
export const FRAME_EDGE = 'edge-strip';
export const FRAME_MIDDLE = 'middle-texture';
export const FRAME_CARTOUCHE = 'cartouche';

/** Altın uçuşu ikonu (`fx/GoldFlight.ts`) — M6-T10 görsel iyileştirme. */
export const FRAME_GOLD_COIN = 'gold-coin';
