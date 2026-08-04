import { describe, it, expect } from 'vitest';
import { findSpotAt, SpotOccupancy, SPOT_HIT_RADIUS } from './buildSpots';
import { MAP_1 } from '../data/maps';
import type { Vec2 } from '../types/common';

const NOKTALAR: readonly Vec2[] = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 100, y: 300 },
];

describe('findSpotAt', () => {
  it('tam üstündeki noktayı buluyor', () => {
    expect(findSpotAt({ x: 100, y: 100 }, NOKTALAR)).toBe(0);
    expect(findSpotAt({ x: 300, y: 100 }, NOKTALAR)).toBe(1);
  });

  it('tıklama yarıçapı içinde buluyor', () => {
    expect(findSpotAt({ x: 100 + SPOT_HIT_RADIUS - 1, y: 100 }, NOKTALAR)).toBe(0);
  });

  it('yarıçap sınırında dahil', () => {
    expect(findSpotAt({ x: 100 + SPOT_HIT_RADIUS, y: 100 }, NOKTALAR)).toBe(0);
  });

  it('yarıçap dışında -1', () => {
    expect(findSpotAt({ x: 100 + SPOT_HIT_RADIUS + 1, y: 100 }, NOKTALAR)).toBe(-1);
    expect(findSpotAt({ x: 700, y: 700 }, NOKTALAR)).toBe(-1);
  });

  it('iki nokta da menzildeyse EN YAKIN kazanıyor, dizi sırası değil', () => {
    const yakinlar: readonly Vec2[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
    ];
    // (18,0) ikinciye 2 px, ilkine 18 px.
    expect(findSpotAt({ x: 18, y: 0 }, yakinlar, 30)).toBe(1);
  });

  it('boş liste -1', () => {
    expect(findSpotAt({ x: 0, y: 0 }, [])).toBe(-1);
  });

  it('tıklama alanı görsel daireden büyük — Platform 44×44', () => {
    // Görsel yarıçap 22 (GameScene SPOT_RADIUS), tıklama 24 → çap 48 ≥ 44.
    expect(SPOT_HIT_RADIUS * 2).toBeGreaterThanOrEqual(44);
    expect(SPOT_HIT_RADIUS).toBeGreaterThan(22);
  });
});

describe('findSpotAt — Harita 1 üzerinde', () => {
  it('8 yapı noktasının hepsi kendi merkezinden bulunuyor', () => {
    MAP_1.buildSpots.forEach((s, i) => {
      expect(findSpotAt(s, MAP_1.buildSpots)).toBe(i);
    });
  });

  it('yapı noktaları birbirine karışmıyor — tıklama alanları çakışmıyor', () => {
    // İki nokta 2 × SPOT_HIT_RADIUS'tan yakınsa tıklama belirsizleşir.
    for (let i = 0; i < MAP_1.buildSpots.length; i++) {
      for (let j = i + 1; j < MAP_1.buildSpots.length; j++) {
        const a = MAP_1.buildSpots[i]!;
        const b = MAP_1.buildSpots[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        expect(d, `nokta ${i} ↔ ${j}`).toBeGreaterThan(2 * SPOT_HIT_RADIUS);
      }
    }
  });

  it('yolun ortasına tıklamak hiçbir noktayı seçmiyor', () => {
    expect(findSpotAt({ x: 400, y: 140 }, MAP_1.buildSpots)).toBe(-1);
  });
});

describe('SpotOccupancy', () => {
  it('başlangıçta hepsi boş', () => {
    const o = new SpotOccupancy(8);
    expect(o.count).toBe(8);
    expect(o.occupiedCount).toBe(0);
    for (let i = 0; i < 8; i++) expect(o.isOccupied(i)).toBe(false);
  });

  it('doldurulan nokta ikinci kez KABUL ETMİYOR', () => {
    // "Bitmedi sayılır eğer: aynı noktaya iki kule konabiliyorsa."
    const o = new SpotOccupancy(8);
    expect(o.occupy(3)).toBe(true);
    expect(o.occupy(3)).toBe(false);
    expect(o.occupiedCount).toBe(1);
  });

  it('8 noktanın hepsi dolabiliyor', () => {
    const o = new SpotOccupancy(8);
    for (let i = 0; i < 8; i++) expect(o.occupy(i)).toBe(true);
    expect(o.occupiedCount).toBe(8);
  });

  it('geçersiz indeks reddediliyor', () => {
    const o = new SpotOccupancy(8);
    expect(o.occupy(-1)).toBe(false);
    expect(o.occupy(8)).toBe(false);
    expect(o.occupy(1.5)).toBe(false);
    expect(o.occupy(Number.NaN)).toBe(false);
    expect(o.occupiedCount).toBe(0);
  });

  it('free boşaltıyor ve yeniden dolabiliyor — satış (M3)', () => {
    const o = new SpotOccupancy(8);
    o.occupy(2);
    expect(o.free(2)).toBe(true);
    expect(o.isOccupied(2)).toBe(false);
    expect(o.occupy(2)).toBe(true);
  });

  it('boş noktayı boşaltmak yok sayılıyor', () => {
    const o = new SpotOccupancy(8);
    expect(o.free(2)).toBe(false);
    expect(o.occupiedCount).toBe(0);
  });
});
