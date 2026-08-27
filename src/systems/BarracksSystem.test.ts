/**
 * `GAME-DESIGN.md` §4.4'teki **9 engelleme kuralının** her biri için ayrı
 * test. Taş sonu kontrol listesi bunu şart koşuyor.
 *
 * Ortam `node` — `BarracksSystem` Phaser'a dokunmuyor (TIER 1 kural 11).
 * Askerler ve düşmanlar düz nesnelerle uygulanıyor.
 */

import { describe, expect, it } from 'vitest';
import type { BlockableEnemy, SoldierState } from '../types/barracks';
import type { EnemyDef } from '../types/enemy';
import type { Vec2 } from '../types/common';
import {
  clampRally,
  defaultRally,
  resetSoldierState,
  spawnSoldier,
  stepSoldiers,
} from './BarracksSystem';
import { BLOCK, KISLA, barracksTierAt, meleeDps, SOLDIER_SPEED } from '../data/barracks';
import { GOBLIN, HARPI, OGRE_SEF, TROL, ZIRHLI_ORK } from '../data/enemies';
import { MAP_1, MAP_2 } from '../data/maps';
import { closestPointOnPaths } from '../util/math';

const KARE_MS = 1000 / 60;

function asker(over: Partial<SoldierState> = {}): SoldierState {
  return {
    x: 0,
    y: 0,
    hp: 45,
    maxHp: 45,
    dps: 5,
    engagedWith: null,
    home: { x: 0, y: 0 },
    rally: { x: 0, y: 0 },
    state: 'idle',
    respawnLeft: 0,
    shield: 0,
    evasion: 0,
    lifetimeLeft: Number.POSITIVE_INFINITY,
    speed: SOLDIER_SPEED,
    alive: true,
    ...over,
  };
}

function dusman(def: EnemyDef, x: number, y = 0, over: Partial<BlockableEnemy> = {}): BlockableEnemy {
  return {
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    alive: true,
    def,
    blockedBy: null,
    ...over,
  };
}

/** `saniye` kadar 60 FPS'lik kare koşturur. */
function kostur(
  soldiers: SoldierState[],
  enemies: BlockableEnemy[],
  saniye: number,
  respawn = 8,
): SoldierState[] {
  const bitenler: SoldierState[] = [];
  const kare = Math.round((saniye * 1000) / KARE_MS);
  for (let i = 0; i < kare; i++) {
    const r = stepSoldiers(soldiers, enemies, KARE_MS, respawn);
    bitenler.push(...r.expired);
  }
  return bitenler;
}

// ---------------------------------------------------------------------------

describe('Kural 1 — engagedWith / blockedBy alanları', () => {
  it('kilitlenince İKİ TARAF da işaretleniyor', () => {
    const s = asker({ x: 0, y: 0, rally: { x: 0, y: 0 } });
    const e = dusman(GOBLIN, 10);
    kostur([s], [e], 0.05);
    expect(s.engagedWith).toBe(e);
    expect(e.blockedBy).toBe(s);
  });

  it('resetForPool karşılığı İKİ TARAFI da temizliyor — tek taraflı temizlik düşmanı sonsuza kilitler', () => {
    const s = asker();
    const e = dusman(GOBLIN, 10);
    kostur([s], [e], 0.05);
    expect(e.blockedBy).toBe(s);

    resetSoldierState(s);
    expect(s.engagedWith).toBeNull();
    expect(e.blockedBy).toBeNull(); // ← kritik
  });
});

