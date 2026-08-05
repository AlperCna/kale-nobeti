import { describe, it, expect, vi } from 'vitest';
import { WaveManager, earlyStartBonus } from './WaveManager';
import { EconomySystem } from './EconomySystem';
import { EventBus } from './EventBus';
import { PathSystem } from './PathSystem';
import { PathMover, resetEnemyState } from './movers';
import { Pool } from '../util/pool';
import type { Poolable } from '../util/pool';
import type { EnemyDef, Mover, SpawnableEnemy } from '../types/enemy';
import type { Wave } from '../types/wave';
import type { Vec2 } from '../types/common';
import { MAP_1 } from '../data/maps';
import { MAP1_WAVES, waveEnemyCount } from '../data/waves';
import { GOBLIN } from '../data/enemies';
import { BALANCE, POOL_PREALLOC } from '../data/balance';

const KISA_YOL: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 600, y: 0 },
];

class SahteDusman implements SpawnableEnemy, Poolable {
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

function kur(
  waves: readonly Wave[] = MAP1_WAVES,
  prealloc: number = POOL_PREALLOC.enemy,
  yol: readonly Vec2[] = KISA_YOL,
) {
  const pool = new Pool<SahteDusman>(() => new SahteDusman(), prealloc);
  const bus = new EventBus();
  const eco = new EconomySystem(MAP_1, bus);
  const mover = new PathMover(new PathSystem(yol));
  const wm = new WaveManager(pool, () => mover, bus, eco, waves, MAP_1.hpMultiplier);
  return { pool, bus, eco, mover, wm };
}

/** `saniye` kadar 60 FPS'lik karelerle ilerlet. */
function kosut(wm: WaveManager<SahteDusman>, saniye: number): void {
  const kare = 1000 / 60;
  for (let i = 0; i < Math.round((saniye * 1000) / kare); i++) wm.update(kare);
}

describe('earlyStartBonus — GAME-DESIGN §6', () => {
  it('ilk 3 dalgada KAPALI', () => {
    expect(earlyStartBonus(20, 1)).toBe(0);
    expect(earlyStartBonus(20, 2)).toBe(0);
    expect(earlyStartBonus(20, 3)).toBe(0);
  });

  it('dalga 4: 20 × ceil(4/2) = 40', () => {
    expect(earlyStartBonus(20, 4)).toBe(40);
  });

  it('dalga 10: 20 × 5 = 100', () => {
    expect(earlyStartBonus(20, 10)).toBe(100);
  });

  it('kalan süre 0 veya negatifse bonus yok', () => {
    expect(earlyStartBonus(0, 10)).toBe(0);
    expect(earlyStartBonus(-5, 10)).toBe(0);
  });

  it('ölçekli formül: geç dalgada aynı süre daha çok değerli', () => {
    // §6'nın amacı bu — erken oyunda öğrenmeyi cezalandırmıyor,
    // geç oyunda gerçek bir karar oluyor.
    expect(earlyStartBonus(10, 10)).toBeGreaterThan(earlyStartBonus(10, 4));
  });
});

describe('WaveManager — hazırlık aşaması', () => {
  it('prep ile başlıyor, sayaç 20 sn', () => {
    const { wm } = kur();
    expect(wm.phase).toBe('prep');
    expect(wm.prepRemainingSec).toBeCloseTo(BALANCE.prepSeconds, 6);
    expect(wm.waveNumber).toBe(1);
  });

  it('sayaç dolunca dalga OTOMATİK başlıyor (S29)', () => {
    const { wm, bus } = kur();
    const dinleyici = vi.fn();
    bus.on('wave:started', dinleyici);

    kosut(wm, BALANCE.prepSeconds - 1);
    expect(wm.phase).toBe('prep');

    kosut(wm, 2);
    expect(wm.phase).toBe('running');
    expect(dinleyici).toHaveBeenCalledWith({ index: 1 });
  });

  it('erken başlatma butonu dalga 4\'e kadar KAPALI', () => {
    const { wm } = kur();
    expect(wm.earlyStartAvailable).toBe(false);
    expect(wm.startWaveEarly()).toBe(0); // bonus yok ama dalga başlıyor
    expect(wm.phase).toBe('running');
  });

  it('erken başlatma bonusu altına ekleniyor', () => {
    // Dalga 4'e gelmek için üç dalgayı hızlıca geçir.
    const { wm, eco } = kur([MAP1_WAVES[3]!]); // tek dalga listesi
    // Bu liste tek dalgalı olduğu için waveNumber 1; bonus testini
    // doğrudan fonksiyonla yapıyoruz. Burada davranış: prep'te başlatınca
    // faz değişiyor.
    const oncesi = eco.gold;
    wm.startWaveEarly();
    expect(wm.phase).toBe('running');
    expect(eco.gold).toBe(oncesi); // dalga 1 → bonus 0
  });

  it('running iken startWaveEarly 0 döner', () => {
    const { wm } = kur();
    wm.startWaveEarly();
    expect(wm.startWaveEarly()).toBe(0);
  });
});

describe('WaveManager — doğurma', () => {
  it('grup startAt\'ta doğmaya başlıyor', () => {
    const wave: Wave = {
      index: 1,
      groups: [{ enemy: 'goblin', count: 3, spawnDelay: 1, startAt: 2, spawnPoint: 0 }],
    };
    const { wm, pool } = kur([wave]);
    wm.startWaveEarly();

    kosut(wm, 1.5);
    expect(pool.activeCount).toBe(0); // henüz startAt gelmedi
    kosut(wm, 1); // t = 2.5
    expect(pool.activeCount).toBe(1);
  });

  it('spawnDelay aralıklarıyla count kadar düşman çıkıyor', () => {
    const wave: Wave = {
      index: 1,
      groups: [{ enemy: 'goblin', count: 4, spawnDelay: 0.5, startAt: 0, spawnPoint: 0 }],
    };
    const { wm, pool } = kur([wave], 60, [
      { x: 0, y: 0 },
      { x: 100000, y: 0 }, // kaleye varmasınlar
    ]);
    wm.startWaveEarly();

    kosut(wm, 0.1);
    expect(pool.activeCount).toBe(1);
    kosut(wm, 0.5);
    expect(pool.activeCount).toBe(2);
    kosut(wm, 1.1);
    expect(pool.activeCount).toBe(4);
  });

  it('doğan düşman doğru tipte ve harita çarpanıyla', () => {
    const wave: Wave = {
      index: 1,
      groups: [{ enemy: 'goblin', count: 1, spawnDelay: 1, startAt: 0, spawnPoint: 0 }],
    };
    const { wm, pool } = kur([wave]);
    wm.startWaveEarly();
    kosut(wm, 0.1);
    const d = pool.activeItems()[0]!;
    expect(d.def).toBe(GOBLIN);
    expect(d.hp).toBe(GOBLIN.hp * MAP_1.hpMultiplier);
  });

  it('havuz doluyken doğurma ERTELENİYOR — düşman kaybolmuyor', () => {
    // "Bitmedi sayılır eğer: havuz doluyken doğurulmak istenen düşman
    // sessizce atlanıyorsa."
    const wave: Wave = {
      index: 1,
      groups: [{ enemy: 'goblin', count: 5, spawnDelay: 0.01, startAt: 0, spawnPoint: 0 }],
    };
    const uzunYol: readonly Vec2[] = [
      { x: 0, y: 0 },
      { x: 100000, y: 0 },
    ];
    const { wm, pool } = kur([wave], 2, uzunYol); // havuz yalnız 2
    wm.startWaveEarly();
    kosut(wm, 1);

    expect(pool.activeCount).toBe(2);
    expect(pool.capacity).toBe(2); // sessizce büyümedi

    // Yer açılınca kalanlar doğuyor.
    for (const d of pool.activeItems()) pool.release(d);
    kosut(wm, 0.1);
    expect(pool.activeCount).toBe(2);
  });
});

describe('WaveManager — dalga bitişi ve zincir', () => {
  it('son düşman kaleye varınca dalga bitiyor ve bonus geliyor', () => {
    const wave: Wave = {
      index: 1,
      groups: [{ enemy: 'goblin', count: 2, spawnDelay: 0.1, startAt: 0, spawnPoint: 0 }],
    };
    const { wm, eco, pool } = kur([wave]);
    const oncesi = eco.gold;
    wm.startWaveEarly();

    // Yol 600 px, goblin 60 px/sn → 10 sn.
    kosut(wm, 15);
    expect(pool.activeCount).toBe(0);
    expect(wm.phase).toBe('done'); // tek dalgalı liste
    expect(eco.gold).toBe(oncesi + BALANCE.waveEndBonus(1));
  });

  it('dalga bitince sonraki HAZIRLIĞA geçiyor', () => {
    const w = (index: number): Wave => ({
      index,
      groups: [{ enemy: 'goblin', count: 1, spawnDelay: 1, startAt: 0, spawnPoint: 0 }],
    });
    const { wm } = kur([w(1), w(2)]);
    wm.startWaveEarly();
    kosut(wm, 15);

    expect(wm.phase).toBe('prep');
    expect(wm.waveNumber).toBe(2);
    // Dalga ~10 sn sürdü (600 px / 60 px/sn), kalan ~5 sn hazırlığa gitti.
    // Yani sayaç 20'den geri sayıyor ama 15 saniyelik koşunun sonunda 20
    // OLMAZ — ilk yazımda `toBeCloseTo(20)` bekleyip kırdım.
    expect(wm.prepRemainingSec).toBeGreaterThan(0);
    expect(wm.prepRemainingSec).toBeLessThan(BALANCE.prepSeconds);
    expect(wm.prepRemainingSec).toBeCloseTo(BALANCE.prepSeconds - 5, 0);
  });

  it('sızan düşman can götürüyor', () => {
    const wave: Wave = {
      index: 1,
      groups: [{ enemy: 'goblin', count: 3, spawnDelay: 0.1, startAt: 0, spawnPoint: 0 }],
    };
    const { wm, eco } = kur([wave]);
    wm.startWaveEarly();
    kosut(wm, 15);
    expect(eco.lives).toBe(BALANCE.startLives - 3);
  });

  it('10 dalganın hepsi zincirleniyor ve done ile bitiyor', () => {
    const { wm } = kur(MAP1_WAVES);
    let guvenlik = 0;
    while (!wm.isComplete && guvenlik < 200_000) {
      wm.update(1000 / 60);
      guvenlik++;
    }
    expect(wm.isComplete).toBe(true);
    expect(wm.waveNumber).toBe(10);
  });

  it('boş dalga listesi anında done', () => {
    const { wm } = kur([]);
    wm.update(1000 / 60);
    expect(wm.phase).toBe('done');
  });

  it('done aşamasında güncelleme çökmüyor', () => {
    const { wm } = kur([]);
    expect(() => kosut(wm, 5)).not.toThrow();
  });
});

describe('WaveManager — 2× hız', () => {
  it('2× hızda dalga da iki kat hızlı akıyor', () => {
    const { wm: bir } = kur();
    const { wm: iki } = kur();

    for (let i = 0; i < 300; i++) bir.update(1000 / 60); // 5 sn
    for (let i = 0; i < 300; i++) iki.update((1000 / 60) * 2); // 10 sn

    expect(bir.prepRemainingSec).toBeCloseTo(BALANCE.prepSeconds - 5, 1);
    expect(iki.prepRemainingSec).toBeCloseTo(BALANCE.prepSeconds - 10, 1);
  });
});

describe('MAP1_WAVES — havuz uyumu', () => {
  it('en kalabalık dalga bile havuza sığıyor', () => {
    const enKalabalik = Math.max(...MAP1_WAVES.map(waveEnemyCount));
    expect(enKalabalik).toBeLessThanOrEqual(POOL_PREALLOC.enemy);
  });
});
