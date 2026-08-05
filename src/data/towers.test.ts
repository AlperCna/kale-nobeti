import { describe, it, expect } from 'vitest';
import { OKCU, TOP, BUYU, TOWERS, getTower, tierAt } from './towers';
import {
  GOBLIN,
  ORK_SAVASCI,
  HARPI,
  ZIRHLI_ORK,
  SAMAN,
  TROL,
  ORUMCEK_ANA,
  ORUMCEK_YAVRUSU,
  OGRE_SEF,
  ENEMIES,
  getEnemy,
} from './enemies';
import { COVERAGE_REFERENCE_RANGE, MAP_1 } from './maps';

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

  it('M4 kadrosu üç kule ailesi', () => {
    expect(TOWERS).toHaveLength(3);
    expect(getTower('okcu')).toBe(OKCU);
    expect(getTower('top')).toBe(TOP);
    expect(getTower('buyu')).toBe(BUYU);
    expect(getTower('kisla')).toBeUndefined(); // M5 — kule değil
  });
});

describe('towers.ts — GAME-DESIGN §4.3 Büyü tablosu', () => {
  it('T1: 100 / 14 / 0.7 / 155', () => {
    expect(BUYU.tiers[0]).toEqual({
      cost: 100,
      damage: 14,
      fireRate: 0.7,
      range: 155,
      airMultiplier: 1,
    });
  });

  it('T2: 150 / 24 / 0.75 / 170', () => {
    expect(BUYU.tiers[1]).toEqual({
      cost: 150,
      damage: 24,
      fireRate: 0.75,
      range: 170,
      airMultiplier: 1,
    });
  });

  it('BÜYÜ hasarı — zırhı hiç görmüyor', () => {
    expect(BUYU.damageType).toBe('magic');
  });

  it('Yıldırım: 230 / 30 / 0.7 / 170, 3 hedefe %70 azalarak', () => {
    const y = BUYU.branches[0];
    expect(y.cost).toBe(230);
    expect(y.damage).toBe(30);
    expect(y.fireRate).toBe(0.7);
    expect(y.range).toBe(170);
    expect(y.effect).toEqual({ kind: 'chain', targets: 3, falloff: 0.7 });
  });

  it('Buz: 230 / 20 / 0.8 / 180, %50 yavaşlatma 2,5 sn', () => {
    const b = BUYU.branches[1];
    expect(b.cost).toBe(230);
    expect(b.damage).toBe(20);
    expect(b.fireRate).toBe(0.8);
    expect(b.range).toBe(180);
    expect(b.effect).toEqual({ kind: 'slow', factor: 0.5, seconds: 2.5 });
  });
});

