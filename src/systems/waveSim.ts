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

import type { EnemyDef, EnemyId, Mover, SpawnableEnemy, Targetable } from '../types/enemy';
import type { MapDef } from '../types/map';
import type { ProjectileState } from '../types/projectile';
import type { ReferenceBoard } from '../types/board';
import type { Wave } from '../types/wave';
import type { Poolable } from '../util/pool';
import { Pool } from '../util/pool';
import { GECICI_MERMI_HIZI, MERMI_ISABET_YARICAPI, POOL_PREALLOC } from '../data/balance';
import { getTower } from '../data/towers';
import { getEnemyForMap } from '../data/enemies';
import { KISLA, barracksTierAt, SOLDIER_SPEED } from '../data/barracks';
import { defaultRally, spawnSoldier, stepSoldiers } from './BarracksSystem';
import type { SoldierState } from '../types/barracks';
import { EconomySystem } from './EconomySystem';
import { EventBus } from './EventBus';
import { PathSystem } from './PathSystem';
import { LineMover, PathMover, resetEnemyState } from './movers';
import { ProjectileSystem } from './ProjectileSystem';
import { TowerSystem } from './TowerSystem';
import { WaveManager } from './WaveManager';
import type { TowerEffect } from '../types/tower';

export interface SimResult {
  /** Kaleye ulaşan düşmanların **kalan** HP toplamı. Birim: HP. */
  readonly leakedHp: number;
  readonly leakedCount: number;
  /** **Ölçüldü**, tanımlanmadı. Birim: saniye. */
  readonly durationSec: number;
  readonly killedCount: number;
  /** Aynı anda ekranda görülen en yüksek düşman sayısı. */
  readonly peakEnemies: number;
  /**
   * **Hangi düşman** sızdı — tip başına adet.
   *
   * Toplam sayı "dalga sızdırdı" diyor ama *neyin* sızdığını söylemiyor.
   * Denge kararı için gereken bilgi bu: Trol mü sızıyor yoksa yanındaki
   * goblinler mi? İkisi tamamen farklı iki düzeltme gerektiriyor.
   */
  readonly leakedByEnemy: Readonly<Partial<Record<EnemyId, number>>>;
}

/** Sahnesiz düşman. `Enemy`'nin Phaser'sız ikizi. */
class SimEnemy implements SpawnableEnemy, Poolable, Targetable {
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
  speedFactor = 1;
  splashRadius = 0;
  hitRadius = 0;
  effect: TowerEffect | undefined = undefined;
  alive = false;
  lastKnownX = 0;
  lastKnownY = 0;