describe('Kural 2 — aggro 60 px, temas 20 px, düşman DURUYOR', () => {
  it('aggro yarıçapı DIŞINDAKİ düşman hedeflenmiyor', () => {
    const s = asker({ rally: { x: 0, y: 0 } });
    const e = dusman(GOBLIN, BLOCK.aggroRadius + 5);
    kostur([s], [e], 0.05);
    expect(s.engagedWith).toBeNull();
    expect(e.blockedBy).toBeNull();
  });

  it('aggro SINIRINDAKİ düşman hedefleniyor — distSq <= aggroKare', () => {
    const s = asker({ rally: { x: 0, y: 0 } });
    const e = dusman(GOBLIN, BLOCK.aggroRadius);
    // 60 px'ten 20 px'e yürümek 40/45 ≈ 0,9 sn sürüyor — kilitlenme
    // aday seçimiyle aynı karede olmuyor, olmamalı da (kural 2).
    kostur([s], [e], 2.0);
    expect(s.engagedWith).toBe(e);
  });

  it('aggro sınırının 1 px dışı hedeflenmiyor — sınır testinin karşı yarısı', () => {
    const s = asker({ rally: { x: 0, y: 0 } });
    const e = dusman(GOBLIN, BLOCK.aggroRadius + 1);
    kostur([s], [e], 2.0);
    expect(s.engagedWith).toBeNull();
  });

  it('temas mesafesine gelene kadar YÜRÜYOR, kilitlenmiyor', () => {
    const s = asker({ rally: { x: 0, y: 0 } });
    const e = dusman(GOBLIN, 55);
    stepSoldiers([s], [e], KARE_MS, 8);
    expect(s.engagedWith).toBeNull(); // henüz temas yok
    expect(s.x).toBeGreaterThan(0); // ama yürüdü
  });

  it('en YAKIN düşmanı seçiyor', () => {
    const s = asker({ rally: { x: 0, y: 0 } });
    const uzak = dusman(GOBLIN, 50);
    const yakin = dusman(GOBLIN, 25);
    kostur([s], [uzak, yakin], 0.5);
    expect(s.engagedWith).toBe(yakin);
  });
});

describe('Kural 3 — çok askere karşı bir düşman: bedava DPS, tek hasar', () => {
  it('iki asker dövüşürken düşman YALNIZ birine hasar veriyor', () => {
    const a = asker({ x: -10, y: 0, rally: { x: -10, y: 0 } });
    const b = asker({ x: 10, y: 0, rally: { x: 10, y: 0 } });
    const e = dusman(ZIRHLI_ORK, 0);
    kostur([a, b], [e], 1.0);

    expect(e.blockedBy).not.toBeNull();
    const engelleyen = e.blockedBy === a ? a : b;
    const digeri = e.blockedBy === a ? b : a;

    expect(engelleyen.hp).toBeLessThan(engelleyen.maxHp);
    expect(digeri.hp).toBe(digeri.maxHp); // ← bedava DPS, hasar yok
  });

  it('iki askerin DPS’i de SAYILIYOR — düşman ~iki kat hızlı eriyor', () => {
    const tek = asker({ x: -10, rally: { x: -10, y: 0 } });
    const e1 = dusman(ZIRHLI_ORK, 0);
    kostur([tek], [e1], 1.0);
    const tekHasar = e1.maxHp - e1.hp;

    const a = asker({ x: -10, rally: { x: -10, y: 0 } });
    const b = asker({ x: 10, rally: { x: 10, y: 0 } });
    const e2 = dusman(ZIRHLI_ORK, 0);
    kostur([a, b], [e2], 1.0);
    const ciftHasar = e2.maxHp - e2.hp;

    expect(ciftHasar / tekHasar).toBeCloseTo(2, 1);
  });

  it('serbest düşman varken ona gidiliyor — engellenmiş olan ikinci tercih', () => {
    const a = asker({ x: 0, y: 0, rally: { x: 0, y: 0 } });
    const b = asker({ x: 0, y: 0, rally: { x: 0, y: 0 } });
    const e1 = dusman(GOBLIN, 15, 0);
    const e2 = dusman(GOBLIN, 15, 10);
    kostur([a, b], [e1, e2], 0.5);
    // İkisi de farklı düşmana kilitlendi.
    expect(a.engagedWith).not.toBe(b.engagedWith);
    expect(e1.blockedBy).not.toBeNull();
    expect(e2.blockedBy).not.toBeNull();
  });
});

