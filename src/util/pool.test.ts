import { describe, it, expect, vi } from 'vitest';
import { Pool } from './pool';
import type { Poolable } from './pool';

/** Sıfırlama sözleşmesini gözlemleyebilmek için sahte havuzlanabilir nesne. */
class SahteDusman implements Poolable {
  hedef: object | null = null;
  tint = 0xff0000;
  sifirlamaSayisi = 0;

  resetForPool(): void {
    this.hedef = null;
    this.tint = 0xffffff;
    this.sifirlamaSayisi++;
  }
}

function havuzYap(prealloc: number, onExhausted?: (c: number) => void) {
  let uretim = 0;
  const pool = new Pool<SahteDusman>(
    () => {
      uretim++;
      return new SahteDusman();
    },
    prealloc,
    onExhausted,
  );
  return { pool, uretimSayisi: () => uretim };
}

describe('Pool', () => {
  it('ön ayırma kurucuda biter — sonra hiç üretim yok', () => {
    const { pool, uretimSayisi } = havuzYap(5);
    expect(uretimSayisi()).toBe(5);
    expect(pool.capacity).toBe(5);
    expect(pool.freeCount).toBe(5);
    expect(pool.activeCount).toBe(0);

    for (let i = 0; i < 5; i++) pool.acquire();
    expect(uretimSayisi()).toBe(5); // acquire üretmiyor
  });

  it('acquire/release turu sayaçları doğru tutuyor', () => {
    const { pool } = havuzYap(3);
    const a = pool.acquire();
    const b = pool.acquire();
    expect(pool.activeCount).toBe(2);
    expect(pool.freeCount).toBe(1);

    pool.release(a!);
    expect(pool.activeCount).toBe(1);
    expect(pool.freeCount).toBe(2);

    pool.release(b!);
    expect(pool.activeCount).toBe(0);
    expect(pool.capacity).toBe(3); // kapasite hiç değişmedi
  });

  it('havuz dolunca null döner — YENİ NESNE YARATMAZ', () => {
    // TIER 1 kural 3'ün "sessizce büyümez" kısmı.
    const { pool, uretimSayisi } = havuzYap(2);
    expect(pool.acquire()).not.toBeNull();
    expect(pool.acquire()).not.toBeNull();
    expect(pool.acquire()).toBeNull();
    expect(pool.acquire()).toBeNull();
    expect(uretimSayisi()).toBe(2);
    expect(pool.capacity).toBe(2);
  });

  it('havuz tükenince onExhausted tetikleniyor', () => {
    const uyari = vi.fn();
    const { pool } = havuzYap(1, uyari);
    pool.acquire();
    expect(uyari).not.toHaveBeenCalled();
    pool.acquire();
    expect(uyari).toHaveBeenCalledWith(1);
  });

  it('release HER ZAMAN resetForPool çağırıyor', () => {
    const { pool } = havuzYap(1);
    const a = pool.acquire()!;
    const oncekiSayi = a.sifirlamaSayisi; // kurucudaki ilk sıfırlama
    a.hedef = { olu: true };
    a.tint = 0x00ff00;

    pool.release(a);

    expect(a.sifirlamaSayisi).toBe(oncekiSayi + 1);
    expect(a.hedef).toBeNull(); // ölü hedef referansı temizlendi
    expect(a.tint).toBe(0xffffff);
  });

  it('havuza dönen nesne temiz çıkıyor', () => {
    const { pool } = havuzYap(1);
    const a = pool.acquire()!;
    a.hedef = { olu: true };
    pool.release(a);

    const b = pool.acquire()!;
    expect(b).toBe(a); // aynı nesne geri geldi
    expect(b.hedef).toBeNull(); // ama durumu taşımadı
  });

  it('çift release yok sayılıyor — aynı nesne iki kez dağıtılmaz', () => {
    const { pool } = havuzYap(2);
    const a = pool.acquire()!;
    const sifirlamaOnce = a.sifirlamaSayisi;

    pool.release(a);
    pool.release(a); // ikincisi sessizce yok sayılır

    expect(a.sifirlamaSayisi).toBe(sifirlamaOnce + 1);
    expect(pool.freeCount).toBe(2);
    expect(pool.capacity).toBe(2); // kapasite şişmedi

    const x = pool.acquire();
    const y = pool.acquire();
    expect(x).not.toBe(y); // aynı nesne iki kez dağıtılmadı
    expect(pool.acquire()).toBeNull();
  });

  it('bu havuzdan alınmamış nesne release edilirse yok sayılıyor', () => {
    const { pool } = havuzYap(1);
    const yabanci = new SahteDusman();
    pool.release(yabanci);
    expect(pool.capacity).toBe(1);
    expect(pool.freeCount).toBe(1);
  });

  it('releaseAll hepsini sıfırlayıp geri veriyor', () => {
    const { pool } = havuzYap(4);
    const alinanlar = [pool.acquire()!, pool.acquire()!, pool.acquire()!];
    for (const n of alinanlar) n.hedef = { olu: true };

    pool.releaseAll();

    expect(pool.activeCount).toBe(0);
    expect(pool.freeCount).toBe(4);
    for (const n of alinanlar) expect(n.hedef).toBeNull();
  });

  it('activeItems kopya döner — döngü içinde release güvenli', () => {
    const { pool } = havuzYap(3);
    pool.acquire();
    pool.acquire();
    pool.acquire();

    expect(() => {
      for (const n of pool.activeItems()) pool.release(n);
    }).not.toThrow();
    expect(pool.activeCount).toBe(0);
  });

  it('prealloc 0: her acquire null', () => {
    const { pool } = havuzYap(0);
    expect(pool.capacity).toBe(0);
    expect(pool.acquire()).toBeNull();
  });

  it('ön ayrılan nesneler de sıfırlanmış durumda başlıyor', () => {
    const { pool } = havuzYap(1);
    const a = pool.acquire()!;
    expect(a.sifirlamaSayisi).toBe(1);
    expect(a.tint).toBe(0xffffff);
  });
});
