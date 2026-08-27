import { describe, expect, it } from 'vitest';
import { AbilitySystem } from './AbilitySystem';
import { stepSoldiers } from './BarracksSystem';
import { METEOR, TAKVIYE } from '../data/abilities';
import { GOBLIN, HARPI, OGRE_SEF, ZIRHLI_ORK } from '../data/enemies';
import type { BlockableEnemy, SoldierState } from '../types/barracks';
import type { EnemyDef } from '../types/enemy';

const KARE_MS = 1000 / 60;

function dusman(def: EnemyDef, x: number, y = 0): BlockableEnemy {
  return { x, y, hp: def.hp, maxHp: def.hp, alive: true, def, blockedBy: null };
}

function bosAsker(): SoldierState {
  return {
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
    speed: 0,
    alive: false,
    flipX: false,
  };
}

/**
 * `saniye` kadar **duvar saati** ilerletir.
 *
 * Kare sayısı ölçekten bağımsız (60 FPS sabit); ölçek yalnız her karede
 * geçen **oyun** zamanını değiştiriyor. 2× hızda aynı sayıda kare iki kat
 * oyun zamanı üretiyor — TIER 1 kural 8'in tam olarak iddia ettiği şey.
 */
function bekle(sys: AbilitySystem, saniye: number, olcek = 1): void {
  const kare = Math.ceil((saniye * 1000) / KARE_MS);
  for (let i = 0; i < kare; i++) sys.tick(KARE_MS * olcek);
}

describe('Bekleme süreleri — §8', () => {
  it('başlangıçta iki yetenek de HAZIR', () => {
    const s = new AbilitySystem();
    expect(s.ready('meteor')).toBe(true);
    expect(s.ready('takviye')).toBe(true);
    expect(s.progress('meteor')).toBe(1);
  });

  it('kullanınca TAM süreye sıfırlanıyor', () => {
    const s = new AbilitySystem();
    s.castMeteor({ x: 0, y: 0 }, []);
    expect(s.cooldownLeft('meteor')).toBeCloseTo(METEOR.cooldownSeconds, 6);
    expect(s.ready('meteor')).toBe(false);
  });

  it('bekleme dolmadan İKİNCİ KEZ kullanılamıyor', () => {
    const s = new AbilitySystem();
    const e = [dusman(GOBLIN, 0)];
    expect(s.castMeteor({ x: 0, y: 0 }, e)).not.toBeNull();
    expect(s.castMeteor({ x: 0, y: 0 }, e)).toBeNull();
  });

  it('süre dolunca yeniden kullanılabiliyor', () => {
    const s = new AbilitySystem();
    s.castMeteor({ x: 0, y: 0 }, []);
    bekle(s, METEOR.cooldownSeconds + 0.1);
    expect(s.ready('meteor')).toBe(true);
    expect(s.castMeteor({ x: 0, y: 0 }, [])).not.toBeNull();
  });

  it('iki yeteneğin beklemesi BAĞIMSIZ', () => {
    const s = new AbilitySystem();
    s.castMeteor({ x: 0, y: 0 }, []);
    expect(s.ready('takviye')).toBe(true);
  });

  it('TIER 1 k.8 — 2× hızda bekleme YARI sürede doluyor', () => {
    const normal = new AbilitySystem();
    normal.castMeteor({ x: 0, y: 0 }, []);
    bekle(normal, 23, 1); // 23 sn duvar saati @1×
    expect(normal.ready('meteor')).toBe(false);

    const hizli = new AbilitySystem();
    hizli.castMeteor({ x: 0, y: 0 }, []);
    bekle(hizli, 23, 2); // 23 sn duvar saati @2× = 46 oyun sn
    expect(hizli.ready('meteor')).toBe(true);
  });

  it('progress 0→1 arasında ilerliyor — HUD dairesel dolumu', () => {
    const s = new AbilitySystem();
    s.castMeteor({ x: 0, y: 0 }, []);
    expect(s.progress('meteor')).toBeCloseTo(0, 3);
    bekle(s, METEOR.cooldownSeconds / 2);
    expect(s.progress('meteor')).toBeCloseTo(0.5, 1);
    bekle(s, METEOR.cooldownSeconds);
    expect(s.progress('meteor')).toBe(1);
  });

  it('S49 — reset() beklemeleri sıfırlıyor (haritalar arası)', () => {
    const s = new AbilitySystem();
    s.castMeteor({ x: 0, y: 0 }, []);
    s.castReinforcements({ x: 0, y: 0 }, () => null);
    s.reset();
    expect(s.ready('meteor')).toBe(true);
    expect(s.ready('takviye')).toBe(true);
  });
});