describe('Kural 4 — kilit kırılma ve yeniden kilitlenme', () => {
  it('düşman ölünce kilit kırılıyor, asker idle’a dönüyor', () => {
    const s = asker({ dps: 100 });
    const e = dusman(GOBLIN, 10);
    kostur([s], [e], 2.0);
    expect(e.hp).toBe(0);
    expect(s.engagedWith).toBeNull();
    expect(s.state).toBe('idle');
  });

  it('canı bitmiş ama havuza dönmemiş düşman YENİDEN hedeflenmiyor', () => {
    // `alive` bayrağı bir kare gecikmeyle düşüyor. O karede asker ölü
    // düşmana kilitlenirse gerçek tehdidi görmez.
    const s = asker({ dps: 0, rally: { x: 0, y: 0 } });
    const olu = dusman(GOBLIN, 10, 0, { hp: 0 });
    const canli = dusman(GOBLIN, 30);
    kostur([s], [olu, canli], 2.0);
    expect(s.engagedWith).toBe(canli);
  });

  it('asker ölünce düşman SERBEST kalıyor', () => {
    const s = asker({ hp: 5, maxHp: 5, dps: 0 });
    const e = dusman(TROL, 10);
    kostur([s], [e], 1.0);
    expect(s.state).toBe('dead');
    expect(e.blockedBy).toBeNull();
  });

  it('engelleyen asker ölünce temastaki DİĞER asker devralıyor', () => {
    const zayif = asker({ x: -10, rally: { x: -10, y: 0 }, hp: 4, maxHp: 4, dps: 0 });
    const guclu = asker({ x: 10, rally: { x: 10, y: 0 }, hp: 500, maxHp: 500, dps: 0 });
    const e = dusman(TROL, 0);

    // Zayıf asker önce kilitlensin.
    stepSoldiers([zayif], [e], KARE_MS, 8);
    expect(e.blockedBy).toBe(zayif);

    kostur([zayif, guclu], [e], 1.0);
    expect(zayif.state).toBe('dead');
    expect(e.blockedBy).toBe(guclu); // ← devralındı, düşman serbest kalmadı
  });
});

describe('Kural 5 — askerden fazla düşman DURMADAN geçer', () => {
  it('2 askere 3 düşman gelince biri hiç engellenmiyor', () => {
    const a = asker({ x: 0, y: -5, rally: { x: 0, y: -5 } });
    const b = asker({ x: 0, y: 5, rally: { x: 0, y: 5 } });
    const d1 = dusman(GOBLIN, 12, -5);
    const d2 = dusman(GOBLIN, 12, 5);
    const d3 = dusman(GOBLIN, 12, 15);
    kostur([a, b], [d1, d2, d3], 1.0);

    const engellenen = [d1, d2, d3].filter((d) => d.blockedBy !== null);
    expect(engellenen.length).toBe(2); // asker sayısı kadar, fazlası değil
  });

  it('kural 5 için ÖZEL KOD yok — N asker en fazla N düşman engelliyor', () => {
    // Her asker `engagedWith` ile en fazla bir düşmana kilitleniyor ve
    // yalnız `blockedBy` olan düşman duruyor. Sınır bu ikisinden DOĞAL
    // olarak çıkıyor; sayıyı kontrol eden bir dal yok.
    const askerler = [0, 1, 2].map((i) => asker({ x: 0, y: i * 3, rally: { x: 0, y: i * 3 } }));
    const dusmanlar = [0, 1, 2, 3, 4, 5].map((i) => dusman(GOBLIN, 12, i * 3));
    kostur(askerler, dusmanlar, 1.0);
    expect(dusmanlar.filter((d) => d.blockedBy !== null).length).toBeLessThanOrEqual(3);
  });
});

