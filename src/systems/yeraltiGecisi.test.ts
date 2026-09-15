/**
 * **Yeraltı geçişi** — `M12` Faz 1, harita 6'nın tanıttığı mekanik.
 *
 * Düşman yolun bir aralığında hedeflenemez oluyor. Test üç şeyi
 * bağlıyor: kuralın kendisi, oyunla simülasyonun **aynı** kuralı
 * çalıştırması, ve "dokunulmaz değil, hedeflenemez" ayrımı.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it } from 'vitest';
import { GOBLIN, TUNELCI } from '../data/enemies';
import { MAP_3 } from '../data/maps';
import { gomuluMu, selectTarget } from './TargetingSystem';
import { simulateWave } from './waveSim';
import type { EnemyDef, EnemyId, Targetable } from '../types/enemy';
import type { ReferenceBoard } from '../types/board';
import type { Vec2 } from '../types/common';

const KAZICI: EnemyDef = {
  ...GOBLIN,
  id: 'goblin',
  ability: { kind: 'burrow', fromFraction: 0.2, toFraction: 0.6 },
};

function dusman(oran: number, def: EnemyDef = KAZICI): Targetable {
  return {
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    alive: true,
    effects: { slowSeconds: 0 },
    remainingDistance: 1000 * (1 - oran),
    pathFraction: oran,
    def,
  };
}

const KULE = { x: 0, y: 0, rangeSq: 100 * 100, airMultiplier: 1 as const };

describe('Yeraltı geçişi — M12 Faz 1', () => {
  it('aralığın DIŞINDA hedeflenebilir', () => {
    expect(gomuluMu(dusman(0.1))).toBe(false);
    expect(gomuluMu(dusman(0.6))).toBe(false); // çıkış anı dahil DEĞİL
    expect(gomuluMu(dusman(0.9))).toBe(false);
  });

  it('aralığın İÇİNDE hedeflenemez', () => {
    expect(gomuluMu(dusman(0.2))).toBe(true); // giriş anı dahil
    expect(gomuluMu(dusman(0.4))).toBe(true);
    expect(gomuluMu(dusman(0.599))).toBe(true);
  });

  it('yeteneği olmayan düşman hiç etkilenmiyor', () => {
    for (const oran of [0, 0.3, 0.5, 1]) {
      expect(gomuluMu(dusman(oran, GOBLIN)), String(oran)).toBe(false);
    }
  });

  it('**hedef seçimi** gömülüyü atlıyor, üstteki düşmanı seçiyor', () => {
    const gomulu = dusman(0.4);
    const acikta = dusman(0.8);
    const secilen = selectTarget('first', [gomulu, acikta], KULE);
    expect(secilen).toBe(acikta);
  });

  it('menzilde YALNIZ gömülü varsa kule hedefsiz kalıyor', () => {
    expect(selectTarget('first', [dusman(0.4)], KULE)).toBeNull();
    expect(selectTarget('weakest', [dusman(0.4)], KULE)).toBeNull();
    expect(selectTarget('closest', [dusman(0.4)], KULE)).toBeNull();
  });

  it('çıkınca yeniden hedeflenebiliyor — durum tutulmuyor', () => {
    // `enrage` ile aynı sözleşme: bayrak yok, her çağrıda `pathFraction`
    // üzerinden türetiliyor. Havuza dönen düşmanda sıfırlanacak alan
    // doğmuyor (TIER 1 kural 3).
    const e = dusman(0.4);
    expect(selectTarget('first', [e], KULE)).toBeNull();
    const cikan = { ...e, pathFraction: 0.7 };
    expect(selectTarget('first', [cikan], KULE)).toBe(cikan);
  });
});

/**
 * **Yerleştirme artık düşmana bağlı** — mekaniğin asıl iddiası.
 *
 * Aynı dört kule, iki farklı nokta kümesi:
 * - **gömülü aralıktaki** noktalar (yolun %15-%60'ını gören, kapsaması
 *   yüksek noktalar),
 * - **aralık dışındaki** noktalar.
 *
 * Ölçülen (harita 3, Okçu T3a, sızan düşman sayısı):
 *
 * | Dalga | aralık içi tahta | aralık dışı tahta |
 * |---|---|---|
 * | Goblin ×6 | **0** | 3 |
 * | Tünelci ×6 | 5 | 5 |
 * | Goblin ×10 | **2** | 7 |
 * | Tünelci ×10 | 9 | 9 |
 *
 * Normal düşmana karşı kapsama kazanıyor; Tünelci'ye karşı o üstünlük
 * **tamamen siliniyor**. Yani "en yüksek kapsamalı noktayı doldur"
 * cevabı artık her zaman doğru değil.
 */
