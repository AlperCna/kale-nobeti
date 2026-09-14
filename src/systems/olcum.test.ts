import { describe, it, expect, beforeEach } from 'vitest';
import { Portal } from './Portal';
import { haritaBasladi, haritaKazanildi, haritaKaybedildi } from './olcum';

function izleyenPortal(): { p: Portal; iz: string[] } {
  const iz: string[] = [];
  const p = new Portal();
  p.kur({
    ad: 'sahte',
    gameplayStart() {},
    gameplayStop() {},
    commercialBreak() {},
    measure: (k, n, e) => void iz.push(`${k}/${n}/${e}`),
  });
  return { p, iz };
}

describe('olcum — ROADMAP teşhis matrisinin sinyalleri', () => {
  let p: Portal;
  let iz: string[];

  beforeEach(() => {
    ({ p, iz } = izleyenPortal());
  });

  it('harita başlarken: seviye + zorluk', () => {
    haritaBasladi(p, 'kul-ovasi', 'zor');
    expect(iz).toEqual(['level/kul-ovasi/start', 'difficulty/zor/start']);
  });

  it('kazanınca: tamamlama + yıldız', () => {
    haritaKazanildi(p, 'kul-ovasi', 2);
    expect(iz).toEqual(['level/kul-ovasi/complete', 'stars/2/complete']);
  });

  /**
   * Matrisin *"nerede bırakıyorlar"* sinyali. Dalga `action`'da, `what`'ta
   * değil — `what` haritayı tanımlıyor ve ayrık değer sayısı harita
   * sayısıyla sınırlı kalıyor.
   */
  it('kaybedince: başarısızlık + BIRAKILAN DALGA', () => {
    haritaKaybedildi(p, 'kadim-harabe', 8);
    expect(iz).toEqual(['level/kadim-harabe/fail', 'wave/kadim-harabe/8']);
  });

  it('Poki sözlüğü kullanılıyor — start/complete/fail', () => {
    haritaBasladi(p, 'm', 'normal');
    haritaKazanildi(p, 'm', 3);
    haritaKaybedildi(p, 'm', 4);
    const eylemler = iz.map((x) => x.split('/')[2]);
    expect(eylemler).toContain('start');
    expect(eylemler).toContain('complete');
    expect(eylemler).toContain('fail');
  });

  /**
   * Koşu başına olay sayısı **dört** ile sınırlı: her dalga için olay
   * göndermek matrisin sormadığı bir şey ve ayrık değer sayısını şişirir.
   */
  it('bir koşu en çok dört olay üretiyor', () => {
    haritaBasladi(p, 'm', 'normal');
    haritaKaybedildi(p, 'm', 4);
    expect(iz).toHaveLength(4);
  });

  it('SDK measure vermiyorsa (CrazyGames) sessizce düşüyor', () => {
    const y = new Portal();
    y.kur({
      ad: 'measuresiz',
      gameplayStart() {},
      gameplayStop() {},
      commercialBreak() {},
    });
    expect(() => haritaBasladi(y, 'm', 'normal')).not.toThrow();
    // Sayaç yine artıyor: çağrı yapıldı, karşılığı yoktu.
    expect(y.sayac.olcum).toBe(2);
  });
});
