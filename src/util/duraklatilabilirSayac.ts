/**
 * **Duraklatılabilir duvar saati sayacı** — `M104`.
 *
 * ## Neden var
 *
 * `fx/TutorialHints` balonun okunma süresini **duvar saatiyle** ölçüyor
 * ve gerekçesi doğru: `scene.time` 2×/3× hızda ölçekleniyor, bir bilgi
 * balonunun okunma süresi oyun hızına bağlı olmamalı.
 *
 * Ama duvar saati **duraklatmayı da** görmüyordu. Ölçüldü (tarayıcıda,
 * Sisli Bataklık): balon ekrandayken duraklatma düğmesine basılıyor,
 * 11 saniye sonra devam ediliyor ve balon **yok** — perdenin arkasında
 * süresi dolmuş. İpucu bir kez gösterilip "görüldü" diye kaydedildiği
 * için oyuncu onu bir daha **hiç** görmüyor. Üstelik bir popup'ı okumak
 * için duraklatmak en doğal tepki.
 *
 * ## Neden ayrı bir dosya
 *
 * TIER 1 kural 11 ve `util/pool.ts`'in deseni: **muhasebe** (ne kadar
 * kaldı, duraklatıldı mı, sayaç kuruldu mu) Phaser'sız ve `node`'da
 * test edilebilir; `setTimeout`'u kuran taraf `fx/` içinde yaşıyor.
 * Zaman kaynağı dışarıdan veriliyor, yani test sahte saatle koşuyor.
 */

/** Sayacın zaman kaynağı. `K` = zamanlayıcı kimliğinin tipi. */
export interface ZamanOrtami<K> {
  /** Duvar saati, ms. */
  readonly simdi: () => number;
  readonly zamanla: (geriCagir: () => void, ms: number) => K;
  readonly iptal: (kimlik: K) => void;
}

export class DuraklatilabilirSayac<K> {
  readonly #ortam: ZamanOrtami<K>;
  #kimlik?: K;
  /** Kalan süre — yalnız duraklatılmışken anlamlı. */
  #kalan = 0;
  /** Sayacın ateşleyeceği an (`simdi()` cinsinden) — koşarken anlamlı. */
  #bitis = 0;
  #duraklatildi = false;
  #bitince?: () => void;

  constructor(ortam: ZamanOrtami<K>) {
    this.#ortam = ortam;
  }

  /** `true` iken `surdur()` bekliyor; `basla()` da sayacı **kurmuyor**. */
  get duraklatildi(): boolean {
    return this.#duraklatildi;
  }

  /** Kalan süre (ms). Sayaç yoksa `0`. */
  get kalanMs(): number {
    if (this.#bitince === undefined) return 0;
    return this.#duraklatildi ? this.#kalan : Math.max(0, this.#bitis - this.#ortam.simdi());
  }

  /**
   * Yeni bir geri sayım başlatır; varsa öncekini iptal eder.
   *
   * **Duraklatılmışken başlatmak sayacı kurmuyor** — süre `surdur()`
   * çağrılınca işlemeye başlıyor. Oyunda bu yol bugün doğmuyor (ipuçları
   * oyun olaylarından tetikleniyor, duraklatılmış sahne olay üretmiyor)
   * ama yarı kurulmuş bir sayaç bırakmak sessiz bir tuzak olurdu.
   */
  basla(ms: number, bitince: () => void): void {
    this.#temizle();
    this.#bitince = bitince;
    this.#kalan = Math.max(0, ms);
    if (this.#duraklatildi) return;
    this.#kur(this.#kalan);
  }

  /** Kalan süreyi dondurur. Sayaç yokken de güvenli — bayrak yine düşüyor. */
  duraklat(): void {
    if (this.#duraklatildi) return;
    this.#duraklatildi = true;
    if (this.#bitince === undefined) return;
    this.#kalan = Math.max(0, this.#bitis - this.#ortam.simdi());
    this.#zamanlayiciyiIptal();
  }

  /** Dondurulmuş süreyi kaldığı yerden işletir. */
  surdur(): void {
    if (!this.#duraklatildi) return;
    this.#duraklatildi = false;
    if (this.#bitince === undefined) return;
    this.#kur(this.#kalan);
  }

  /** Sayacı tamamen bırakır — geri çağırma artık ateşlenmiyor. */
  iptal(): void {
    this.#temizle();
  }

  #kur(ms: number): void {
    const bitince = this.#bitince;
    if (bitince === undefined) return;
    this.#bitis = this.#ortam.simdi() + ms;
    this.#kimlik = this.#ortam.zamanla(() => {
      this.#kimlik = undefined;
      this.#bitince = undefined;
      bitince();
    }, ms);
  }

  #zamanlayiciyiIptal(): void {
    if (this.#kimlik === undefined) return;
    this.#ortam.iptal(this.#kimlik);
    this.#kimlik = undefined;
  }

  #temizle(): void {
    this.#zamanlayiciyiIptal();
    this.#bitince = undefined;
    this.#kalan = 0;
    this.#bitis = 0;
  }
}
