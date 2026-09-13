import { describe, expect, it } from 'vitest';
import { enemyName, enemySummary } from './enemyLabel';
import { ENEMIES, GOBLIN, ZIRHLI_ORK, SAMAN, TROL, ORUMCEK_ANA, HARPI } from '../data/enemies';

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
