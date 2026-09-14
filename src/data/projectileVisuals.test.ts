import { describe, expect, it } from 'vitest';
import { projectileLook } from './projectileVisuals';

describe('projectileVisuals — oyuncu geri bildirimi: mermiler aileye göre ayrışsın', () => {
  it('üç ailenin mermisi renkte ve ölçekte birbirinden farklı', () => {
    const okcu = projectileLook('okcu');
    const top = projectileLook('top');
    const buyu = projectileLook('buyu');
    expect(new Set([okcu.color, top.color, buyu.color]).size).toBe(3);
    expect(okcu.scaleX).not.toBe(top.scaleX);
    expect(top.scaleX).not.toBe(buyu.scaleX);
  });

  it('ok hedefe dönük, gülle ve büyü dönmüyor', () => {
    expect(projectileLook('okcu').rotateToTarget).toBe(true);
    expect(projectileLook('top').rotateToTarget).toBe(false);
    expect(projectileLook('buyu').rotateToTarget).toBe(false);
  });

  it('dal etkisi yalnız rengi eziyor, ailenin ölçeği/yönü kalıyor', () => {
    const taban = projectileLook('okcu');
    const yanan = projectileLook('okcu', 'burn');
    expect(yanan.color).not.toBe(taban.color);
    expect(yanan.scaleX).toBe(taban.scaleX);
    expect(yanan.rotateToTarget).toBe(taban.rotateToTarget);
    // Üç etki üç ayrı renk — buz ile yıldırım karışmasın.
    expect(new Set([yanan.color, projectileLook('buyu', 'slow').color, projectileLook('buyu', 'chain').color]).size).toBe(3);
  });
  /**
   * Oyuncu geri bildirimi: "kulelerin tiplerini değiştirince atış
   * şekilleri hiç değişmiyor, hep aynı". Bu blok o kusurun geri
   * gelmesini engelliyor.
   */
  describe('kademe merminin görünümünü DEĞİŞTİRİR', () => {
    it('her kademe bir öncekinden büyük (T3 iki dalı eşit)', () => {
      const o = [0, 1, 2, 3].map((i) => projectileLook('okcu', undefined, i as 0 | 1 | 2 | 3));
      expect(o[1]!.scaleX).toBeGreaterThan(o[0]!.scaleX);
      expect(o[2]!.scaleX).toBeGreaterThan(o[1]!.scaleX);
      // T3'ün iki dalı aynı boyda: fark dalın ETKİSİNDE, kademede değil.
      expect(o[3]!.scaleX).toBe(o[2]!.scaleX);
    });

    it('büyüme en-boy oranını bozmuyor — okun oku, güllenin yuvarlağı kalıyor', () => {
      for (const aile of ['okcu', 'top', 'buyu'] as const) {
        const t1 = projectileLook(aile, undefined, 0);
        const t3 = projectileLook(aile, undefined, 2);
        expect(t3.scaleX / t3.scaleY).toBeCloseTo(t1.scaleX / t1.scaleY, 5);
      }
    });

    it('son kademenin izi var — ailenin kendi izi olmasa bile', () => {
      // `okcu` ve `top` taban hâlinde izsiz; büyü zaten izli.
      expect(projectileLook('okcu', undefined, 0).trail).toBe(false);
      expect(projectileLook('okcu', undefined, 2).trail).toBe(true);
      expect(projectileLook('top', undefined, 3).trail).toBe(true);
      expect(projectileLook('buyu', undefined, 0).trail).toBe(true);
    });

    it('ayrım RENGE dayanmıyor — kural 6', () => {
      // Aynı aile, etkisiz, farklı kademe: renk aynı ama boyut farklı.
      const t1 = projectileLook('top', undefined, 0);
      const t3 = projectileLook('top', undefined, 2);
      expect(t3.color).toBe(t1.color);
      expect(t3.scaleX).not.toBe(t1.scaleX);
    });
  });
});
