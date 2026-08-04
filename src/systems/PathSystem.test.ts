import { describe, it, expect } from 'vitest';
import { PathSystem } from './PathSystem';
import { MAP_1 } from '../data/maps';
import type { Vec2 } from '../types/common';

/** 3-4-5 üçgeni + düz parça: uzunlukları elle doğrulanabilir. */
const YOL: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 300, y: 400 }, // uzunluk 500
  { x: 300, y: 500 }, // uzunluk 100
  { x: 700, y: 500 }, // uzunluk 400
];
// toplam 1000

describe('PathSystem — kuruluş', () => {
  it('totalLength segment uzunlukları toplamına eşit', () => {
    expect(new PathSystem(YOL).totalLength).toBe(1000);
  });

  it('segmentCount = waypoint − 1', () => {
    expect(new PathSystem(YOL).segmentCount).toBe(3);
  });

  it('2 noktadan az yol hata veriyor — sessizce donmuyor', () => {
    expect(() => new PathSystem([{ x: 0, y: 0 }])).toThrow(/en az 2 waypoint/);
    expect(() => new PathSystem([])).toThrow();
  });

  it('start yolun başında ve kalan mesafe tam uzunluk', () => {
    const s = new PathSystem(YOL).start();
    expect(s).toEqual({ segmentIndex: 0, tInSegment: 0, remainingDistance: 1000 });
  });
});

describe('PathSystem — advance', () => {
  const sys = new PathSystem(YOL);

  it('tek segment içinde ilerliyor', () => {
    const p = sys.advance(sys.start(), 250);
    expect(p.segmentIndex).toBe(0);
    expect(p.tInSegment).toBeCloseTo(0.5, 10);
    expect(p.remainingDistance).toBeCloseTo(750, 10);
  });

  it('girdiyi değiştirmiyor — saf', () => {
    const once = sys.start();
    const kopya = { ...once };
    sys.advance(once, 250);
    expect(once).toEqual(kopya);
  });

  it('segment sınırını tam yakalıyor', () => {
    // 500 px = 0. segmentin tamamı; 1. segmentin başında olmalı.
    const p = sys.advance(sys.start(), 500);
    expect(p.segmentIndex).toBe(1);
    expect(p.tInSegment).toBeCloseTo(0, 10);
    expect(p.remainingDistance).toBeCloseTo(500, 10);
  });

  it('bir adımda İKİ segment geçebiliyor', () => {
    // 650 px: 0. segment (500) tamamen + 1. segmentin (100) tamamı
    // + 2. segmentin 50'si.
    const p = sys.advance(sys.start(), 650);
    expect(p.segmentIndex).toBe(2);
    expect(p.tInSegment).toBeCloseTo(50 / 400, 10);
    expect(p.remainingDistance).toBeCloseTo(350, 10);
  });

  it('tek dev adım yol sonunu aşarsa sonda duruyor', () => {
    const p = sys.advance(sys.start(), 99999);
    expect(p.segmentIndex).toBe(2);
    expect(p.tInSegment).toBe(1);
    expect(p.remainingDistance).toBe(0);
    expect(sys.reachedEnd(p)).toBe(true);
  });

  it('remainingDistance monoton azalıyor ve hiç negatif olmuyor', () => {
    let p = sys.start();
    let onceki = p.remainingDistance;
    for (let i = 0; i < 500; i++) {
      p = sys.advance(p, 7.3);
      expect(p.remainingDistance).toBeLessThanOrEqual(onceki);
      expect(p.remainingDistance).toBeGreaterThanOrEqual(0);
      onceki = p.remainingDistance;
    }
    expect(sys.reachedEnd(p)).toBe(true);
  });

  it('remainingDistance türetiliyor — 10 000 küçük adımda sapma yok', () => {
    // Kare kare çıkarma yapılsaydı kayan nokta hatası burada birikirdi.
    let p = sys.start();
    for (let i = 0; i < 10_000; i++) p = sys.advance(p, 0.05);
    // 10 000 × 0,05 = 500 px yürüdü → 1. segmentin başında.
    expect(p.remainingDistance).toBeCloseTo(500, 6);
  });

  it('0, negatif ve NaN hareket durumu bozmuyor', () => {
    const p = sys.advance(sys.start(), 250);
    expect(sys.advance(p, 0)).toEqual(p);
    expect(sys.advance(p, -10)).toEqual(p);
    expect(sys.advance(p, Number.NaN)).toEqual(p);
  });

  it('yol sonunda ilerlemeye devam etmek güvenli', () => {
    let p = sys.advance(sys.start(), 1000);
    for (let i = 0; i < 5; i++) p = sys.advance(p, 100);
    expect(p.remainingDistance).toBe(0);
    expect(p.segmentIndex).toBe(2);
    expect(p.tInSegment).toBe(1);
  });

  it('sıfır uzunluklu segment sonsuz döngüye girmiyor', () => {
    const bozuk: readonly Vec2[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 }, // sıfır uzunluk
      { x: 100, y: 0 },
    ];
    const s = new PathSystem(bozuk);
    expect(s.totalLength).toBe(100);
    const p = s.advance(s.start(), 40);
    expect(p.remainingDistance).toBeCloseTo(60, 10);
  });
});

describe('PathSystem — positionAt', () => {
  const sys = new PathSystem(YOL);

  it('başlangıç ilk waypoint', () => {
    expect(sys.positionAt(sys.start())).toEqual({ x: 0, y: 0 });
  });

  it('segment ortası', () => {
    const p = sys.advance(sys.start(), 250);
    expect(sys.positionAt(p)).toEqual({ x: 150, y: 200 });
  });

  it('yol sonu son waypoint', () => {
    const p = sys.advance(sys.start(), 1000);
    expect(sys.positionAt(p)).toEqual({ x: 700, y: 500 });
  });

  it('kat edilen mesafe ile konum tutarlı — köşe kesme yok (S13)', () => {
    // Keskin dönüşte düşman köşe noktasından TAM geçiyor.
    const p = sys.advance(sys.start(), 500);
    expect(sys.positionAt(p)).toEqual({ x: 300, y: 400 });
  });
});

describe('PathSystem — Harita 1 üzerinde', () => {
  const sys = new PathSystem(MAP_1.paths[0] ?? []);

  it("totalLength maps.ts'teki ölçümle aynı", () => {
    expect(sys.totalLength).toBe(1700);
  });

  it('yol sonu kaleye denk geliyor', () => {
    const p = sys.advance(sys.start(), sys.totalLength);
    expect(sys.positionAt(p)).toEqual(MAP_1.castle);
    expect(sys.reachedEnd(p)).toBe(true);
  });

  it('en hızlı düşman (110 px/sn) 2× hızda yolu tek parça yürüyor', () => {
    // 110 px/sn × 2 = 220 px/sn. 30 FPS'te kare başına ~7,3 px.
    let p = sys.start();
    let kare = 0;
    while (!sys.reachedEnd(p) && kare < 10_000) {
      p = sys.advance(p, 220 * (1 / 30));
      kare++;
    }
    expect(sys.reachedEnd(p)).toBe(true);
    // 1700 / 220 ≈ 7,7 sn → 30 FPS'te ~232 kare.
    expect(kare).toBeGreaterThan(220);
    expect(kare).toBeLessThan(245);
  });
});
