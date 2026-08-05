import { describe, it, expect } from 'vitest';
import { EnemyAbilitySystem } from './EnemyAbilitySystem';
import type { AbilityEnemy } from './EnemyAbilitySystem';
import { PathSystem } from './PathSystem';
import { PathMover, LineMover, resetEnemyState } from './movers';
import { Pool } from '../util/pool';
import type { Poolable } from '../util/pool';
import type { EnemyDef, Mover } from '../types/enemy';
import type { Vec2 } from '../types/common';
import { GOBLIN, SAMAN, TROL, ORUMCEK_ANA, ORUMCEK_YAVRUSU, HARPI, getEnemy } from '../data/enemies';

const YOL: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 2000, y: 0 },
];

class SahteDusman implements AbilityEnemy, Poolable {
  x = 0;
  y = 0;
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  speed = 0;
  speedFactor = 1;
  progress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
  blockedBy: object | null = null;
  alive = false;
  mover: Mover | null = null;

  spawn(mover: Mover, def: EnemyDef, hpMultiplier: number): void {
    const hp = def.hp * hpMultiplier;
    this.mover = mover;
    this.def = def;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = def.speed;
    this.blockedBy = null;
    this.alive = true;
    this.progress = mover.spawnProgress();
    this.#konumla();
  }

  step(scaledDelta: number): void {
    this.mover?.step(this, scaledDelta);
    this.#konumla();
  }

  reachedEnd(): boolean {
    return this.mover !== null && this.mover.reachedEnd(this);
  }

  resetForPool(): void {
    resetEnemyState(this);
    this.mover = null;
    this.x = 0;
    this.y = 0;
  }

  #konumla(): void {
    if (this.mover === null) return;
    const p = this.mover.positionAt(this);
    this.x = p.x;
    this.y = p.y;
  }
}

function kur(prealloc = 20) {
  const pool = new Pool<SahteDusman>(() => new SahteDusman(), prealloc);
  const mover = new PathMover(new PathSystem(YOL));
  const sys = new EnemyAbilitySystem(pool, 1, getEnemy);
  return { pool, mover, sys };
}

function dogur(pool: Pool<SahteDusman>, mover: Mover, def: EnemyDef): SahteDusman {
  const e = pool.acquire()!;
  e.spawn(mover, def, 1);
  return e;
}

/** `saniye` kadar 60 FPS'lik karelerle ilerlet. */
function kosut(sys: EnemyAbilitySystem<SahteDusman>, saniye: number, hiz = 1): void {
  const kare = (1000 / 60) * hiz;
  for (let i = 0; i < Math.round((saniye * 1000) / kare); i++) sys.update(kare);
}

