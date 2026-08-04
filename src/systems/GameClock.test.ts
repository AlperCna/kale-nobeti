import { describe, it, expect } from 'vitest';
import { GameClock } from './GameClock';
import type { ClockTarget } from './GameClock';

/**
 * Sahte hedef. `Phaser.Scene`'in `setScale`'e maruz kalan yüzeyini
 * taklit ediyor — gerçek Phaser yüklenmiyor (TIER 1 kural 11, S08).
 */
function sahteHedef(): ClockTarget {
  return {
    tweens: { timeScale: 1 },
    time: { timeScale: 1 },
    anims: { globalTimeScale: 1 },
  };
}

describe('GameClock', () => {
  it('1× hızda scaledDelta ham delta ile aynı', () => {
    const clock = new GameClock();

    clock.tick(16.67);

    expect(clock.scale).toBe(1);
    expect(clock.scaledDelta).toBeCloseTo(16.67, 5);
  });

  it('2× hızda scaledDelta iki katı', () => {
    const clock = new GameClock();

    clock.setScale(2, sahteHedef());
    clock.tick(16.67);

    expect(clock.scale).toBe(2);
    expect(clock.scaledDelta).toBeCloseTo(33.34, 5);
  });

  it('setScale üç Phaser özelliğini de yazar', () => {
    const clock = new GameClock();
    const hedef = sahteHedef();

    clock.setScale(2, hedef);

    // Üçü de yazılmalı. Biri atlanırsa o sistem yanlış hızda çalışır
    // ve bu sessizce olur — bu görevin "bitmedi sayılır eğer" maddesi.
    expect(hedef.tweens.timeScale).toBe(2);
    expect(hedef.time.timeScale).toBe(2);
    expect(hedef.anims.globalTimeScale).toBe(2);
  });

  it('setScale(1) üçünü de 1e döndürür', () => {
    const clock = new GameClock();
    const hedef = sahteHedef();

    clock.setScale(2, hedef);
    clock.setScale(1, hedef);

    expect(clock.scale).toBe(1);
    expect(hedef.tweens.timeScale).toBe(1);
    expect(hedef.time.timeScale).toBe(1);
    expect(hedef.anims.globalTimeScale).toBe(1);
  });

  it('başlangıçta 1× ve scaledDelta sıfır', () => {
    const clock = new GameClock();

    expect(clock.scale).toBe(1);
    expect(clock.scaledDelta).toBe(0);
  });

  it('art arda tick çağrıları son değeri taşır, birikmez', () => {
    const clock = new GameClock();

    clock.tick(16);
    clock.tick(20);

    expect(clock.scaledDelta).toBe(20);
  });
});
