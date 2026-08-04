import { describe, it, expect } from 'vitest';
import { coveredLength, measureCoverage, pathLength, spotsCoveringFlyerPaths } from './coverage';
import { distSq, lerp, segmentLength } from './math';
import type { Vec2 } from '../types/common';

/** Uzun düz yol — kenar etkisi olmadan ölçüm yapabilmek için. */
const DUZ: readonly Vec2[] = [
  { x: 0, y: 100 },
  { x: 1000, y: 100 },
];

/**
 * Bağımsız kâhin: örneklemeli kapsama.
 *
 * Üretim kodu analitik; bu ise tamamen farklı bir yöntemle aynı sayıyı
 * hesaplıyor. İkisinin uyuşması, formülün cebirsel olarak da geometrik
 * olarak da doğru olduğunun kanıtı — tek bir hesabın kendini
 * doğrulamasından güçlü.
 */
function orneklemeKapsama(path: readonly Vec2[], spot: Vec2, range: number, step = 0.25): number {
  const rangeSq = range * range;
  let toplam = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (a === undefined || b === undefined) continue;
    const uzunluk = segmentLength(a, b);
    if (uzunluk === 0) continue;
    const adet = Math.max(1, Math.ceil(uzunluk / step));
    const dilim = uzunluk / adet;
    for (let k = 0; k < adet; k++) {
      if (distSq(lerp(a, b, (k + 0.5) / adet), spot) <= rangeSq) toplam += dilim;
    }
  }
  return toplam;
}

