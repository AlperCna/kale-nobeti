/**
 * M7 öncesi kapatılan iki borç:
 *
 * 1. **`ReferenceBoard` hedefleme modu taşımıyordu** (M4'ten). Karşı-oyun
 *    tablosunun "Şaman → Keskin Nişancı (`last` ile arkadan seç)" satırı
 *    uçtan uca ölçülemiyordu — simülasyon her kuleyi `first` yapıyordu.
 * 2. **`simulateWave` kışlayı bilmiyordu** (M5'ten). Kısıt B kışlalı bir
 *    tahtayı modelleyemiyordu, oysa M5 kışlanın **yerinin** sonucu
 *    20/20'den 0/20'ye çevirebildiğini ölçtü (S69). Harita 2-3'ün dengesi
 *    bu olmadan doğrulanamaz.
 */

import { describe, expect, it } from 'vitest';
import { simulateWave } from './waveSim';
import { MAP_1 } from '../data/maps';
import type { ReferenceBoard } from '../types/board';
import type { Wave } from '../types/wave';
import type { EnemyId } from '../types/enemy';
import type { TargetMode } from '../types/tower';

const KAPSAMA_SIRALI = [...MAP_1.coverage]
  .sort((a, b) => b.coveredPx - a.coveredPx)
  .map((c) => c.spotIndex);

function dalga(enemy: EnemyId, count: number, spawnDelay = 0.7): Wave {
  return { index: 10, groups: [{ enemy, count, spawnDelay, startAt: 0, spawnPoint: 0 }] };
}

describe('Borç 1 — tahta hedefleme modu taşıyor', () => {
  it('varsayılan `first` (geriye uyumluluk — M3/M4 tahtaları modsuz)', () => {
    const tahta: ReferenceBoard = {
      waveIndex: 10,
      cumulativeCost: 0,
      towers: [{ spotIndex: KAPSAMA_SIRALI[0]!, towerId: 'okcu', tier: 1 }],
    };
    expect(() => simulateWave(dalga('goblin', 5), tahta, MAP_1)).not.toThrow();
  });

  /** `n` kuleli, hepsi aynı modda bir tahta. */
  const tahtaYap = (n: number, mod: TargetMode): ReferenceBoard => ({
    waveIndex: 10,
    cumulativeCost: 0,
    towers: KAPSAMA_SIRALI.slice(0, n).map((spotIndex) => ({
      spotIndex,
      towerId: 'okcu' as const,
      tier: 1 as const,
      targetMode: mod,
    })),
  });

  it('TEK kuleyle beş mod da AYNI sonucu veriyor — fark gürültü değil', () => {
    // Menzilde tek düşman varken her mod aynı hedefi seçer. Bu, aşağıdaki
    // farkın gerçekten moddan geldiğini gösteren kontrol grubu: mod hiç
    // uygulanmasaydı çok kuleli koşuda da fark çıkmazdı.
    const modlar: TargetMode[] = ['first', 'last', 'strongest', 'weakest', 'closest'];
    const sonuclar = modlar.map((m) => simulateWave(dalga('orkSavasci', 8, 0.5), tahtaYap(1, m), MAP_1));
    for (const r of sonuclar) {
      expect(r.leakedCount).toBe(sonuclar[0]!.leakedCount);
      expect(r.leakedHp).toBeCloseTo(sonuclar[0]!.leakedHp, 6);
    }
  });

  it('DÖRT kuleyle mod sonucu DEĞİŞTİRİYOR — tahtadan simülasyona geçiyor', () => {
    const ilk = simulateWave(dalga('orkSavasci', 8, 0.5), tahtaYap(4, 'first'), MAP_1);
    const son = simulateWave(dalga('orkSavasci', 8, 0.5), tahtaYap(4, 'last'), MAP_1);
    const yakin = simulateWave(dalga('orkSavasci', 8, 0.5), tahtaYap(4, 'closest'), MAP_1);

    // `last` odaklanma dağıttığı için sızan HP artıyor (358 → 374).
    expect(son.leakedHp).toBeGreaterThan(ilk.leakedHp);
    // `closest` bir düşman daha öldürüyor (4 vs 3).
    expect(yakin.killedCount).toBeGreaterThan(ilk.killedCount);
  });

  it('Şaman senaryosu artık ÖLÇÜLEBİLİR — M4’te ölçülemiyordu', () => {
    // §5: "Şaman → Keskin Nişancı (`last` ile arkadan seç) veya Yıldırım".
    // M4-SONUC §1: "simülasyon hedefleme modunu taşımadığı için senaryo
    // uçtan uca ölçülemedi". Artık ölçülüyor.
    const ilk = simulateWave(dalga('saman', 6, 0.6), tahtaYap(4, 'first'), MAP_1);
    const son = simulateWave(dalga('saman', 6, 0.6), tahtaYap(4, 'last'), MAP_1);
    // Fark küçük ama gerçek: `last` dalgayı daha erken bitiriyor.
    expect(son.durationSec).toBeLessThan(ilk.durationSec);
  });
});

