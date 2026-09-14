/**
 * Sonsuz mod rekorları — `M8-T06`.
 *
 * Kayıt şeması `progress` ile **aynı anahtarı** paylaşıyor ama ayrı bir
 * üst alanda (`endless`) duruyor. Gerekçe `TutorialSystem`'dekiyle aynı:
 * `progress.version` bir göç sözleşmesi; yeni bir alan eklemek için onu
 * yükseltmek, var olan kayıtları göç koduna sokmak demek olurdu. Ayrı alan
 * eski kayıtlarla **kendiliğinden uyumlu** — okunduğunda yoksa boş.
 *
 * TIER 1 kural 10: `localStorage`'a doğrudan dokunmuyor, `KeyValueStore`
 * arkasından geçiyor (o da `try/catch` sarılı).
 * TIER 1 kural 11: Phaser'a dokunmaz.
 */

import type { KeyValueStore } from '../util/storage';
import { SAVE_KEY } from '../util/storage';

/** Harita kimliği → ulaşılan en yüksek sonsuz dalga. */
export type EndlessBests = Readonly<Record<string, number>>;

export class EndlessRecords {
  #best: Record<string, number>;
  readonly #store: KeyValueStore;

  constructor(store: KeyValueStore) {
    this.#store = store;
    this.#best = this.#oku();
  }

  get data(): EndlessBests {
    return this.#best;
  }

  bestOf(mapId: string): number {
    return this.#best[mapId] ?? 0;
  }

  /**
   * Rekoru günceller.
   *
   * **Rekor düşmüyor** — `SaveSystem`'in yıldız kuralıyla aynı: oyuncunun
   * kazandığı şey geri alınmaz.
   *
   * @returns Gerçekten yeni rekorsa `true` (oyun sonu ekranı bunu kutluyor).
   */
  record(mapId: string, wave: number): boolean {
    if (!Number.isFinite(wave) || wave <= this.bestOf(mapId)) return false;
    this.#best = { ...this.#best, [mapId]: Math.floor(wave) };
    this.#yaz();
    return true;
  }

  #oku(): Record<string, number> {
    const ham = this.#store.get(SAVE_KEY);
    if (ham === null) return {};
    try {
      const nesne = JSON.parse(ham) as { endless?: Record<string, unknown> };
      const kaynak = nesne.endless ?? {};
      const sonuc: Record<string, number> = {};
      for (const [k, v] of Object.entries(kaynak)) {
        // Bozuk/elle kurcalanmış değer kaydı çökertmiyor, yok sayılıyor.
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) sonuc[k] = Math.floor(v);
      }
      return sonuc;
    } catch {
      return {};
    }
  }

  #yaz(): void {
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
    mevcut['endless'] = this.#best;
    this.#store.set(SAVE_KEY, JSON.stringify(mevcut));
  }
}
