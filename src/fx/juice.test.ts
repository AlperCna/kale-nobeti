/**
 * Juice katmanının saf mantığı — `GAME-DESIGN.md` §10.
 *
 * `ScreenShake` ve `HitStop` Phaser'a dokunmuyor; `node`'da test ediliyor.
 */

import { describe, expect, it } from 'vitest';
import { ScreenShake, SHAKE_MIN_SEC, SHAKE_MAX_SEC } from './ScreenShake';
import { HitStop, HITSTOP_MAX_MS, HITSTOP_MIN_MS } from './HitStop';

const KARE_MS = 1000 / 60;

describe('ScreenShake — §10: yönlü, 0,12-0,25 sn, üstel sönüm', () => {
  it('tetiklenmeden kayma YOK', () => {
    const s = new ScreenShake();
    expect(s.offset).toEqual({ x: 0, y: 0 });
    expect(s.active).toBe(false);
  });

  it('süre scaledDelta ile tükeniyor — TIER 1 k.8', () => {
    const s = new ScreenShake();
    s.trigger(1, 0, 1); // 0,25 sn
    let kare = 0;
    while (s.active && kare < 1000) {
      s.update(KARE_MS);
      kare++;
    }
    expect(kare * (KARE_MS / 1000)).toBeCloseTo(SHAKE_MAX_SEC, 1);
  });

  it('2× hızda YARI sürede bitiyor', () => {
    const say = (olcek: number): number => {
      const s = new ScreenShake();
      s.trigger(1, 0, 1);
      let k = 0;
      while (s.active && k < 1000) {
        s.update(KARE_MS * olcek);
        k++;
      }
      return k;
    };
    expect(say(1) / say(2)).toBeCloseTo(2, 0);
  });

  it('şiddet süreyi 0,12-0,25 sn aralığına eşliyor', () => {
    const sure = (g: number): number => {
      const s = new ScreenShake();
      s.trigger(1, 0, g);
      let k = 0;
      while (s.active && k < 1000) {
        s.update(KARE_MS);
        k++;
      }
      return k * (KARE_MS / 1000);
    };
    expect(sure(0)).toBeCloseTo(SHAKE_MIN_SEC, 1);
    expect(sure(1)).toBeCloseTo(SHAKE_MAX_SEC, 1);
  });

  it('YÖNLÜ — kayma darbe ekseninde, dik eksende sıfır', () => {
    const s = new ScreenShake();
    s.trigger(1, 0, 1);
    for (let i = 0; i < 5; i++) {
      s.update(KARE_MS);
      expect(s.offset.y).toBeCloseTo(0, 9); // yatay darbe → dikey kayma yok
    }

    const d = new ScreenShake();
    d.trigger(0, 1, 1);
    for (let i = 0; i < 5; i++) {
      d.update(KARE_MS);
      expect(d.offset.x).toBeCloseTo(0, 9);
    }
  });

  it('çapraz darbede kayma AYNI çapraz eksende kalıyor', () => {
    const s = new ScreenShake();
    s.trigger(3, 4, 1); // 3-4-5
    for (let i = 0; i < 8; i++) {
      s.update(KARE_MS);
      const o = s.offset;
      if (Math.abs(o.x) < 1e-9) continue;
      expect(o.y / o.x).toBeCloseTo(4 / 3, 6);
    }
  });

  it('sıfır vektör sarsıntı ÜRETMİYOR — rastgele yön uydurulmuyor', () => {
    const s = new ScreenShake();
    s.trigger(0, 0, 1);
    expect(s.active).toBe(false);
  });

  it('sönüm ÜSTEL — genlik monoton azalıyor', () => {
    const s = new ScreenShake();
    s.trigger(1, 0, 1);
    const tepeler: number[] = [];
    let oncekiMutlak = 0;
    let artiyordu = false;
    while (s.active) {
      s.update(KARE_MS / 4); // ince adım: salınım tepelerini yakala
      const m = Math.abs(s.offset.x);
      if (artiyordu && m < oncekiMutlak) tepeler.push(oncekiMutlak);
      artiyordu = m > oncekiMutlak;
      oncekiMutlak = m;
    }
    expect(tepeler.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < tepeler.length; i++) {
      expect(tepeler[i]!).toBeLessThan(tepeler[i - 1]!);
    }
  });

  it('TIER 1 k.6 — kapalıyken kamera HİÇ oynamıyor', () => {
    const s = new ScreenShake();
    s.enabled = false;
    s.trigger(1, 0, 1);
    s.update(KARE_MS);
    expect(s.offset).toEqual({ x: 0, y: 0 });
    expect(s.active).toBe(false);
  });

  it('sarsıntı SÜRERKEN kapatılırsa ekran donmuş kaymayla kalmıyor', () => {
    const s = new ScreenShake();
    s.trigger(1, 0, 1);
    s.update(KARE_MS * 2);
    expect(Math.abs(s.offset.x)).toBeGreaterThan(0);
    s.enabled = false;
    expect(s.offset).toEqual({ x: 0, y: 0 });
  });

  it('güçlü darbe zayıfı EZİYOR, zayıf güçlüyü uzatmıyor', () => {
    const s = new ScreenShake();
    s.trigger(1, 0, 1);
    s.update(KARE_MS * 6);
    const kalanGuclu = s.offset.x;
    s.trigger(0, 1, 0.05); // çok zayıf, farklı yön
    // Yön değişmediyse zayıf darbe ezilmiş demektir.
    s.update(KARE_MS);
    expect(Math.abs(s.offset.y)).toBeLessThan(Math.abs(kalanGuclu) + 1);
  });

  it('reset her şeyi sıfırlıyor', () => {
    const s = new ScreenShake();
    s.trigger(1, 0, 1);
    s.update(KARE_MS);
    s.reset();
    expect(s.active).toBe(false);
    expect(s.offset).toEqual({ x: 0, y: 0 });
  });
});

