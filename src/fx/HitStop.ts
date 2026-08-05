/**
 * Hit-stop — `GAME-DESIGN.md` §10.
 *
 * > **60–80 ms**. Yalnızca boss hasarı ve düşman ölümünde. Hareket hiç
 * > değişmese bile beyin bunu "daha ağır vuruş" olarak okur.
 * >
 * > **2× hızda:** hit-stop devre dışı. Yoksa hızlandırılmış oyun okunmaz
 * > hale gelir.
 *
 * ## TIER 1 kural 8 ile ilişkisi
 *
 * Hit-stop **oyun zamanını durduran** şey; o yüzden kendi sayacı oyun
 * zamanıyla ölçülemez — durdurduğu saatle kendini ölçerdi ve hiç bitmezdi.
 * Sayaç **duvar saatiyle** (`realMs`) işliyor. Bu, kural 8'in ihlali değil
 * **tanımı**: kural "zaman bağımlı mantık `scaledDelta` üzerinden çalışır"
 * diyor ve `scaledDelta`yı üreten katman bu kuralın dışında kalmak zorunda
 * (`GameClock`'un kendisi gibi).
 *
 * Parametre adı bilerek `delta` değil: bekçi k.8 ham `delta` adını
 * `GameClock`/`GameScene` dışında yasaklıyor ve bu dosya o yasağın
 * kapsamında kalmalı.
 *
 * Phaser'a dokunmuyor — `node`'da test ediliyor.
 */

/** §10: 60-80 ms. Alt sınır düşman ölümü, üst sınır boss hasarı. */
export const HITSTOP_MIN_MS = 60;
export const HITSTOP_MAX_MS = 80;

export class HitStop {
  #kalanMs = 0;

  /**
   * @param ms İstenen süre. `HITSTOP_MAX_MS`'i **aşamaz** — §10'un üst
   *   sınırı; aşması "oyun takıldı" hissi verir.
   * @param speed Oyun hızı. **`2` ise hiç tetiklenmiyor** (§10).
   */
  trigger(ms: number, speed: 1 | 2): void {
    if (speed === 2) return; // §10 — 2× hızda devre dışı
    if (!(ms > 0)) return;
    const kirpik = ms > HITSTOP_MAX_MS ? HITSTOP_MAX_MS : ms;
    // Üst üste gelen vuruşlar **uzatmıyor**, en uzunu kazanıyor: her ölümde
    // 60 ms eklenseydi yoğun dalgada oyun saniyelerce donardı.
    if (kirpik > this.#kalanMs) this.#kalanMs = kirpik;
  }

  /**
   * @param realMs Duvar saati. Yukarıdaki gerekçe.
   * @returns Hit-stop **bu karede** etkinse `true` — çağıran o karede
   *   oyun zamanını sıfırlıyor.
   */
  update(realMs: number): boolean {
    if (this.#kalanMs <= 0) return false;
    this.#kalanMs -= realMs;
    if (this.#kalanMs < 0) this.#kalanMs = 0;
    return true;
  }

  get active(): boolean {
    return this.#kalanMs > 0;
  }

  get remainingMs(): number {
    return this.#kalanMs;
  }

  reset(): void {
    this.#kalanMs = 0;
  }
}
