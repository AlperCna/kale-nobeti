import { describe, it, expect } from 'vitest';
import atlasJson from '../../public/assets/atlas.json';
import {
  towerFrameKey,
  enemyFrameKey,
  SOLDIER_FRAME,
  METEOR_FRAME,
  TAKVIYE_FRAME,
  FRAME_CORNER,
  FRAME_EDGE,
  FRAME_MIDDLE,
  FRAME_CARTOUCHE,
} from './spriteFrames';
import type { TowerId, TierIndex } from '../types/tower';
import type { EnemyId } from '../types/enemy';

/**
 * `atlas.png`/`atlas.json` `npm run prep-assets` ile üretiliyor, testten
 * ayrı. Bu dosya yalnız **isimlerin eşleştiğini** doğruluyor — üretilen
 * atlas'ta olmayan bir kareye başvurursak Phaser sessizce boş doku basar,
 * bu test o sınıf hatayı derleme zamanında değil ama en azından
 * `npm run test`'te yakalar.
 */
describe('spriteFrames.ts — atlas.json ile eşleşme', () => {
  const kareler = new Set(Object.keys(atlasJson.frames));

  const AILELER: readonly TowerId[] = ['okcu', 'top', 'buyu', 'kisla'];
  const KADEMELER: readonly TierIndex[] = [0, 1, 2, 3];

  it.each(AILELER.flatMap((aile) => KADEMELER.map((kademe) => [aile, kademe] as const)))(
    '%s kademe %i atlas karesi var',
    (aile, kademe) => {
      expect(kareler.has(towerFrameKey(aile, kademe))).toBe(true);
    },
  );

  const DUSMANLAR: readonly EnemyId[] = [
    'goblin',
    'orkSavasci',
    'kurtBinicisi',
    'harpi',
    'zirhliOrk',
    'saman',
    'trol',
    'orumcekAna',
    'orumcekYavrusu',
    'ogreSef',
  ];

  it.each(DUSMANLAR)('%s atlas karesi var', (id) => {
    expect(kareler.has(enemyFrameKey(id))).toBe(true);
  });

  it('asker/yetenek/HUD kareleri var', () => {
    expect(kareler.has(SOLDIER_FRAME)).toBe(true);
    expect(kareler.has(METEOR_FRAME)).toBe(true);
    expect(kareler.has(TAKVIYE_FRAME)).toBe(true);
    expect(kareler.has(FRAME_CORNER)).toBe(true);
    expect(kareler.has(FRAME_EDGE)).toBe(true);
    expect(kareler.has(FRAME_MIDDLE)).toBe(true);
    expect(kareler.has(FRAME_CARTOUCHE)).toBe(true);
  });

  it('okçu T3a/T3b farklı kareler (dal isimleri karışmıyor)', () => {
    expect(towerFrameKey('okcu', 2)).not.toBe(towerFrameKey('okcu', 3));
  });
});
