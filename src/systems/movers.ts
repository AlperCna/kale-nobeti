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
 * **Uçan düşmanlar** — `flyerPaths` üstünde düz gider (`GAME-DESIGN.md` §5).
 *
 * `Mover` arayüzünü uyguluyor, yani **`Enemy` sınıfı hiç değişmedi.**
 * `DEPENDENCIES.md` §2'nin hareket stratejisini M1'de ayırmasının sebebi
 * tam olarak buydu: uçan desteği için `Enemy`'ye `if (flying)` dalı
 * eklemek gerekseydi entity yarılırdı.
 *
 * Uçan **engellenemez** — `blockedBy` burada hiç okunmuyor (§5).
 */
export class LineMover implements Mover {
  private readonly path: PathSystem;

  constructor(line: readonly Vec2[]) {
    // Uçan hattı da bir waypoint dizisi; tek fark yolu değil havayı izlemesi.
    // Aynı `PathSystem`i kullanmak `remainingDistance` semantiğini de
    // ortaklaştırıyor — `first`/`last` hedeflemesi ikisinde de aynı anlama
    // geliyor (kaleye kalan mesafe).
    this.path = new PathSystem(line);
  }

  step(e: EnemyState, scaledDelta: number): void {
    if (!e.alive) return;
    // `blockedBy` KONTROL EDİLMİYOR: uçan engellenemez (§5).
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
  e.def = null;
  e.hp = 0;
  e.maxHp = 0;
  e.speed = 0;
  e.blockedBy = null;
  e.alive = false;
  e.progress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
}
