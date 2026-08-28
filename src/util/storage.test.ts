import { describe, expect, it } from 'vitest';
import { LocalStore, MemoryStore, SAVE_KEY } from './storage';

/**
 * `Y08` — `LocalStore`'un **sağlayıcı** tarafı hiç test edilmiyordu
 * (`Settings.test.ts`/`SaveSystem.test.ts` yalnız *tüketici* tarafı,
 * sahte bir `KeyValueStore` ile test ediyor). TIER 1 kural 10'un tam
 * kalbi burada — `RISKS.md` R16.
 *
 * Gerçek `localStorage` API'sini taklit eden, **çalışan** bir sahte —
 * `Settings.test.ts`'teki "her erişim fırlıyor" sahtesinden farklı:
 * burada normal okuma/yazma gerçekten çalışıyor, yalnız `bozAnahtar`
 * ile işaretlenen anahtarlar fırlatıyor. Bu, "prob başarılı ama gerçek
 * yazma kota yüzünden fırlıyor" senaryosunu (Settings.test.ts'in
 * "getter'ın tamamı fırlıyor" senaryosundan **farklı** bir kod yolu)
 * ayrı test etmeyi sağlıyor.
 */
class SahteLocalStorage {
  readonly #veri = new Map<string, string>();
  readonly #bozuk = new Set<string>();

  getItem(key: string): string | null {
    if (this.#bozuk.has(key)) throw new Error('erişim reddedildi');
    return this.#veri.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.#bozuk.has(key)) throw new Error('QuotaExceededError');
    this.#veri.set(key, value);
  }

  removeItem(key: string): void {
    if (this.#bozuk.has(key)) throw new Error('erişim reddedildi');
    this.#veri.delete(key);
  }

  /** Bu anahtara **sonraki** her erişimi fırlatır hâle getirir. */
  bozAnahtar(key: string): void {
    this.#bozuk.add(key);
  }
}

/** Testler arası `globalThis.localStorage`'ı izole eder — sızıntı yok. */
function sahteKur(depo: unknown): () => void {
  const asil = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: depo });
  return () => {
    if (asil) Object.defineProperty(globalThis, 'localStorage', asil);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  };
}

describe('MemoryStore', () => {
  it('yaz-oku turu çalışıyor', () => {
    const m = new MemoryStore();
    expect(m.get('x')).toBeNull();
    m.set('x', '1');
    expect(m.get('x')).toBe('1');
    m.remove('x');
    expect(m.get('x')).toBeNull();
  });

  it('set her zaman true dönüyor — çökme yolu yok', () => {
    expect(new MemoryStore().set('x', '1')).toBe(true);
  });
});

