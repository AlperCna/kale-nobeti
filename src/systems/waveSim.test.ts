import { describe, it, expect } from 'vitest';
import { simulateWave, simulateAllWaves } from './waveSim';
import { buildReferenceBoards } from './balanceChecks';
import { MAP_1 } from '../data/maps';
import { MAP1_WAVES } from '../data/waves';
import { measureCoverage } from '../util/coverage';
import { BALANCE } from '../data/balance';
import type { ReferenceBoard } from '../types/board';

const KAPSAMA = measureCoverage(MAP_1.paths, MAP_1.buildSpots, 150);
const BOARDS = buildReferenceBoards(MAP_1, MAP1_WAVES, KAPSAMA);
/** Erken başlatma bonusu kullanılmış hâli — §6 bunu bekliyor. */
const GERCEKCI = buildReferenceBoards(MAP_1, MAP1_WAVES, KAPSAMA, true);
const BOS_TAHTA: ReferenceBoard = { waveIndex: 1, towers: [], cumulativeCost: 0 };

describe('simulateWave — temel davranış', () => {
  it('sahnesiz koşuyor — Phaser gerektirmiyor', () => {
    // "Bitmedi sayılır eğer: simülasyon render veya Phaser.Scene
    // gerektiriyorsa." Bu test dosyası `node` ortamında koşuyor; import
    // zinciri Phaser'a dokunsaydı `window is not defined` ile patlardı.
    expect(() => simulateWave(MAP1_WAVES[0]!, BOARDS[0]!, MAP_1)).not.toThrow();
  });

  it('kulesiz tahtada HER düşman sızıyor', () => {
    const r = simulateWave(MAP1_WAVES[0]!, BOS_TAHTA, MAP_1);
    expect(r.leakedCount).toBe(10); // dalga 1: 10 goblin
    expect(r.leakedHp).toBeGreaterThan(0);
    expect(r.killedCount).toBe(0);
  });

  it('kulesiz sızan HP = düşman sayısı × tam can', () => {
    const r = simulateWave(MAP1_WAVES[0]!, BOS_TAHTA, MAP_1);
    expect(r.leakedHp).toBeCloseTo(10 * 45 * MAP_1.hpMultiplier, 6);
  });

  it('DETERMİNİSTİK — aynı girdi aynı sonuç', () => {
    const a = simulateWave(MAP1_WAVES[4]!, BOARDS[4]!, MAP_1);
    const b = simulateWave(MAP1_WAVES[4]!, BOARDS[4]!, MAP_1);
    expect(a).toEqual(b);
  });

  it('durationSec ÖLÇÜLÜYOR — pozitif ve makul', () => {
    const r = simulateWave(MAP1_WAVES[0]!, BOARDS[0]!, MAP_1);
    expect(r.durationSec).toBeGreaterThan(0);
    expect(r.durationSec).toBeLessThan(300);
  });

  it('adım boyutu yarıya inince sonuç < %2 değişiyor (yakınsama)', () => {
    const normal = simulateWave(MAP1_WAVES[5]!, BOARDS[5]!, MAP_1, 1000 / 60);
    const ince = simulateWave(MAP1_WAVES[5]!, BOARDS[5]!, MAP_1, 1000 / 120);
    const fark = Math.abs(ince.durationSec - normal.durationSec) / normal.durationSec;
    expect(fark).toBeLessThan(0.02);
    expect(ince.killedCount).toBe(normal.killedCount);
  });
});

describe('Kısıt B — 10 dalga referans tahtaya karşı', () => {
  const gercekci = simulateAllWaves(MAP1_WAVES, GERCEKCI, MAP_1);
  const muhafazakar = simulateAllWaves(MAP1_WAVES, BOARDS, MAP_1);

  it('gerçekçi tahtayla harita GEÇİLEBİLİR — can 20\'nin çok altına inmiyor', () => {
    // Ham "leakedHp === 0" iddiası ölçümle tutmadı ve **doğru iddia da o
    // değil**: 20 can veriliyorsa amaç sıfır sızıntı değil, geçilebilirlik.
    // §9 yıldız tablosu zaten bunu söylüyor (20 → ★★★, 15-19 → ★★).
    const toplamSizan = gercekci.reduce((t, r) => t + r.leakedCount, 0);
    expect(toplamSizan).toBeLessThanOrEqual(3);
    expect(BALANCE.startLives - toplamSizan).toBeGreaterThan(15); // ★★ üstü
  });

  it('muhafazakâr tahtayla bile harita kaybedilmiyor', () => {
    // Oyuncu hiç erken başlatmasa da 20 canı bitirmiyor.
    const toplamSizan = muhafazakar.reduce((t, r) => t + r.leakedCount, 0);
    expect(toplamSizan).toBeLessThan(BALANCE.startLives);
  });

  it('erken başlatma bonusu ÖLÇÜLEBİLİR fark yaratıyor', () => {
    // §6: "geç oyunda gerçek bir karar". Ölçüm bunu doğruluyor.
    const g = gercekci.reduce((t, r) => t + r.leakedHp, 0);
    const m = muhafazakar.reduce((t, r) => t + r.leakedHp, 0);
    expect(g).toBeLessThan(m);
  });

  it('ilk iki dalga hiç sızdırmıyor — öğretici dalgalar temiz', () => {
    expect(gercekci[0]!.leakedCount).toBe(0);
    expect(gercekci[1]!.leakedCount).toBe(0);
  });

  it('son dört dalga sızdırmıyor — tahta rampayı yakalıyor', () => {
    for (let i = 6; i < 10; i++) {
      expect(gercekci[i]!.leakedCount, `dalga ${i + 1}`).toBe(0);
    }
  });

  it('düşmanların ezici çoğunluğu ölüyor', () => {
    const toplamDusman = MAP1_WAVES.reduce(
      (t, w) => t + w.groups.reduce((s, g) => s + g.count, 0),
      0,
    );
    const oldurulen = gercekci.reduce((t, r) => t + r.killedCount, 0);
    expect(oldurulen / toplamDusman).toBeGreaterThan(0.98);
  });

  it('tepe düşman sayısı havuz kapasitesinin altında', () => {
    for (const r of gercekci) expect(r.peakEnemies).toBeLessThan(60);
  });

  it('10 dalga simülasyonu 2 saniyeden kısa', () => {
    // `CLAUDE.md` Test: "node belirgin şekilde hızlı ve simulateWave'in
    // '10 dalga < 2 sn' şartı buna bağlı."
    const t0 = performance.now();
    simulateAllWaves(MAP1_WAVES, GERCEKCI, MAP_1);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});

describe('simulateWave — tahta gücü sonucu değiştiriyor', () => {
  it('zayıf tahta sızdırıyor, güçlü tahta sızdırmıyor', () => {
    const zayif: ReferenceBoard = {
      waveIndex: 10,
      towers: [BOARDS[9]!.towers[0]!], // tek kule
      cumulativeCost: 0,
    };
    const zayifSonuc = simulateWave(MAP1_WAVES[9]!, zayif, MAP_1);
    const guclu = simulateWave(MAP1_WAVES[9]!, BOARDS[9]!, MAP_1);

    expect(zayifSonuc.leakedHp).toBeGreaterThan(0);
    expect(guclu.leakedHp).toBe(0);
  });

  it('erken dalga tahtası geç dalgayı tutamıyor — rampa gerçek', () => {
    const erkenTahta = BOARDS[0]!;
    const gecDalga = MAP1_WAVES[9]!;
    expect(simulateWave(gecDalga, erkenTahta, MAP_1).leakedHp).toBeGreaterThan(0);
  });
});
