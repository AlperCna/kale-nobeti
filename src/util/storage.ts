/**
 * Kalıcı depolama — **TIER 1 kural 10**.
 *
 * > `localStorage` erişimi her zaman `try/catch` içinde. Gizli sekmede
 * > istisna fırlatıyor; sarılmazsa oyun açılışta çöker. Kayıt başarısızsa
 * > oyuncuya bir kez bildirilir.
 *
 * `CLAUDE.md` Teknoloji: kayıt bir `KeyValueStore` arayüzü arkasında,
 * tek anahtar `kale-nobeti-save-v1`. Arayüz portal SDK'ları için de kapı
 * bırakıyor (Poki ve CrazyGames kendi bulut kaydını sunuyor).
 *
 * TIER 1 kural 11: Phaser'a dokunmaz. DOM'a **koşullu** dokunuyor —
 * `localStorage` yoksa (node testleri) bellek içi yedeğe düşüyor.
 */

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

/** Tek kayıt anahtarı (`CLAUDE.md` Teknoloji). */
export const SAVE_KEY = 'kale-nobeti-save-v1';

/**
 * Bellek içi depo — testlerde ve `localStorage`'ın hiç var olmadığı
 * ortamlarda. Oyun çalışmaya devam eder, yalnız kalıcılık kaybolur.
 */
export class MemoryStore implements KeyValueStore {
  readonly #harita = new Map<string, string>();

  get(key: string): string | null {
    return this.#harita.get(key) ?? null;
  }

  set(key: string, value: string): boolean {
    this.#harita.set(key, value);
    return true;
  }

  remove(key: string): void {
    this.#harita.delete(key);
  }
}

/**
 * `localStorage` sarmalayıcısı. **Her erişim `try/catch` içinde.**
 *
 * Gizli sekmede `localStorage`'a *dokunmak* bile (varlığını okumak dahil)
 * bazı tarayıcılarda `SecurityError` fırlatıyor — bu yüzden kurucudaki
 * yoklama da sarılı.
 *
 * @param onFailure Yazma **ilk kez** başarısız olduğunda bir kez çağrılır
 *   (`CLAUDE.md` kural 10: "kayıt başarısızsa oyuncuya bir kez bildirilir").
 */
export class LocalStore implements KeyValueStore {
  #bildirildi = false;
  readonly #onFailure: (() => void) | undefined;
  readonly #yedek = new MemoryStore();
  readonly #kullanilabilir: boolean;

  constructor(onFailure?: () => void) {
    this.#onFailure = onFailure;
    this.#kullanilabilir = LocalStore.destekleniyorMu();
  }

  /** Gizli sekme sınaması — yoklamanın kendisi de sarılı. */
  static destekleniyorMu(): boolean {
    try {
      const ls = globalThis.localStorage;
      if (ls === undefined || ls === null) return false;
      const sinama = '__kn_probe__';
      ls.setItem(sinama, '1');
      ls.removeItem(sinama);
      return true;
    } catch {
      return false;
    }
  }

  get(key: string): string | null {
    if (!this.#kullanilabilir) return this.#yedek.get(key);
    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      return this.#yedek.get(key);
    }
  }

  set(key: string, value: string): boolean {
    if (this.#kullanilabilir) {
      try {
        globalThis.localStorage.setItem(key, value);
        return true;
      } catch {
        // Kota dolmuş olabilir — sessizce yedeğe düş.
      }
    }
    this.#yedek.set(key, value);
    this.#bildir();
    return false;
  }

  remove(key: string): void {
    this.#yedek.remove(key);
    if (!this.#kullanilabilir) return;
    try {
      globalThis.localStorage.removeItem(key);
    } catch {
      // yoksay
    }
  }

  #bildir(): void {
    if (this.#bildirildi) return;
    this.#bildirildi = true;
    this.#onFailure?.();
  }
}