describe('LocalStore.destekleniyorMu', () => {
  it('localStorage hiç yoksa false', () => {
    const geriAl = sahteKur(undefined);
    try {
      expect(LocalStore.destekleniyorMu()).toBe(false);
    } finally {
      geriAl();
    }
  });

  it('localStorage varsa ve çalışıyorsa true', () => {
    const geriAl = sahteKur(new SahteLocalStorage());
    try {
      expect(LocalStore.destekleniyorMu()).toBe(true);
    } finally {
      geriAl();
    }
  });

  it('prob (yoklama) fırlarsa false — gizli sekme', () => {
    const geriAl = sahteKur({
      setItem() {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(LocalStore.destekleniyorMu()).toBe(false);
    } finally {
      geriAl();
    }
  });
});

describe('LocalStore — localStorage hiç yokken (node ortamı, gerçek sekme dışı)', () => {
  it('get başlangıçta null, set yedeğe düşüp false dönüyor', () => {
    const geriAl = sahteKur(undefined);
    try {
      const d = new LocalStore();
      expect(d.get('a')).toBeNull();
      expect(d.set('a', '1')).toBe(false);
      expect(d.get('a')).toBe('1'); // yedekten okunuyor
    } finally {
      geriAl();
    }
  });

  it('remove çökmüyor, yedekten siliyor', () => {
    const geriAl = sahteKur(undefined);
    try {
      const d = new LocalStore();
      d.set('a', '1');
      d.remove('a');
      expect(d.get('a')).toBeNull();
    } finally {
      geriAl();
    }
  });
});

describe('LocalStore — localStorage gerçekten çalışıyorken', () => {
  it('set true dönüyor, get GERÇEK depodan okuyor (yedekten değil)', () => {
    const sahte = new SahteLocalStorage();
    const geriAl = sahteKur(sahte);
    try {
      const d = new LocalStore();
      expect(d.set('a', '1')).toBe(true);
      // İkinci, BAĞIMSIZ bir LocalStore aynı gerçek depoyu paylaşıyor —
      // ilkinin yazdığını görebiliyorsa veri gerçekten localStorage'a
      // gitmiş demektir, yalnız kendi bellek yedeğine değil.
      const d2 = new LocalStore();
      expect(d2.get('a')).toBe('1');
    } finally {
      geriAl();
    }
  });

  it('remove GERÇEK depodan siliyor', () => {
    const sahte = new SahteLocalStorage();
    const geriAl = sahteKur(sahte);
    try {
      new LocalStore().set('a', '1');
      new LocalStore().remove('a');
      expect(new LocalStore().get('a')).toBeNull();
    } finally {
      geriAl();
    }
  });

  it('olmayan anahtar için null dönüyor', () => {
    const geriAl = sahteKur(new SahteLocalStorage());
    try {
      expect(new LocalStore().get('yok')).toBeNull();
    } finally {
      geriAl();
    }
  });
});

describe('LocalStore — çalışma sırasında bozulma (Y08 — kalıcı düşüş)', () => {
  it('prob başarılı ama SONRAKİ set kota yüzünden fırlarsa: yedeğe düşüyor, false dönüyor', () => {
    const sahte = new SahteLocalStorage();
    sahte.bozAnahtar('buyuk'); // prob ('__kn_probe__') temiz, yalnız bu anahtar bozuk
    const geriAl = sahteKur(sahte);
    try {
      const d = new LocalStore();
      expect(d.set('buyuk', 'veri')).toBe(false);
      expect(d.get('buyuk')).toBe('veri'); // yedekten
    } finally {
      geriAl();
    }
  });

  it('kalıcı düşüş SONRASI aynı ÖRNEK başka bir anahtar için de yedeği kullanıyor', () => {
    // Gerçek hata (düzeltilmeden önce): `#kullanilabilir` yalnız kurucuda
    // ölçülüyordu — bir set() çalışma sırasında fırlasa bile bayrak
    // `true` kalıyor, sonraki `get()` gerçek depoyu tekrar deniyor ve
    // (yazma hiç gerçekleşmediği için) eski/olmayan değeri döndürüyordu.
    const sahte = new SahteLocalStorage();
    sahte.bozAnahtar('bozuk');
    const geriAl = sahteKur(sahte);
    try {
      const d = new LocalStore();
      d.set('bozuk', 'x'); // fırlar, kalıcı düşüş tetiklenir
      // Bozuk OLMAYAN bir anahtar bile artık yedekten okunmalı —
      // düşüş kalıcı, anahtar-özel değil.
      expect(d.set('temiz', 'y')).toBe(false);
      expect(d.get('temiz')).toBe('y');
      // Gerçek depoya HİÇ yazılmadığını doğrula (ayrı bir örnekle okuyarak).
      expect(new LocalStore().get('temiz')).toBeNull();
    } finally {
      geriAl();
    }
  });

  it('kalıcı düşüş SONRASI remove de yedekten siliyor, gerçek depoya dokunmuyor', () => {
    const sahte = new SahteLocalStorage();
    sahte.bozAnahtar('bozuk');
    const geriAl = sahteKur(sahte);
    try {
      const d = new LocalStore();
      d.set('bozuk', 'x'); // kalıcı düşüş
      d.set('temiz', 'y'); // artık yedekte
      d.remove('temiz');
      expect(d.get('temiz')).toBeNull();
    } finally {
      geriAl();
    }
  });

  it('get çalışma sırasında fırlarsa da kalıcı düşüyor', () => {
    const sahte = new SahteLocalStorage();
    const geriAl = sahteKur(sahte);
    try {
      const d = new LocalStore();
      d.set('a', '1'); // gerçek depoya yazıldı, #kullanilabilir hâlâ true
      sahte.bozAnahtar('a'); // artık bu anahtara her erişim fırlıyor
      expect(d.get('a')).toBeNull(); // yedekte hiç yok — gerçek depodaki eski değere değil, yedeğe düştü
      // Kalıcı düşüş: BAŞKA bir anahtar da artık yedekten okunuyor.
      expect(d.set('b', '2')).toBe(false);
      expect(new LocalStore().get('b')).toBeNull(); // gerçek depoya hiç gitmedi
    } finally {
      geriAl();
    }
  });
});

describe('LocalStore — "oyuncuya bir kez bildir" (CLAUDE.md TIER 1 k.10)', () => {
  it('birden çok başarısız set tek bir bildirim üretiyor', () => {
    const geriAl = sahteKur(undefined);
    try {
      let sayac = 0;
      const d = new LocalStore(() => sayac++);
      d.set('a', '1');
      d.set('b', '2');
      d.set('c', '3');
      expect(sayac).toBe(1);
    } finally {
      geriAl();
    }
  });

  it('çalışma sırasındaki kalıcı düşüş de bildirimi tetikliyor, hâlâ bir kez', () => {
    const sahte = new SahteLocalStorage();
    sahte.bozAnahtar('a');
    const geriAl = sahteKur(sahte);
    try {
      let sayac = 0;
      const d = new LocalStore(() => sayac++);
      d.set('a', '1'); // fırlar → kalıcı düşüş → bildirim #1
      d.set('b', '2'); // artık yedekte, ikinci bildirim YOK
      expect(sayac).toBe(1);
    } finally {
      geriAl();
    }
  });

  it('onFailure verilmediyse çökmüyor', () => {
    const geriAl = sahteKur(undefined);
    try {
      const d = new LocalStore();
      expect(() => d.set('a', '1')).not.toThrow();
    } finally {
      geriAl();
    }
  });
});

describe('SAVE_KEY', () => {
  it('CLAUDE.md Teknoloji ile eşleşiyor — tek anahtar', () => {
    expect(SAVE_KEY).toBe('kale-nobeti-save-v1');
  });
});
