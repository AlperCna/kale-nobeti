import { describe, it, expect, beforeEach } from 'vitest';
import { Portal, PORTAL_YOK } from './Portal';
import type { PortalAdapter } from './Portal';

function sahteAdapter(): PortalAdapter & { iz: string[] } {
  const iz: string[] = [];
  return {
    ad: 'sahte',
    iz,
    gameplayStart: () => void iz.push('start'),
    gameplayStop: () => void iz.push('stop'),
    commercialBreak: (kis) => {
      iz.push('reklam');
      kis(true);
      iz.push('sesKisildi');
      kis(false);
      iz.push('sesAcildi');
    },
  };
}

describe('Portal — Poki/CrazyGames olay sözleşmesi', () => {
  let p: Portal;
  let a: ReturnType<typeof sahteAdapter>;

  beforeEach(() => {
    p = new Portal();
    a = sahteAdapter();
    p.kur(a);
  });

  /**
   * Poki'nin açık yasağı: *"Olaylar arka arkaya veya çift
   * tetiklenemez."* Bu, başvuru reddi sebebi olabilecek tek mekanik
   * madde — o yüzden koruma sahnelerde değil burada ve teste bağlı.
   */
  it('gameplayStart iki kez ÜST ÜSTE SDK’ya gitmiyor', () => {
    p.gameplayStart();
    p.gameplayStart();
    p.gameplayStart();
    expect(a.iz).toEqual(['start']);
    expect(p.sayac.start).toBe(1);
  });

  it('gameplayStop iki kez üst üste SDK’ya gitmiyor', () => {
    p.gameplayStart();
    p.gameplayStop();
    p.gameplayStop();
    expect(a.iz).toEqual(['start', 'stop']);
  });

  it('oyun başlamadan stop SDK’ya hiç gitmiyor', () => {
    p.gameplayStop();
    expect(a.iz).toEqual([]);
  });

  it('start/stop sırayla dönüşümlü çalışıyor', () => {
    p.gameplayStart();
    p.gameplayStop();
    p.gameplayStart();
    p.gameplayStop();
    expect(a.iz).toEqual(['start', 'stop', 'start', 'stop']);
  });

  /**
   * Poki'nin yanlış örneği: *"oyundan çıkıp seviye seçime gitmek"*.
   * Reklam yalnız **duraklamadan oyuna dönüşte** meşru, yani oyun
   * DURMUŞKEN. Oyun sürerken gelen çağrı yutuluyor.
   */
  it('oyun sürerken reklam istenirse yutuluyor', () => {
    p.gameplayStart();
    p.commercialBreak(() => {});
    expect(a.iz).toEqual(['start']);
    expect(p.sayac.reklam).toBe(0);
  });

  it('duraklamadan dönüşte reklam çalışıyor ve ses kısılıp açılıyor', () => {
    p.gameplayStart();
    p.gameplayStop();
    p.commercialBreak((kisik) => void a.iz.push(kisik ? 'çağıranKıstı' : 'çağıranAçtı'));
    // Sahte bağdaştırıcı kendi adımlarını da yazıyor; sıra bu yüzden
    // iç içe: reklam → (çağıran kıstı) → sesKisildi → (çağıran açtı) → sesAcildi.
    expect(a.iz).toEqual([
      'start',
      'stop',
      'reklam',
      'çağıranKıstı',
      'sesKisildi',
      'çağıranAçtı',
      'sesAcildi',
    ]);
  });

  it('reklam gameplayStart’ı KENDİSİ çağırmıyor — sıra çağıranda', () => {
    p.gameplayStop();
    p.commercialBreak(() => {});
    expect(p.oyundaMi).toBe(false);
  });

  describe('SDK yokken (itch.io / geliştirme)', () => {
    it('hiçbir çağrı patlamıyor', () => {
      const y = new Portal(); // varsayılan PORTAL_YOK
      expect(y.adapterAdi).toBe('yok');
      expect(() => {
        y.gameplayStart();
        y.gameplayStop();
        y.commercialBreak(() => {});
      }).not.toThrow();
    });

    /**
     * Reklamsız yolda da ses kısılıp **geri açılıyor**: çağıran taraf
     * iki dünyada aynı kodu çalıştırsın ve "reklam yokken ses kısık
     * kaldı" durumu hiç doğmasın.
     */
    it('ses kısma geri çağrısı dengeli — kısıldı sonra açıldı', () => {
      const izler: boolean[] = [];
      PORTAL_YOK.commercialBreak((k) => void izler.push(k));
      expect(izler).toEqual([true, false]);
    });
  });
});
