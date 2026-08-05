/**
 * Ekran sarsıntısı — `GAME-DESIGN.md` §10.
 *
 * > **yönlü**, darbe vektörü boyunca; süre 0.12–0.25 sn; üstel sönüm.
 * > Yalnızca top patlaması, boss vuruşu ve can kaybında. Her okçu atışında
 * > sarsıntı olmaz.
 *
 * **Phaser'a dokunmuyor.** Sınıf yalnız bir kayma vektörü üretiyor; kamerayı
 * kaydırmak sahnenin işi. Böylece `node` ortamında test edilebiliyor —
 * `fx/` kural 11 kapsamında değil ama aynı ayrım burada da işe yarıyor.
 *
 * TIER 1 kural 8: süre `scaledDelta` ile tükeniyor.
 * TIER 1 kural 6: `enabled = false` ile tamamen kapanıyor.
 */

/** §10: süre 0,12–0,25 sn. Şiddet bu aralığa eşleniyor. */
export const SHAKE_MIN_SEC = 0.12;
export const SHAKE_MAX_SEC = 0.25;

/**
 * Üstel sönüm katsayısı. `e^(-k·t/T)` — `k = 5` sonda genliği başlangıcın
 * **%0,7'sine** indiriyor, yani sarsıntı görünür biçimde bitiyor.
 * Daha küçük bir `k` sarsıntıyı aniden kesilmiş gibi gösterirdi.
 */
const SONUM_K = 5;

export interface ShakeOffset {
  readonly x: number;
  readonly y: number;
}

const SIFIR: ShakeOffset = { x: 0, y: 0 };

export class ScreenShake {
  /** TIER 1 kural 6 — ayarlardan kapatılabilir. */
  enabled = true;

  #kalan = 0;
  #toplam = 0;
  /** Birim darbe vektörü. */
  #dx = 0;
  #dy = 0;
  #genlik = 0;
  #faz = 0;

  /**
   * @param dirX Darbe vektörü (normalize edilmesi gerekmiyor).
   * @param dirY
   * @param strength `0`…`1`. Süreyi 0,12-0,25 sn arasına, genliği px'e eşler.
   *
   * **Rastgele yön yok** — §10 "yönlü, darbe vektörü boyunca" diyor ve
   * görevin "bitmedi sayılır eğer" maddesi bunu şart koşuyor. Rastgele
   * yönlü sarsıntı oyuncuya darbenin nereden geldiğini söylemez.
   */
  trigger(dirX: number, dirY: number, strength = 1, maxAmplitudePx = 8): void {
    if (!this.enabled) return;

    const uzunluk = Math.hypot(dirX, dirY);
    // Sıfır vektör: yön bilgisi yok, sarsıntı da yok. Rastgele yön
    // uydurmak §10'un "yönlü" şartını sessizce delerdi.
    if (uzunluk === 0) return;

    const s = strength < 0 ? 0 : strength > 1 ? 1 : strength;
    const sure = SHAKE_MIN_SEC + (SHAKE_MAX_SEC - SHAKE_MIN_SEC) * s;

    // Daha güçlü bir darbe devam edeni **ezer**; zayıf olan uzatmaz.
    if (this.#kalan > 0 && s * maxAmplitudePx < this.#genlik) return;

    this.#dx = dirX / uzunluk;
    this.#dy = dirY / uzunluk;
    this.#toplam = sure;
    this.#kalan = sure;
    this.#genlik = s * maxAmplitudePx;
    this.#faz = 0;
  }

  /** @param scaledDelta `GameClock.scaledDelta`, birim ms (TIER 1 k.8). */
  update(scaledDelta: number): void {
    if (this.#kalan <= 0) return;
    this.#kalan -= scaledDelta / 1000;
    this.#faz += scaledDelta / 1000;
    if (this.#kalan < 0) this.#kalan = 0;
  }

  get active(): boolean {
    return this.#kalan > 0;
  }

  /**
   * Kameraya uygulanacak kayma. Kapalıyken **her zaman** `{0,0}` —
   * kapatma bayrağı yalnız `trigger`'da kontrol edilseydi, ayar sarsıntı
   * sürerken kapatılınca ekran ortada donmuş bir kaymayla kalırdı.
   */
  get offset(): ShakeOffset {
    if (!this.enabled || this.#kalan <= 0 || this.#toplam <= 0) return SIFIR;

    const t = 1 - this.#kalan / this.#toplam; // 0 → 1
    const sonum = Math.exp(-SONUM_K * t);
    // Darbe ekseninde salınım. 34 Hz: 0,12 sn'de ~4 salınım.
    const salinim = Math.sin(this.#faz * Math.PI * 2 * 34);
    const a = this.#genlik * sonum * salinim;
    return { x: this.#dx * a, y: this.#dy * a };
  }

  /** Sahne yeniden başlatmasında ve ayar kapatıldığında. */
  reset(): void {
    this.#kalan = 0;
    this.#toplam = 0;
    this.#genlik = 0;
    this.#faz = 0;
  }
}
