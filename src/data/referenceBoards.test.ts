import { describe, it, expect } from 'vitest';
import {
  T2_BOARD_VS_BOSS,
  T3_CEILING_BOARD,
  ABILITY_CEILING_DAMAGE,
  BOSS_HP_BEFORE_NERF,
  BOSS_CEILING_BAND,
  M1_ENEMY_PROBES,
  ceilingA,
} from './referenceBoards';
import { MAP_1, COVERAGE_REFERENCE_RANGE } from './maps';
import { measureCoverage } from '../util/coverage';

/** Harita 1'de verilen menzilde ortalama kapsanan yol. Birim: px. */
function ortalamaKapsama(range: number): number {
  const c = measureCoverage(MAP_1.paths, MAP_1.buildSpots, range);
  return c.reduce((t, x) => t + x.coveredPx, 0) / c.length;
}

describe('`kapsama ≈ 2 × menzil` modeli — ölçümle sınanıyor', () => {
  // research/01 §4'ün TÜM tavan hesapları bu modele dayanıyordu.
  // research/03 §3 ise "≥ 450 px" diyordu (T1 menzili 150 için 3 × menzil).
  // Harita 1 çizildi; hangisi doğru artık ölçülebilir.
  it('T1 menzilinde (150) model %5 içinde tutuyor — 450 px değil ~300 px', () => {
    const ort = ortalamaKapsama(150);
    expect(ort / (2 * 150)).toBeGreaterThan(0.95);
    expect(ort / (2 * 150)).toBeLessThan(1.05);

    // research/03'ün "≥ 450 px" kriteri bu haritada sağlanmıyor — bilinçli.
    // Sağlansaydı boss 700 tavanın %52'sinde kalırdı (aşağıdaki test).
    expect(ort).toBeLessThan(450);
  });

  it('geniş menzillerde model biraz iyimserleşiyor ama %10 içinde', () => {
    // Menzil büyüdükçe viraj noktaları yolu daha çok kez görüyor.
    for (const r of [170, 180, 230, 260]) {
      const oran = ortalamaKapsama(r) / (2 * r);
      expect(oran).toBeGreaterThan(0.98);
      expect(oran).toBeLessThan(1.1);
    }
  });
});

describe('Kısıt A — boss', () => {
  const bossProbe = M1_ENEMY_PROBES.find((e) => e.id === 'ogreSef');

  it('boss HP hedef bandın içinde (%75-85)', () => {
    const tavan = ceilingA(
      T2_BOARD_VS_BOSS.totalDps,
      ortalamaKapsama(COVERAGE_REFERENCE_RANGE),
      bossProbe?.speed ?? 28,
    );
    const oran = (bossProbe?.hp ?? 0) / tavan;
    expect(oran).toBeGreaterThanOrEqual(BOSS_CEILING_BAND.min);
    expect(oran).toBeLessThanOrEqual(BOSS_CEILING_BAND.max);
  });

  it('450 px olsaydı boss bandın ÇOK altında kalırdı — çelişkinin çözümü', () => {
    // research/03 §3 ile research/01 §4 aynı anda doğru olamıyor. Bu test
    // hangisinin §5'teki boss değeriyle tutarlı olduğunu gösteriyor.
    const tavan450 = ceilingA(T2_BOARD_VS_BOSS.totalDps, 450, bossProbe?.speed ?? 28);
    const oran = (bossProbe?.hp ?? 0) / tavan450;
    expect(oran).toBeLessThan(0.6); // ölçülen: %52
  });
});

describe('Manşet bulgu — boss 2200 gerçekten geçilemez miydi?', () => {
  // `research/01` §4, `docs/research/README.md` §1, `GAME-DESIGN.md` §5 ve kök
  // `README.md`: "8 nokta T3 olsa ve Meteor iki kez kullanılsa bile mutlak
  // tavan 2200'ün altında." O hesap `kapsama = 2 × menzil` varsayımıyla
  // yapılmıştı ve 2131 çıkmıştı. Şimdi kapsama ÖLÇÜLÜYOR.
  const mutlakTavan =
    T3_CEILING_BOARD.reduce(
      (t, k) => t + k.count * k.dpsVsBoss * (ortalamaKapsama(k.range) / 28),
      0,
    ) + ABILITY_CEILING_DAMAGE;

  it('ölçülen mutlak tavan hâlâ 2200 altında — iddia ayakta', () => {
    expect(mutlakTavan).toBeLessThan(BOSS_HP_BEFORE_NERF);
  });

  it('ama pay ince: %3 altında', () => {
    // Ölçüm 2188 verdi, 2131 değil. İddia doğru ama "matematiksel olarak
    // imkânsız" değil, "pratik olarak imkânsız". Bu testin varlık sebebi:
    // biri kule menzillerini artırırsa manşet sessizce yanlışlanır.
    expect(BOSS_HP_BEFORE_NERF - mutlakTavan).toBeLessThan(0.03 * BOSS_HP_BEFORE_NERF);
    expect(mutlakTavan).toBeGreaterThan(2100);
  });
});

describe('Kısıt A — boss dışı düşmanlar (harita 1 geometrisi)', () => {
  const kapsama = ortalamaKapsama(COVERAGE_REFERENCE_RANGE);

  it('hepsi tavanın altında ve %15 pay var', () => {
    for (const e of M1_ENEMY_PROBES) {
      const sure = kapsama / e.speed;
      const tavan = ceilingA(e.approxDpsAgainst, kapsama, e.speed);
      const etkinHp = e.hp + (e.extraEffectiveHp?.(sure) ?? 0);
      // GAME-DESIGN §6 Kısıt A: tavan > HP × 1.15
      expect(tavan, `${e.id} tavanı`).toBeGreaterThan(etkinHp * 1.15);
    }
  });

  it('Trol boss dışındaki en tank düşman ama duvar değil', () => {
    // 400 ⚠️ işaretinin sebebi buydu: 300 px varsayımıyla türetilmişti.
    const trol = M1_ENEMY_PROBES.find((e) => e.id === 'trol');
    if (trol === undefined) throw new Error('trol yok');

    const sure = kapsama / trol.speed;
    const tavan = ceilingA(trol.approxDpsAgainst, kapsama, trol.speed);
    const oran = (trol.hp + (trol.extraEffectiveHp?.(sure) ?? 0)) / tavan;

    expect(oran).toBeGreaterThan(0.25); // Zırhlı Ork'tan (%22) tank
    expect(oran).toBeLessThan(0.5); // ama boss (%79) değil

    const digerleri = M1_ENEMY_PROBES.filter((e) => e.id !== 'trol' && e.id !== 'ogreSef').map(
      (e) => {
        const s = kapsama / e.speed;
        return (e.hp + (e.extraEffectiveHp?.(s) ?? 0)) / ceilingA(e.approxDpsAgainst, kapsama, e.speed);
      },
    );
    expect(oran).toBeGreaterThan(Math.max(...digerleri));
  });
});
