import { describe, it, expect, vi } from 'vitest';
import { TowerSystem, currentTier } from './TowerSystem';
import { EventBus } from './EventBus';
import { OKCU, TOP } from '../data/towers';
import { GOBLIN } from '../data/enemies';
import type { Targetable } from '../types/enemy';
import type { TowerDef, TowerRuntime } from '../types/tower';

function kule(o: Partial<TowerRuntime> = {}): TowerRuntime {
  return {
    spotIndex: 0,
    x: 0,
    y: 0,
    def: OKCU,
    tierIndex: 0,
    targetMode: 'first',
    cooldownLeft: 0,
    target: null,
    ...o,
  };
}

/**
 * Testlerde düşman **yerinde** değişiyor — kopya değil.
 * Gerçekte de öyle: havuzdaki nesne ölüyor, yerine yenisi geçmiyor.
 * Kopya kullanılırsa kule hâlâ eski nesneyi işaret eder ve test yanlış
 * şeyi ölçer (ilk yazımda tam olarak bu oldu).
 */
type MutTargetable = { -readonly [K in keyof Targetable]: Targetable[K] };

let sayac = 0;
function dusman(o: Partial<Targetable> = {}): MutTargetable {
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

/** 60 FPS'lik kareler halinde `saniye` kadar ilerlet. */
function kosut(sys: TowerSystem, dusmanlar: readonly Targetable[], saniye: number): void {
  const kare = 1000 / 60;
  for (let i = 0; i < Math.round((saniye * 1000) / kare); i++) sys.update(kare, dusmanlar);
}

describe('TowerSystem — yerleştirme', () => {
  it('eklenen kule listede', () => {
    const sys = new TowerSystem(() => {});
    const t = kule();
    sys.add(t);
    expect(sys.towers).toEqual([t]);
  });

  it('tower:placed yayılıyor', () => {
    const bus = new EventBus();
    const dinleyici = vi.fn();
    bus.on('tower:placed', dinleyici);
    new TowerSystem(() => {}, bus).add(kule({ spotIndex: 5 }));
    expect(dinleyici).toHaveBeenCalledWith({ spotIndex: 5 });
  });

  it('remove kuleyi çıkarıyor', () => {
    const sys = new TowerSystem(() => {});
    sys.add(kule({ spotIndex: 1 }));
    sys.add(kule({ spotIndex: 2 }));
    sys.remove(1);
    expect(sys.towers.map((t) => t.spotIndex)).toEqual([2]);
  });

  it('currentTier tierIndex\'e göre doğru satırı veriyor', () => {
    expect(currentTier(kule({ tierIndex: 0 }))).toBe(OKCU.tiers[0]);
    expect(currentTier(kule({ tierIndex: 1 }))).toBe(OKCU.tiers[1]);
  });
});

describe('TowerSystem — ateş döngüsü', () => {
  it('bekleme dolmadan ateş etmiyor', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    sys.add(kule({ cooldownLeft: 1 })); // 1 sn bekleme
    const d = [dusman()];

    kosut(sys, d, 0.5);
    expect(ates).not.toHaveBeenCalled();
    kosut(sys, d, 0.6);
    expect(ates).toHaveBeenCalledTimes(1);
  });

  it('atış hızı gerçekten fireRate — 10 saniyede 11 atış (Okçu T1)', () => {
    // Okçu T1 fireRate 1.1 → 10 sn'de 11 atış. İlk atış t=0'da.
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    sys.add(kule());
    kosut(sys, [dusman()], 10);
    expect(ates.mock.calls.length).toBeGreaterThanOrEqual(11);
    expect(ates.mock.calls.length).toBeLessThanOrEqual(12);
  });

  it('Top T1 daha yavaş — 10 saniyede 5-6 atış', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    // Top menzili 140; düşman 10 px'te, içeride. Uçmayan goblin.
    sys.add(kule({ def: TOP }));
    kosut(sys, [dusman()], 10);
    expect(ates.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(ates.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('2× hızda iki katı atış — scaledDelta üzerinden', () => {
    const a = vi.fn();
    const b = vi.fn();
    const s1 = new TowerSystem(a);
    const s2 = new TowerSystem(b);
    s1.add(kule());
    s2.add(kule());
    const d = [dusman()];

    for (let i = 0; i < 600; i++) s1.update(1000 / 60, d); // 10 sn, 1×
    for (let i = 0; i < 600; i++) s2.update((1000 / 60) * 2, d); // 10 sn, 2×

    expect(b.mock.calls.length).toBeGreaterThan(1.8 * a.mock.calls.length);
    expect(b.mock.calls.length).toBeLessThan(2.2 * a.mock.calls.length);
  });

  it('bir karede en fazla bir atış — takılma sonrası patlama yok', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    sys.add(kule());
    // Tek karede 10 saniye: 11 atışlık birikim olurdu.
    sys.update(10_000, [dusman()]);
    expect(ates).toHaveBeenCalledTimes(1);
  });

  it('hedef yoksa ateş etmiyor ve bekleme sıfırın altına düşmüyor', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    const t = kule();
    sys.add(t);
    kosut(sys, [], 5);
    expect(ates).not.toHaveBeenCalled();
    expect(t.cooldownLeft).toBeLessThanOrEqual(0);
  });

  it('ateşe hazır DEĞİLKEN hedef aramıyor', () => {
    // TIER 1 kural 9'un ikinci cümlesi. Ölçülebilir hâli: bekleme
    // süresindeyken `target` alanı güncellenmiyor.
    const sys = new TowerSystem(() => {});
    const t = kule({ cooldownLeft: 5 });
    sys.add(t);
    sys.update(1000 / 60, [dusman()]);
    expect(t.target).toBeNull();
  });

  it('menzil dışındaki düşmana ateş etmiyor', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    sys.add(kule());
    kosut(sys, [dusman({ x: 500, y: 0 })], 5);
    expect(ates).not.toHaveBeenCalled();
  });

  it('Top uçana ateş etmiyor — airMultiplier 0', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    sys.add(kule({ def: TOP }));
    const ucan = dusman({ def: { ...GOBLIN, flying: true } });
    kosut(sys, [ucan], 5);
    expect(ates).not.toHaveBeenCalled();
  });

  it('onFire kuleyi, kademeyi ve hedefi veriyor', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    const t = kule();
    const d = dusman();
    sys.add(t);
    sys.update(1000, [d]);
    expect(ates).toHaveBeenCalledWith(t, OKCU.tiers[0], d);
  });

  it('T2 kule T2 satırıyla ateş ediyor', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    sys.add(kule({ tierIndex: 1 }));
    sys.update(1000, [dusman()]);
    expect(ates.mock.calls[0]?.[1]).toBe(OKCU.tiers[1]);
  });
});

