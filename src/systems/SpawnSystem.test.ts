import { describe, it, expect, vi } from 'vitest';
import { SpawnSystem } from './SpawnSystem';
import { PathSystem } from './PathSystem';
import { PathMover, resetEnemyState } from './movers';
import { EventBus } from './EventBus';
import { Pool } from '../util/pool';
import type { EnemyDef, Mover, SpawnableEnemy } from '../types/enemy';
import { GOBLIN } from '../data/enemies';
import type { Poolable } from '../util/pool';
import type { Vec2 } from '../types/common';

const YOL: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 600, y: 0 },
];

/**
 * `Enemy` yerine geçen düz nesne — `SpawnSystem` sınıfı değil şekli tanıyor.
 * `entities/Enemy.ts` `node` ortamında import edilemez (Phaser `window` arar).
 */
class SahteDusman implements SpawnableEnemy, Poolable {
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  speed = 0;
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
  }

  step(scaledDelta: number): void {
    this.mover?.step(this, scaledDelta);
  }

  reachedEnd(): boolean {
    return this.mover !== null && this.mover.reachedEnd(this);
  }

  resetForPool(): void {
    resetEnemyState(this);
    this.mover = null;
  }
}

/** Hız artık `EnemyDef`'ten geliyor; test senaryosu için türev tanım. */
function hizli(speed: number): EnemyDef {
  return { ...GOBLIN, speed };
}

function kur(
  prealloc = 10,
  ozel: Partial<{
    speed: number;
    hpMultiplier: number;
    intervalSeconds: number;
    startingLives: number;
  }> = {},
) {
  const pool = new Pool<SahteDusman>(() => new SahteDusman(), prealloc);
  const mover = new PathMover(new PathSystem(YOL));
  const bus = new EventBus();
  const sys = new SpawnSystem(pool, mover, bus, {
    def: ozel.speed === undefined ? GOBLIN : hizli(ozel.speed),
    hpMultiplier: ozel.hpMultiplier ?? 1,
    intervalSeconds: ozel.intervalSeconds ?? 1,
    startingLives: ozel.startingLives ?? 20,
  });
  return { pool, mover, bus, sys };
}

describe('SpawnSystem — doğurma', () => {
  it('aralık dolunca bir düşman doğuyor', () => {
    const { pool, sys } = kur();
    sys.update(500);
    expect(pool.activeCount).toBe(0);
    sys.update(500); // toplam 1 sn
    expect(pool.activeCount).toBe(1);
  });

  it('doğan düşman EnemyDef değerleriyle ve yolun BAŞINDA başlıyor', () => {
    const { pool, sys, mover } = kur();
    sys.update(1000);
    const d = pool.activeItems()[0]!;
    expect(d.def).toBe(GOBLIN);
    expect(d.hp).toBe(GOBLIN.hp);
    expect(d.maxHp).toBe(GOBLIN.hp);
    expect(d.speed).toBe(GOBLIN.speed);
    expect(d.alive).toBe(true);
    expect(d.blockedBy).toBeNull();
    expect(mover.remainingDistance(d)).toBe(600);
  });

  it('harita HP çarpanı uygulanıyor, hıza dokunulmuyor', () => {
    // GAME-DESIGN §9: harita 2 çarpanı 1.6. Hız ölçeklenmez.
    const { pool, sys } = kur(10, { hpMultiplier: 1.6 });
    sys.update(1000);
    const d = pool.activeItems()[0]!;
    expect(d.hp).toBeCloseTo(GOBLIN.hp * 1.6, 10);
    expect(d.maxHp).toBeCloseTo(GOBLIN.hp * 1.6, 10);
    expect(d.speed).toBe(GOBLIN.speed);
  });

  it('tek karede birden çok doğum sırası gelirse HEPSİ doğuyor', () => {
    // 2× hızda ve düşük FPS'te olan şey. `if` kullanılsaydı fazlalık
    // sessizce yutulur ve M3'te dalga bütçesi eksik doğardı.
    const { pool, sys } = kur();
    sys.update(3500); // 3,5 sn = 3 doğum
    expect(pool.activeCount).toBe(3);
  });

  it('artan süre taşınıyor — doğum hızı kaymıyor', () => {
    const { pool, sys } = kur();
    for (let i = 0; i < 100; i++) sys.update(100); // 10 sn, 100 ms'lik kareler
    expect(pool.activeCount).toBe(10);
  });

  it('havuz dolunca doğurmuyor — sessizce büyümüyor', () => {
    const { pool, sys } = kur(3);
    sys.update(10_000);
    expect(pool.activeCount).toBe(3);
    expect(pool.capacity).toBe(3);
  });

  it('setInterval doğum hızını değiştiriyor', () => {
    const { pool, sys } = kur();
    sys.setInterval(0.25);
    sys.update(1000);
    expect(pool.activeCount).toBe(4);
  });
});