describe('Kural 6 — toplanma noktası', () => {
  const yol: readonly Vec2[] = [
    { x: 0, y: 100 },
    { x: 400, y: 100 },
  ];
  const paths: readonly (readonly Vec2[])[] = [yol];
  const kisla: Vec2 = { x: 200, y: 40 };

  it('yol üstündeki geçerli nokta olduğu gibi kalıyor', () => {
    const r = clampRally(kisla, { x: 250, y: 100 }, paths);
    expect(r.x).toBeCloseTo(250, 6);
    expect(r.y).toBeCloseTo(100, 6);
  });

  it('yola ≤40 px yakın nokta YOLA YAPIŞIYOR', () => {
    const r = clampRally(kisla, { x: 250, y: 70 }, paths);
    expect(r.y).toBeCloseTo(100, 6); // yola çekildi
    expect(r.x).toBeCloseTo(250, 6);
  });

  it('yola 40 px’ten uzak nokta KONULAMIYOR — yol dışına çıkamaz', () => {
    const mevcut = { x: 300, y: 100 };
    const r = clampRally(kisla, { x: 250, y: 20 }, paths, mevcut);
    // Yola 80 px uzak → reddedildi, MEVCUT toplanma noktası korunuyor.
    expect(r).toEqual(mevcut);
  });

  it('geri düşüş verilmezse varsayılan toplanma noktası dönüyor — sonuç HER ZAMAN yol üstünde', () => {
    const r = clampRally(kisla, { x: 250, y: 20 }, paths);
    expect(r.y).toBeCloseTo(100, 6); // yolun üstünde
  });

  it('varsayılan toplanma noktası kışlanın ÜSTÜ DEĞİL — yola en yakın nokta', () => {
    // Harita 1'in sekiz noktasının hepsi yoldan 75-90 px uzakta, yani
    // `pathSnapMax = 40`'ın dışında. Kışlanın üstü varsayılan olsaydı
    // askerler yol kenarında dururdu, aggro (60 px) yola yetişmezdi ve
    // kışla hiçbir şey yapmazdı. Canlı ölçümde yakalandı.
    const r = defaultRally(kisla, paths);
    expect(r.x).toBeCloseTo(kisla.x, 6);
    expect(r.y).toBeCloseTo(100, 6);
    expect(r.y).not.toBe(kisla.y);
  });

  it('Harita 1’in HER yapı noktası geçerli bir toplanma noktası üretiyor', () => {
    for (const spot of MAP_1.buildSpots) {
      const r = defaultRally(spot, MAP_1.paths);
      // Yol üstünde mi?
      expect(closestPointOnPaths(r, MAP_1.paths).distSq).toBeLessThan(1e-6);
      // Toplanma menzilinde mi?
      expect(Math.hypot(r.x - spot.x, r.y - spot.y)).toBeLessThanOrEqual(BLOCK.rallyRange);
    }
  });

  it('kışladan 160 px dışına sürüklenince SINIRA kenetleniyor', () => {
    const uzakKisla: Vec2 = { x: 0, y: 100 };
    const r = clampRally(uzakKisla, { x: 400, y: 100 }, paths);
    const mesafe = Math.hypot(r.x - uzakKisla.x, r.y - uzakKisla.y);
    expect(mesafe).toBeCloseTo(BLOCK.rallyRange, 3);
  });

  it('kenetleme ÖNCE, yapışma SONRA — sıra tersine dönerse menzil aşılır', () => {
    const uzakKisla: Vec2 = { x: 0, y: 100 };
    const r = clampRally(uzakKisla, { x: 900, y: 100 }, paths);
    const mesafe = Math.hypot(r.x - uzakKisla.x, r.y - uzakKisla.y);
    expect(mesafe).toBeLessThanOrEqual(BLOCK.rallyRange + 1e-6);
  });
});

