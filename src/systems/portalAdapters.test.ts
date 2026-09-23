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
