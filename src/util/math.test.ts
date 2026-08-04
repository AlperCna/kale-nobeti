import { describe, it, expect } from 'vitest';
import { distSq, lerp, segmentLength, pointToSegmentDistSq, angleTo } from './math';

describe('distSq', () => {
  it('3-4-5 üçgeni: mesafe karesi 25', () => {
    expect(distSq({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });

  it('aynı nokta sıfır verir', () => {
    expect(distSq({ x: 7, y: -2 }, { x: 7, y: -2 })).toBe(0);
  });

  it('yön fark etmez', () => {
    const a = { x: -5, y: 12 };
    const b = { x: 4, y: -3 };
    expect(distSq(a, b)).toBe(distSq(b, a));
  });
});

describe('lerp', () => {
  it('t=0 başlangıcı verir', () => {
    expect(lerp({ x: 10, y: 20 }, { x: 30, y: 40 }, 0)).toEqual({ x: 10, y: 20 });
  });

  it('t=1 bitişi verir', () => {
    expect(lerp({ x: 10, y: 20 }, { x: 30, y: 40 }, 1)).toEqual({ x: 30, y: 40 });
  });

  it('t=0.5 orta noktayı verir', () => {
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 10 });
  });

  it('t kırpılmaz — çağıran sorumlu', () => {
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 0 }, 1.5)).toEqual({ x: 15, y: 0 });
  });
});

describe('segmentLength', () => {
  it('3-4-5 üçgeni: uzunluk 5', () => {
    expect(segmentLength({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('sıfır uzunluk', () => {
    expect(segmentLength({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it('kareler toplanamaz, uzunluklar toplanır', () => {
    // Yol uzunluğunun neden sqrt istediğinin kanıtı:
    // iki 3-4-5 segmenti = 10 uzunluk, ama kareler toplamı 50 ≠ 100.
    const a = { x: 0, y: 0 };
    const b = { x: 3, y: 4 };
    const c = { x: 6, y: 8 };
    const uzunlukToplami = segmentLength(a, b) + segmentLength(b, c);
    expect(uzunlukToplami).toBe(10);
    expect(distSq(a, b) + distSq(b, c)).toBe(50);
    expect(segmentLength(a, c)).toBe(10);
  });
});

describe('pointToSegmentDistSq', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };

  it('nokta segmentin ortasının üstünde', () => {
    expect(pointToSegmentDistSq({ x: 5, y: 3 }, a, b)).toBe(9);
  });

  it('nokta tam segment üstünde: sıfır', () => {
    expect(pointToSegmentDistSq({ x: 7, y: 0 }, a, b)).toBe(0);
  });

  it('nokta segmentin uzantısında: uç noktaya uzaklık', () => {
    // Sonsuz doğruya uzaklık 0 olurdu; segment olduğu için b'ye 5.
    expect(pointToSegmentDistSq({ x: 15, y: 0 }, a, b)).toBe(25);
  });

  it('nokta geriye uzantıda: a uç noktasına uzaklık', () => {
    expect(pointToSegmentDistSq({ x: -4, y: 0 }, a, b)).toBe(16);
  });

  it('uzantıda ve yanda: köşegen uzaklık', () => {
    // b'den 3 sağ, 4 yukarı → 25.
    expect(pointToSegmentDistSq({ x: 13, y: 4 }, a, b)).toBe(25);
  });

  it('sıfır uzunluklu segment: noktaya uzaklık, çökme yok', () => {
    const p = { x: 3, y: 4 };
    const s = { x: 0, y: 0 };
    expect(pointToSegmentDistSq(p, s, s)).toBe(25);
  });

  it('uç nokta sırası sonucu değiştirmez', () => {
    const p = { x: 5, y: 3 };
    expect(pointToSegmentDistSq(p, a, b)).toBe(pointToSegmentDistSq(p, b, a));
  });

  it('eğik segmentte doğru dik uzaklık', () => {
    // (0,0)-(4,4) segmentine (4,0) noktasının dik uzaklığı
    // izdüşüm (2,2), mesafe² = 4+4 = 8.
    expect(pointToSegmentDistSq({ x: 4, y: 0 }, { x: 0, y: 0 }, { x: 4, y: 4 })).toBeCloseTo(8, 10);
  });
});

describe('angleTo', () => {
  it('sağa bakış: 0', () => {
    expect(angleTo({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(0);
  });

  it('aşağı bakış: +π/2 (ekran koordinatında y aşağı)', () => {
    expect(angleTo({ x: 0, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(Math.PI / 2, 10);
  });

  it('sola bakış: π', () => {
    expect(Math.abs(angleTo({ x: 0, y: 0 }, { x: -5, y: 0 }))).toBeCloseTo(Math.PI, 10);
  });

  it('aynı nokta: 0, çökme yok', () => {
    expect(angleTo({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
  });
});