describe('Kural 6 — çok yollu harita (Y13)', () => {
  // İki ayrı, birbirinden uzak kol — harita 2/3'ün iki girişinin küçük
  // bir modeli. Eskiden `defaultRally`/`clampRally` yalnız `kolA`'ya
  // bakıyordu; ikinci kolun yanına kurulan kışla toplanma noktasını
  // hiç bulamıyordu.
  const kolA: readonly Vec2[] = [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
  ];
  const kolB: readonly Vec2[] = [
    { x: 0, y: 1000 },
    { x: 400, y: 1000 },
  ];
  const paths: readonly (readonly Vec2[])[] = [kolA, kolB];

  it('kışla B kolunun yanındaysa varsayılan toplanma B kolunda — A kolunda DEĞİL', () => {
    const kislaB: Vec2 = { x: 200, y: 1040 }; // B'ye 40 px, A'ya 1040 px
    const r = defaultRally(kislaB, paths);
    expect(r.y).toBeCloseTo(1000, 6); // B kolu
  });

  it('kışla A kolunun yanındaysa varsayılan toplanma A kolunda', () => {
    const kislaA: Vec2 = { x: 200, y: 40 };
    const r = defaultRally(kislaA, paths);
    expect(r.y).toBeCloseTo(0, 6); // A kolu
  });

  it('bayrak B kolunun üstüne sürüklenebiliyor — sessizce reddedilmiyor', () => {
    const kislaB: Vec2 = { x: 200, y: 1040 };
    const r = clampRally(kislaB, { x: 250, y: 1010 }, paths);
    expect(r.y).toBeCloseTo(1000, 6);
    expect(r.x).toBeCloseTo(250, 6);
  });

  it('bayrak yanlış kola (kışlanın bağlı olmadığı kola) yapışmıyor', () => {
    // Kışla B'nin yanında; A kolu kışladan 1000 px uzak — rallyRange
    // (160) kenetlemesi zaten A'yı erişilemez kılıyor, bayrak B'de kalır.
    const kislaB: Vec2 = { x: 200, y: 1040 };
    const r = clampRally(kislaB, { x: 200, y: 5 }, paths);
    expect(r.y).toBeCloseTo(1000, 3);
  });

  it('MAP_2’nin HER yapı noktası geçerli bir toplanma noktası üretiyor (iki kol)', () => {
    for (const spot of MAP_2.buildSpots) {
      const r = defaultRally(spot, MAP_2.paths);
      expect(closestPointOnPaths(r, MAP_2.paths).distSq).toBeLessThan(1e-6);
      expect(Math.hypot(r.x - spot.x, r.y - spot.y)).toBeLessThanOrEqual(BLOCK.rallyRange);
    }
  });
});

describe('Kural 7 — dirilen asker YÜRÜR, yürürken engellemez', () => {
  it('ölen asker respawn süresi sonunda kışlada doğuyor', () => {
    const s = asker({ hp: 1, maxHp: 45, dps: 0, home: { x: -100, y: 0 }, rally: { x: 0, y: 0 } });
    const e = dusman(TROL, 10);
    kostur([s], [e], 0.5, 8);
    expect(s.state).toBe('dead');

    kostur([s], [e], 8.1, 8);
    expect(s.x).not.toBe(0); // kışlada doğdu, toplanma noktasında değil
    expect(s.hp).toBe(s.maxHp);
  });

  it('doğan asker walking durumunda ve engagedWith null', () => {
    const s = asker();
    spawnSoldier(s, { x: -100, y: 0 }, { x: 0, y: 0 }, {
      hp: 45,
      dps: 5,
      evasion: 0,
      speed: SOLDIER_SPEED,
    });
    expect(s.state).toBe('walking');
    expect(s.engagedWith).toBeNull();
  });

  it('YÜRÜRKEN yanındaki düşmanı ENGELLEMİYOR — kuralın kalbi', () => {
    const s = asker();
    spawnSoldier(s, { x: 0, y: 0 }, { x: 200, y: 0 }, {
      hp: 45,
      dps: 5,
      evasion: 0,
      speed: SOLDIER_SPEED,
    });
    const e = dusman(GOBLIN, 5); // temas mesafesinde!
    kostur([s], [e], 0.5);
    expect(s.state).toBe('walking');
    expect(s.engagedWith).toBeNull();
    expect(e.blockedBy).toBeNull();
  });

  it('toplanma noktasına varınca idle oluyor ve engellemeye başlıyor', () => {
    const s = asker();
    spawnSoldier(s, { x: 0, y: 0 }, { x: 40, y: 0 }, {
      hp: 45,
      dps: 5,
      evasion: 0,
      speed: SOLDIER_SPEED,
    });
    kostur([s], [], 2.0);
    expect(s.state).toBe('idle');

    const e = dusman(GOBLIN, 45);
    kostur([s], [e], 0.5);
    expect(e.blockedBy).toBe(s);
  });
});

