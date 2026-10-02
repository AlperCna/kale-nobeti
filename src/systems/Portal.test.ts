import { describe, it, expect, beforeEach } from 'vitest';
import { Portal, PORTAL_YOK, REKLAM_BASLAMA_SINIRI_MS } from './Portal';
import type { PortalAdapter, ReklamOlaylari, Zamanlayici } from './Portal';

/** Reklamı testin kendisi bitiriyor: `son` en son istenen reklamın olayları. */
function sahteAdapter(): PortalAdapter & { iz: string[]; son: ReklamOlaylari | null } {
  const a = {
    ad: 'sahte',
    iz: [] as string[],
    son: null as ReklamOlaylari | null,
    gameplayStart: () => void a.iz.push('start'),
    gameplayStop: () => void a.iz.push('stop'),
    commercialBreak: (olay: ReklamOlaylari) => {
      a.iz.push('reklam');
      a.son = olay;
    },
    yuklemeBasladi: () => void a.iz.push('yuklemeBasladi'),
    yuklemeBitti: () => void a.iz.push('yuklemeBitti'),
  };
  return a;
}

/** Elle ilerleyen saat — reklam başlama sınırı için. */
function sahteSaat(): { zamanla: Zamanlayici; ilerle: () => void; sureler: number[] } {
  const isler: { is: () => void; iptal: boolean }[] = [];
  const sureler: number[] = [];
  return {
    sureler,
    zamanla: (is, ms) => {
      const k = { is, iptal: false };
      isler.push(k);
      sureler.push(ms);
      return () => {
        k.iptal = true;
      };
    },
    ilerle: () => {
      for (const k of isler) {
        if (k.iptal) continue;
        k.iptal = true;
        k.is();
      }
    },
  };
}

/** Çağıranın gördüğü: ses durumları ve `devam` sayısı. */
function cagiran(): { ses: boolean[]; devam: number; sesiKis: (k: boolean) => void; devamEt: () => void } {
  const c = {
    ses: [] as boolean[],
    devam: 0,
    sesiKis: (k: boolean) => void c.ses.push(k),
    devamEt: () => {
      c.devam++;
    },
  };
  return c;
}

