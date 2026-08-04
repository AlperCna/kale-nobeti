import { describe, it, expect } from 'vitest';
import { applyDamage, DAMAGE_FLOOR_RATIO } from './combat';
import { OKCU, TOP } from '../data/towers';
import { GOBLIN, ORK_SAVASCI } from '../data/enemies';

/** Zırhsız, dirençsiz. */
const CIPLAK = { armor: 0, magicResist: 0 };
/** Ogre Şef savunmaları (`GAME-DESIGN.md` §5). Düşman verisi M4'te gelecek. */
const BOSS = { armor: 10, magicResist: 0.25 };

describe('applyDamage — fiziksel', () => {
  it('zırh 0 → tam hasar', () => {
    expect(applyDamage(6, 'physical', CIPLAK)).toEqual({ dealt: 6, floored: false });
  });

  it('Okçu T1 (6) vs Ork Savaşçı (zırh 2) → 4', () => {
    // Zırh kavramını tanıtan senaryo (§5). Gerçek veriyle, kurguyla değil.
    const r = applyDamage(OKCU.tiers[0].damage, OKCU.damageType, ORK_SAVASCI);
    expect(r).toEqual({ dealt: 4, floored: false });
  });

  it('Top T1 (22) vs Goblin (zırh 0) → 22', () => {
    const r = applyDamage(TOP.tiers[0].damage, TOP.damageType, GOBLIN);
    expect(r).toEqual({ dealt: 22, floored: false });
  });

  it('Okçu T2 (10) vs boss zırh 10 → 1.5, tabana düştü', () => {
    // §3'ün "okçu boss'a tekrar tekrar 1 yazıyor" örneği.
    const r = applyDamage(OKCU.tiers[1].damage, 'physical', BOSS);
    expect(r.dealt).toBeCloseTo(1.5, 10);
    expect(r.floored).toBe(true);
  });

  it('zırh hasardan büyük → dmg × 0.15, floored', () => {
    const r = applyDamage(6, 'physical', { armor: 99, magicResist: 0 });
    expect(r.dealt).toBeCloseTo(0.9, 10);
    expect(r.floored).toBe(true);
  });

  it('zırh tam hasara eşit → yine taban (0 değil)', () => {
    // Duvar yok kuralı: hiçbir vuruş tamamen emilmez.
    const r = applyDamage(6, 'physical', { armor: 6, magicResist: 0 });
    expect(r.dealt).toBeCloseTo(0.9, 10);
    expect(r.floored).toBe(true);
    expect(r.dealt).toBeGreaterThan(0);
  });

  it('tabanın hemen üstü floored DEĞİL', () => {
    // dmg 10, zırh 8 → 2 > 1.5. Sınır davranışı.
    const r = applyDamage(10, 'physical', { armor: 8, magicResist: 0 });
    expect(r.dealt).toBe(2);
    expect(r.floored).toBe(false);
  });

  it('fiziksel hasar büyü direncini GÖRMEZ', () => {
    const r = applyDamage(10, 'physical', { armor: 0, magicResist: 0.9 });
    expect(r).toEqual({ dealt: 10, floored: false });
  });
});

describe('applyDamage — büyü', () => {
  it('direnç 0 → tam hasar', () => {
    expect(applyDamage(20, 'magic', CIPLAK)).toEqual({ dealt: 20, floored: false });
  });

  it('direnç 0.40 → %60', () => {
    const r = applyDamage(20, 'magic', { armor: 0, magicResist: 0.4 });
    expect(r.dealt).toBeCloseTo(12, 10);
    expect(r.floored).toBe(false);
  });

  it('boss direnci 0.25 → %75', () => {
    const r = applyDamage(24, 'magic', BOSS);
    expect(r.dealt).toBeCloseTo(18, 10);
    expect(r.floored).toBe(false);
  });

  it('büyü hasarı zırhı GÖRMEZ', () => {
    const r = applyDamage(20, 'magic', { armor: 100, magicResist: 0 });
    expect(r).toEqual({ dealt: 20, floored: false });
  });

  it('direnç %85 ALTINDA taban hiç devreye girmiyor', () => {
    // §3 notu: büyüde out = dmg × (1−mr); taban dmg × 0.15.
    // out < taban ⟺ mr > 0.85. Bu, görevin "bitmedi sayılır" maddesi.
    for (const mr of [0, 0.25, 0.4, 0.6, 0.8, 0.84]) {
      const r = applyDamage(20, 'magic', { armor: 0, magicResist: mr });
      expect(r.floored, `mr=${mr}`).toBe(false);
    }
  });

  it('direnç %85 ÜSTÜNDE taban devreye giriyor', () => {
    for (const mr of [0.86, 0.95, 1]) {
      const r = applyDamage(20, 'magic', { armor: 0, magicResist: mr });
      expect(r.floored, `mr=${mr}`).toBe(true);
      expect(r.dealt).toBeCloseTo(20 * DAMAGE_FLOOR_RATIO, 10);
    }
  });

  it('direnç tam %85 sınırında taban devreye girmiyor', () => {
    const r = applyDamage(20, 'magic', { armor: 0, magicResist: 0.85 });
    expect(r.dealt).toBeCloseTo(3, 10);
    expect(r.floored).toBe(false); // out === taban, küçük değil
  });
});

describe('applyDamage — gerçek hasar', () => {
  it('zırh ve direnç hiç etkilemiyor', () => {
    expect(applyDamage(180, 'true', BOSS)).toEqual({ dealt: 180, floored: false });
    expect(applyDamage(180, 'true', { armor: 999, magicResist: 1 })).toEqual({
      dealt: 180,
      floored: false,
    });
  });
});

describe('applyDamage — sınır durumları', () => {
  it('hasar 0 → 0 ve floored DEĞİL', () => {
    // Emilecek bir şey yok; kalkan ikonu çıkarmak yanıltıcı olurdu.
    expect(applyDamage(0, 'physical', BOSS)).toEqual({ dealt: 0, floored: false });
    expect(applyDamage(0, 'magic', BOSS)).toEqual({ dealt: 0, floored: false });
  });

  it('negatif hasar → 0', () => {
    expect(applyDamage(-5, 'physical', CIPLAK)).toEqual({ dealt: 0, floored: false });
  });

  it('sonuç asla negatif değil', () => {
    for (const armor of [0, 1, 5, 50, 1000]) {
      expect(applyDamage(6, 'physical', { armor, magicResist: 0 }).dealt).toBeGreaterThan(0);
    }
  });

  it('saf — aynı girdi hep aynı çıktı, yan etki yok', () => {
    const e = { armor: 2, magicResist: 0 };
    const a = applyDamage(6, 'physical', e);
    const b = applyDamage(6, 'physical', e);
    expect(a).toEqual(b);
    expect(e).toEqual({ armor: 2, magicResist: 0 });
  });
});
