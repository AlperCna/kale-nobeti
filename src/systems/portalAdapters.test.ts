/**
 * **Portal bağdaştırıcıları — SDK hazır olmadan olay gitmiyor** (`M131`).
 *
 * İki portalın dokümanı da init'i oyundan **önce** istiyor:
 * CrazyGames *"the SDK is unusable until initialized"*, Poki'nin
 * belgelenen kalıbı ise oyunu `init().then(...)` içinde başlatıyor.
 * Buradaki kod `void sdk.init()` diyordu — ateşle ve unut. `M131` onu
 * bir **kuyruğa** çevirdi: oyun hiç beklemiyor (reklam engelleyici
 * şartı), olaylar init çözülene kadar birikiyor ve sırayla gidiyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { pokiAdapter, crazyAdapter } from './portalAdapters';
import { Portal } from './Portal';

interface SahteSdk {
  readonly cagrilar: string[];
  coz: () => void;
  reddet: () => void;
}

function pokiKur(): SahteSdk {
  const cagrilar: string[] = [];
  let coz = (): void => {};
  let reddet = (): void => {};
  const bekle = new Promise<void>((c, r) => {
    coz = c;
    reddet = () => r(new Error('init hatası'));
  });
  (globalThis as Record<string, unknown>)['PokiSDK'] = {
    init: () => bekle,
    gameplayStart: () => cagrilar.push('start'),
    gameplayStop: () => cagrilar.push('stop'),
    commercialBreak: () => Promise.resolve(),
  };
  return { cagrilar, coz, reddet };
}

function crazyKur(): SahteSdk {
  const cagrilar: string[] = [];
  let coz = (): void => {};
  let reddet = (): void => {};
  const bekle = new Promise<void>((c, r) => {
    coz = c;
    reddet = () => r(new Error('init hatası'));
  });
  (globalThis as Record<string, unknown>)['CrazyGames'] = {
    SDK: {
      init: () => bekle,
      game: {
        gameplayStart: () => cagrilar.push('start'),
        gameplayStop: () => cagrilar.push('stop'),
      },
    },
  };
  return { cagrilar, coz, reddet };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>)['PokiSDK'];
  delete (globalThis as Record<string, unknown>)['CrazyGames'];
});

describe('portal bağdaştırıcıları — init kapısı (M131)', () => {
  it('Poki: init çözülmeden olay SDK’ya GİTMİYOR', async () => {
    const sahte = pokiKur();
    const a = pokiAdapter();
    a?.gameplayStart();
    expect(sahte.cagrilar, 'init beklemeden gitti').toEqual([]);
    sahte.coz();
    await Promise.resolve();
    await Promise.resolve();
    expect(sahte.cagrilar).toEqual(['start']);
  });

  it('Poki: biriken olaylar SIRAYLA boşalıyor', async () => {
    const sahte = pokiKur();
    const a = pokiAdapter();
    a?.gameplayStart();
    a?.gameplayStop();
    a?.gameplayStart();
    sahte.coz();
    await Promise.resolve();
    await Promise.resolve();
    expect(sahte.cagrilar).toEqual(['start', 'stop', 'start']);
  });

  /**
   * Poki'nin kendi `catch` dalı *"yine de yükle"* diyor: init
   * başarısızsa oyun durmamalı ve biriken olaylar da asılı kalmamalı.
   */
  it('init REDDEDİLSE bile kapı açılıyor', async () => {
    const sahte = pokiKur();
    const a = pokiAdapter();
    a?.gameplayStart();
    sahte.reddet();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(sahte.cagrilar).toEqual(['start']);
  });

  it('CrazyGames: aynı kapı — init çözülmeden olay gitmiyor', async () => {
    const sahte = crazyKur();
    const a = crazyAdapter();
    a?.gameplayStart();
    a?.gameplayStop();
    expect(sahte.cagrilar).toEqual([]);
    sahte.coz();
    await Promise.resolve();
    await Promise.resolve();
    expect(sahte.cagrilar).toEqual(['start', 'stop']);
  });

  it('SDK globali yoksa bağdaştırıcı null — reklam engelleyici yolu', () => {
    expect(pokiAdapter()).toBeNull();
    expect(crazyAdapter()).toBeNull();
  });
});

/**
 * **`M178` — reklam ve yükleme olayları, belgelerin GERÇEK imzasıyla.**
 *
 * Yukarıdaki sahte SDK'larda `ad` alanı yoktu; CrazyGames reklam yolu bu
 * yüzden hiç koşmamıştı ve `requestAd`'in `Promise` döndürmediği
 * (`sdk/video-ads`) fark edilmemişti. Buradaki sahteler `init`'siz: kapı
 * isteği aynı tikte iletiyor.
 */