const YOL = MAP_3.paths[0]!;
const YOL_UZUNLUGU = YOL.reduce(
  (t, p, i) => (i === 0 ? 0 : t + Math.hypot(p.x - YOL[i - 1]!.x, p.y - YOL[i - 1]!.y)),
  0,
);

/** Yapı noktasının yolun hangi oranına denk geldiği (0..1). */
function noktaOrani(s: Vec2): number {
  let enIyi = Infinity;
  let oran = 0;
  let gidilen = 0;
  for (let i = 1; i < YOL.length; i++) {
    const a = YOL[i - 1]!;
    const b = YOL[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const t = Math.max(
      0,
      Math.min(1, ((s.x - a.x) * (b.x - a.x) + (s.y - a.y) * (b.y - a.y)) / (seg * seg || 1)),
    );
    const d = Math.hypot(s.x - (a.x + (b.x - a.x) * t), s.y - (a.y + (b.y - a.y) * t));
    if (d < enIyi) {
      enIyi = d;
      oran = (gidilen + seg * t) / YOL_UZUNLUGU;
    }
    gidilen += seg;
  }
  return oran;
}

const NOKTALAR = MAP_3.buildSpots.map((s, i) => ({
  i,
  oran: noktaOrani(s),
  kapsama: MAP_3.coverage[i]?.coveredPx ?? 0,
}));
const y = TUNELCI.ability;
const ARALIK = y?.kind === 'burrow' ? y : { fromFraction: 0.15, toFraction: 0.6 };
const ARALIK_ICI = NOKTALAR.filter(
  (n) => n.oran >= ARALIK.fromFraction && n.oran < ARALIK.toFraction,
)
  .sort((a, b) => b.kapsama - a.kapsama)
  .map((n) => n.i);
const ARALIK_DISI = NOKTALAR.filter((n) => n.oran >= ARALIK.toFraction)
  .sort((a, b) => b.kapsama - a.kapsama)
  .slice(0, ARALIK_ICI.length)
  .map((n) => n.i);

function tahta(noktalar: readonly number[]): ReferenceBoard {
  return {
    waveIndex: 10,
    cumulativeCost: 0,
    towers: noktalar.map((spotIndex) => ({
      spotIndex,
      towerId: 'okcu' as const,
      tier: 2 as const,
      targetMode: 'first' as const,
    })),
  };
}

function sizinti(enemy: EnemyId, adet: number, noktalar: readonly number[]): number {
  const w = { index: 10, groups: [{ enemy, count: adet, spawnDelay: 1.2, startAt: 0, spawnPoint: 0 }] };
  return simulateWave(w, tahta(noktalar), MAP_3).leakedCount;
}

describe('Yeraltı geçişi — yerleştirme artık düşmana bağlı', () => {
  it('ölçüm kurulumu geçerli: iki nokta kümesi de dolu', () => {
    expect(ARALIK_ICI.length).toBeGreaterThan(0);
    expect(ARALIK_DISI.length).toBe(ARALIK_ICI.length);
  });

  it('NORMAL düşmana karşı gömülü-aralık noktaları daha iyi', () => {
    expect(sizinti('goblin', 6, ARALIK_ICI)).toBeLessThan(sizinti('goblin', 6, ARALIK_DISI));
  });

  it('**TÜNELCİ’ye karşı o üstünlük siliniyor**', () => {
    const ici = sizinti('tunelci', 6, ARALIK_ICI);
    const disi = sizinti('tunelci', 6, ARALIK_DISI);
    expect(ici).toBeGreaterThanOrEqual(disi);
  });

  it('aynı tahtada Tünelci gömülü aralık yüzünden daha çok sızıyor', () => {
    // Aynı nokta kümesi, aynı adet: tek fark yeteneğin kendisi.
    expect(sizinti('tunelci', 6, ARALIK_ICI)).toBeGreaterThan(sizinti('goblin', 6, ARALIK_ICI));
  });
});
