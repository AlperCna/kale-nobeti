import { describe, it, expect } from 'vitest';
import {
  budget,
  spawnDelayFor,
  MAP1_WAVES,
  wavePoints,
  waveEnemyCount,
  BOSS_REFAKAT_GECIKMESI_SN,
} from './waves';
import { BALANCE, POOL_PREALLOC, SPAWN_K } from './balance';
import { MAP_1 } from './maps';
import { getEnemy } from './enemies';

describe('budget — GAME-DESIGN §7 formülü', () => {
  it('planda sabitlenen dört değer', () => {
    expect(budget(1)).toBe(10);
    expect(budget(4)).toBe(15); // nefes
    expect(budget(7)).toBe(25); // nefes
    expect(budget(10)).toBe(52);
  });

  it('tam rampa: nefes dışı dalgalar %20 büyüyor', () => {
    for (const n of [1, 2, 3, 5, 6, 8, 9]) {
      const beklenen = Math.round(10 * Math.pow(1.2, n - 1));
      expect(budget(n), `dalga ${n}`).toBe(beklenen);
    }
  });

  it('nefes dalgaları %85 çarpanını yiyor', () => {
    for (const n of BALANCE.breatherWaves) {
      const nefessiz = Math.round(10 * Math.pow(1.2, n - 1));
      expect(budget(n), `dalga ${n}`).toBeLessThan(nefessiz);
    }
  });

  it('nefes dalgası bir ÖNCEKİNDEN küçük DEĞİL — plan kriteri yanlıştı', () => {
    // `M3-T01` kabul kriteri "nefes dalgaları bir öncekinden küçük" diyordu.
    // Formül bunu vermiyor: budget(4)=15 > budget(3)=14, budget(7)=25 = budget(6)=25.
    // %85 çarpanı dalgayı **kendi rampa değerinden** küçültüyor, önceki
    // dalgadan değil. Doğru iddia yukarıdaki testte.
    expect(budget(4)).toBeGreaterThan(budget(3));
    expect(budget(7)).toBe(budget(6));
  });

  it('bütçe monoton artıyor (nefes hariç azalma yok)', () => {
    for (let n = 2; n <= 10; n++) {
      expect(budget(n), `dalga ${n}`).toBeGreaterThanOrEqual(budget(n - 1));
    }
  });

  it('geçersiz dalga numarası HATA fırlatıyor', () => {
    // Sessizce 0 dönmek dalgayı boş bırakır ve hata çok sonra ortaya çıkar.
    expect(() => budget(0)).toThrow(/≥ 1/);
    expect(() => budget(-3)).toThrow();
    expect(() => budget(1.5)).toThrow();
    expect(() => budget(Number.NaN)).toThrow();
  });
});

describe('spawnDelayFor — §7 tempo formülü', () => {
  it('kalabalık dalga daha SIK doğuruyor', () => {
    expect(spawnDelayFor(10)).toBeCloseTo(SPAWN_K / 10, 10);
    expect(spawnDelayFor(26)).toBeCloseTo(SPAWN_K / 26, 10);
    expect(spawnDelayFor(26)).toBeLessThan(spawnDelayFor(10));
  });

  it('doğum PENCERESİ dalga boyundan bağımsız — ≈ SPAWN_K', () => {
    // Formülün asıl anlamı bu: `(n−1) × K/n` her n için K'ya yakınsıyor.
    // Yani `SPAWN_K` "dalga kaç saniyede doğar" demek.
    for (const n of [8, 12, 20, 26]) {
      const pencere = (n - 1) * spawnDelayFor(n);
      expect(pencere, `n=${n}`).toBeGreaterThan(SPAWN_K * 0.85);
      expect(pencere).toBeLessThanOrEqual(SPAWN_K);
    }
  });

  it('doğum penceresi hazırlık sayacıyla aynı büyüklükte', () => {
    // Ritim: ~20 sn hazırlan → ~22 sn savaş → nefes.
    expect(SPAWN_K).toBeGreaterThan(BALANCE.prepSeconds * 0.8);
    expect(SPAWN_K).toBeLessThan(BALANCE.prepSeconds * 1.5);
  });

  it('sıfır düşman çökmüyor', () => {
    expect(spawnDelayFor(0)).toBe(SPAWN_K);
    expect(spawnDelayFor(-5)).toBe(SPAWN_K);
  });
});