describe('portal bağdaştırıcıları — reklam ve yükleme (M178)', () => {
  interface CrazyGeri {
    adStarted: () => void;
    adFinished: () => void;
    adError: (h: unknown) => void;
  }

  function crazyReklamliKur(): { iz: string[]; geri: () => CrazyGeri | null } {
    const iz: string[] = [];
    let son: CrazyGeri | null = null;
    (globalThis as Record<string, unknown>)['CrazyGames'] = {
      SDK: {
        game: {
          gameplayStart: () => iz.push('start'),
          gameplayStop: () => iz.push('stop'),
          loadingStart: () => iz.push('loadingStart'),
          loadingStop: () => iz.push('loadingStop'),
        },
        ad: {
          // Belgedeki imza: geri çağrı nesnesi, dönüş değeri YOK.
          requestAd: (tur: string, g: CrazyGeri): void => {
            iz.push(`requestAd:${tur}`);
            son = g;
          },
        },
      },
    };
    return { iz, geri: () => son };
  }

  function olayIzi(): { iz: string[]; basladi: () => void; bitti: () => void } {
    const iz: string[] = [];
    return { iz, basladi: () => void iz.push('basladi'), bitti: () => void iz.push('bitti') };
  }

  it('CrazyGames: requestAd geri çağrılarla — fırlamıyor, başladı/bitti taşınıyor', () => {
    const sahte = crazyReklamliKur();
    const o = olayIzi();
    expect(() => crazyAdapter()?.commercialBreak(o)).not.toThrow();
    expect(sahte.iz).toEqual(['requestAd:midgame']);
    sahte.geri()?.adStarted();
    sahte.geri()?.adFinished();
    expect(o.iz).toEqual(['basladi', 'bitti']);
  });

  /** `adCooldown` · `unfilled` · `adblock` — hepsi `adError`. */
  it('CrazyGames: adError da reklamı BİTİRİYOR', () => {
    const sahte = crazyReklamliKur();
    const o = olayIzi();
    crazyAdapter()?.commercialBreak(o);
    sahte.geri()?.adError('adCooldown');
    expect(o.iz).toEqual(['bitti']);
  });

  it('CrazyGames: ad modülü yoksa reklam hemen bitiyor', () => {
    (globalThis as Record<string, unknown>)['CrazyGames'] = {
      SDK: { game: { gameplayStart: () => {}, gameplayStop: () => {} } },
    };
    const o = olayIzi();
    crazyAdapter()?.commercialBreak(o);
    expect(o.iz).toEqual(['bitti']);
  });

  it('CrazyGames: yükleme olayları loadingStart / loadingStop', () => {
    const sahte = crazyReklamliKur();
    const a = crazyAdapter();
    a?.yuklemeBasladi?.();
    a?.yuklemeBitti?.();
    expect(sahte.iz).toEqual(['loadingStart', 'loadingStop']);
  });

  /**
   * **Hatanın şekli:** eski bağdaştırıcı `requestAd(...).catch` diyordu.
   * `Portal` üzerinden uçtan uca: reklam hata verip bitince ses AÇILMALI
   * ve oyun başlamalı. Eski kodla `undefined.catch` fırlıyor, ses kısık
   * kalıyor ve `devam` hiç gelmiyordu.
   */
  it('uçtan uca: CrazyGames reklamından sonra ses AÇIK ve oyun başlıyor', () => {
    const sahte = crazyReklamliKur();
    const p = new Portal(() => () => {});
    const a = crazyAdapter();
    expect(a).not.toBeNull();
    if (a !== null) p.kur(a);
    const ses: boolean[] = [];
    let devam = 0;
    p.commercialBreak(
      (k) => void ses.push(k),
      () => {
        devam++;
      },
    );
    sahte.geri()?.adError('unfilled');
    expect(ses).toEqual([true, false]);
    expect(devam).toBe(1);
  });

  it('Poki: beforeAd başladı, Promise çözülünce bitti — reddedilse de bitti', async () => {
    const iz: string[] = [];
    let sonuc: 'coz' | 'reddet' = 'coz';
    (globalThis as Record<string, unknown>)['PokiSDK'] = {
      gameplayStart: () => iz.push('start'),
      gameplayStop: () => iz.push('stop'),
      gameLoadingFinished: () => iz.push('gameLoadingFinished'),
      commercialBreak: (beforeAd?: () => void): Promise<void> => {
        beforeAd?.();
        return sonuc === 'coz' ? Promise.resolve() : Promise.reject(new Error('reklam'));
      },
    };
    const a = pokiAdapter();
    const o1 = olayIzi();
    a?.commercialBreak(o1);
    await Promise.resolve();
    expect(o1.iz).toEqual(['basladi', 'bitti']);

    sonuc = 'reddet';
    const o2 = olayIzi();
    a?.commercialBreak(o2);
    await Promise.resolve();
    await Promise.resolve();
    expect(o2.iz).toEqual(['basladi', 'bitti']);

    a?.yuklemeBitti?.();
    expect(iz).toEqual(['gameLoadingFinished']);
  });
});
