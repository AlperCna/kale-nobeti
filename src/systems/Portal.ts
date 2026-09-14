/**
 * Portal SDK katmanı — `M9-T01`.
 *
 * Poki ve CrazyGames'in ikisi de `gameplayStart()` / `gameplayStop()`
 * çağrılarını **zorunlu** kılıyor (Eylül 2026 dokümanları). Bu bir cila
 * maddesi değil, başvuru engeli.
 *
 * TIER 1 kural 11: bu dosya Phaser'a **hiç dokunmuyor** — sahne tarafı
 * ne zaman çağıracağına karar veriyor, burası ne olduğuna. Böylece
 * sözleşme `node` ortamında test edilebiliyor ve sözleşmenin en kritik
 * maddesi (çift tetikleme yasağı) bir teste bağlanabiliyor.
 *
 * ## Sözleşme
 *
 * | Çağrı | Ne zaman |
 * |---|---|
 * | `gameplayStart` | Oyuncunun **ilk etkileşiminde** — yüklemede değil |
 * | `gameplayStop` | Her kesintide: duraklatma, ayar paneli, seviye bitişi, menüye dönüş |
 * | `commercialBreak` | **Yalnız** duraklamadan oyuna dönerken |
 *
 * Poki'nin açık yasağı: *"Olaylar arka arkaya veya çift tetiklenemez."*
 * Bu yüzden `#oyundaMi` bayrağı burada tutuluyor ve yinelenen çağrılar
 * **yutuluyor**. Çağıran taraf (sahneler) bunu bilmek zorunda değil —
 * `GameScene` hem ilk tıklamada hem dalga başında `start` demek isteyebilir
 * ve ikisi de doğru olur; koruma tek yerde.
 *
 * ## SDK yoksa sessizce hiçbir şey yapmıyor
 *
 * `KeyValueStore`'un deseninin aynısı. itch.io sürümü SDK'sız yayınlanıyor
 * ve **aynı kodla** çalışmalı; hiçbir sahne "portal var mı" diye
 * sormamalı. Varsayılan bağdaştırıcı `YOK` ve bütün çağrıları yutuyor.
 */

/**
 * Bir portalın sağladığı yüzey. Üçü de `Promise` dönebiliyor (reklam
 * bekletir) ama çağıranlar beklemiyor — oyun akışı reklama bağlanamaz.
 */
export interface PortalAdapter {
  readonly ad: string;
  gameplayStart(): void;
  gameplayStop(): void;
  /** Reklam gösterir. `sesiKis` reklam boyunca sesi kapatmak için. */
  commercialBreak(sesiKis: (kisik: boolean) => void): void;
}

/** SDK yokken kullanılan bağdaştırıcı — itch.io ve geliştirme. */
export const PORTAL_YOK: PortalAdapter = {
  ad: 'yok',
  gameplayStart() {},
  gameplayStop() {},
  commercialBreak(sesiKis) {
    // Reklam yok ama sözleşme aynı kalsın: ses kısılıp hemen açılıyor.
    // Böylece çağıran taraf iki dünyada da aynı kodu çalıştırıyor ve
    // "reklamsız yolda ses açık kalıyor mu" sorusu doğmuyor.
    sesiKis(true);
    sesiKis(false);
  },
};

/**
 * Oyunun portal kapısı.
 *
 * Tek örnek (`portal`) dışa açılıyor; bağdaştırıcı `main.ts`'te bir kez
 * seçiliyor. Sahneler yalnız bu üç metodu biliyor.
 */
export class Portal {
  #adapter: PortalAdapter = PORTAL_YOK;

  /**
   * Oyun sürüyor mu? **Çift tetikleme korumasının tamamı bu bayrak.**
   * `gameplayStart` yalnız `false`→`true` geçişinde, `gameplayStop`
   * yalnız `true`→`false` geçişinde SDK'ya ulaşıyor.
   */
  #oyundaMi = false;

  /** Ölçüm için: SDK'ya **gerçekten** giden çağrı sayıları. */
  readonly sayac = { start: 0, stop: 0, reklam: 0 };

  get adapterAdi(): string {
    return this.#adapter.ad;
  }

  get oyundaMi(): boolean {
    return this.#oyundaMi;
  }

  kur(adapter: PortalAdapter): void {
    this.#adapter = adapter;
  }

  /** Oyuncu oynamaya başladı. Yinelenen çağrı yutulur. */
  gameplayStart(): void {
    if (this.#oyundaMi) return;
    this.#oyundaMi = true;
    this.sayac.start++;
    this.#adapter.gameplayStart();
  }

  /** Oyun kesildi (duraklatma, menü, seviye sonu). Yinelenen çağrı yutulur. */
  gameplayStop(): void {
    if (!this.#oyundaMi) return;
    this.#oyundaMi = false;
    this.sayac.stop++;
    this.#adapter.gameplayStop();
  }

  /**
   * Duraklamadan oyuna **dönerken** reklam.
   *
   * Poki'nin yanlış kullanım örneği: *"oyundan çıkıp seviye seçime
   * gitmek"* — o yüzden burası `gameplayStart`'ı kendisi çağırmıyor,
   * çağıran taraf reklamdan sonra ayrıca `gameplayStart` diyor. İki
   * olayın sırası çağıranda kalıyor ki "devam" ile "menüye dön"
   * karışmasın.
   *
   * Oyun sürerken çağrılırsa yutuluyor: reklam yalnız **duraklamadan
   * çıkışta** meşru.
   */
  commercialBreak(sesiKis: (kisik: boolean) => void): void {
    if (this.#oyundaMi) return;
    this.sayac.reklam++;
    this.#adapter.commercialBreak(sesiKis);
  }

  /** Sahne yeniden başlatmalarında sayaçlar sıfırlanmıyor — test için. */
  sayaclariSifirla(): void {
    this.sayac.start = 0;
    this.sayac.stop = 0;
    this.sayac.reklam = 0;
    this.#oyundaMi = false;
  }
}

/** Oyunun tek portal kapısı. `main.ts` bağdaştırıcıyı bir kez kuruyor. */
export const portal = new Portal();
