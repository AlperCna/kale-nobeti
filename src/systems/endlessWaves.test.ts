import { describe, expect, it } from 'vitest';
import {
  endlessBodyCost,
  endlessBudget,
  endlessHpScale,
  generateEndlessWave,
  isEndlessBossWave,
} from './endlessWaves';
import {
  ENDLESS_BOSS_EVERY,
  ENDLESS_FIRST_WAVE,
  ENDLESS_MAX_ENEMIES,
} from '../data/endless';
import { POOL_PREALLOC } from '../data/balance';
import { MAP_1, MAP_3, MAP_5, MAPS } from '../data/maps';
import { budget, wavePoints, waveEnemyCount } from '../data/waves';

const KADRO = MAP_5.enemyRoster;

describe('endlessBudget — dalga 10’dan devam', () => {
  it('ilk sonsuz dalga bir UÇURUM değil', () => {
    // Dalga 10'un bütçesi 52; 11'inki onun %8 üstü olmalı, iki katı değil.
    expect(endlessBudget(11)).toBe(Math.round(budget(10) * 1.08));
    expect(endlessBudget(11) / budget(10)).toBeLessThan(1.15);
  });

  it('monoton artıyor', () => {
    for (let n = ENDLESS_FIRST_WAVE + 1; n <= 60; n++) {
      expect(endlessBudget(n), `dalga ${n}`).toBeGreaterThan(endlessBudget(n - 1));
    }
  });

  it('sonsuz mod dışında HATA — sessizce 0 dönmüyor', () => {
    expect(() => endlessBudget(10)).toThrow();
    expect(() => endlessBudget(11.5)).toThrow();
  });
});

describe('endlessHpScale', () => {
  it('elle yazılan dalgalarda 1 — çağıran dallanmak zorunda değil', () => {
    for (let n = 1; n <= 10; n++) expect(endlessHpScale(n)).toBe(1);
  });

  it('her sonsuz dalgada artıyor — havuz tavanı bağlayınca zorluğu bu taşıyor', () => {
    for (let n = ENDLESS_FIRST_WAVE + 1; n <= 60; n++) {
      expect(endlessHpScale(n)).toBeGreaterThan(endlessHpScale(n - 1));
    }
    expect(endlessHpScale(30)).toBeCloseTo(1 + 20 * 0.08, 6);
  });
});

describe('isEndlessBossWave — S79', () => {
  it('20, 30, 40… boss; aradakiler değil', () => {
    expect(isEndlessBossWave(10)).toBe(false); // haritanın kendi bossu
    expect(isEndlessBossWave(11)).toBe(false);
    expect(isEndlessBossWave(20)).toBe(true);
    expect(isEndlessBossWave(25)).toBe(false);
    expect(isEndlessBossWave(30)).toBe(true);
  });

  it('boss dalgasında gerçekten boss var', () => {
    const w = generateEndlessWave(20, KADRO, 2);
    const boss = w.groups.filter((g) => g.enemy === 'ogreSef');
    expect(boss).toHaveLength(1);
    expect(boss[0]!.count).toBe(1);
  });

  it('boss dalgası olmayanda boss YOK', () => {
    for (let n = ENDLESS_FIRST_WAVE; n < ENDLESS_FIRST_WAVE + ENDLESS_BOSS_EVERY; n++) {
      if (isEndlessBossWave(n)) continue;
      expect(generateEndlessWave(n, KADRO, 2).groups.some((g) => g.enemy === 'ogreSef')).toBe(
        false,
      );
    }
  });
});