describe('Portal — Poki/CrazyGames olay sözleşmesi', () => {
  let p: Portal;
  let a: ReturnType<typeof sahteAdapter>;
  let saat: ReturnType<typeof sahteSaat>;

  beforeEach(() => {
    saat = sahteSaat();
    p = new Portal(saat.zamanla);
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

  describe('reklam — seviye geçişinde ve BEKLENİYOR (M178)', () => {
    /**
     * `M178`'in çekirdeği: oyun reklam kapanınca başlıyor. `M9` reklamı
     * beklemiyordu ve oyun video oynarken sürüyordu.
     */
    it('reklam bitene kadar devam YOK; bitince ses açılıp devam BİR kez', () => {
      const c = cagiran();
      p.commercialBreak(c.sesiKis, c.devamEt);
      expect(a.iz).toEqual(['reklam']);
      expect(c.ses).toEqual([true]);
      expect(c.devam).toBe(0);
      a.son?.basladi();
      expect(c.devam, 'reklam oynarken oyun başladı').toBe(0);
      a.son?.bitti();
      expect(c.ses).toEqual([true, false]);
      expect(c.devam).toBe(1);
      a.son?.bitti(); // SDK iki kez bildirse de
      expect(c.devam).toBe(1);
      expect(p.reklamda).toBe(false);
    });

    /**
     * Sigorta: hiçbir geri çağrı gelmezse oyuncu geçişte kilitli
     * kalırdı. CrazyGames belgesi her isteğe bir geri çağrı garanti
     * etmiyor.
     */
    it('reklam BAŞLAMAZSA sınırda devam ediliyor — geçiş kilitlenmiyor', () => {
      const c = cagiran();
      p.commercialBreak(c.sesiKis, c.devamEt);
      expect(saat.sureler).toEqual([REKLAM_BASLAMA_SINIRI_MS]);
      saat.ilerle();
      expect(c.devam).toBe(1);
      expect(c.ses).toEqual([true, false]);
      expect(p.reklamda).toBe(false);
    });

    it('reklam BAŞLADIYSA sınır işlemiyor — bitişi bekleniyor', () => {
      const c = cagiran();
      p.commercialBreak(c.sesiKis, c.devamEt);
      a.son?.basladi();
      saat.ilerle();
      expect(c.devam).toBe(0);
      a.son?.bitti();
      expect(c.devam).toBe(1);
    });

    it('sınırdan SONRA başlayan reklam sessiz oynuyor, oyun ikinci kez başlamıyor', () => {
      const c = cagiran();
      p.commercialBreak(c.sesiKis, c.devamEt);
      saat.ilerle();
      a.son?.basladi();
      expect(c.ses).toEqual([true, false, true]);
      a.son?.bitti();
      expect(c.ses).toEqual([true, false, true, false]);
      expect(c.devam).toBe(1);
    });

    /** Poki: *"It should not be possible to fire any SDK events during midrolls."* */
    it('reklam sırasında gameplayStart SDK’ya GİTMİYOR', () => {
      const c = cagiran();
      p.commercialBreak(c.sesiKis, c.devamEt);
      p.gameplayStart();
      expect(a.iz).toEqual(['reklam']);
      a.son?.bitti();
      p.gameplayStart();
      expect(a.iz).toEqual(['reklam', 'start']);
    });

    it('reklam gameplayStart’ı KENDİSİ çağırmıyor — o ilk etkileşimde', () => {
      const c = cagiran();
      p.commercialBreak(c.sesiKis, c.devamEt);
      a.son?.bitti();
      expect(p.oyundaMi).toBe(false);
    });

    /**
     * Oyun sürerken reklam yok — ama istek yutulunca `devam` HEMEN
     * geliyor; yutulan bir istek geçişi kilitlememeli.
     */
    it('oyun sürerken istenirse reklam YOK, devam hemen', () => {
      const c = cagiran();
      p.gameplayStart();
      p.commercialBreak(c.sesiKis, c.devamEt);
      expect(a.iz).toEqual(['start']);
      expect(p.sayac.reklam).toBe(0);
      expect(c.devam).toBe(1);
      expect(c.ses).toEqual([]);
    });

    it('açık bir reklamın üstüne ikinci istek reklam açmıyor', () => {
      const c1 = cagiran();
      const c2 = cagiran();
      p.commercialBreak(c1.sesiKis, c1.devamEt);
      p.commercialBreak(c2.sesiKis, c2.devamEt);
      expect(p.sayac.reklam).toBe(1);
      expect(a.iz).toEqual(['reklam']);
    });
  });

  describe('yükleme olayları (M178)', () => {
    it('birer kez gidiyor — sonraki çağrılar yutuluyor', () => {
      p.yuklemeBasladi();
      p.yuklemeBasladi();
      p.yuklemeBitti();
      p.yuklemeBitti();
      p.yuklemeBasladi();
      expect(a.iz).toEqual(['yuklemeBasladi', 'yuklemeBitti']);
    });

    it('başlangıç bildirilmeden de bitiş gidiyor (Poki’de başlangıç yok)', () => {
      p.yuklemeBitti();
      expect(a.iz).toEqual(['yuklemeBitti']);
    });
  });

  describe('SDK yokken (itch.io / geliştirme)', () => {
    it('hiçbir çağrı patlamıyor', () => {
      const y = new Portal(); // varsayılan PORTAL_YOK
      expect(y.adapterAdi).toBe('yok');
      expect(() => {
        y.gameplayStart();
        y.gameplayStop();
        y.commercialBreak(
          () => {},
          () => {},
        );
        y.yuklemeBasladi();
        y.yuklemeBitti();
      }).not.toThrow();
    });

    /**
     * itch.io'da haritaya giriş `M178` öncesi kadar anlık kalmalı:
     * `devam` **aynı tikte**, ses dengeli, sigorta saati iptal.
     */
    it('reklamsız yolda devam AYNI TİKTE ve ses kısılıp açılıyor', () => {
      const s = sahteSaat();
      const y = new Portal(s.zamanla);
      const c = cagiran();
      y.commercialBreak(c.sesiKis, c.devamEt);
      expect(c.devam).toBe(1);
      expect(c.ses).toEqual([true, false]);
      s.ilerle(); // iptal edilmiş sigorta ikinci devam üretmiyor
      expect(c.devam).toBe(1);
    });

    it('PORTAL_YOK reklamı istekte bitiriyor', () => {
      const iz: string[] = [];
      PORTAL_YOK.commercialBreak({
        basladi: () => void iz.push('basladi'),
        bitti: () => void iz.push('bitti'),
      });
      expect(iz).toEqual(['bitti']);
    });
  });
});
