import { describe, it, expect } from 'vitest';
import {
  applyEffect,
  emptyEffects,
  resetEffects,
  speedMultiplier,
  stepEffects,
} from './effects';
import { OKCU, TOP, BUYU } from '../data/towers';

const KUNDAKCI = OKCU.branches[1].effect!;
const BUZ = BUYU.branches[1].effect!;
/**
 * `M11-T02` — **Barut Fıçısı artık yavaşlatmıyor.** Yavaşlatma tek bir
 * dalın (Buz) kimliği oldu; gerekçe `data/towers.ts`'te (Kısıt A'da
 * yavaşlatma `hız`ı bölüyor, yani bütün tahtayı çarpıyor).
 *
 * `applyEffect`'in "en güçlü yavaşlatma kazanır" kuralı (S35) yine de
 * korunmalı: oyunda bugün tek yavaşlatma kaynağı var ama kural
 * `ProjectileSystem`'in sözleşmesi ve yarın ikinci bir kaynak gelirse
 * sessizce bozulmamalı. O yüzden artık **sentetik** etkilerle test
 * ediliyor, kule verisiyle değil.
 */
const ZAYIF_YAVAS = { kind: 'slow', factor: 0.25, seconds: 1.5 } as const;
const GUCLU_YAVAS = { kind: 'slow', factor: 0.6, seconds: 3 } as const;

/** `saniye` kadar 60 FPS'lik karelerle ilerlet, toplam yanma hasarını döndür. */
function kosut(fx: ReturnType<typeof emptyEffects>, saniye: number, hizCarpani = 1): number {
  const kare = (1000 / 60) * hizCarpani;
  const adet = Math.round((saniye * 1000) / kare);
  let toplam = 0;
  for (let i = 0; i < adet; i++) toplam += stepEffects(fx, kare);
  return toplam;
}

/** Sayılar `towers.ts`'ten türüyor — denge değişince test kendiliğinden doğru kalıyor (k.1). */
const YANMA_TOPLAM = KUNDAKCI.kind === 'burn' ? KUNDAKCI.dps * KUNDAKCI.seconds : 0;
const YANMA_DPS = KUNDAKCI.kind === 'burn' ? KUNDAKCI.dps : 0;
const YANMA_SN = KUNDAKCI.kind === 'burn' ? KUNDAKCI.seconds : 0;
const BUZ_CARPAN = BUZ.kind === 'slow' ? 1 - BUZ.factor : 1;

describe('yanma — Kundakçı (sayılar towers.ts’ten)', () => {
  it('toplam hasar dps × seconds', () => {
    const fx = emptyEffects();
    applyEffect(fx, KUNDAKCI);
    const toplam = kosut(fx, 6); // süreden uzun koş
    expect(toplam).toBeCloseTo(YANMA_TOPLAM, 6);
  });

  it('süre bitince yanma duruyor', () => {
    const fx = emptyEffects();
    applyEffect(fx, KUNDAKCI);
    kosut(fx, 6);
    expect(fx.burnSeconds).toBe(0);
    expect(fx.burnDps).toBe(0);
    expect(stepEffects(fx, 1000)).toBe(0);
  });

  it('2× hızda yanma YARI SÜREDE bitiyor, toplam hasar AYNI', () => {
    // TIER 1 kural 8'in gözlemlenebilir sonucu. Ölçüm birimi **gerçek
    // kare sayısı**: 2× hızda aynı yanma yarısı kadar karede tükenir.
    // (İlk yazımda gerçek saniye ile oyun saniyesini karıştırıp kırdım.)
    const bitisKaresi = (hizCarpani: number): { kare: number; hasar: number } => {
      const fx = emptyEffects();
      applyEffect(fx, KUNDAKCI);
      let kare = 0;
      let hasar = 0;
      while (fx.burnSeconds > 0 && kare < 10_000) {
        hasar += stepEffects(fx, (1000 / 60) * hizCarpani);
        kare++;
      }
      return { kare, hasar };
    };

    const bir = bitisKaresi(1);
    const iki = bitisKaresi(2);

    expect(bir.hasar).toBeCloseTo(YANMA_TOPLAM, 6);
    expect(iki.hasar).toBeCloseTo(YANMA_TOPLAM, 6); // toplam hasar değişmiyor
    // Yarı sürede bitiyor. Tam yarı olamaz — kare sayısı tam sayı ve
    // son kare kalan süreyi taşıyor; 1 karelik yuvarlama payı bırakılıyor.
    expect(Math.abs(iki.kare - bir.kare / 2)).toBeLessThanOrEqual(1);
  });

  it('kare boyutundan bağımsız — toplam hasar sabit', () => {
    for (const kare of [1000 / 144, 1000 / 60, 1000 / 30, 250]) {
      const fx = emptyEffects();
      applyEffect(fx, KUNDAKCI);
      let toplam = 0;
      // Yanma bitene kadar koş — sabit kare sayısı yavaş kareyle yetmiyordu.
      let n = 0;
      while (fx.burnSeconds > 0 && n < 10_000) {
        toplam += stepEffects(fx, kare);
        n++;
      }
      expect(toplam, `kare=${kare.toFixed(1)}ms`).toBeCloseTo(YANMA_TOPLAM, 6);
    }
  });

  it('YIĞILMIYOR — ikinci vuruş süreyi yeniliyor, DPS toplamıyor (S34)', () => {
    const fx = emptyEffects();
    applyEffect(fx, KUNDAKCI);
    kosut(fx, 2);
    applyEffect(fx, KUNDAKCI); // yenile
    expect(fx.burnDps).toBe(YANMA_DPS); // iki katı DEĞİL
    expect(fx.burnSeconds).toBeCloseTo(YANMA_SN, 6);
  });
});