describe('coveredLength', () => {
  it('yoldan uzak nokta: 0', () => {
    expect(coveredLength(DUZ, { x: 500, y: 900 }, 150)).toBe(0);
  });

  it('düz yol merkezden geçiyor: tam 2 × menzil', () => {
    // research/01 §4'ün "300 px" varsayımının geldiği geometri.
    // Analitik olduğu için yaklaşık değil, TAM 300.
    expect(coveredLength(DUZ, { x: 500, y: 100 }, 150)).toBeCloseTo(300, 9);
  });

  it('yandan bakan nokta: kiriş formülü 2√(r²−d²)', () => {
    // d = 90, r = 150 → 2 × √(22500 − 8100) = 2 × 120 = 240
    expect(coveredLength(DUZ, { x: 500, y: 10 }, 150)).toBeCloseTo(240, 9);
  });

  it('menzil kenarına tam teğet: 0', () => {
    // d = r → kiriş sıfır uzunlukta.
    expect(coveredLength(DUZ, { x: 500, y: 100 - 150 }, 150)).toBeCloseTo(0, 9);
  });

  it('teğetin bir hair içinde: pozitif ama küçük', () => {
    const kapsanan = coveredLength(DUZ, { x: 500, y: 100 - 149 }, 150);
    expect(kapsanan).toBeGreaterThan(0);
    expect(kapsanan).toBeLessThan(40);
  });

  it('yol menzilden İKİ kez geçiyor: toplanıyor, 2r ile sınırlanmıyor', () => {
    // Saç tokası: sağa git, aşağı in, geri dön. Nokta ikisini de görüyor.
    const tokali: readonly Vec2[] = [
      { x: 0, y: 100 },
      { x: 1000, y: 100 },
      { x: 1000, y: 160 },
      { x: 0, y: 160 },
    ];
    const kapsanan = coveredLength(tokali, { x: 500, y: 130 }, 150);
    // İki paralel geçiş, her biri 2√(150²−30²) = 2×146.97 ≈ 293.9 → ~588.
    // Kritik olan: 2 × menzil = 300'ü AŞMASI.
    expect(kapsanan).toBeGreaterThan(300);
    expect(kapsanan).toBeCloseTo(2 * 2 * Math.sqrt(150 * 150 - 30 * 30), 6);
  });

  it('analitik sonuç bağımsız örnekleme kâhiniyle uyuşuyor', () => {
    const senaryolar: ReadonlyArray<{ spot: Vec2; r: number }> = [
      { spot: { x: 500, y: 100 }, r: 150 },
      { spot: { x: 500, y: 40 }, r: 150 },
      { spot: { x: 500, y: 10 }, r: 150 },
      { spot: { x: 20, y: 100 }, r: 150 }, // yol başına yakın, kırpma devrede
      { spot: { x: 990, y: 100 }, r: 260 }, // yol sonuna yakın
    ];
    for (const { spot, r } of senaryolar) {
      const analitik = coveredLength(DUZ, spot, r);
      const ornek = orneklemeKapsama(DUZ, spot, r);
      expect(Math.abs(analitik - ornek)).toBeLessThan(1);
    }
  });

  it('yol ucunda kırpma: yarım kiriş', () => {
    // Nokta yolun tam başında, menzil geriye taşıyor ama yol orada bitiyor.
    // Sonsuz doğru 300 verirdi; segment olduğu için yarısı: 150.
    expect(coveredLength(DUZ, { x: 0, y: 100 }, 150)).toBeCloseTo(150, 9);
  });

  it('sıfır uzunluklu segment çökmüyor', () => {
    const bozuk: readonly Vec2[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(() => coveredLength(bozuk, { x: 50, y: 0 }, 150)).not.toThrow();
    expect(coveredLength(bozuk, { x: 50, y: 0 }, 150)).toBeGreaterThan(0);
  });

  it('geçersiz girdiler 0 veriyor', () => {
    expect(coveredLength([], { x: 0, y: 0 }, 150)).toBe(0);
    expect(coveredLength([{ x: 0, y: 0 }], { x: 0, y: 0 }, 150)).toBe(0);
    expect(coveredLength(DUZ, { x: 500, y: 100 }, 0)).toBe(0);
    expect(coveredLength(DUZ, { x: 500, y: 100 }, -10)).toBe(0);
  });

  it('kapsama menzille birlikte büyüyor', () => {
    const spot = { x: 500, y: 100 };
    expect(coveredLength(DUZ, spot, 200)).toBeGreaterThan(coveredLength(DUZ, spot, 100));
  });
});

describe('measureCoverage', () => {
  it('her yapı noktası için ayrı sonuç, sırayla', () => {
    const spots = [
      { x: 500, y: 100 }, // yol üstünde
      { x: 500, y: 900 }, // uzak
    ];
    const sonuc = measureCoverage([DUZ], spots, 150);

    expect(sonuc).toHaveLength(2);
    expect(sonuc[0]?.spotIndex).toBe(0);
    expect(sonuc[0]?.coveredPx).toBeCloseTo(300, 9);
    expect(sonuc[1]?.spotIndex).toBe(1);
    expect(sonuc[1]?.coveredPx).toBe(0);
  });

  it('çoklu giriş: yolların kapsamaları toplanıyor', () => {
    // DEPENDENCIES §1 — harita 3'ün iki girişi var.
    const yol2: readonly Vec2[] = [
      { x: 0, y: 160 },
      { x: 1000, y: 160 },
    ];
    const spot = { x: 500, y: 130 };
    const tek = measureCoverage([DUZ], [spot], 150)[0]?.coveredPx ?? 0;
    const cift = measureCoverage([DUZ, yol2], [spot], 150)[0]?.coveredPx ?? 0;

    expect(cift).toBeCloseTo(tek * 2, 6); // iki simetrik yol
  });

  it('yapı noktası yoksa boş dizi', () => {
    expect(measureCoverage([DUZ], [], 150)).toEqual([]);
  });
});

describe('pathLength', () => {
  it('düz yol', () => {
    expect(pathLength(DUZ)).toBe(1000);
  });

  it('köşeli yol: segmentler toplanıyor', () => {
    const kose: readonly Vec2[] = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 400 },
    ];
    expect(pathLength(kose)).toBe(700);
  });

  it('tek nokta: 0', () => {
    expect(pathLength([{ x: 5, y: 5 }])).toBe(0);
  });
});

describe('spotsCoveringFlyerPaths', () => {
  it('uçan hattını gören nokta sayısını veriyor', () => {
    const ucus: readonly Vec2[] = [
      { x: 0, y: 300 },
      { x: 1000, y: 300 },
    ];
    const spots = [
      { x: 200, y: 300 }, // hat üstünde
      { x: 600, y: 350 }, // yakın
      { x: 800, y: 900 }, // uzak
    ];
    expect(spotsCoveringFlyerPaths([ucus], spots, 150)).toBe(2);
  });

  it('hiçbiri görmüyorsa 0 — harpi garantili sızar', () => {
    const ucus: readonly Vec2[] = [
      { x: 0, y: 900 },
      { x: 1000, y: 900 },
    ];
    expect(spotsCoveringFlyerPaths([ucus], [{ x: 500, y: 100 }], 150)).toBe(0);
  });
});