describe('generateEndlessWave', () => {
  it('DETERMİNİSTİK — aynı girdi aynı dalga', () => {
    for (const n of [11, 17, 23, 40]) {
      expect(generateEndlessWave(n, KADRO, 2)).toEqual(generateEndlessWave(n, KADRO, 2));
    }
  });

  it('tohum değişince dalga da değişiyor — sabit bir şablon değil', () => {
    const a = generateEndlessWave(25, KADRO, 2, 1);
    const b = generateEndlessWave(25, KADRO, 2, 2);
    expect(a).not.toEqual(b);
  });

  /**
   * **`M86`: yalnız harita 1 sınanıyordu.** Dar kadro doğru seçimdi (5
   * tip, trol/örümcek yok) ama kadroya özgü tipler — özellikle harita
   * 6'nın **Tünelci**'si — hiç sınanmamıştı. Liste artık `MAPS`'ten
   * türetiliyor: yeni harita kendiliğinden giriyor.
   */
  it('**yalnız kadro** — haritada olmayan düşman doğmuyor', () => {
    for (const m of MAPS) {
      for (let n = 11; n <= 45; n++) {
        for (const g of generateEndlessWave(n, m.enemyRoster, m.paths.length).groups) {
          expect(m.enemyRoster, `${m.id} dalga ${n}: ${g.enemy}`).toContain(g.enemy);
        }
      }
    }
  });

  /**
   * **`M86`** — beden tavanı da altı kadronun hepsinde. Tavan
   * `ENDLESS_MAX_ENEMIES`; aşılırsa `WaveManager` doğumu erteler ve dalga
   * hiç bitmez (kilitlenme). Kadro genişledikçe üretici farklı tipler
   * seçiyor, yani tavan her kadroda ayrı sınanmalı.
   */
  it('beden tavanı ALTI kadroda da tutuyor (M86)', () => {
    for (const m of MAPS) {
      for (let n = 11; n <= 60; n++) {
        const w = generateEndlessWave(n, m.enemyRoster, m.paths.length);
        expect(endlessBodyCost(w), `${m.id} dalga ${n}`).toBeLessThanOrEqual(ENDLESS_MAX_ENEMIES);
      }
    }
  });

  it('yavru dalgaya ELLE konmuyor — yalnız bölünmeden doğar', () => {
    for (let n = 11; n <= 45; n++) {
      const w = generateEndlessWave(n, MAP_3.enemyRoster, 2);
      expect(w.groups.some((g) => g.enemy === 'orumcekYavrusu'), `dalga ${n}`).toBe(false);
    }
  });

  it('**havuz maliyeti tavanı AŞMIYOR** — dalga kilitlenmesin', () => {
    // Ölçüt kafa değil **beden**: Örümcek Ana tek kafa, dört beden
    // (kendisi + 3 yavru). Kafayla ölçen bir tavan havuzu taşırırdı ve
    // `WaveManager` erteleyip dalgayı bitirmezdi.
    for (let n = 11; n <= 80; n++) {
      const w = generateEndlessWave(n, KADRO, 2);
      expect(endlessBodyCost(w), `dalga ${n}`).toBeLessThanOrEqual(ENDLESS_MAX_ENEMIES);
      expect(endlessBodyCost(w)).toBeLessThan(POOL_PREALLOC.enemy);
      expect(waveEnemyCount(w)).toBeLessThanOrEqual(ENDLESS_MAX_ENEMIES);
    }
  });

  it('bütçe ±%10 — tavan bağlamadığı sürece', () => {
    for (let n = 11; n <= 45; n++) {
      const w = generateEndlessWave(n, KADRO, 2);
      // Tavan **bedenle** bağlıyor; son bir beden bile kalmadıysa bütçe
      // eksik kapanmış demektir ve sapma beklenen bir sonuç.
      if (endlessBodyCost(w) > ENDLESS_MAX_ENEMIES - 4) continue;
      const hedef = endlessBudget(n);
      const sapma = Math.abs(wavePoints(w) - hedef) / hedef;
      expect(sapma, `dalga ${n}: ${wavePoints(w)} vs ${hedef}`).toBeLessThanOrEqual(0.1);
    }
  });

  it('boş dalga ÜRETMİYOR', () => {
    for (let n = 11; n <= 80; n++) {
      expect(waveEnemyCount(generateEndlessWave(n, KADRO, 2)), `dalga ${n}`).toBeGreaterThan(0);
    }
  });

  it('`spawnPoint` harita giriş sayısının içinde', () => {
    for (const kapi of [1, 2]) {
      for (let n = 11; n <= 40; n++) {
        for (const g of generateEndlessWave(n, KADRO, kapi).groups) {
          expect(g.spawnPoint).toBeGreaterThanOrEqual(0);
          expect(g.spawnPoint).toBeLessThan(kapi);
        }
      }
    }
  });

  it('iki kapılı haritada İKİSİ de kullanılıyor', () => {
    // Tek gruplu bir dalga çıkabilir; bir tur boyunca ikisi de görülmeli.
    const kullanilan = new Set<number>();
    for (let n = 11; n <= 30; n++) {
      for (const g of generateEndlessWave(n, KADRO, 2).groups) kullanilan.add(g.spawnPoint);
    }
    expect(kullanilan).toEqual(new Set([0, 1]));
  });

  it('30 dalga üretimi 2 sn’nin altında — sim şartı', () => {
    const t0 = Date.now();
    for (let n = 11; n <= 41; n++) generateEndlessWave(n, KADRO, 2);
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it('grupların zamanlaması artan — kuyruk sıralaması anlamlı', () => {
    const w = generateEndlessWave(33, KADRO, 2);
    for (let i = 1; i < w.groups.length; i++) {
      expect(w.groups[i]!.startAt).toBeGreaterThanOrEqual(w.groups[i - 1]!.startAt);
    }
  });
});
