/**
 * İlerleme kaydı — `M7-T05`.
 *
 * `CLAUDE.md` Teknoloji: `KeyValueStore` arayüzü arkasında, **tek anahtar**
 * `kale-nobeti-save-v1`. Ayarlar (`Settings`) **aynı anahtarı** paylaşıyor;
 * ikisi de yazarken diğerinin alanlarını koruyor.
 *
 * TIER 1 kural 10: tüm `localStorage` erişimi `LocalStore` içinde ve
 * `try/catch` sarılı — gizli sekmede oyun çökmüyor, bellek yedeğine düşüyor.
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { KeyValueStore } from '../util/storage';
import { SAVE_KEY } from '../util/storage';

/** `GAME-DESIGN.md` §9 eşikleri. */
export const STAR_THRESHOLDS = { three: 20, two: 15 } as const;

/**
 * Kalan cana göre yıldız.
 *
 * §9: 20 (hiç sızma yok) → ★★★, 15-19 → ★★, ≤14 → ★.
 * Kaybedilen oyun **0 yıldız** — kazanmadan yıldız yok.
 */
export function starsFor(lives: number, won = true): 0 | 1 | 2 | 3 {
  if (!won || lives <= 0) return 0;
  if (lives >= STAR_THRESHOLDS.three) return 3;
  if (lives >= STAR_THRESHOLDS.two) return 2;
  return 1;
}

export interface SaveData {
  /** Şema sürümü — göç için. */
  readonly version: 1;
  /** Harita kimliği → kazanılan **en yüksek** yıldız. */
  readonly stars: Readonly<Record<string, 0 | 1 | 2 | 3>>;
}

const BOS: SaveData = { version: 1, stars: {} };

/**
 * İlerleme okuma/yazma.
 *
 * **Yıldız asla düşmüyor:** bir haritayı ★★★ bitirip sonra ★ ile tekrar
 * oynamak kaydı bozmuyor. Oyuncunun kazandığı şey geri alınmaz.
 */
export class SaveSystem {
  #veri: SaveData;
  readonly #store: KeyValueStore;

  constructor(store: KeyValueStore) {
    this.#store = store;
    this.#veri = this.#oku();
  }

  get data(): SaveData {
    return this.#veri;
  }

  starsOf(mapId: string): 0 | 1 | 2 | 3 {
    return this.#veri.stars[mapId] ?? 0;
  }

  isCompleted(mapId: string): boolean {
    return this.starsOf(mapId) > 0;
  }

  /**
   * Harita kilidi — **yalnız bitirme** (S62 varsayılanı).
   *
   * İlk harita her zaman açık. Sonrakiler bir öncekini bitirmeyi
   * istiyor; **yıldız şartı yok**, çünkü yıldız şartı oyuncuyu ilerleyemez
   * hâle getirebilir ve §9 böyle bir kilit tanımlamıyor.
   */
  isUnlocked(mapIds: readonly string[], mapId: string): boolean {
    const i = mapIds.indexOf(mapId);
    if (i <= 0) return true;
    const onceki = mapIds[i - 1];
    return onceki !== undefined && this.isCompleted(onceki);
  }

  /** @returns Kayıt gerçekten değiştiyse `true`. */
  recordResult(mapId: string, lives: number, won: boolean): boolean {
    const yeni = starsFor(lives, won);
    if (yeni <= this.starsOf(mapId)) return false; // yıldız düşmüyor
    this.#veri = { ...this.#veri, stars: { ...this.#veri.stars, [mapId]: yeni } };
    this.#yaz();
    return true;
  }

  /** Toplam yıldız — seviye seçim ekranında gösteriliyor. */
  totalStars(): number {
    return Object.values(this.#veri.stars).reduce<number>((a, b) => a + b, 0);
  }

  #oku(): SaveData {
    const ham = this.#store.get(SAVE_KEY);
    if (ham === null) return BOS;
    try {
      const nesne = JSON.parse(ham) as { progress?: Partial<SaveData> };
      const p = nesne.progress;
      if (p === undefined || p.version !== 1) return BOS;
      const stars: Record<string, 0 | 1 | 2 | 3> = {};
      for (const [k, v] of Object.entries(p.stars ?? {})) {
        if (v === 0 || v === 1 || v === 2 || v === 3) stars[k] = v;
      }
      return { version: 1, stars };
    } catch {
      // Bozuk kayıt oyunu çökertmiyor — sıfırdan başlıyor.
      return BOS;
    }
  }

  #yaz(): void {
    // `Settings` aynı anahtarı kullanıyor; onun alanları korunuyor.
    let mevcut: Record<string, unknown> = {};
    const ham = this.#store.get(SAVE_KEY);
    if (ham !== null) {
      try {
        const nesne: unknown = JSON.parse(ham);
        if (typeof nesne === 'object' && nesne !== null) mevcut = nesne as Record<string, unknown>;
      } catch {
        mevcut = {};
      }
    }
    mevcut['progress'] = this.#veri;
    this.#store.set(SAVE_KEY, JSON.stringify(mevcut));
  }
}
