import { describe, expect, it } from 'vitest';
import { enemyName, enemySummary } from './enemyLabel';
import {
  ENEMIES,
  GOBLIN,
  ZIRHLI_ORK,
  SAMAN,
  TROL,
  ORUMCEK_ANA,
  HARPI,
  TUNELCI,
  getEnemyForMap,
} from '../data/enemies';
import { MAP_1, MAP_5, MAP_6 } from '../data/maps';

describe('enemyLabel — M8-T02 telgraf bilgisi', () => {
  it('her düşmanın adı var ve anahtar sızmıyor', () => {
    for (const e of ENEMIES) {
      const ad = enemyName(e.id);
      expect(ad, e.id).not.toBe('');
      // `t()` bulamadığı anahtarı kendisi döndürüyor — o sızıntı olurdu.
      expect(ad.startsWith('enemy'), e.id).toBe(false);
    }
  });

  it('sıfır savunma YAZILMIYOR — goblin yalnız ad', () => {
    expect(enemySummary(GOBLIN)).toBe('Goblin');
  });

  it('zırh yazılıyor', () => {
    expect(enemySummary(ZIRHLI_ORK)).toContain(`zırh ${ZIRHLI_ORK.armor}`);
  });

  it('büyü direnci yüzdeye çevriliyor', () => {
    expect(enemySummary(SAMAN)).toContain(`%${Math.round(SAMAN.magicResist * 100)}`);
  });

  it('uçan işaretleniyor', () => {
    expect(enemySummary(HARPI)).toContain('uçar');
  });

  it('yetenekler yazılıyor — karşı-oyun kararını değiştiren tek şey', () => {
    expect(enemySummary(TROL)).toContain('yenilenir');
    expect(enemySummary(ORUMCEK_ANA)).toContain('bölünür');
  });
});

/**
 * **Boss'un verb'ü telgrafta görünüyor** — `M13`/`M15`.
 *
 * `M13` boss'a çağırma ekledi ve telgraf onu söylemiyordu; harita 5'in
 * ikinci evresi de `M10`'dan beri sessizdi. Oyuncu karşı-oyun kararını
 * yetenekten veriyor, o yüzden dalga **gelmeden** okunmalı.
 */
describe('boss yetenekleri telgrafta yazılı (M15)', () => {
  it('harita 6 bossu "yandaş çağırır" diyor', () => {
    const boss = getEnemyForMap('ogreSef', MAP_6)!;
    expect(enemySummary(boss)).toContain('yandaş çağırır');
  });

  it('harita 5 bossu "yarısında hızlanır" diyor', () => {
    const boss = getEnemyForMap('ogreSef', MAP_5)!;
    expect(enemySummary(boss)).toContain('yarısında hızlanır');
  });

  it('düz boss yetenek satırı taşımıyor', () => {
    const boss = getEnemyForMap('ogreSef', MAP_1)!;
    expect(enemySummary(boss)).not.toContain('çağırır');
    expect(enemySummary(boss)).not.toContain('hızlanır');
  });

  it('Tünelci "yeraltından geçer" diyor', () => {
    expect(enemySummary(TUNELCI)).toContain('yeraltından geçer');
  });
});
