import { describe, it, expect } from 'vitest';
import { selectTarget, isTargetStillValid } from './TargetingSystem';
import type { TargetingTower } from './TargetingSystem';
import type { EnemyDef, Targetable } from '../types/enemy';
import { GOBLIN, ORK_SAVASCI } from '../data/enemies';
import { OKCU, TOP } from '../data/towers';

/** Harpi (`GAME-DESIGN.md` §5) — düşman verisi M4'te gelecek. */
const HARPI: EnemyDef = {
  id: 'harpi',
  hp: 70,
  speed: 75,
  armor: 0,
  magicResist: 0,
  gold: 9,
  points: 3,
  leakDamage: 1,
  flying: true,
};

const KULE: TargetingTower = {
  x: 0,
  y: 0,
  rangeSq: OKCU.tiers[0].range ** 2, // 150² = 22500
  airMultiplier: 1,
};

/** Uçana vuramayan kule — Top T1 (`GAME-DESIGN.md` §4.2). */
const TOP_KULE: TargetingTower = {
  x: 0,
  y: 0,
  rangeSq: TOP.tiers[0].range ** 2,
  airMultiplier: TOP.tiers[0].airMultiplier,
};

let sayac = 0;
function dusman(o: Partial<Targetable> = {}): Targetable {
  sayac++;
  return {
    x: 10,
    y: 0,
    hp: 100,
    maxHp: 100,
    alive: true,
    remainingDistance: 1000 - sayac,
    def: GOBLIN,
    ...o,
  };
}

describe('selectTarget — beş mod', () => {
  it('first: kaleye kalan mesafesi EN AZ olan', () => {
    const uzak = dusman({ remainingDistance: 900 });
    const yakin = dusman({ remainingDistance: 100 });
    const orta = dusman({ remainingDistance: 500 });
    expect(selectTarget('first', [uzak, yakin, orta], KULE)).toBe(yakin);
  });

  it('last: kaleye kalan mesafesi EN ÇOK olan', () => {
    const uzak = dusman({ remainingDistance: 900 });
    const yakin = dusman({ remainingDistance: 100 });
    expect(selectTarget('last', [yakin, uzak], KULE)).toBe(uzak);
  });

  it('strongest: MAKSİMUM HP en yüksek olan', () => {
    const kucuk = dusman({ hp: 100, maxHp: 100 });
    const buyuk = dusman({ hp: 100, maxHp: 400 });
    expect(selectTarget('strongest', [kucuk, buyuk], KULE)).toBe(buyuk);
  });

  it('strongest MEVCUT HP\'ye BAKMIYOR — hedef titremesi önleniyor', () => {
    // §4.5: "strongest mevcut HP'ye bakmaz — bakarsa hedef her karede değişir
    // ve kule dönüş animasyonu titrer." Görevin "bitmedi sayılır" maddesi bu.
    const saglamKucuk = dusman({ hp: 100, maxHp: 100 });
    const yaraliBuyuk = dusman({ hp: 5, maxHp: 400 });
    expect(selectTarget('strongest', [saglamKucuk, yaraliBuyuk], KULE)).toBe(yaraliBuyuk);
  });

  it('weakest: MEVCUT HP en düşük olan — bitirici vuruş', () => {
    const saglam = dusman({ hp: 100, maxHp: 100 });
    const yarali = dusman({ hp: 5, maxHp: 400 });
    expect(selectTarget('weakest', [saglam, yarali], KULE)).toBe(yarali);
  });

  it('closest: kuleye öklit mesafesi en az olan', () => {
    const yakin = dusman({ x: 30, y: 40 }); // 50
    const uzak = dusman({ x: 60, y: 80 }); // 100
    expect(selectTarget('closest', [uzak, yakin], KULE)).toBe(yakin);
  });

  it('closest karesel sıralama gerçek mesafe sıralamasıyla aynı', () => {
    const a = dusman({ x: 100, y: 0 });
    const b = dusman({ x: 0, y: 60 });
    const c = dusman({ x: 40, y: 40 }); // ~56.6
    expect(selectTarget('closest', [a, b, c], KULE)).toBe(c);
  });
});

