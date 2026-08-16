import { describe, it, expect } from 'vitest';
import {
  distSq,
  lerp,
  segmentLength,
  pointToSegmentDistSq,
  angleTo,
  segmentCircleOverlapLength,
  closestPointOnSegment,
  closestPointOnPath,
  quadraticBezier,
} from './math';

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

describe('segmentCircleOverlapLength', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 1000, y: 0 };

  it('çemberi hiç kesmiyor: 0', () => {
    expect(segmentCircleOverlapLength(a, b, { x: 500, y: 400 }, 150)).toBe(0);
  });

  it('merkez segment üstünde: tam çap', () => {
    expect(segmentCircleOverlapLength(a, b, { x: 500, y: 0 }, 150)).toBeCloseTo(300, 9);
  });

  it('yandan bakış: kiriş 2√(r²−d²)', () => {
    const d = 90;
    const r = 150;
    const beklenen = 2 * Math.sqrt(r * r - d * d);
    expect(segmentCircleOverlapLength(a, b, { x: 500, y: d }, r)).toBeCloseTo(beklenen, 9);
  });

  it('tam teğet: 0', () => {
    expect(segmentCircleOverlapLength(a, b, { x: 500, y: 150 }, 150)).toBeCloseTo(0, 9);
  });

  it('segment ucu çemberin içinde: kırpılıyor', () => {
    // Merkez a'nın üstünde; sonsuz doğru 300 verirdi, segment yarısını verir.
    expect(segmentCircleOverlapLength(a, b, { x: 0, y: 0 }, 150)).toBeCloseTo(150, 9);
  });

  it('segment tamamen çemberin içinde: segment uzunluğu', () => {
    const kisa = { x: 10, y: 0 };
    expect(segmentCircleOverlapLength(a, kisa, { x: 5, y: 0 }, 150)).toBeCloseTo(10, 9);
  });

  it('çember segmentin uzantısında: 0', () => {
    expect(segmentCircleOverlapLength(a, b, { x: 1300, y: 0 }, 150)).toBe(0);
  });

  it('sıfır uzunluklu segment: 0, çökme yok', () => {
    expect(segmentCircleOverlapLength(a, a, { x: 0, y: 0 }, 150)).toBe(0);
  });

  it('sıfır veya negatif yarıçap: 0', () => {
    expect(segmentCircleOverlapLength(a, b, { x: 500, y: 0 }, 0)).toBe(0);
    expect(segmentCircleOverlapLength(a, b, { x: 500, y: 0 }, -5)).toBe(0);
  });

  it('uç nokta sırası sonucu değiştirmez', () => {
    const c = { x: 500, y: 60 };
    expect(segmentCircleOverlapLength(a, b, c, 150)).toBeCloseTo(
      segmentCircleOverlapLength(b, a, c, 150),
      9,
    );
  });

  it('eğik segmentte de doğru', () => {
    // (0,0)-(100,100) segmenti, merkez (50,50), r=10 → çap 20.
    expect(
      segmentCircleOverlapLength({ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 50 }, 10),
    ).toBeCloseTo(20, 9);
  });
});

describe('closestPointOnSegment / closestPointOnPath (M5 — kural 6)', () => {
  it('segment üstündeki dik izdüşüm', () => {
    const p = closestPointOnSegment({ x: 5, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(p.x).toBeCloseTo(5, 9);
    expect(p.y).toBeCloseTo(0, 9);
  });

  it('segment DIŞINA düşen izdüşüm uç noktaya kırpılıyor', () => {
    const p = closestPointOnSegment({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(p.x).toBeCloseTo(10, 9);
  });

  it('sıfır uzunluklu segment — sıfıra bölme yok', () => {
    const p = closestPointOnSegment({ x: 5, y: 5 }, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(p).toEqual({ x: 1, y: 1 });
  });

  it('çok segmentli yolda EN YAKIN segment seçiliyor', () => {
    const yol = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const r = closestPointOnPath({ x: 95, y: 60 }, yol);
    expect(r.point.x).toBeCloseTo(100, 9);
    expect(r.point.y).toBeCloseTo(60, 9);
    expect(r.distSq).toBeCloseTo(25, 9);
  });

  it('mesafe KARESEL dönüyor — TIER 1 kural 9', () => {
    const r = closestPointOnPath({ x: 0, y: 3 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(r.distSq).toBeCloseTo(9, 9); // 3² — kök alınmamış
  });

  it('boş ve tek noktalı yol çökmüyor', () => {
    expect(closestPointOnPath({ x: 4, y: 4 }, []).distSq).toBe(0);
    expect(closestPointOnPath({ x: 4, y: 0 }, [{ x: 0, y: 0 }]).distSq).toBeCloseTo(16, 9);
  });

  it('pointToSegmentDistSq ile TUTARLI — iki fonksiyon ayrışamaz', () => {
    const a = { x: 3, y: 7 };
    const b = { x: 40, y: -12 };
    for (const p of [{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: -30, y: 5 }, { x: 60, y: 60 }]) {
      const nokta = closestPointOnSegment(p, a, b);
      expect(distSq(p, nokta)).toBeCloseTo(pointToSegmentDistSq(p, a, b), 9);
    }
  });
});

describe('quadraticBezier', () => {
  it('t=0 başlangıcı verir', () => {
    const r = quadraticBezier({ x: 0, y: 0 }, { x: 50, y: -80 }, { x: 100, y: 0 }, 0);
    expect(r).toEqual({ x: 0, y: 0 });
  });

  it('t=1 bitişi verir', () => {
    const r = quadraticBezier({ x: 0, y: 0 }, { x: 50, y: -80 }, { x: 100, y: 0 }, 1);
    expect(r).toEqual({ x: 100, y: 0 });
  });

  it('t=0.5 — düz çizgi kontrol noktasına eşit ağırlıkta çekilir', () => {
    // Kontrol noktası doğrudan orta noktaysa eğri de oradan geçer.
    const r = quadraticBezier({ x: 0, y: 0 }, { x: 50, y: -40 }, { x: 100, y: 0 }, 0.5);
    expect(r.x).toBeCloseTo(50, 9);
    expect(r.y).toBeCloseTo(-20, 9); // uçlar 0'da, kontrol -40'ta — orta -20
  });

  it('kontrol noktası uçların ÜSTÜNDEyse eğri yukarı kabarır — altın uçuşu kavisi', () => {
    const baslangic = { x: 0, y: 100 };
    const bitis = { x: 200, y: 100 };
    const kontrol = { x: 100, y: 0 }; // uçlardan çok daha yukarıda
    const orta = quadraticBezier(baslangic, kontrol, bitis, 0.5);
    expect(orta.y).toBeLessThan(baslangic.y); // ekranda küçük y = yukarı
  });

  it('kontrol noktası uçlarla aynı doğruysa eğri DÜZ çizgiye eşit — lerp ile tutarlı', () => {
    const a = { x: 10, y: 20 };
    const b = { x: 90, y: 60 };
    const orta = lerp(a, b, 0.5); // doğru üstünde bir nokta, kontrol olarak kullanılabilir
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const bez = quadraticBezier(a, orta, b, t);
      const duz = lerp(a, b, t);
      expect(bez.x).toBeCloseTo(duz.x, 9);
      expect(bez.y).toBeCloseTo(duz.y, 9);
    }
  });
});