describe('SpawnSystem — kaleye varış ve can', () => {
  it('kaleye varan düşman havuza DÖNÜYOR — sızıntı yok', () => {
    // Yol 600 px, hız 600 px/sn → tam 1 sn'de kaleye varıyor.
    const { pool, sys } = kur(5, { speed: 600, intervalSeconds: 0.5 });

    sys.update(500); // bir doğum
    expect(pool.activeCount).toBe(1);

    sys.setInterval(9999); // yeni doğum olmasın
    for (let i = 0; i < 20; i++) sys.update(100); // 2 sn ilerle

    expect(pool.activeCount).toBe(0);
    expect(pool.freeCount).toBe(5);
    expect(pool.capacity).toBe(5);
  });

  it('doğum karesinde düşman hareket etmiyor', () => {
    // Ters sıra (önce doğur, sonra ilerlet) düşmanı doğar doğmaz bir kare
    // boyu ileri fırlatırdı; 2× hızda bu 2 kare demek.
    const { pool, sys, mover } = kur(5, { speed: 600, intervalSeconds: 0.5 });
    sys.update(500);
    expect(mover.remainingDistance(pool.activeItems()[0]!)).toBe(600);
  });

  it('uzun koşuda activeCount sürekli artmıyor — havuz sızıntısı testi', () => {
    const { pool, sys } = kur(60, { speed: 600, intervalSeconds: 0.2 });
    for (let i = 0; i < 3000; i++) sys.update(16.67); // ~50 sn
    // 50 sn / 0,2 sn = 250 doğum; yol 600 px / 600 px/sn = 1 sn'de bitiyor.
    // Sızıntı olsaydı havuz çoktan dolar ve activeCount 60'ta çakılırdı.
    expect(pool.activeCount).toBeLessThan(10);
    expect(pool.capacity).toBe(60);
  });

  it('kaleye varan can götürüyor ve life:lost yayıyor', () => {
    const { sys, bus } = kur(5, { speed: 600, intervalSeconds: 0.2 });
    const dinleyici = vi.fn();
    bus.on('life:lost', dinleyici);

    for (let i = 0; i < 200; i++) sys.update(16.67);

    expect(dinleyici).toHaveBeenCalled();
    expect(dinleyici.mock.calls[0]?.[0]).toEqual({ remaining: 19 });
    expect(sys.lives).toBe(20 - dinleyici.mock.calls.length);
  });

  it('can 0 altına inmiyor ve 0 olunca doğurma duruyor', () => {
    const { pool, sys, bus } = kur(60, { speed: 6000, intervalSeconds: 0.05, startingLives: 3 });
    const dinleyici = vi.fn();
    bus.on('life:lost', dinleyici);

    for (let i = 0; i < 2000; i++) sys.update(16.67);

    expect(sys.lives).toBe(0);
    expect(dinleyici).toHaveBeenCalledTimes(3);
    expect(pool.activeCount).toBe(0);
  });

  it('engellenen düşman kaleye varmıyor — can gitmiyor', () => {
    const { pool, sys, bus } = kur(5, { speed: 600, intervalSeconds: 0.2 });
    const dinleyici = vi.fn();
    bus.on('life:lost', dinleyici);

    sys.update(300); // bir düşman doğsun
    for (const d of pool.activeItems()) d.blockedBy = { asker: true };

    for (let i = 0; i < 100; i++) {
      sys.update(16.67);
      for (const d of pool.activeItems()) d.blockedBy = { asker: true };
    }
    expect(dinleyici).not.toHaveBeenCalled();
  });
});
