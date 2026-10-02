import { describe, it, expect } from 'vitest';
import { alfaAdimi, noktaKutuda } from './hudOrtusme';
import { HUD_ORTUSME, KART, kutusu } from '../data/panelLayout';
import { MAPS } from '../data/maps';

describe('HUD örtüşme saydamlığı (M177)', () => {
  const k = { x0: 10, y0: 10, x1: 50, y1: 30 };

  it('nokta kutuda — pay dahil, dışı hariç', () => {
    expect(noktaKutuda(20, 20, k, 0)).toBe(true);
    expect(noktaKutuda(55, 20, k, 0)).toBe(false);
    expect(noktaKutuda(55, 20, k, 5)).toBe(true);
    expect(noktaKutuda(20, 41, k, 10)).toBe(false);
  });

  it('alfa hedefe sabit adımla yaklaşıyor ve aşmıyor', () => {
    expect(alfaAdimi(1, 0.35, 0.1)).toBeCloseTo(0.9);
    expect(alfaAdimi(0.4, 0.35, 0.1)).toBe(0.35);
    expect(alfaAdimi(0.35, 1, 0.1)).toBeCloseTo(0.45);
    expect(alfaAdimi(1, 1, 0.1)).toBe(1);
  });

  it('saydam kart hâlâ okunur, geçiş birkaç karede bitiyor', () => {
    expect(HUD_ORTUSME.alfa).toBeGreaterThan(0.2);
    expect(HUD_ORTUSME.alfa).toBeLessThan(0.6);
    expect((1 - HUD_ORTUSME.alfa) / HUD_ORTUSME.adim).toBeLessThan(15);
  });

  /**
   * Gerekçenin kendisi: kartın altından geçen yol gerçekten var. Bu liste
   * boşalırsa (yollar taşınırsa) saydamlık gereksizleşir — test söyler.
   */
  it('en az bir haritanın yolu kartın altından geçiyor', () => {
    const kart = kutusu(KART);
    const gecenler = MAPS.filter((m) =>
      m.paths.some((yol) => yol.some((p, i) => {
        const q = yol[i + 1];
        if (q === undefined) return false;
        // Yolun parçasını 8 px adımla örnekle.
        const adim = Math.max(1, Math.ceil((Math.abs(q.x - p.x) + Math.abs(q.y - p.y)) / 8));
        for (let s = 0; s <= adim; s++) {
          const x = p.x + ((q.x - p.x) * s) / adim;
          const y = p.y + ((q.y - p.y) * s) / adim;
          if (noktaKutuda(x, y, kart, 0)) return true;
        }
        return false;
      })),
    ).map((m) => m.id);
    expect(gecenler.length).toBeGreaterThan(0);
  });
});