describe('Meteor — §8 + §3 gerçek hasar', () => {
  it('Ogre Şef’e (zırh 10, direnç %25) TAM 180 hasar', () => {
    const s = new AbilitySystem();
    const boss = dusman(OGRE_SEF, 0);
    const r = s.castMeteor({ x: 0, y: 0 }, [boss]);
    expect(r?.totalDamage).toBeCloseTo(180, 6);
    expect(boss.maxHp - boss.hp).toBeCloseTo(180, 6);
  });

  it('zırhlı Ork’a da TAM 180 — gerçek hasar hiçbir şeyle azalmaz', () => {
    const s = new AbilitySystem();
    const e = dusman(ZIRHLI_ORK, 0);
    s.castMeteor({ x: 0, y: 0 }, [e]);
    expect(e.hp).toBe(0); // 160 HP < 180
  });

  it('yarıçap DIŞINDAKİ düşman etkilenmiyor', () => {
    const s = new AbilitySystem();
    const ici = dusman(OGRE_SEF, METEOR.radius - 1);
    const disi = dusman(OGRE_SEF, METEOR.radius + 1);
    const r = s.castMeteor({ x: 0, y: 0 }, [ici, disi]);
    expect(r?.hit).toBe(1);
    expect(disi.hp).toBe(disi.maxHp);
  });

  it('yarıçap SINIRINDAKİ dahil — distSq <= yarıçapKare', () => {
    const s = new AbilitySystem();
    const sinir = dusman(OGRE_SEF, METEOR.radius);
    expect(s.castMeteor({ x: 0, y: 0 }, [sinir])?.hit).toBe(1);
  });

  it('S48 — uçanları da vuruyor', () => {
    const s = new AbilitySystem();
    const h = dusman(HARPI, 10);
    s.castMeteor({ x: 0, y: 0 }, [h]);
    expect(h.hp).toBe(0);
  });

  it('ölü düşmanı ikinci kez vurmuyor', () => {
    const s = new AbilitySystem();
    const e = dusman(GOBLIN, 0);
    e.hp = 0;
    expect(s.castMeteor({ x: 0, y: 0 }, [e])?.hit).toBe(0);
  });

  it('bekleme dolmamışken hasar VERMİYOR — çift kullanım sızıntısı', () => {
    const s = new AbilitySystem();
    const e = dusman(OGRE_SEF, 0);
    s.castMeteor({ x: 0, y: 0 }, [e]);
    const sonra = e.hp;
    s.castMeteor({ x: 0, y: 0 }, [e]);
    expect(e.hp).toBe(sonra);
  });
});

describe('Takviye — §8', () => {
  it('2 asker çağırıyor, §8 değerleriyle', () => {
    const s = new AbilitySystem();
    const havuz = [bosAsker(), bosAsker(), bosAsker()];
    let i = 0;
    const cikan = s.castReinforcements({ x: 100, y: 50 }, () => havuz[i++] ?? null);
    expect(cikan).toHaveLength(TAKVIYE.soldierCount);
    for (const a of cikan!) {
      expect(a.maxHp).toBe(60);
      expect(a.dps).toBe(7);
      expect(a.lifetimeLeft).toBe(20);
      expect(a.x).toBe(100);
      expect(a.y).toBe(50);
      expect(a.alive).toBe(true);
    }
  });

  it('S47 — geçici askerler ENGELLEME yapıyor', () => {
    const s = new AbilitySystem();
    const havuz = [bosAsker(), bosAsker()];
    let i = 0;
    const cikan = s.castReinforcements({ x: 0, y: 0 }, () => havuz[i++] ?? null)!;
    const e = dusman(GOBLIN, 10);
    stepSoldiers(cikan, [e], KARE_MS, 8);
    expect(e.blockedBy).not.toBeNull();
  });

  it('20 sn sonra havuza dönüyor — destroy edilmiyor', () => {
    const s = new AbilitySystem();
    const havuz = [bosAsker(), bosAsker()];
    let i = 0;
    const cikan = s.castReinforcements({ x: 0, y: 0 }, () => havuz[i++] ?? null)!;

    let bitenler: SoldierState[] = [];
    for (let k = 0; k < 60 * 21; k++) {
      bitenler = [...bitenler, ...stepSoldiers(cikan, [], KARE_MS, 8).expired];
    }
    expect(bitenler).toHaveLength(2);
    expect(new Set(bitenler)).toEqual(new Set(cikan));
  });

  it('TIER 1 k.3 — havuz doluyken asker sayısı KISILIYOR, new çağrılmıyor', () => {
    const s = new AbilitySystem();
    const tek = bosAsker();
    let verildi = false;
    const cikan = s.castReinforcements({ x: 0, y: 0 }, () => {
      if (verildi) return null;
      verildi = true;
      return tek;
    });
    expect(cikan).toHaveLength(1); // 2 değil — havuz bir tane verdi
  });

  it('havuz TAMAMEN doluyken bile bekleme tükeniyor — bedava yetenek yok', () => {
    const s = new AbilitySystem();
    const cikan = s.castReinforcements({ x: 0, y: 0 }, () => null);
    expect(cikan).toHaveLength(0);
    expect(s.ready('takviye')).toBe(false);
  });

  it('geçici asker hedef noktada doğuyor ve yürümüyor — anında hazır', () => {
    const s = new AbilitySystem();
    const havuz = [bosAsker(), bosAsker()];
    let i = 0;
    const cikan = s.castReinforcements({ x: 300, y: 200 }, () => havuz[i++] ?? null)!;
    for (const a of cikan) expect(a.state).toBe('idle');
  });
});