  resetForPool(): void {
    this.target = null;
    this.damage = 0;
    this.speed = 0;
    this.splashRadius = 0;
    this.hitRadius = 0;
    this.effect = undefined;
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
  // Birden fazla giriş olabilir (harita 2/3) — her yol/uçan hattı kendi
  // hareketini alır, `WaveGroup.spawnPoint` hangisini seçeceğini söylüyor.
  // Gerçek oyunla (`GameScene.ts`) aynı seçim mantığı: tek yol kullanmak
  // ikinci girişin kulelerini hiç sınamadan bırakırdı.
  const groundMovers: Mover[] = map.paths.map((p) => new PathMover(new PathSystem(p)));
  const flyerMovers: Mover[] = map.flyerPaths.map((p) => new LineMover(p));
  const moverFor = (def: EnemyDef, spawnPoint: number): Mover => {
    const havuz = def.flying ? flyerMovers : groundMovers;
    // Son çare: harita bozuksa (paths boş) bile bir Mover döner —
    // `map.paths[0] ?? []` yerine doğrudan boş yol, aynı zararsız kalıyor.
    return havuz[spawnPoint] ?? havuz[0] ?? groundMovers[0] ?? new PathMover(new PathSystem([]));
  };

  let leakedHp = 0;
  let leakedCount = 0;
  const leakedByEnemy: Partial<Record<EnemyId, number>> = {};
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
      effect: tier.effect,
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
      targetMode: bt.targetMode ?? 'first',
      cooldownLeft: 0,
      target: null,
    });
  }

  const wm = new WaveManager(
    enemyPool,
    moverFor,
    bus,
    eco,
    [wave],
    map.hpMultiplier,
    (id) => getEnemyForMap(id, map),
    (e) => {
      leakedHp += Math.max(0, e.hp);
      leakedCount++;
      const id = e.def?.id;
      if (id !== undefined) leakedByEnemy[id] = (leakedByEnemy[id] ?? 0) + 1;
    },
  );
  // --- Kışlalar (M5'ten taşınan borç) -------------------------------------
  //
  // Kışla `TowerSystem`'e girmiyor; askerleri ayrı bir listede yaşıyor ve
  // `BarracksSystem.stepSoldiers` ile ilerliyor. O fonksiyon zaten
  // Phaser'sız (TIER 1 kural 11), yani burada yeni mantık değil **kablolama**
  // var — dokuz engelleme kuralı canlı oyunla **aynı** koddan geliyor.
  interface SimKisla {
    readonly soldiers: SoldierState[];
    readonly respawnSeconds: number;
  }
  const kislalar: SimKisla[] = [];
  for (const bb of board.barracks ?? []) {
    const spot = map.buildSpots[bb.spotIndex];
    if (spot === undefined) continue;
    const kademe = barracksTierAt(KISLA, bb.tier);
    // Toplanma noktası: yola en yakın nokta. Kışlanın üstü **olamaz** —
    // yapı noktaları yoldan `pathSnapMax`'ten uzak (M5-SONUC §5).
    // `Y13`: bütün yollara bakılıyor — gerçek oyunla (`GameScene.ts`)
    // aynı fonksiyon, aynı imza. Eskiden yalnız `paths[0]`'a bakılıyordu,
    // yani harita 2/3'te kışla simülasyonu gerçek oyundan sessizce
    // ayrışıyordu ve buradan çıkan denge sayıları kışlası bozuk bir
    // oyunda ölçülmüştü.
    const rally = defaultRally(spot, map.paths);
    const askerler: SoldierState[] = [];
    for (let i = 0; i < kademe.soldierCount; i++) {
      const s: SoldierState = {
        x: 0,
        y: 0,
        hp: 0,
        maxHp: 0,
        dps: 0,
        engagedWith: null,
        home: { x: 0, y: 0 },
        rally: { x: 0, y: 0 },
        state: 'dead',
        respawnLeft: 0,
        shield: 0,
        evasion: 0,
        lifetimeLeft: Number.POSITIVE_INFINITY,
        speed: SOLDIER_SPEED,
        alive: false,
      };
      const yayilma = (i - (kademe.soldierCount - 1) / 2) * 14;
      spawnSoldier(s, spot, { x: rally.x + yayilma, y: rally.y }, {
        hp: kademe.soldierHp,
        dps: kademe.soldierDps,
        evasion: kademe.evasion ?? 0,
        speed: SOLDIER_SPEED,
      });
      askerler.push(s);
    }
    kislalar.push({ soldiers: askerler, respawnSeconds: kademe.respawnSeconds });
  }

  // Hazırlık aşamasını atla — ölçülen şey dalganın kendisi.
  wm.startWaveEarly();

  let adim = 0;
  while (!wm.isComplete && adim < MAX_STEPS) {
    wm.update(stepMs);
    const dusmanlar = enemyPool.activeItems();
    if (dusmanlar.length > peakEnemies) peakEnemies = dusmanlar.length;
    // Kışla kulelerden **önce**: engellenen düşman aynı adımda duruyor,
    // yani kule ona ateş ederken doğru konumda oluyor (canlı oyunla
    // aynı sıra — `GameScene.update`).
    for (const k of kislalar) stepSoldiers(k.soldiers, dusmanlar, stepMs, k.respawnSeconds);
    // Askerlerin öldürdüğü düşmanların muhasebesi: `stepSoldiers` yalnız
    // `hp` düşürüyor, ölüm defterini tutmak çağıranın işi (canlı oyunda da
    // öyle — `GameScene.#hasarUygula`).
    if (kislalar.length > 0) {
      for (const e of dusmanlar) {
        if (e.alive && e.hp <= 0) {
          e.alive = false;
          killedCount++;
          enemyPool.release(e);
        }
      }
    }
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
    leakedByEnemy,
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
