/**
 * Hareket stratejileri.
 *
 * Plan `entities/movers.ts` diyordu; dosya `systems/` altına alındı çünkü
 * `Enemy` bir `Phaser.GameObjects` alt sınıfı ve `entities/` içinde
 * çalışma zamanında Phaser var. Hareket mantığı orada kalsaydı tek bir
 * hareket testi bile Phaser dünyası ayağa kaldırmak zorunda kalırdı
 * (TIER 1 kural 11 gerekçesi). `systems/` altında bekçi de denetliyor.
 *
 * TIER 1 kural 8: `scaledDelta` dışında zaman kaynağı yok.
 */

import type { Vec2 } from '../types/common';
import type { EnemyState, Mover } from '../types/enemy';
import type { PathProgress } from '../types/path';
import { PathSystem } from './PathSystem';

/** ms → sn. `speed` px/sn, `scaledDelta` ms. */
const MS_TO_S = 1 / 1000;

/** Yolu takip eden düşmanlar. Uçanlar M4'te `LineMover` alacak. */
export class PathMover implements Mover {
  constructor(private readonly path: PathSystem) {}

  step(e: EnemyState, scaledDelta: number): void {
    if (!e.alive) return;
    // Engellenmiş düşman ilerlemez — DEPENDENCIES §7, kullanımı M5'te.
    if (e.blockedBy !== null) return;
    e.progress = this.path.advance(e.progress, e.speed * scaledDelta * MS_TO_S);
  }

  remainingDistance(e: EnemyState): number {
    return e.progress.remainingDistance;
  }

  positionAt(e: EnemyState): Vec2 {
    return this.path.positionAt(e.progress);
  }

  reachedEnd(e: EnemyState): boolean {
    return this.path.reachedEnd(e.progress);
  }

  spawnProgress(): PathProgress {
    return this.path.start();
  }
}

/**
 * Havuza dönen düşmanın mantıksal durumunu sıfırlar (TIER 1 kural 3).
 *
 * `Enemy.resetForPool` bunu çağırıp üstüne görsel durumu (tint, alpha,
 * ölçek, tween) temizler. Mantık kısmı burada, çünkü sıfırlamanın **test
 * edilebilir** olması gereken kısmı bu: sıfırlanmayan `blockedBy` ölü
 * düşmanı canlı askere kilitler, sıfırlanmayan `progress` yeni düşmanı
 * kalenin dibinde doğurur.
 */
export function resetEnemyState(e: EnemyState): void {
  e.hp = 0;
  e.maxHp = 0;
  e.speed = 0;
  e.blockedBy = null;
  e.alive = false;
  e.progress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
}