describe('Şaman iyileştirmesi — §5, 8 HP/sn', () => {
  it('yarıçaptaki düşmanı iyileştiriyor', () => {
    const { pool, mover, sys } = kur();
    dogur(pool, mover, SAMAN); // x = 0
    const yarali = dogur(pool, mover, GOBLIN);
    yarali.hp = 10;

    kosut(sys, 1);
    expect(yarali.hp).toBeCloseTo(18, 1); // 10 + 8
  });

  it('yarıçap DIŞINDAKİNİ iyileştirmiyor', () => {
    const { pool, mover, sys } = kur();
    dogur(pool, mover, SAMAN);
    const uzak = dogur(pool, mover, GOBLIN);
    uzak.hp = 10;
    // Yarıçap 90; uzağa taşı.
    uzak.progress = new PathSystem(YOL).advance(uzak.progress, 500);
    uzak.step(0);

    kosut(sys, 2);
    expect(uzak.hp).toBe(10);
  });

  it('iyileştirme MAKSİMUM HP\'yi aşmıyor', () => {
    // "Bitmedi sayılır eğer: iyileştirme maksimum HP'nin üstüne çıkabiliyorsa."
    const { pool, mover, sys } = kur();
    dogur(pool, mover, SAMAN);
    const yarali = dogur(pool, mover, GOBLIN);
    yarali.hp = 40; // maks 45

    kosut(sys, 10);
    expect(yarali.hp).toBe(45);
  });

  it('Şaman KENDİNİ iyileştirmiyor — §5 "yakındaki düşmanlara"', () => {
    const { pool, mover, sys } = kur();
    const saman = dogur(pool, mover, SAMAN);
    saman.hp = 50;
    kosut(sys, 2);
    expect(saman.hp).toBe(50);
  });

  it('iki Şaman birbirini iyileştiriyor', () => {
    const { pool, mover, sys } = kur();
    const a = dogur(pool, mover, SAMAN);
    const b = dogur(pool, mover, SAMAN);
    a.hp = 50;
    b.hp = 50;
    kosut(sys, 1);
    expect(a.hp).toBeCloseTo(58, 1);
    expect(b.hp).toBeCloseTo(58, 1);
  });

  it('ölü düşmanı iyileştirmiyor', () => {
    const { pool, mover, sys } = kur();
    dogur(pool, mover, SAMAN);
    const olu = dogur(pool, mover, GOBLIN);
    olu.hp = 5;
    olu.alive = false;
    kosut(sys, 2);
    expect(olu.hp).toBe(5);
  });

  it('2× hızda iyileştirme de İKİ KAT hızlı', () => {
    const yap = (hiz: number): number => {
      const { pool, mover, sys } = kur();
      dogur(pool, mover, SAMAN);
      const y = dogur(pool, mover, GOBLIN);
      y.hp = 1;
      // Aynı sayıda GERÇEK kare, farklı ölçek.
      for (let i = 0; i < 60; i++) sys.update((1000 / 60) * hiz);
      return y.hp;
    };
    const bir = yap(1); // 1 + 8
    const iki = yap(2); // 1 + 16
    expect(bir).toBeCloseTo(9, 1);
    expect(iki).toBeCloseTo(17, 1);
  });
});

describe('Trol yenilenmesi — §5, 6 HP/sn', () => {
  it('kendini yeniliyor', () => {
    const { pool, mover, sys } = kur();
    const trol = dogur(pool, mover, TROL);
    trol.hp = 100;
    kosut(sys, 1);
    expect(trol.hp).toBeCloseTo(106, 1);
  });

  it('maksimum HP\'yi aşmıyor', () => {
    const { pool, mover, sys } = kur();
    const trol = dogur(pool, mover, TROL);
    trol.hp = 398;
    kosut(sys, 5);
    expect(trol.hp).toBe(400);
  });

  it('harita çarpanıyla ÖLÇEKLENMİYOR (S39)', () => {
    // §5 mutlak bir hız veriyor. Harita 3'te (HP ×2,6) yenilenme oransal
    // olarak zayıflıyor — bilinçli, aksi hâlde HP çarpanının zorluk
    // etkisi yenilenmeyle nötrlenirdi.
    const pool = new Pool<SahteDusman>(() => new SahteDusman(), 10);
    const mover = new PathMover(new PathSystem(YOL));
    const sys = new EnemyAbilitySystem(pool, 2.6, getEnemy); // harita 3 çarpanı

    const trol = pool.acquire()!;
    trol.spawn(mover, TROL, 2.6);
    expect(trol.maxHp).toBe(400 * 2.6);
    trol.hp = 100;

    for (let i = 0; i < 60; i++) sys.update(1000 / 60);
    expect(trol.hp).toBeCloseTo(106, 1); // 6 HP/sn, çarpansız
  });

  it('yeteneksiz düşman yenilenmiyor', () => {
    const { pool, mover, sys } = kur();
    const g = dogur(pool, mover, GOBLIN);
    g.hp = 10;
    kosut(sys, 3);
    expect(g.hp).toBe(10);
  });
});

