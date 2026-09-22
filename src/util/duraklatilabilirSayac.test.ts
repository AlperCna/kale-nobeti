import { describe, expect, it } from 'vitest';
import { DuraklatilabilirSayac, type ZamanOrtami } from './duraklatilabilirSayac';

/**
 * Sahte saat: zaman elle ilerletiliyor, `setTimeout` yok. `M104`'ün
 * ayrı bir dosya olmasının sebebi tam olarak bu — muhasebe `node`'da
 * gerçek zaman beklemeden sınanıyor.
 */
function sahteOrtam(): ZamanOrtami<number> & {
  ilerle: (ms: number) => void;
  kurulanSayisi: number;
} {
  let simdi = 1000;
  let siradakiKimlik = 1;
  const bekleyen = new Map<number, { an: number; f: () => void }>();
  const o = {
    simdi: () => simdi,
    zamanla: (f: () => void, ms: number) => {
      const k = siradakiKimlik++;
      bekleyen.set(k, { an: simdi + ms, f });
      o.kurulanSayisi += 1;
      return k;
    },
    iptal: (k: number) => {
      bekleyen.delete(k);
    },
    kurulanSayisi: 0,
    ilerle: (ms: number) => {
      simdi += ms;
      for (const [k, v] of [...bekleyen]) {
        if (v.an <= simdi) {
          bekleyen.delete(k);
          v.f();
        }
      }
    },
  };
  return o;
}

describe('DuraklatilabilirSayac — M104', () => {
  it('süre dolunca ateşliyor', () => {
    const o = sahteOrtam();
    let atesledi = 0;
    new DuraklatilabilirSayac(o).basla(1000, () => (atesledi += 1));
    o.ilerle(999);
    expect(atesledi).toBe(0);
    o.ilerle(1);
    expect(atesledi).toBe(1);
  });

  /** `M104`'ün asıl derdi: perdenin arkasında süre işlemesin. */
  it('DURAKLATILMIŞKEN süre işlemiyor', () => {
    const o = sahteOrtam();
    let atesledi = 0;
    const s = new DuraklatilabilirSayac(o);
    s.basla(1000, () => (atesledi += 1));
    o.ilerle(400);
    s.duraklat();
    o.ilerle(100000);
    expect(atesledi, 'duraklatılmışken ateşlememeli').toBe(0);
    expect(s.kalanMs).toBe(600);
  });

  it('sürdürünce KALDIĞI yerden devam ediyor', () => {
    const o = sahteOrtam();
    let atesledi = 0;
    const s = new DuraklatilabilirSayac(o);
    s.basla(1000, () => (atesledi += 1));
    o.ilerle(400);
    s.duraklat();
    o.ilerle(50000);
    s.surdur();
    o.ilerle(599);
    expect(atesledi).toBe(0);
    o.ilerle(1);
    expect(atesledi).toBe(1);
  });

  it('art arda duraklat/sürdür süreyi KAYDIRMIYOR', () => {
    const o = sahteOrtam();
    const s = new DuraklatilabilirSayac(o);
    s.basla(1000, () => {});
    for (let i = 0; i < 5; i++) {
      o.ilerle(100);
      s.duraklat();
      o.ilerle(9999);
      s.surdur();
    }
    expect(s.kalanMs).toBe(500);
  });

  it('çift duraklat ve çift sürdür zararsız', () => {
    const o = sahteOrtam();
    const s = new DuraklatilabilirSayac(o);
    s.basla(1000, () => {});
    o.ilerle(200);
    s.duraklat();
    s.duraklat();
    expect(s.kalanMs).toBe(800);
    s.surdur();
    s.surdur();
    o.ilerle(800);
    expect(s.kalanMs).toBe(0);
  });

  it('duraklatılmışken BAŞLAYAN sayaç kurulmuyor, sürdürünce işliyor', () => {
    const o = sahteOrtam();
    let atesledi = 0;
    const s = new DuraklatilabilirSayac(o);
    s.duraklat();
    s.basla(1000, () => (atesledi += 1));
    o.ilerle(5000);
    expect(atesledi).toBe(0);
    s.surdur();
    o.ilerle(1000);
    expect(atesledi).toBe(1);
  });

  it('iptal sonrası ateşlemiyor — ölü nesneye geri çağırma yok', () => {
    const o = sahteOrtam();
    let atesledi = 0;
    const s = new DuraklatilabilirSayac(o);
    s.basla(1000, () => (atesledi += 1));
    s.iptal();
    o.ilerle(5000);
    expect(atesledi).toBe(0);
    expect(s.kalanMs).toBe(0);
  });

  it('yeni başla önceki sayacı İPTAL ediyor — iki balon iki kez kapanmaz', () => {
    const o = sahteOrtam();
    const sira: string[] = [];
    const s = new DuraklatilabilirSayac(o);
    s.basla(1000, () => sira.push('ilk'));
    o.ilerle(500);
    s.basla(1000, () => sira.push('ikinci'));
    o.ilerle(1000);
    expect(sira).toEqual(['ikinci']);
  });

  it('ateşledikten sonra duraklat/sürdür yeniden kurmuyor', () => {
    const o = sahteOrtam();
    let atesledi = 0;
    const s = new DuraklatilabilirSayac(o);
    s.basla(100, () => (atesledi += 1));
    o.ilerle(100);
    expect(atesledi).toBe(1);
    const kurulan = o.kurulanSayisi;
    s.duraklat();
    s.surdur();
    o.ilerle(10000);
    expect(atesledi, 'ikinci kez ateşlememeli').toBe(1);
    expect(o.kurulanSayisi, 'yeni zamanlayıcı kurulmamalı').toBe(kurulan);
  });
});