describe('Kural 8 — uçanlar engellenemez', () => {
  it('harpi hiç hedeflenmiyor', () => {
    const s = asker({ rally: { x: 0, y: 0 } });
    const h = dusman(HARPI, 10);
    kostur([s], [h], 1.0);
    expect(s.engagedWith).toBeNull();
    expect(h.blockedBy).toBeNull();
  });

  it('uçan ve yürüyen bir aradayken YÜRÜYEN seçiliyor — uçan daha yakın olsa bile', () => {
    const s = asker({ rally: { x: 0, y: 0 } });
    const h = dusman(HARPI, 8);
    const g = dusman(GOBLIN, 40);
    kostur([s], [h, g], 1.0);
    expect(s.engagedWith).toBe(g);
  });
});

describe('Kural 9 — Ogre Şef askeri TEK VURUŞTA öldürür', () => {
  it('boss temas eder etmez asker ölüyor', () => {
    const s = asker({ hp: 140, maxHp: 140, rally: { x: 0, y: 0 } });
    const e = dusman(OGRE_SEF, 10);
    // Tek kare yetmeli: kilitlenme + hasar.
    kostur([s], [e], 0.05);
    expect(s.state).toBe('dead');
    expect(s.hp).toBe(0);
  });

  it('en dayanıklı asker (Paladin 140 HP) bile tek karede ölüyor', () => {
    const paladin = barracksTierAt(KISLA, 2);
    const s = asker({ hp: paladin.soldierHp, maxHp: paladin.soldierHp, rally: { x: 0, y: 0 } });
    const e = dusman(OGRE_SEF, 10);
    kostur([s], [e], 0.05);
    expect(s.hp).toBe(0);
  });

  it('boss S66 formülüyle ÖLÇEKLENMİYOR — kural 9 anlık', () => {
    // Formül boss için 140,6 DPS verirdi; bir kare = 2,3 hasar. Kural 9
    // bunu anlık yapıyor. Sayı değil, davranış farkı.
    expect(meleeDps(OGRE_SEF) * (KARE_MS / 1000)).toBeLessThan(5);
    const s = asker({ hp: 140, maxHp: 140, rally: { x: 0, y: 0 } });
    kostur([s], [dusman(OGRE_SEF, 10)], 0.05);
    expect(s.hp).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('Sinerji — iki kışla aynı noktaya toplanınca (§4.4)', () => {
  /**
   * §4.4: "iki takım tek düşmana grup halinde saldırır — **daha çok hasar,
   * daha az hasar alır**."
   *
   * "Daha az hasar" **sabit bir süre penceresinde ölçülmez.** Düşman her
   * an yalnız `blockedBy` askerine vuruyor, yani birim zamandaki kayıp
   * asker sayısından bağımsız; 3 saniye boyunca 4 asker doğal olarak
   * 2 askerden çok kayıp verir çünkü daha uzun süre ayakta kalırlar.
   *
   * Doğru ölçü **verilen hasar başına alınan hasar**. Kural 3'ten doğrudan
   * çıkıyor: verilen `N × dpsEtkin`, alınan `1 × meleeDps`. N ikiye
   * katlanınca oran yarıya iniyor.
   */
  const oran = (askerSayisi: number): number => {
    const t1 = barracksTierAt(KISLA, 0);
    const askerler = Array.from({ length: askerSayisi }, (_, i) =>
      asker({
        x: (i - askerSayisi / 2) * 4,
        y: 0,
        rally: { x: (i - askerSayisi / 2) * 4, y: 0 },
        hp: 1e6,
        maxHp: 1e6,
        dps: t1.soldierDps,
      }),
    );
    const e = dusman(TROL, 0, 0, { hp: 1e6, maxHp: 1e6 });
    kostur(askerler, [e], 2.0, t1.respawnSeconds);

    const verilen = e.maxHp - e.hp;
    const alinan = askerler.reduce((a, s) => a + (s.maxHp - s.hp), 0);
    return alinan / verilen;
  };

  it('özel kod YOK: iki kat asker → verilen hasar başına alınan hasar YARIYA iniyor', () => {
    const iki = oran(2);
    const dort = oran(4);
    expect(dort / iki).toBeCloseTo(0.5, 1);
  });

  it('daha çok hasar: 4 asker 2 askerin ~iki katını vuruyor', () => {
    const verilen = (n: number): number => {
      const t1 = barracksTierAt(KISLA, 0);
      const askerler = Array.from({ length: n }, (_, i) =>
        asker({
          x: (i - n / 2) * 4,
          y: 0,
          rally: { x: (i - n / 2) * 4, y: 0 },
          hp: 1e6,
          maxHp: 1e6,
          dps: t1.soldierDps,
        }),
      );
      const e = dusman(TROL, 0, 0, { hp: 1e6, maxHp: 1e6 });
      kostur(askerler, [e], 2.0, t1.respawnSeconds);
      return e.maxHp - e.hp;
    };
    expect(verilen(4) / verilen(2)).toBeCloseTo(2, 1);
  });

  it('düşman kaç asker dövüşürse dövüşsün birim zamanda AYNI hasarı veriyor', () => {
    const alinan = (n: number): number => {
      const askerler = Array.from({ length: n }, (_, i) =>
        asker({
          x: (i - n / 2) * 4,
          y: 0,
          rally: { x: (i - n / 2) * 4, y: 0 },
          hp: 1e6,
          maxHp: 1e6,
          dps: 0,
        }),
      );
      kostur(askerler, [dusman(TROL, 0, 0, { hp: 1e6, maxHp: 1e6 })], 2.0);
      return askerler.reduce((a, s) => a + (s.maxHp - s.hp), 0);
    };
    expect(alinan(4)).toBeCloseTo(alinan(2), 3);
  });
});

describe('S44 — kaçınma çarpımsal, rastgelelik yok', () => {
  it('%25 kaçınmalı asker %25 daha az hasar alıyor, hep aynı sonuç', () => {
    const kosu = (evasion: number): number => {
      const s = asker({ hp: 1000, maxHp: 1000, dps: 0, evasion, rally: { x: 0, y: 0 } });
      kostur([s], [dusman(TROL, 10)], 1.0);
      return s.maxHp - s.hp;
    };
    const normal = kosu(0);
    const kacinmali = kosu(0.25);
    expect(kacinmali / normal).toBeCloseTo(0.75, 3);
    // Belirlenimci: iki kez koş, aynı sayı.
    expect(kosu(0.25)).toBe(kacinmali);
  });
});

describe('S67 — asker hasarı zırhtan etkileniyor, ama SANİYELİK rakama', () => {
  it('zırhlı Ork’a (zırh 8) T1 askeri (5 DPS) taban hasar veriyor', () => {
    const s = asker({ dps: 5, hp: 1e6, maxHp: 1e6, rally: { x: 0, y: 0 } });
    const e = dusman(ZIRHLI_ORK, 10);
    kostur([s], [e], 1.0);
    const hasar = e.maxHp - e.hp;
    // 5 - 8 < 0 → %15 tabanı → 0,75 DPS.
    expect(hasar).toBeCloseTo(0.75, 1);
  });

  it('zırh KARE BAŞINA uygulansaydı hasar 60 kat düşerdi — regresyon kilidi', () => {
    const s = asker({ dps: 5, hp: 1e6, maxHp: 1e6, rally: { x: 0, y: 0 } });
    const e = dusman(GOBLIN, 10, 0, { hp: 1e6, maxHp: 1e6 }); // zırh 0
    kostur([s], [e], 1.0);
    // 60 karenin ilki kilitlenmeye gidiyor (kural 2: aday seçimi ve
    // kilitlenme aynı karede olmaz), o yüzden 59/60 × 5 bekleniyor.
    expect(e.maxHp - e.hp).toBeCloseTo((59 / 60) * 5, 6);
    // Kare başına zırh uygulansaydı bu sayı 5 yerine 0,75 çıkardı.
    expect(e.maxHp - e.hp).toBeGreaterThan(4);
  });
});

describe('Havuz sözleşmesi (TIER 1 kural 3)', () => {
  it('resetSoldierState her alanı sıfırlıyor', () => {
    const s = asker({ hp: 30, dps: 9, evasion: 0.25, lifetimeLeft: 5, respawnLeft: 3 });
    resetSoldierState(s);
    expect(s.hp).toBe(0);
    expect(s.dps).toBe(0);
    expect(s.evasion).toBe(0);
    expect(s.shield).toBe(0);
    expect(s.respawnLeft).toBe(0);
    expect(s.lifetimeLeft).toBe(Number.POSITIVE_INFINITY);
    expect(s.engagedWith).toBeNull();
    expect(s.alive).toBe(false);
    expect(s.state).toBe('dead');
  });

  it('havuzda bekleyen asker (alive=false) adım atmıyor', () => {
    const s = asker();
    resetSoldierState(s);
    const e = dusman(GOBLIN, 5);
    kostur([s], [e], 1.0);
    expect(e.blockedBy).toBeNull();
    expect(s.x).toBe(0);
  });
});

describe('Geçici asker ömrü (§8 Takviye)', () => {
  it('20 sn sonra expired listesine düşüyor', () => {
    const s = asker({ lifetimeLeft: 20 });
    const bitenler = kostur([s], [], 19.0);
    expect(bitenler).toHaveLength(0);
    const sonra = kostur([s], [], 1.5);
    expect(sonra).toContain(s);
  });

  it('ömrü biterken kilitliyse düşmanı SERBEST bırakıyor', () => {
    const s = asker({ lifetimeLeft: 0.5, rally: { x: 0, y: 0 } });
    const e = dusman(TROL, 10);
    kostur([s], [e], 0.2);
    expect(e.blockedBy).toBe(s);
    kostur([s], [e], 0.6);
    expect(e.blockedBy).toBeNull();
  });

  it('geçici asker ölünce DİRİLMİYOR', () => {
    const s = asker({ lifetimeLeft: 20, hp: 1, maxHp: 60, dps: 0, rally: { x: 0, y: 0 } });
    const bitenler = kostur([s], [dusman(TROL, 10)], 0.5);
    expect(s.state).toBe('dead');
    expect(bitenler).toContain(s);
  });
});

describe('TIER 1 kural 8 — 2× hızda her şey iki kat hızlı', () => {
  it('diriliş sayacı scaledDelta ile azalıyor', () => {
    const yap = (): SoldierState =>
      asker({ hp: 0, maxHp: 45, state: 'dead', respawnLeft: 8, home: { x: -50, y: 0 } });

    // 250 kare = 4,17 sn duvar saati. 1×'te 8 sn dolmuyor, 2×'te doluyor.
    const normal = yap();
    for (let i = 0; i < 250; i++) stepSoldiers([normal], [], KARE_MS, 8);
    expect(normal.state).toBe('dead');

    const hizli = yap();
    for (let i = 0; i < 250; i++) stepSoldiers([hizli], [], KARE_MS * 2, 8);
    expect(hizli.state).toBe('walking'); // dirildi
  });

  it('dövüş hasarı da iki kat', () => {
    const kosu = (olcek: number): number => {
      const s = asker({ dps: 10, hp: 1e6, maxHp: 1e6, rally: { x: 0, y: 0 } });
      const e = dusman(GOBLIN, 10, 0, { hp: 1e6, maxHp: 1e6 });
      for (let i = 0; i < 60; i++) stepSoldiers([s], [e], KARE_MS * olcek, 8);
      return e.maxHp - e.hp;
    };
    expect(kosu(2) / kosu(1)).toBeCloseTo(2, 2);
  });
});