describe('Örümcek Ana bölünmesi — §5, 3× yavru', () => {
  it('ölünce ÜÇ yavru çıkıyor', () => {
    const { pool, mover, sys } = kur();
    const anne = dogur(pool, mover, ORUMCEK_ANA);
    expect(sys.splitOnDeath(anne)).toBe(3);
    expect(pool.activeCount).toBe(4); // anne + 3 yavru
  });

  it('yavrular annenin YOL İLERLEMESİNDEN devam ediyor', () => {
    const { pool, mover, sys } = kur();
    const anne = dogur(pool, mover, ORUMCEK_ANA);
    for (let i = 0; i < 120; i++) anne.step(1000 / 60); // ilerlesin
    const anneKalan = anne.progress.remainingDistance;

    sys.splitOnDeath(anne);
    const yavrular = pool.activeItems().filter((e) => e.def === ORUMCEK_YAVRUSU);

    expect(yavrular).toHaveLength(3);
    for (const y of yavrular) {
      expect(y.progress.remainingDistance).toBeCloseTo(anneKalan, 6);
    }
  });

  it('yavru §5 değerleriyle doğuyor', () => {
    const { pool, mover, sys } = kur();
    sys.splitOnDeath(dogur(pool, mover, ORUMCEK_ANA));
    const y = pool.activeItems().find((e) => e.def === ORUMCEK_YAVRUSU)!;
    expect(y.hp).toBe(30);
    expect(y.speed).toBe(90);
    expect(y.alive).toBe(true);
  });

  it('havuz doluyken bölünme KISILIYOR, new çağrılmıyor', () => {
    // "Bitmedi sayılır eğer: yavrular new Enemy() ile yaratılıyorsa."
    const { pool, mover, sys } = kur(2); // yalnız 2 yuva
    const anne = dogur(pool, mover, ORUMCEK_ANA); // 1 yuva doldu

    expect(sys.splitOnDeath(anne)).toBe(1); // yalnız 1 yavru sığdı
    expect(pool.capacity).toBe(2); // havuz BÜYÜMEDİ
  });

  it('yavru kendi başına bölünmüyor — sonsuz zincir yok', () => {
    const { pool, mover, sys } = kur();
    sys.splitOnDeath(dogur(pool, mover, ORUMCEK_ANA));
    const y = pool.activeItems().find((e) => e.def === ORUMCEK_YAVRUSU)!;
    expect(sys.splitOnDeath(y)).toBe(0);
  });

  it('bölünme yeteneği olmayan düşman bölünmüyor', () => {
    const { pool, mover, sys } = kur();
    expect(sys.splitOnDeath(dogur(pool, mover, GOBLIN))).toBe(0);
    expect(sys.splitOnDeath(dogur(pool, mover, TROL))).toBe(0);
  });
});

describe('LineMover — uçan hareketi (M4-T05)', () => {
  const HAT: readonly Vec2[] = [
    { x: 0, y: 0 },
    { x: 600, y: 300 },
  ];

  it('düz hat üstünde gidiyor', () => {
    const m = new LineMover(HAT);
    const e = new SahteDusman();
    e.spawn(m, HARPI, 1);

    m.step(e, 1000); // 1 sn, 75 px/sn
    const p = m.positionAt(e);
    // Hat eğimi (600,300) → birim (0.894, 0.447)
    expect(p.x).toBeCloseTo(75 * 0.8944, 1);
    expect(p.y).toBeCloseTo(75 * 0.4472, 1);
  });

  it('uçan ENGELLENEMİYOR — blockedBy okunmuyor (§5)', () => {
    const m = new LineMover(HAT);
    const e = new SahteDusman();
    e.spawn(m, HARPI, 1);
    e.blockedBy = { asker: true };

    const oncesi = m.remainingDistance(e);
    m.step(e, 1000);
    expect(m.remainingDistance(e)).toBeLessThan(oncesi);
  });

  it('hattın sonunda reachedEnd', () => {
    const m = new LineMover(HAT);
    const e = new SahteDusman();
    e.spawn(m, HARPI, 1);
    expect(m.reachedEnd(e)).toBe(false);
    m.step(e, 100_000);
    expect(m.reachedEnd(e)).toBe(true);
  });

  it('Harpi uçuyor ve §5 değerlerinde', () => {
    expect(HARPI.flying).toBe(true);
    expect([HARPI.hp, HARPI.speed, HARPI.gold, HARPI.points]).toEqual([70, 75, 9, 3]);
  });

  it('ölü düşman ilerlemiyor', () => {
    const m = new LineMover(HAT);
    const e = new SahteDusman();
    e.spawn(m, HARPI, 1);
    e.alive = false;
    const oncesi = m.remainingDistance(e);
    m.step(e, 5000);
    expect(m.remainingDistance(e)).toBe(oncesi);
  });
});