describe('yavaşlatma', () => {
  it('Buz hızı `1 − factor` oranına indiriyor', () => {
    const fx = emptyEffects();
    applyEffect(fx, BUZ);
    expect(speedMultiplier(fx)).toBeCloseTo(BUZ_CARPAN, 10);
  });

  /** `M11-T02` — oyundaki **tek** yavaşlatma kaynağı Buz. */
  it('Barut Fıçısı ARTIK yavaşlatmıyor — yavaşlatma Buz’un kimliği', () => {
    expect(TOP.branches[1].effect).toBeUndefined();
    expect(BUYU.branches[1].effect?.kind).toBe('slow');
  });

  it('süre bitince hız ESKİ DEĞERİNE dönüyor', () => {
    // "Bitmedi sayılır eğer: yavaşlatma süresi bitince hız eski değerine
    // dönmüyorsa."
    const fx = emptyEffects();
    applyEffect(fx, BUZ);
    kosut(fx, 6); // süreden uzun
    expect(speedMultiplier(fx)).toBe(1);
    expect(fx.slowFactor).toBe(0);
  });

  it('süre dolmadan hız hâlâ yavaş', () => {
    const fx = emptyEffects();
    applyEffect(fx, BUZ);
    kosut(fx, 1); // süreden kısa
    expect(speedMultiplier(fx)).toBeCloseTo(BUZ_CARPAN, 10);
  });

  /**
   * Kural sentetik etkilerle test ediliyor: `M11-T02`'den sonra oyunda
   * tek yavaşlatma kaynağı var (Buz), ama kural `applyEffect`'in
   * sözleşmesi ve ikinci bir kaynak gelirse sessizce bozulmamalı.
   */
  it('EN GÜÇLÜSÜ kazanıyor — yığılmıyor (S35)', () => {
    // %60 × %25 çarpımsal yığılsaydı %70 olur ve iki kule düşmanı
    // neredeyse durdururdu.
    const fx = emptyEffects();
    applyEffect(fx, GUCLU_YAVAS);
    applyEffect(fx, ZAYIF_YAVAS);
    expect(speedMultiplier(fx)).toBeCloseTo(1 - GUCLU_YAVAS.factor, 10);
  });

  it('zayıf olan varken güçlü gelirse GÜÇLÜ uygulanıyor', () => {
    const fx = emptyEffects();
    applyEffect(fx, ZAYIF_YAVAS);
    applyEffect(fx, GUCLU_YAVAS);
    expect(speedMultiplier(fx)).toBeCloseTo(1 - GUCLU_YAVAS.factor, 10);
    expect(fx.slowSeconds).toBeCloseTo(GUCLU_YAVAS.seconds, 6);
  });

  it('aynı güçte ikinci vuruş süreyi TAZELİYOR', () => {
    const fx = emptyEffects();
    applyEffect(fx, GUCLU_YAVAS);
    kosut(fx, GUCLU_YAVAS.seconds - 0.5);
    applyEffect(fx, GUCLU_YAVAS);
    expect(fx.slowSeconds).toBeCloseTo(GUCLU_YAVAS.seconds, 6);
  });
});

describe('yanma + yavaşlatma birlikte', () => {
  it('ikisi bağımsız işliyor', () => {
    const fx = emptyEffects();
    applyEffect(fx, KUNDAKCI); // 4 sn
    applyEffect(fx, BUZ); // 2,5 sn

    kosut(fx, 3);
    expect(speedMultiplier(fx)).toBe(1); // buz bitti
    expect(fx.burnSeconds).toBeGreaterThan(0); // yanma sürüyor
  });
});

describe('sınır durumları', () => {
  it('etkisiz düşmanda hız çarpanı 1, hasar 0', () => {
    const fx = emptyEffects();
    expect(speedMultiplier(fx)).toBe(1);
    expect(stepEffects(fx, 16.67)).toBe(0);
  });

  it('0 veya negatif kare süresi durumu bozmuyor', () => {
    const fx = emptyEffects();
    applyEffect(fx, KUNDAKCI);
    expect(stepEffects(fx, 0)).toBe(0);
    expect(stepEffects(fx, -16)).toBe(0);
    expect(fx.burnSeconds).toBeCloseTo(4, 6);
  });

  it('chain etkisi süreli listeye girmiyor', () => {
    const fx = emptyEffects();
    applyEffect(fx, BUYU.branches[0].effect!); // Yıldırım
    expect(fx.burnSeconds).toBe(0);
    expect(fx.slowSeconds).toBe(0);
  });

  it('resetEffects hepsini sıfırlıyor — havuza dönen düşman', () => {
    const fx = emptyEffects();
    applyEffect(fx, KUNDAKCI);
    applyEffect(fx, BUZ);
    resetEffects(fx);
    expect(fx).toEqual(emptyEffects());
    expect(speedMultiplier(fx)).toBe(1);
  });
});
