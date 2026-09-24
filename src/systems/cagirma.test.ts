/**
 * **Çağırma** — `M13` Faz 1, boss'un ikinci verb'ü.
 *
 * Boss canının her `hpStep` oranını kaybettiğinde yandaş doğuruyor.
 * Test dört sözleşmeyi bağlıyor: eşik sayımı, havuz kısıtı, havuza
 * dönüş (TIER 1 kural 3) ve "iyileşen boss geri saymıyor".
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { EnemyAbilitySystem } from './EnemyAbilitySystem';
import type { AbilityEnemy } from './EnemyAbilitySystem';
import { Pool } from '../util/pool';
import type { Poolable } from '../util/pool';
import { GOBLIN, OGRE_SEF } from '../data/enemies';
import { resetEnemyState } from './movers';
import type { EnemyDef, Mover } from '../types/enemy';
import type { PathProgress } from '../types/path';

const CAGIRAN: EnemyDef = {
  ...OGRE_SEF,
  ability: { kind: 'summon', childId: 'goblin', count: 2, hpStep: 0.25 },
};

const SAHTE_MOVER: Mover = {
  step: () => {},
  remainingDistance: () => 0,
  positionAt: () => ({ x: 0, y: 0 }),
  reachedEnd: () => false,
  spawnProgress: (): PathProgress => ({ segmentIndex: 0, tInSegment: 0, remainingDistance: 0 }),
};

class SahteDusman implements AbilityEnemy, Poolable {
  x = 0;
  y = 0;
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  speed = 0;
  speedFactor = 1;
  progress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
  pathFraction = 0;
  summonsDone = 0;
  susturmaBekleme = 0;
  blockedBy: object | null = null;
  alive = false;
  shieldLeft = 0;
  mover: Mover | null = null;

  spawn(mover: Mover, def: EnemyDef, hpMultiplier: number): void {
    this.mover = mover;
    this.def = def;
    this.hp = def.hp * hpMultiplier;
    this.maxHp = this.hp;
    this.speed = def.speed;
    this.alive = true;
  }
  step(): void {}
  reachedEnd(): boolean {
    return false;
  }
  resetForPool(): void {
    resetEnemyState(this);
    this.mover = null;
  }
}

function kur(kapasite = 16) {
  const havuz = new Pool<SahteDusman>(() => new SahteDusman(), kapasite);
  const sistem = new EnemyAbilitySystem<SahteDusman>(havuz, 1, (id) =>
    id === 'goblin' ? GOBLIN : id === 'ogreSef' ? CAGIRAN : undefined,
  );
  const boss = havuz.acquire()!;
  boss.spawn(SAHTE_MOVER, CAGIRAN, 1);
  return { havuz, sistem, boss };
}

/** Boss dışındaki canlı düşman sayısı — yani çağrılanlar. */
function yandas(havuz: Pool<SahteDusman>, boss: SahteDusman): number {
  return havuz.activeItems().filter((e) => e !== boss && e.alive).length;
}

describe('Çağırma — M13 Faz 1', () => {
  it('can düşmedikçe kimse çağrılmıyor', () => {
    const { havuz, sistem, boss } = kur();
    sistem.update(16);
    expect(yandas(havuz, boss)).toBe(0);
    expect(boss.summonsDone).toBe(0);
  });

  it('her eşikte `count` kadar yandaş — %75, %50, %25', () => {
    const { havuz, sistem, boss } = kur();
    for (const [kalan, beklenenEsik] of [
      [0.8, 0],
      [0.74, 1],
      [0.51, 1],
      [0.49, 2],
      [0.2, 3],
    ] as const) {
      boss.hp = boss.maxHp * kalan;
      sistem.update(16);
      expect(boss.summonsDone, `kalan ${kalan}`).toBe(beklenenEsik);
      expect(yandas(havuz, boss), `kalan ${kalan}`).toBe(beklenenEsik * 2);
    }
  });

  it('tek karede iki eşik birden geçilirse İKİSİ de işliyor', () => {
    // Meteor 180 gerçek hasar veriyor; bir vuruşta iki dilim gidebilir.
    const { havuz, sistem, boss } = kur();
    boss.hp = boss.maxHp * 0.45; // %55 kayıp → iki eşik
    sistem.update(16);
    expect(boss.summonsDone).toBe(2);
    expect(yandas(havuz, boss)).toBe(4);
  });

  it('**iyileşen boss geri saymıyor** — sonsuz yandaş yok', () => {
    const { havuz, sistem, boss } = kur();
    boss.hp = boss.maxHp * 0.7;
    sistem.update(16);
    expect(boss.summonsDone).toBe(1);
    // Şaman yukarı çekiyor, sonra tekrar aynı eşiğin altına iniyor.
    boss.hp = boss.maxHp;
    sistem.update(16);
    boss.hp = boss.maxHp * 0.7;
    sistem.update(16);
    expect(boss.summonsDone).toBe(1);
    expect(yandas(havuz, boss)).toBe(2);
  });

  it('yandaş BOSS’UN progress nesnesini paylaşmıyor (M35)', () => {
    // Bölünmedeki ikizin aynısı — burada daha kritiği: paylaşılan nesne
    // **bossu da** içine alırdı, yani boss kendi yandaşlarıyla birlikte
    // hızlanırdı. Bugün zararsız (`PathMover.step` yeni nesne atıyor),
    // ama bu test o saflığa bağımlı kalmamayı bağlıyor.
    const { havuz, sistem, boss } = kur();
    boss.hp = boss.maxHp * 0.7;
    sistem.update(16);
    const yandaslar = havuz.activeItems().filter((e) => e !== boss && e.alive);

    expect(yandaslar.length).toBeGreaterThan(0);
    for (const y of yandaslar) expect(y.progress).not.toBe(boss.progress);
    if (yandaslar.length >= 2) {
      expect(yandaslar[0]!.progress).not.toBe(yandaslar[1]!.progress);
    }
  });

  it('havuz doluysa çağırma KISILIYOR, `new` çağrılmıyor', () => {
    const { havuz, sistem, boss } = kur(2); // boss + 1 yer
    boss.hp = boss.maxHp * 0.2; // üç eşik birden
    sistem.update(16);
    expect(yandas(havuz, boss)).toBe(1); // yalnız bir yer vardı
    expect(havuz.activeCount).toBe(2);
  });

  it('havuza dönen boss `summonsDone = 0` ile geliyor (kural 3)', () => {
    const { havuz, sistem, boss } = kur();
    boss.hp = boss.maxHp * 0.2;
    sistem.update(16);
    expect(boss.summonsDone).toBe(3);
    havuz.release(boss);
    expect(boss.summonsDone).toBe(0);
  });
});
