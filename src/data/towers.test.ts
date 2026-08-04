import { describe, it, expect } from 'vitest';
import { OKCU, TOP, TOWERS, getTower } from './towers';
import { GOBLIN, ORK_SAVASCI, ENEMIES, getEnemy } from './enemies';
import { COVERAGE_REFERENCE_RANGE } from './maps';

/**
 * Test sabitleri **elle yazılı ve kaynağı belirtilmiş** — veri dosyasından
 * okunsalardı test hiçbir şey kanıtlamazdı (kendi kendini doğrulama).
 * Kaynak: `docs/GAME-DESIGN.md` §4.1, §4.2, §5 tabloları.
 */

describe('towers.ts — GAME-DESIGN §4.1 Okçu tablosu', () => {
  it('T1: 70 / 6 / 1.1 / 150', () => {
    expect(OKCU.tiers[0]).toEqual({
      cost: 70,
      damage: 6,
      fireRate: 1.1,
      range: 150,
      airMultiplier: 1,
    });
  });

  it('T2: 110 / 10 / 1.3 / 165', () => {
    expect(OKCU.tiers[1]).toEqual({
      cost: 110,
      damage: 10,
      fireRate: 1.3,
      range: 165,
      airMultiplier: 1,
    });
  });

  it('fiziksel hasar ve uçana tam vuruş', () => {
    expect(OKCU.damageType).toBe('physical');
    expect(OKCU.tiers[0].airMultiplier).toBe(1);
    expect(OKCU.tiers[1].airMultiplier).toBe(1);
  });

  it('patlama yarıçapı yok — tek hedef', () => {
    expect(OKCU.tiers[0].splashRadius).toBeUndefined();
    expect(OKCU.tiers[1].splashRadius).toBeUndefined();
  });
});

describe('towers.ts — GAME-DESIGN §4.2 Top tablosu', () => {
  it('T1: 110 / 22 / 0.5 / 140, yarıçap 45', () => {
    expect(TOP.tiers[0]).toEqual({
      cost: 110,
      damage: 22,
      fireRate: 0.5,
      range: 140,
      splashRadius: 45,
      airMultiplier: 0,
    });
  });

  it('T2: 160 / 34 / 0.55 / 150, yarıçap 55', () => {
    expect(TOP.tiers[1]).toEqual({
      cost: 160,
      damage: 34,
      fireRate: 0.55,
      range: 150,
      splashRadius: 55,
      airMultiplier: 0,
    });
  });

  it('Top T1 ve T2 uçana VURAMAZ — §4.2 kasıtlı zayıflığı', () => {
    // "Bitmedi sayılır eğer: airMultiplier Top T1'de 0 değilse."
    // Harpi dalgasında oyuncunun tahtasının yarısının ölü kalması bilinçli.
    expect(TOP.tiers[0].airMultiplier).toBe(0);
    expect(TOP.tiers[1].airMultiplier).toBe(0);
  });

  it('T3 dalları: Havan uçana vuramaz, Barut Fıçısı %50 ile vurur', () => {
    // §4.2: T3 dallanmasını gerçek bir seçime çeviren şey bu.
    expect(TOP.branches[0].airMultiplier).toBe(0);
    expect(TOP.branches[1].airMultiplier).toBe(0.5);
  });
});

describe('towers.ts — DPS türevleri', () => {
  it('Okçu T1 DPS = 6.6, Top T1 DPS = 11', () => {
    expect(OKCU.tiers[0].damage * OKCU.tiers[0].fireRate).toBeCloseTo(6.6, 10);
    expect(TOP.tiers[0].damage * TOP.tiers[0].fireRate).toBeCloseTo(11, 10);
  });

  it('kule ailelerinin menzilleri farklı — hiçbiri diğerinin üstü değil', () => {
    // §4: "hiçbir kule diğerinin düpedüz üstünde değildir".
    // Top daha çok hasar veriyor ama menzili kısa ve uçana vuramıyor.
    expect(TOP.tiers[0].range).toBeLessThan(OKCU.tiers[0].range);
    expect(TOP.tiers[0].damage).toBeGreaterThan(OKCU.tiers[0].damage);
  });

  it('M2 kadrosu iki kule', () => {
    expect(TOWERS).toHaveLength(2);
    expect(getTower('okcu')).toBe(OKCU);
    expect(getTower('top')).toBe(TOP);
    expect(getTower('buyu')).toBeUndefined(); // M4
  });
});

describe('kapsama referans menzili ile Okçu T1 menzili aynı olmalı', () => {
  it('COVERAGE_REFERENCE_RANGE === OKCU.tiers[0].range', () => {
    // `maps.ts` bu sözü veriyordu: "kule verisi geldiğinde T1 menzili bu
    // sayıya EŞİT olmak zorunda, yoksa coverage alanı denge hesabıyla
    // farklı bir tabana oturur". Söz burada bağlanıyor.
    expect(COVERAGE_REFERENCE_RANGE).toBe(OKCU.tiers[0].range);
  });
});

describe('enemies.ts — GAME-DESIGN §5 tablosu', () => {
  it('Goblin: 45 / 60 / 0 / 0, altın 3, puan 1', () => {
    expect(GOBLIN).toEqual({
      id: 'goblin',
      hp: 45,
      speed: 60,
      armor: 0,
      magicResist: 0,
      gold: 3,
      points: 1,
      leakDamage: 1,
      flying: false,
    });
  });

  it('Ork Savaşçı: 110 / 45 / 2 / 0, altın 6, puan 2', () => {
    expect(ORK_SAVASCI).toEqual({
      id: 'orkSavasci',
      hp: 110,
      speed: 45,
      armor: 2,
      magicResist: 0,
      gold: 6,
      points: 2,
      leakDamage: 1,
      flying: false,
    });
  });

  it('altın = 3 × puan — §5 oran kuralı', () => {
    for (const e of ENEMIES) expect(e.gold).toBe(3 * e.points);
  });

  it('ikisi de yürüyor, sızma cezası 1 can', () => {
    for (const e of ENEMIES) {
      expect(e.flying).toBe(false);
      expect(e.leakDamage).toBe(1);
    }
  });

  it('M2 kadrosu iki düşman, ikisi de harita 1 kadrosunda', () => {
    expect(ENEMIES).toHaveLength(2);
    expect(getEnemy('goblin')).toBe(GOBLIN);
    expect(getEnemy('trol')).toBeUndefined(); // M4
  });
});
