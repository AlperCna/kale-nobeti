/**
 * **Kısıt B — başsız dalga simülasyonu.** `M3-T09`.
 *
 * ## Neden formül değil simülasyon
 *
 * Kısıt B'nin iki girdisi — `dalgaSüresi` ve `aktiflikOranı` — statik
 * veriden **hesaplanamaz.** İkisi de dalganın nasıl aktığına bağlı: kuleler
 * ne zaman hedef buldu, düşmanlar ne zaman öldü, kalan sürede kim
 * menzildeydi. Bunlara tanım uydurmak, uydurulmuş bir sayıyla testi yeşile
 * boyamak olurdu (S26, S27 bu yüzden **düştü**).
 *
 * Kısıt A statik kalabiliyor çünkü tek düşman için `kapsama / hız` yeterli
 * ve sonuç yerleşimden bağımsız (`research/01` §2). Kısıt B için değil.
 *
 * **Doğru çözüm: dalgayı gerçekten çalıştır ve sızan HP'yi ölç.**
 * Odaklanma kaybı (`× 0.75`, `research/01` §10) da doğal olarak ortaya
 * çıkıyor — çarpan gerekmiyor, kuleler zaten aynı hedefe ateş ediyor.
 *
 * TIER 1 kural 11: sahne yok, render yok, Phaser yok. `node`'da koşuyor.
 * TIER 1 kural 8: zaman tek kaynaktan — sabit `stepMs`.
 */

import type { EnemyDef, Mover, SpawnableEnemy, Targetable } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { ProjectileState } from '../types/projectile';
import type { ReferenceBoard } from '../types/board';
import type { Wave } from '../types/wave';
import type { Poolable } from '../util/pool';
import { Pool } from '../util/pool';
import { GECICI_MERMI_HIZI, MERMI_ISABET_YARICAPI, POOL_PREALLOC } from '../data/balance';
import { getTower } from '../data/towers';
import { EconomySystem } from './EconomySystem';
import { EventBus } from './EventBus';
import { PathSystem } from './PathSystem';
import { PathMover, resetEnemyState } from './movers';
import { ProjectileSystem } from './ProjectileSystem';
import { TowerSystem } from './TowerSystem';
import { WaveManager } from './WaveManager';

export interface SimResult {
  /** Kaleye ulaşan düşmanların **kalan** HP toplamı. Birim: HP. */
  readonly leakedHp: number;
  readonly leakedCount: number;
  /** **Ölçüldü**, tanımlanmadı. Birim: saniye. */
  readonly durationSec: number;
  readonly killedCount: number;
  /** Aynı anda ekranda görülen en yüksek düşman sayısı. */
  readonly peakEnemies: number;
}

/** Sahnesiz düşman. `Enemy`'nin Phaser'sız ikizi. */
class SimEnemy implements SpawnableEnemy, Poolable, Targetable {
  x = 0;
  y = 0;
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  speed = 0;
  progress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
  blockedBy: object | null = null;
  alive = false;
  mover: Mover | null = null;

  get remainingDistance(): number {
    return this.progress.remainingDistance;
  }

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
    if (this.mover === null || !this.alive) return;
    this.mover.step(this, scaledDelta);
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

/** Sahnesiz mermi. */
class SimProjectile implements ProjectileState<SimEnemy>, Poolable {
  x = 0;
  y = 0;
  target: SimEnemy | null = null;
  damage = 0;
  damageType: ProjectileState['damageType'] = 'physical';
  speed = 0;
  splashRadius = 0;
  hitRadius = 0;
  alive = false;
  lastKnownX = 0;
  lastKnownY = 0;

  resetForPool(): void {
    this.target = null;
    this.damage = 0;
    this.speed = 0;
    this.splashRadius = 0;
    this.hitRadius = 0;
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.lastKnownX = 0;
    this.lastKnownY = 0;
  }
}

/** Simülasyonun sonsuza gitmemesi için sert tavan. 300 sn'lik oyun süresi. */
const MAX_STEPS = 20_000;

/**
 * Bir dalgayı referans tahtaya karşı çalıştırır.
 *
 * **Deterministik:** rastgelelik yok, aynı girdi aynı sonucu verir.
 * `waveSim.test.ts` bunu ayrı bir testle bağlıyor.
 */
export function simulateWave(
  wave: Wave,
  board: ReferenceBoard,
  map: MapDef,
  stepMs = 1000 / 60,
): SimResult {
  const bus = new EventBus();
  const eco = new EconomySystem(map, bus);
  const path = new PathSystem(map.paths[0] ?? []);
  const mover = new PathMover(path);

  let leakedHp = 0;
  let leakedCount = 0;
  let killedCount = 0;
  let peakEnemies = 0;

  const enemyPool = new Pool<SimEnemy>(() => new SimEnemy(), POOL_PREALLOC.enemy);
  const projPool = new Pool<SimProjectile>(() => new SimProjectile(), POOL_PREALLOC.projectile);

  const projectiles = new ProjectileSystem<SimEnemy, SimProjectile>(projPool, (e, sonuc) => {
    if (!e.alive) return;
    e.hp -= sonuc.dealt;
    if (e.hp > 0) return;
    e.alive = false;
    killedCount++;
    enemyPool.release(e);
  });

  const towers = new TowerSystem((kule, tier, hedef) => {
    const ucanCarpani = hedef.def?.flying === true ? tier.airMultiplier : 1;
    projectiles.fire({
      x: kule.x,
      y: kule.y,
      target: hedef as SimEnemy,
      damage: tier.damage * ucanCarpani,
      damageType: kule.def.damageType,
      speed: GECICI_MERMI_HIZI,
      splashRadius: tier.splashRadius ?? 0,
      hitRadius: MERMI_ISABET_YARICAPI,
    });
  });

  for (const bt of board.towers) {
    const def = getTower(bt.towerId);
    const spot = map.buildSpots[bt.spotIndex];
    if (def === undefined || spot === undefined) continue;
    towers.add({
      spotIndex: bt.spotIndex,
      x: spot.x,
      y: spot.y,
      def,
      tierIndex: bt.tier,
      targetMode: 'first',
      cooldownLeft: 0,
      target: null,
    });
  }

  const wm = new WaveManager(
    enemyPool,
    mover,
    bus,
    eco,
    [wave],
    map.hpMultiplier,
    (e) => {
      leakedHp += Math.max(0, e.hp);
      leakedCount++;
    },
  );
  // Hazırlık aşamasını atla — ölçülen şey dalganın kendisi.
  wm.startWaveEarly();

  let adim = 0;
  while (!wm.isComplete && adim < MAX_STEPS) {
    wm.update(stepMs);
    const dusmanlar = enemyPool.activeItems();
    if (dusmanlar.length > peakEnemies) peakEnemies = dusmanlar.length;
    towers.update(stepMs, dusmanlar);
    projectiles.update(stepMs, dusmanlar);
    adim++;
  }

  return {
    leakedHp,
    leakedCount,
    durationSec: (adim * stepMs) / 1000,
    killedCount,
    peakEnemies,
  };
}

/** Bir haritanın tüm dalgalarını sırayla simüle eder. */
export function simulateAllWaves(
  waves: readonly Wave[],
  boards: readonly ReferenceBoard[],
  map: MapDef,
  stepMs = 1000 / 60,
): SimResult[] {
  return waves.map((w, i) => simulateWave(w, boards[i] ?? boards[boards.length - 1]!, map, stepMs));
}
