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
  it('T1: 70 / 8 / 1.1 / 150 (S95)', () => {
    expect(OKCU.tiers[0]).toEqual({
      cost: 70,
      damage: 8,
      fireRate: 1.1,
      range: 150,
      airMultiplier: 1,
    });
  });

  it('T2: 110 / 14 / 1.3 / 165 (S95)', () => {
    expect(OKCU.tiers[1]).toEqual({
      cost: 110,
      damage: 14,
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

  /**
   * `M11-T02` — **Havan artık uçana vurabiliyor (0 → 0,5).**
   * `airMultiplier: 0` düşmanı hedef listesinden tümden eliyordu, yani
   * Havan harpi dalgasında **tamamen ölü** kalıyordu. Ölçüm altı T3
   * dalından üçünün hiçbir senaryoda kazanmadığını gösterdi; bu
   * onlardan biriydi. Dallar artık patlama/menzil/atış hızıyla
   * ayrışıyor, kategorik bir delikle değil.
   */
  it('T3 dalları: ikisi de uçana vuruyor — kategorik delik YOK', () => {
    expect(TOP.branches[0].airMultiplier).toBe(0.5);
    expect(TOP.branches[1].airMultiplier).toBe(0.5);
    // T1/T2 hâlâ vuramıyor — §4.2'nin "Top uçana zayıf" kimliği duruyor.
    expect(TOP.tiers[0].airMultiplier).toBe(0);
    expect(TOP.tiers[1].airMultiplier).toBe(0);
  });
});

describe('towers.ts — DPS türevleri', () => {
  it('Okçu T1 DPS = 8.8, Top T1 DPS = 11 (S95)', () => {
    // `M11` Faz 5: Okçu 6,6 → 8,8. Ölü aileydi; gerekçe `towers.ts`.
    expect(OKCU.tiers[0].damage * OKCU.tiers[0].fireRate).toBeCloseTo(8.8, 10);
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

  it('Yıldırım: 230 / 36 / 0.7 / 170, 3 hedefe %70 azalarak (S110)', () => {
    const y = BUYU.branches[0];
    expect(y.cost).toBe(230);
    expect(y.damage).toBe(36); // `M18` (S110): 30 → 36, gerekçe towers.ts'te
    expect(y.fireRate).toBe(0.7);
    expect(y.range).toBe(170);
    expect(y.effect).toEqual({ kind: 'chain', targets: 3, falloff: 0.7 });
  });

  /**
   * `M11-T02` — Buz **alan yavaşlatıcısı** oldu. Ölçüm yapısal bir
   * sorun gösterdi: Buz yavaşlatmayı tek tek uyguluyordu (0,8 hedef/sn)
   * ve bu yüzden Barut Fıçısı'nın patlamayla dağıttığı daha zayıf
   * yavaşlatmadan **daha az** düşman yavaşlatıyordu. Hasarı düştü
   * (20 → 8), patlama ve yavaşlatma kimliği oldu.
   */
  it('Buz: 230 / 8 / 0.8 / 180, patlama 30, yavaşlatma %30 · 2 sn (M11-T02)', () => {
    const b = BUYU.branches[1];
    expect(b.cost).toBe(230);
    expect(b.damage).toBe(8);
    expect(b.fireRate).toBe(0.8);
    expect(b.range).toBe(180);
    expect(b.splashRadius).toBe(30);
    expect(b.effect).toEqual({ kind: 'slow', factor: 0.3, seconds: 2 });
  });
});

describe('towers.ts — T3 dalları (12 kademe)', () => {
  it('üç ailenin de iki dalı var, hepsi adlandırılmış', () => {
    for (const def of TOWERS) {
      expect(def.branches).toHaveLength(2);
      for (const b of def.branches) expect(b.branchNameKey).toBeTruthy();
    }
  });

  it('Keskin Nişancı: 170 / 41 / 0.6 / 260, efekt yok (S95 → S119)', () => {
    const k = OKCU.branches[0];
    expect([k.cost, k.damage, k.fireRate, k.range]).toEqual([170, 41, 0.6, 260]);
    expect(k.effect).toBeUndefined();
  });

  it('Kundakçı: 170 / 9 / 1.4 / 195, yanma 11/sn 4 sn (S95)', () => {
    const k = OKCU.branches[1];
    expect([k.cost, k.damage, k.fireRate, k.range]).toEqual([170, 9, 1.4, 195]);
    expect(k.effect).toEqual({ kind: 'burn', dps: 11, seconds: 4 });
  });

  it('Havan: 240 / 48 / 0.45 / 230, yarıçap 55, uçana %50 (M11-T02)', () => {
    const h = TOP.branches[0];
    expect([h.cost, h.damage, h.fireRate, h.range, h.splashRadius]).toEqual([
      240, 48, 0.45, 230, 55,
    ]);
    expect(h.airMultiplier).toBe(0.5);
  });

  it('Barut Fıçısı: 240 / 24 / 0.9 / 150, yarıçap 85, YAVAŞLATMA YOK (M11-T02)', () => {
    const b = TOP.branches[1];
    expect([b.cost, b.damage, b.fireRate, b.range, b.splashRadius]).toEqual([
      240, 24, 0.9, 150, 85,
    ]);
    expect(b.airMultiplier).toBe(0.5);
    // `M11-T02` — yavaşlatma KALDIRILDI, Buz'un kimliği oldu. Sebep
    // yapısal: Kısıt A'da yavaşlatma `hız`ı bölüyor, yani bütün
    // tahtanın hasarını çarpıyor — yavaşlatan dal, yavaşlatmayanı her
    // zaman yener. Gerekçenin tamamı `towers.ts`'te.
    expect(b.effect).toBeUndefined();
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

  it('kadro: on düşman + örümcek yavrusu (M12: Tünelci)', () => {
    expect(ENEMIES).toHaveLength(11);
    const kadro = ENEMIES.filter((e) => e.id !== 'orumcekYavrusu');
    expect(kadro).toHaveLength(10);
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