describe('selectTarget — menzil ve uygunluk', () => {
  it('boş liste → null', () => {
    expect(selectTarget('first', [], KULE)).toBeNull();
  });

  it('hepsi menzil dışı → null', () => {
    const uzak = dusman({ x: 500, y: 500 });
    expect(selectTarget('first', [uzak], KULE)).toBeNull();
  });

  it('menzil sınırında olan DAHİL — distSq <= rangeSq', () => {
    const tam = dusman({ x: 150, y: 0 }); // tam 150
    expect(selectTarget('first', [tam], KULE)).toBe(tam);
  });

  it('menzilin 1 px dışı hariç', () => {
    const disari = dusman({ x: 151, y: 0 });
    expect(selectTarget('first', [disari], KULE)).toBeNull();
  });

  it('ölü düşman aday değil', () => {
    const olu = dusman({ alive: false, remainingDistance: 1 });
    const canli = dusman({ alive: true, remainingDistance: 900 });
    expect(selectTarget('first', [olu, canli], KULE)).toBe(canli);
  });

  it('def null olan (havuzda bekleyen) aday değil', () => {
    const havuzda = dusman({ def: null, remainingDistance: 1 });
    const canli = dusman({ remainingDistance: 900 });
    expect(selectTarget('first', [havuzda, canli], KULE)).toBe(canli);
  });

  it('menzil dışındakiler mod hesabını etkilemiyor', () => {
    // Menzil dışındaki daha "iyi" bir düşman seçimi bozmamalı.
    const disariEnIyi = dusman({ x: 500, y: 0, remainingDistance: 1 });
    const icerideki = dusman({ x: 10, y: 0, remainingDistance: 800 });
    expect(selectTarget('first', [disariEnIyi, icerideki], KULE)).toBe(icerideki);
  });
});

describe('selectTarget — uçan düşman', () => {
  it('airMultiplier 0 olan kule UÇANI eliyor', () => {
    const harpi = dusman({ def: HARPI, remainingDistance: 1 });
    const goblin = dusman({ def: GOBLIN, remainingDistance: 900 });
    expect(selectTarget('first', [harpi, goblin], TOP_KULE)).toBe(goblin);
  });

  it('uçandan başka aday yoksa null — Top harpiye vuramaz', () => {
    const harpi = dusman({ def: HARPI });
    expect(selectTarget('first', [harpi], TOP_KULE)).toBeNull();
  });

  it('airMultiplier 1 olan kule uçanı seçebiliyor', () => {
    const harpi = dusman({ def: HARPI, remainingDistance: 1 });
    const goblin = dusman({ def: GOBLIN, remainingDistance: 900 });
    expect(selectTarget('first', [harpi, goblin], KULE)).toBe(harpi);
  });

  it('airMultiplier 0.5 (Barut Fıçısı) uçanı eliyor DEĞİL', () => {
    const harpi = dusman({ def: HARPI });
    expect(selectTarget('first', [harpi], { ...TOP_KULE, airMultiplier: 0.5 })).toBe(harpi);
  });
});

describe('selectTarget — kararlılık', () => {
  it('eşitlikte hep aynı hedef — rastgelelik yok', () => {
    const a = dusman({ remainingDistance: 500 });
    const b = dusman({ remainingDistance: 500 });
    const liste = [a, b];
    for (let i = 0; i < 20; i++) expect(selectTarget('first', liste, KULE)).toBe(a);
  });

  it('aynı girdi beş modda da kararlı', () => {
    const liste = [dusman(), dusman(), dusman()];
    for (const mod of ['first', 'last', 'strongest', 'weakest', 'closest'] as const) {
      const ilk = selectTarget(mod, liste, KULE);
      expect(selectTarget(mod, liste, KULE)).toBe(ilk);
    }
  });

  it('girdi listesini değiştirmiyor', () => {
    const liste = [dusman(), dusman()];
    const kopya = [...liste];
    selectTarget('weakest', liste, KULE);
    expect(liste).toEqual(kopya);
  });
});

describe('isTargetStillValid', () => {
  it('null → false', () => {
    expect(isTargetStillValid(null, KULE)).toBe(false);
  });

  it('canlı ve menzilde → true', () => {
    expect(isTargetStillValid(dusman({ x: 10, y: 0 }), KULE)).toBe(true);
  });

  it('menzilden çıkınca → false', () => {
    expect(isTargetStillValid(dusman({ x: 300, y: 0 }), KULE)).toBe(false);
  });

  it('ölünce → false — ölü düşmana ateş edilmiyor', () => {
    expect(isTargetStillValid(dusman({ alive: false }), KULE)).toBe(false);
  });

  it('havuza dönünce (def null) → false', () => {
    expect(isTargetStillValid(dusman({ def: null }), KULE)).toBe(false);
  });

  it('Ork Savaşçı normal aday — zırh hedeflemeyi etkilemiyor', () => {
    // Zırh `applyDamage`'ın işi; hedefleme onu görmez.
    expect(isTargetStillValid(dusman({ def: ORK_SAVASCI }), KULE)).toBe(true);
  });
});