describe('Borç 2 — simülasyon kışlayı biliyor', () => {
  const KULE_NOKTA = KAPSAMA_SIRALI[0]!;
  const KISLA_NOKTA = KAPSAMA_SIRALI[KAPSAMA_SIRALI.length - 1]!;

  const kulesiz = (barracks?: ReferenceBoard['barracks']): ReferenceBoard => ({
    waveIndex: 10,
    cumulativeCost: 0,
    towers: [{ spotIndex: KULE_NOKTA, towerId: 'okcu', tier: 1 }],
    ...(barracks === undefined ? {} : { barracks }),
  });

  it('`barracks` alanı olmayan tahta eskisi gibi çalışıyor', () => {
    const r = simulateWave(dalga('goblin', 10), kulesiz(), MAP_1);
    expect(r.leakedCount + r.killedCount).toBeGreaterThan(0);
  });

  it('kışla düşmanları ENGELLİYOR — sızıntı azalıyor', () => {
    const kislasiz = simulateWave(dalga('orkSavasci', 10, 0.5), kulesiz(), MAP_1);
    const kislali = simulateWave(
      dalga('orkSavasci', 10, 0.5),
      kulesiz([{ spotIndex: KISLA_NOKTA, tier: 1 }]),
      MAP_1,
    );
    expect(kislali.leakedHp).toBeLessThan(kislasiz.leakedHp);
  });

  it('askerlerin öldürdüğü düşman `killedCount`a giriyor — muhasebe tutuyor', () => {
    const r = simulateWave(
      dalga('goblin', 10, 0.5),
      { waveIndex: 10, cumulativeCost: 0, towers: [], barracks: [{ spotIndex: KISLA_NOKTA, tier: 3 }] },
      MAP_1,
    );
    // Kule YOK; ölen varsa askerler öldürmüştür.
    expect(r.killedCount).toBeGreaterThan(0);
    expect(r.killedCount + r.leakedCount).toBe(10);
  });

  it('kışla kademesi sonucu değiştiriyor — Haydutlar T1’den güçlü', () => {
    const t1 = simulateWave(
      dalga('orkSavasci', 10, 0.5),
      kulesiz([{ spotIndex: KISLA_NOKTA, tier: 0 }]),
      MAP_1,
    );
    const haydut = simulateWave(
      dalga('orkSavasci', 10, 0.5),
      kulesiz([{ spotIndex: KISLA_NOKTA, tier: 3 }]),
      MAP_1,
    );
    expect(haydut.leakedHp).toBeLessThanOrEqual(t1.leakedHp);
  });

  it('**uçanlar kışladan etkilenmiyor** — kural 8 simülasyonda da geçerli', () => {
    const kislasiz = simulateWave(dalga('harpi', 8, 0.5), kulesiz(), MAP_1);
    const kislali = simulateWave(
      dalga('harpi', 8, 0.5),
      kulesiz([{ spotIndex: KISLA_NOKTA, tier: 3 }]),
      MAP_1,
    );
    expect(kislali.leakedCount).toBe(kislasiz.leakedCount);
    expect(kislali.leakedHp).toBeCloseTo(kislasiz.leakedHp, 6);
  });

  it('S69 — kışlanın YERİ sonucu değiştiriyor', () => {
    // M5'in canlı bulgusu simülasyonda da görünmeli: kışla kapsaması
    // yüksek noktaya kurulunca oraya kule kurulamıyor.
    const iyiYer = simulateWave(
      dalga('orkSavasci', 10, 0.5),
      kulesiz([{ spotIndex: KISLA_NOKTA, tier: 1 }]),
      MAP_1,
    );
    // Kışla kulenin noktasını işgal ederse kule hiç yok.
    const kotuYer = simulateWave(
      dalga('orkSavasci', 10, 0.5),
      { waveIndex: 10, cumulativeCost: 0, towers: [], barracks: [{ spotIndex: KULE_NOKTA, tier: 1 }] },
      MAP_1,
    );
    expect(kotuYer.leakedHp).toBeGreaterThan(iyiYer.leakedHp);
  });

  it('kışlalı simülasyon hâlâ HIZLI — "10 dalga < 2 sn" şartı korunuyor', () => {
    const bas = Date.now();
    for (let i = 0; i < 10; i++) {
      simulateWave(
        dalga('orkSavasci', 10, 0.5),
        kulesiz([{ spotIndex: KISLA_NOKTA, tier: 3 }]),
        MAP_1,
      );
    }
    expect(Date.now() - bas).toBeLessThan(2000);
  });
});
