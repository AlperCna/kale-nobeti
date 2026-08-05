import { describe, expect, it } from 'vitest';
import { KISLA, BLOCK, barracksTierAt, meleeDps, MELEE_DPS_PER_POINT, SOLDIER_SPEED } from './barracks';
import { ENEMIES, GOBLIN, TROL, OGRE_SEF } from './enemies';

describe('Kışla tablosu — GAME-DESIGN.md §4.4 birebir', () => {
  it('T1: 90 / 2 asker / 45 HP / 5 DPS / 8 sn', () => {
    const t = barracksTierAt(KISLA, 0);
    expect(t.cost).toBe(90);
    expect(t.soldierCount).toBe(2);
    expect(t.soldierHp).toBe(45);
    expect(t.soldierDps).toBe(5);
    expect(t.respawnSeconds).toBe(8);
  });

  it('T2: 140 / 2 / 75 / 8 / 7 sn', () => {
    const t = barracksTierAt(KISLA, 1);
    expect(t.cost).toBe(140);
    expect(t.soldierCount).toBe(2);
    expect(t.soldierHp).toBe(75);
    expect(t.soldierDps).toBe(8);
    expect(t.respawnSeconds).toBe(7);
  });

  it('Paladin (T3a): 210 / 2 / 140 / 11 / 6 sn', () => {
    const t = barracksTierAt(KISLA, 2);
    expect(t.branchName).toBe('Paladin');
    expect(t.cost).toBe(210);
    expect(t.soldierCount).toBe(2);
    expect(t.soldierHp).toBe(140);
    expect(t.soldierDps).toBe(11);
    expect(t.respawnSeconds).toBe(6);
  });

  it('Haydutlar (T3b): 210 / 3 / 70 / 9 / 5 sn / %25 kaçınma', () => {
    const t = barracksTierAt(KISLA, 3);
    expect(t.branchName).toBe('Haydutlar');
    expect(t.cost).toBe(210);
    expect(t.soldierCount).toBe(3);
    expect(t.soldierHp).toBe(70);
    expect(t.soldierDps).toBe(9);
    expect(t.respawnSeconds).toBe(5);
    expect(t.evasion).toBe(0.25);
  });

  it('S43 — Paladin kalkanı UYDURULMADI, undefined', () => {
    expect(barracksTierAt(KISLA, 2).shield).toBeUndefined();
    // Diğer kademelerde de kalkan yok.
    for (const i of [0, 1, 3] as const) {
      expect(barracksTierAt(KISLA, i).shield).toBeUndefined();
    }
  });

  it('kaçınma YALNIZ Haydutlar dalında', () => {
    for (const i of [0, 1, 2] as const) {
      expect(barracksTierAt(KISLA, i).evasion).toBeUndefined();
    }
  });

  it('dört kademe de maliyet bakımından artan', () => {
    expect(barracksTierAt(KISLA, 0).cost).toBeLessThan(barracksTierAt(KISLA, 1).cost);
    expect(barracksTierAt(KISLA, 1).cost).toBeLessThan(barracksTierAt(KISLA, 2).cost);
    expect(barracksTierAt(KISLA, 2).cost).toBe(barracksTierAt(KISLA, 3).cost);
  });
});

describe('BLOCK sabitleri — §4.4 kural 2 ve 6', () => {
  it('kural 2: aggro 60, temas 20', () => {
    expect(BLOCK.aggroRadius).toBe(60);
    expect(BLOCK.contactRadius).toBe(20);
  });

  it('kural 6: toplanma menzili 160, yola yapışma 40', () => {
    expect(BLOCK.rallyRange).toBe(160);
    expect(BLOCK.pathSnapMax).toBe(40);
  });

  it('temas yarıçapı aggro yarıçapından küçük — yoksa kilitlenme anında olur', () => {
    expect(BLOCK.contactRadius).toBeLessThan(BLOCK.aggroRadius);
  });
});

describe('S66 — düşmanın askere hasarı türetildi, uydurulmadı', () => {
  it('K = 45 HP / 8 sn / 1 puan', () => {
    expect(MELEE_DPS_PER_POINT).toBeCloseTo(5.625, 6);
  });

  it('türetmenin dayanağı: T1 askeri Goblin karşısında TAM bir diriliş döngüsü dayanıyor', () => {
    const t1 = barracksTierAt(KISLA, 0);
    const dayanma = t1.soldierHp / meleeDps(GOBLIN);
    expect(dayanma).toBeCloseTo(t1.respawnSeconds, 6);
  });

  it('Trol T1 askerini 1 sn, Paladin’i ~3,1 sn’de öldürüyor', () => {
    expect(barracksTierAt(KISLA, 0).soldierHp / meleeDps(TROL)).toBeCloseTo(1.0, 3);
    expect(barracksTierAt(KISLA, 2).soldierHp / meleeDps(TROL)).toBeCloseTo(3.111, 2);
  });

  it('hasar puanla ORANTILI — §5 zaten puanı tehdit ölçeği olarak kullanıyor', () => {
    for (const e of ENEMIES) {
      expect(meleeDps(e)).toBeCloseTo(e.points * MELEE_DPS_PER_POINT, 9);
    }
  });

  it('puanı 0 olan (örümcek yavrusu) askere hasar vermiyor', () => {
    const yavru = ENEMIES.find((e) => e.id === 'orumcekYavrusu');
    expect(yavru).toBeDefined();
    expect(meleeDps(yavru!)).toBe(0);
  });

  it('boss formüle GİRMİYOR — kural 9 onu tek vuruşla ayrı tutuyor', () => {
    // Formül boss için bir sayı üretiyor ama BarracksSystem onu kullanmıyor.
    // Bu test yalnız formülün boss’a özel bir dal İÇERMEDİĞİNİ sabitliyor;
    // istisna sistemde, veride değil.
    expect(meleeDps(OGRE_SEF)).toBeCloseTo(140.625, 3);
  });
});

describe('S68 — asker hızı', () => {
  it('en yavaş düşmandan hızlı, en hızlısından yavaş', () => {
    const hizlar = ENEMIES.map((e) => e.speed);
    expect(SOLDIER_SPEED).toBeGreaterThan(Math.min(...hizlar));
    expect(SOLDIER_SPEED).toBeLessThan(Math.max(...hizlar));
  });
});