describe('TowerSystem — hedef koruma', () => {
  it('geçerli hedef korunuyor, yeniden aranmıyor', () => {
    const sys = new TowerSystem(() => {});
    const t = kule();
    sys.add(t);
    const yakin = dusman({ remainingDistance: 100 });
    const uzak = dusman({ remainingDistance: 900 });

    sys.update(1000, [yakin, uzak]);
    expect(t.target).toBe(yakin);

    // Daha iyi bir hedef listeye girse bile mevcut geçerli hedef korunur.
    const cokYakin = dusman({ remainingDistance: 1 });
    sys.update(1000, [cokYakin, yakin, uzak]);
    expect(t.target).toBe(yakin);
  });

  it('hedef ölünce yeni hedef seçiliyor', () => {
    const sys = new TowerSystem(() => {});
    const t = kule();
    sys.add(t);
    const ilk = dusman({ remainingDistance: 100 });
    const ikinci = dusman({ remainingDistance: 900 });

    sys.update(1000, [ilk, ikinci]);
    expect(t.target).toBe(ilk);

    ilk.alive = false; // yerinde ölüyor
    sys.update(1000, [ilk, ikinci]);
    expect(t.target).toBe(ikinci);
  });

  it('hedef menzilden çıkınca yeni hedef seçiliyor', () => {
    const sys = new TowerSystem(() => {});
    const t = kule();
    sys.add(t);
    const kacan = dusman({ x: 10, remainingDistance: 100 });
    const kalan = dusman({ x: 20, remainingDistance: 900 });

    sys.update(1000, [kacan, kalan]);
    expect(t.target).toBe(kacan);

    kacan.x = 900; // yürüyüp menzilden çıkıyor
    sys.update(1000, [kacan, kalan]);
    expect(t.target).toBe(kalan);
  });

  it('hedefleme modu değişince yeni mod uygulanıyor', () => {
    const sys = new TowerSystem(() => {});
    const t = kule();
    sys.add(t);
    const yakin = dusman({ remainingDistance: 100 });
    const uzak = dusman({ remainingDistance: 900 });

    sys.update(1000, [yakin, uzak]);
    expect(t.target).toBe(yakin);

    t.targetMode = 'last';
    t.target = null; // mod değişimi hedefi düşürür (UI'nin işi)
    sys.update(1000, [yakin, uzak]);
    expect(t.target).toBe(uzak);
  });

  it('varsayılan hedefleme modu first', () => {
    expect(kule().targetMode).toBe('first');
  });
});

describe('TowerSystem — çok kule', () => {
  it('8 kule bağımsız ateş ediyor', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    for (let i = 0; i < 8; i++) sys.add(kule({ spotIndex: i }));
    kosut(sys, [dusman()], 10);
    // 8 kule × ~11 atış
    expect(ates.mock.calls.length).toBeGreaterThanOrEqual(88);
    expect(ates.mock.calls.length).toBeLessThanOrEqual(96);
  });

  it('kuleler aynı hedefe ateş edebiliyor — S24 geçici: sınır yok', () => {
    const ates = vi.fn();
    const sys = new TowerSystem(ates);
    sys.add(kule({ spotIndex: 0 }));
    sys.add(kule({ spotIndex: 1 }));
    const tek = dusman();
    sys.update(1000, [tek]);
    expect(ates).toHaveBeenCalledTimes(2);
    expect(sys.towers.every((t) => t.target === tek)).toBe(true);
  });
});