describe('towers.ts — T3 dalları (12 kademe)', () => {
  it('üç ailenin de iki dalı var, hepsi adlandırılmış', () => {
    for (const def of TOWERS) {
      expect(def.branches).toHaveLength(2);
      for (const b of def.branches) expect(b.branchName).toBeTruthy();
    }
  });

  it('Keskin Nişancı: 170 / 26 / 0.6 / 260, efekt yok', () => {
    const k = OKCU.branches[0];
    expect([k.cost, k.damage, k.fireRate, k.range]).toEqual([170, 26, 0.6, 260]);
    expect(k.effect).toBeUndefined();
  });

  it('Kundakçı: 170 / 9 / 1.4 / 165, yanma 4/sn 4 sn', () => {
    const k = OKCU.branches[1];
    expect([k.cost, k.damage, k.fireRate, k.range]).toEqual([170, 9, 1.4, 165]);
    expect(k.effect).toEqual({ kind: 'burn', dps: 4, seconds: 4 });
  });

  it('Havan: 240 / 48 / 0.45 / 230, yarıçap 70, uçana VURAMAZ', () => {
    const h = TOP.branches[0];
    expect([h.cost, h.damage, h.fireRate, h.range, h.splashRadius]).toEqual([
      240, 48, 0.45, 230, 70,
    ]);
    expect(h.airMultiplier).toBe(0);
  });

  it('Barut Fıçısı: 240 / 30 / 0.6 / 150, yarıçap 65, uçana %50', () => {
    const b = TOP.branches[1];
    expect([b.cost, b.damage, b.fireRate, b.range, b.splashRadius]).toEqual([
      240, 30, 0.6, 150, 65,
    ]);
    // §4.2: T3 dallanmasını gerçek bir seçime çeviren şey bu.
    expect(b.airMultiplier).toBe(0.5);
    expect(b.effect).toEqual({ kind: 'slow', factor: 0.4, seconds: 2 });
  });

  it('T3 dalları T2\'den pahalı — kademe atlanamıyor', () => {
    for (const def of TOWERS) {
      for (const b of def.branches) {
        expect(b.cost, def.id).toBeGreaterThan(def.tiers[1].cost);
      }
    }
  });

  it('tierAt indeksleri doğru satıra gidiyor', () => {
    expect(tierAt(OKCU, 0)).toBe(OKCU.tiers[0]);
    expect(tierAt(OKCU, 1)).toBe(OKCU.tiers[1]);
    expect(tierAt(OKCU, 2)).toBe(OKCU.branches[0]);
    expect(tierAt(OKCU, 3)).toBe(OKCU.branches[1]);
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

  it('altın = 3 × puan — §5 oran kuralı, boss ve yavru istisna', () => {
    for (const e of ENEMIES) {
      // Boss: 60/25 = 2,4. §5 gerekçesi: "son dalgada kazanılan altının
      // kullanım değeri düşük". Yavru: ikisi de 0 (S38).
      if (e.id === 'ogreSef' || e.id === 'orumcekYavrusu') continue;
      expect(e.gold, e.id).toBe(3 * e.points);
    }
    expect(OGRE_SEF.gold).toBe(60);
    expect(OGRE_SEF.points).toBe(25);
  });

  it('sızma cezaları §5: normal 1, Trol/Örümcek 2, boss 10', () => {
    expect(GOBLIN.leakDamage).toBe(1);
    expect(TROL.leakDamage).toBe(2);
    expect(ORUMCEK_ANA.leakDamage).toBe(2);
    expect(OGRE_SEF.leakDamage).toBe(10);
  });

  it('yalnız Harpi uçuyor', () => {
    const ucanlar = ENEMIES.filter((e) => e.flying).map((e) => e.id);
    expect(ucanlar).toEqual(['harpi']);
  });

  it('M4 kadrosu: dokuz düşman + örümcek yavrusu', () => {
    expect(ENEMIES).toHaveLength(10);
    const kadro = ENEMIES.filter((e) => e.id !== 'orumcekYavrusu');
    expect(kadro).toHaveLength(9);
    expect(getEnemy('goblin')).toBe(GOBLIN);
    expect(getEnemy('ogreSef')).toBe(OGRE_SEF);
  });

  it('harita 1 kadrosunun beşi de tanımlı', () => {
    for (const id of MAP_1.enemyRoster) expect(getEnemy(id), id).toBeDefined();
  });

  it('§5 tablosu — kalan altı düşmanın sayıları birebir', () => {
    expect([HARPI.hp, HARPI.speed, HARPI.armor, HARPI.magicResist]).toEqual([70, 75, 0, 0]);
    expect([ZIRHLI_ORK.hp, ZIRHLI_ORK.speed, ZIRHLI_ORK.armor]).toEqual([160, 38, 8]);
    expect([SAMAN.hp, SAMAN.speed, SAMAN.magicResist]).toEqual([130, 42, 0.4]);
    expect([TROL.hp, TROL.speed, TROL.armor]).toEqual([400, 30, 4]);
    expect([ORUMCEK_ANA.hp, ORUMCEK_ANA.speed, ORUMCEK_ANA.magicResist]).toEqual([150, 50, 0.2]);
    expect([OGRE_SEF.hp, OGRE_SEF.speed, OGRE_SEF.armor, OGRE_SEF.magicResist]).toEqual([
      700, 28, 10, 0.25,
    ]);
  });

  it('yetenekler §5 "Özellik" sütunuyla eşleşiyor', () => {
    expect(SAMAN.ability).toEqual({ kind: 'heal', hps: 8, radius: 90 });
    expect(TROL.ability).toEqual({ kind: 'regen', hps: 6 });
    expect(ORUMCEK_ANA.ability).toEqual({
      kind: 'split',
      count: 3,
      childId: 'orumcekYavrusu',
    });
    expect(GOBLIN.ability).toBeUndefined();
  });

  it('örümcek yavrusu: HP 30, hız 90, gerisi SIFIR (S38)', () => {
    // §5'te yalnız HP ve hız yazıyor; kalanı uydurulmadı.
    expect(ORUMCEK_YAVRUSU.hp).toBe(30);
    expect(ORUMCEK_YAVRUSU.speed).toBe(90);
    expect(ORUMCEK_YAVRUSU.armor).toBe(0);
    expect(ORUMCEK_YAVRUSU.magicResist).toBe(0);
    expect(ORUMCEK_YAVRUSU.gold).toBe(0);
    expect(ORUMCEK_YAVRUSU.points).toBe(0);
  });
});