describe('MAP1_WAVES — Harita 1 dalgaları', () => {
  it('10 dalga, indeksler 1..10 sırayla', () => {
    expect(MAP1_WAVES).toHaveLength(10);
    MAP1_WAVES.forEach((w, i) => expect(w.index).toBe(i + 1));
  });

  it('her dalganın puanı budget ile ±%10 içinde', () => {
    for (const w of MAP1_WAVES) {
      const b = budget(w.index);
      const p = wavePoints(w);
      expect(Math.abs(p - b) / b, `dalga ${w.index}: ${p} vs ${b}`).toBeLessThanOrEqual(0.1);
    }
  });

  it('hiçbir dalga enemyRoster DIŞI düşman içermiyor', () => {
    for (const w of MAP1_WAVES) {
      for (const g of w.groups) {
        expect(MAP_1.enemyRoster, `dalga ${w.index}`).toContain(g.enemy);
      }
    }
  });

  it('harita 1 kadrosunun BEŞİ de kullanılıyor (§5)', () => {
    const kullanilan = new Set(MAP1_WAVES.flatMap((w) => w.groups.map((g) => g.enemy)));
    expect([...kullanilan].sort()).toEqual(
      ['goblin', 'harpi', 'kurtBinicisi', 'ogreSef', 'orkSavasci'].sort(),
    );
  });

  it('dalga 10 BOSS dalgası, refakat bossʼtan SONRA (§7, S33)', () => {
    const w = MAP1_WAVES[9]!;
    const boss = w.groups[0]!;
    expect(boss.enemy).toBe('ogreSef');
    expect(boss.count).toBe(1);
    expect(boss.startAt).toBe(0);
    // Refakat gecikmeli — first hedeflemesi boss'u seçsin diye.
    for (let i = 1; i < w.groups.length; i++) {
      expect(w.groups[i]!.startAt).toBeGreaterThanOrEqual(BOSS_REFAKAT_GECIKMESI_SN);
    }
  });

  it('boss yalnız dalga 10ʼda', () => {
    for (const w of MAP1_WAVES) {
      const bossVar = w.groups.some((g) => g.enemy === 'ogreSef');
      expect(bossVar, `dalga ${w.index}`).toBe(w.index === 10);
    }
  });

  it('startAt değerleri her dalgada ARTAN', () => {
    for (const w of MAP1_WAVES) {
      for (let i = 1; i < w.groups.length; i++) {
        expect(w.groups[i]!.startAt, `dalga ${w.index} grup ${i}`).toBeGreaterThan(
          w.groups[i - 1]!.startAt,
        );
      }
    }
  });

  it('hiçbir dalga havuz kapasitesini aşmıyor', () => {
    for (const w of MAP1_WAVES) {
      expect(waveEnemyCount(w), `dalga ${w.index}`).toBeLessThanOrEqual(POOL_PREALLOC.enemy);
    }
  });

  it('düşman tipleri kademeli tanıtılıyor', () => {
    const ilkGorunum = (id: string): number =>
      MAP1_WAVES.find((w) => w.groups.some((g) => g.enemy === id))?.index ?? 99;

    expect(ilkGorunum('goblin')).toBe(1);
    // Ork Savaşçı zırh kavramını tanıtıyor (§5) — Goblin'den sonra.
    expect(ilkGorunum('orkSavasci')).toBeGreaterThan(ilkGorunum('goblin'));
    // Kurt Binicisi hız kavramı — en son.
    expect(ilkGorunum('kurtBinicisi')).toBeGreaterThan(ilkGorunum('orkSavasci'));
  });

  it('nefes dalgalarında YENİ tip tanıtılmıyor', () => {
    // Nefes almak yeni şey öğrenmemek demek.
    for (const n of BALANCE.breatherWaves) {
      const oncekiTipler = new Set(
        MAP1_WAVES.filter((w) => w.index < n).flatMap((w) => w.groups.map((g) => g.enemy)),
      );
      const nefesTipleri = MAP1_WAVES[n - 1]?.groups.map((g) => g.enemy) ?? [];
      for (const t of nefesTipleri) {
        expect(oncekiTipler, `dalga ${n} yeni tip tanıtıyor: ${t}`).toContain(t);
      }
    }
  });

  it('dalga büyüdükçe doğum aralığı KISALIYOR', () => {
    const ilk = MAP1_WAVES[0]?.groups[0]?.spawnDelay ?? 0;
    const son = MAP1_WAVES[9]?.groups[0]?.spawnDelay ?? 0;
    expect(son).toBeLessThan(ilk);
  });

  it('her grubun adedi pozitif ve düşman tanımlı', () => {
    for (const w of MAP1_WAVES) {
      for (const g of w.groups) {
        expect(g.count).toBeGreaterThan(0);
        expect(getEnemy(g.enemy), `${g.enemy} tanımsız`).toBeDefined();
        expect(g.spawnPoint).toBe(0); // harita 1 tek girişli
      }
    }
  });
});

describe('BALANCE — GAME-DESIGN §6 sabitleri', () => {
  it('dalga bitiş bonusu 30 + 5n', () => {
    expect(BALANCE.waveEndBonus(1)).toBe(35);
    expect(BALANCE.waveEndBonus(10)).toBe(80);
  });

  it('§6 sayıları birebir', () => {
    expect(BALANCE.startLives).toBe(20);
    expect(BALANCE.sellRefund).toBe(0.7);
    expect(BALANCE.damageFloor).toBe(0.15);
    expect(BALANCE.prepSeconds).toBe(20);
    expect(BALANCE.earlyBonusFrom).toBe(4);
    expect(BALANCE.focusLoss).toBe(0.75);
    expect(BALANCE.safetyMargin).toBe(1.15);
  });
});
