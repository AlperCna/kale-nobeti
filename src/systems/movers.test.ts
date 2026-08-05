import { describe, it, expect } from 'vitest';
import { PathSystem } from './PathSystem';
import { PathMover, resetEnemyState } from './movers';
import type { EnemyState } from '../types/enemy';
import { GOBLIN } from '../data/enemies';
import type { Vec2 } from '../types/common';

const YOL: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
];

function sys(): PathSystem {
  return new PathSystem(YOL);
}

/** `Enemy` sınıfı olmadan `EnemyState` — Mover'lar şekli tanır, sınıfı değil. */
function dusman(mover: PathMover, ozel: Partial<EnemyState> = {}): EnemyState {
  return {
    def: GOBLIN,
    hp: 100,
    maxHp: 100,
    speed: 60,
    speedFactor: 1,
    progress: mover.spawnProgress(),
    blockedBy: null,
    alive: true,
    ...ozel,
  };
}

describe('PathMover', () => {
  it('bir saniyede hız kadar px ilerliyor', () => {
    const m = new PathMover(sys());
    const e = dusman(m); // 60 px/sn
    m.step(e, 1000); // 1 sn
    expect(m.positionAt(e).x).toBeCloseTo(60, 6);
    expect(m.remainingDistance(e)).toBeCloseTo(940, 6);
  });

  it('2× hız gerçekten iki katı ilerletiyor — scaledDelta üzerinden', () => {
    // TIER 1 kural 8'in gözlemlenebilir sonucu: mover'da hız çarpanı YOK,
    // fark tamamen GameClock'un verdiği scaledDelta'dan geliyor.
    const m = new PathMover(sys());
    const bir = dusman(m);
    const iki = dusman(m);
    m.step(bir, 16.67 * 1); // 1×
    m.step(iki, 16.67 * 2); // 2×
    expect(m.remainingDistance(bir) - m.remainingDistance(iki)).toBeCloseTo(
      1000 - m.remainingDistance(bir),
      6,
    );
  });

  it('60 kare × 16,67 ms ≈ 1 saniyelik yol', () => {
    const m = new PathMover(sys());
    const e = dusman(m);
    for (let i = 0; i < 60; i++) m.step(e, 1000 / 60);
    expect(m.positionAt(e).x).toBeCloseTo(60, 4);
  });

  it('blockedBy null değilse ilerleme DURUYOR — DEPENDENCIES §7', () => {
    const m = new PathMover(sys());
    const e = dusman(m);
    m.step(e, 1000);
    const durduguYer = m.remainingDistance(e);

    e.blockedBy = { asker: true };
    for (let i = 0; i < 100; i++) m.step(e, 1000);
    expect(m.remainingDistance(e)).toBe(durduguYer);

    e.blockedBy = null;
    m.step(e, 1000);
    expect(m.remainingDistance(e)).toBeLessThan(durduguYer);
  });

  it('ölü düşman ilerlemiyor', () => {
    const m = new PathMover(sys());
    const e = dusman(m, { alive: false });
    m.step(e, 5000);
    expect(m.remainingDistance(e)).toBe(1000);
  });

  it('remainingDistance PathSystem ile tutarlı', () => {
    const s = sys();
    const m = new PathMover(s);
    const e = dusman(m);
    for (let i = 0; i < 37; i++) m.step(e, 33);
    expect(m.remainingDistance(e)).toBe(e.progress.remainingDistance);
    expect(m.positionAt(e)).toEqual(s.positionAt(e.progress));
  });

  it('yol sonunda reachedEnd', () => {
    const m = new PathMover(sys());
    const e = dusman(m, { speed: 1000 });
    expect(m.reachedEnd(e)).toBe(false);
    m.step(e, 1000);
    expect(m.reachedEnd(e)).toBe(true);
    expect(m.positionAt(e)).toEqual({ x: 1000, y: 0 });
  });

  it('spawnProgress her çağrıda yolun başı', () => {
    const m = new PathMover(sys());
    expect(m.spawnProgress()).toEqual({
      segmentIndex: 0,
      tInSegment: 0,
      remainingDistance: 1000,
    });
  });

  it('duvar saati yok — aynı adımlar aynı sonucu veriyor', () => {
    const m = new PathMover(sys());
    const a = dusman(m);
    const b = dusman(m);
    for (let i = 0; i < 50; i++) m.step(a, 16.67);
    for (let i = 0; i < 50; i++) m.step(b, 16.67);
    expect(m.remainingDistance(a)).toBe(m.remainingDistance(b));
  });
});

describe('resetEnemyState', () => {
  it('TÜM mantıksal durumu sıfırlıyor — TIER 1 kural 3', () => {
    const m = new PathMover(sys());
    const e = dusman(m, { hp: 42, maxHp: 99, speed: 110 });
    m.step(e, 3000);
    e.blockedBy = { asker: true }; // ölü düşmanı canlı askere kilitler

    resetEnemyState(e);

    expect(e.hp).toBe(0);
    expect(e.maxHp).toBe(0);
    expect(e.speed).toBe(0);
    expect(e.blockedBy).toBeNull();
    expect(e.alive).toBe(false);
    expect(e.progress).toEqual({ segmentIndex: 0, tInSegment: 0, remainingDistance: 0 });
  });

  it('sıfırlanan düşman kalenin dibinde doğmuyor', () => {
    // progress sıfırlanmazsa yeniden kullanılan nesne yolun sonunda başlar
    // ve anında can götürür — bu testin varlık sebebi o.
    const m = new PathMover(sys());
    const e = dusman(m, { speed: 5000 });
    m.step(e, 1000);
    expect(m.reachedEnd(e)).toBe(true);

    resetEnemyState(e);
    e.progress = m.spawnProgress();
    e.alive = true;
    expect(m.reachedEnd(e)).toBe(false);
    expect(m.remainingDistance(e)).toBe(1000);
  });

  it('EnemyState şeklindeki her nesnede çalışıyor', () => {
    const dz: EnemyState = {
      def: GOBLIN,
      hp: 1,
      maxHp: 1,
      speed: 1,
      speedFactor: 1,
      progress: { segmentIndex: 3, tInSegment: 0.7, remainingDistance: 12 },
      blockedBy: {},
      alive: true,
    };
    expect(() => resetEnemyState(dz)).not.toThrow();
    expect(dz.blockedBy).toBeNull();
  });
});