describe('HitStop — §10: 60-80 ms, 2× hızda DEVRE DIŞI', () => {
  it('1× hızda duraklama var', () => {
    const h = new HitStop();
    h.trigger(HITSTOP_MIN_MS, 1);
    expect(h.active).toBe(true);
  });

  it('**2× hızda HİÇ tetiklenmiyor** — §10', () => {
    const h = new HitStop();
    h.trigger(HITSTOP_MAX_MS, 2);
    expect(h.active).toBe(false);
    expect(h.update(KARE_MS)).toBe(false);
  });

  it('süre 80 ms’i AŞMIYOR', () => {
    const h = new HitStop();
    h.trigger(500, 1);
    expect(h.remainingMs).toBe(HITSTOP_MAX_MS);
  });

  it('duvar saatiyle tükeniyor — durdurduğu saatle ölçseydi hiç bitmezdi', () => {
    const h = new HitStop();
    h.trigger(60, 1);
    let k = 0;
    while (h.update(KARE_MS)) k++;
    expect(k * KARE_MS).toBeGreaterThanOrEqual(60);
    expect(k * KARE_MS).toBeLessThan(60 + KARE_MS * 2);
  });

  it('üst üste vuruş UZATMIYOR — en uzunu kazanıyor', () => {
    const h = new HitStop();
    h.trigger(60, 1);
    h.trigger(60, 1);
    h.trigger(60, 1);
    expect(h.remainingMs).toBe(60);
  });

  it('daha uzun vuruş kısa olanı YÜKSELTİYOR', () => {
    const h = new HitStop();
    h.trigger(60, 1);
    h.trigger(80, 1);
    expect(h.remainingMs).toBe(80);
  });

  it('sıfır veya negatif süre tetiklemiyor', () => {
    const h = new HitStop();
    h.trigger(0, 1);
    h.trigger(-10, 1);
    expect(h.active).toBe(false);
  });

  it('update etkinken true, bittikten sonra false döndürüyor', () => {
    const h = new HitStop();
    h.trigger(60, 1);
    expect(h.update(30)).toBe(true);
    expect(h.update(40)).toBe(true); // son kare, sayaç sıfırlanıyor
    expect(h.update(16)).toBe(false);
  });

  it('reset sıfırlıyor', () => {
    const h = new HitStop();
    h.trigger(80, 1);
    h.reset();
    expect(h.active).toBe(false);
  });
});
