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
 * | `gameplayStop` | Her kesintide: duraklatma, seviye bitişi, menüye dönüş |
 * | `commercialBreak` | **Seviye geçişinde**, oyun başlamadan (`M178`) |
 * | `yuklemeBasladi` / `yuklemeBitti` | Açılış yüklemesinin iki ucu (`M178`) |
 *
 * **`M131`: bu satırda "ayar paneli" de yazıyordu ve hiçbir yer onu
 * çağırmıyordu** — doküman ile kod ayrışmıştı. Ayrışan taraf **doküman**:
 * HUD'un ⚙ paneli *bilerek* duraklatmıyor (gerekçesi `HudScene`'deki
 * duraklatma düğmesi başlığında — ekran sarsıntısı ve efekt yoğunluğu
 * ayarları ancak oyun **akarken** değerlendirilebiliyor). Poki'nin şartı
 * *"any gameplay interruption (pause, menu open, level end, cutscene)"*
 * diyor; oyun akmaya devam ettiği için bu panel bir kesinti değil,
 * oynanışın üstündeki bir katman. Oyunu gerçekten durduran **duraklatma
 * menüsü** zaten `stop` gönderiyor.
 *
 * Poki'nin açık yasağı: *"Olaylar arka arkaya veya çift tetiklenemez."*
 * Bu yüzden `#oyundaMi` bayrağı burada tutuluyor ve yinelenen çağrılar
 * **yutuluyor**. Çağıran taraf (sahneler) bunu bilmek zorunda değil —
 * `GameScene` hem ilk tıklamada hem dalga başında `start` demek isteyebilir
 * ve ikisi de doğru olur; koruma tek yerde.
 *
 * ## `M178` — reklam seviye geçişinde ve BEKLENİYOR
 *
 * `M9` reklamı **yalnız** duraklatmadan dönüşe koymuştu ve beklemiyordu
 * (*"oyun akışı reklama bağlanamaz"*). Belgelerin bugünkü hâli ikisini de
 * yanlışlıyor: Poki *"`commercialBreak()` before every `gameplayStart()`"*
 * ve *"player dies and restarts: stop > commercialBreak > start"* diyor;
 * CrazyGames reklamı *"between levels… player death"*e koyup gezinme
 * düğmesinde yasaklıyor ve *"your game should be paused during a video
 * ad"* diyor. Bizde `Devam`a basılınca oyun hemen sürüyor, video
 * oynarken düşman yürüyüp can götürüyordu.
 *
 * Bugün: sahne (`scenes/haritaGirisi.ts`) haritaya girerken reklam
 * istiyor ve oyunu `devam` geri çağrısında başlatıyor. Ses kısma ve
 * "reklam hiç başlamazsa kilitlenme" koruması **burada**, tek yerde;
 * bağdaştırıcılar yalnız *başladı* / *bitti* bildiriyor.
 *
 * ## SDK yoksa sessizce hiçbir şey yapmıyor
 *
 * `KeyValueStore`'un deseninin aynısı. itch.io sürümü SDK'sız yayınlanıyor
 * ve **aynı kodla** çalışmalı; hiçbir sahne "portal var mı" diye
 * sormamalı. Varsayılan bağdaştırıcı `YOK` ve bütün çağrıları yutuyor.
 */

/**
 * Bağdaştırıcının reklam sırasında bildirdiği iki an — `M178`.
 *
 * Ses ve "oyunu başlat" kararı bağdaştırıcıda değil `Portal`'da; burası
 * yalnız SDK'nın kendi sinyallerini taşıyor (Poki `beforeAd` geri
 * çağrısı + `Promise`, CrazyGames `adStarted` / `adFinished` / `adError`).
 */
export interface ReklamOlaylari {
  /** Reklam gerçekten ekrana geldi. */
  basladi(): void;
  /** Reklam bitti, gösterilmedi ya da hata verdi. */
  bitti(): void;
}

/** Bir portalın sağladığı yüzey. */
export interface PortalAdapter {
  readonly ad: string;
  gameplayStart(): void;
  gameplayStop(): void;
  /**
   * Reklam ister. **Sözleşme:** `olay.bitti()` her istekte çağrılır —
   * reklam gösterilmese, hata verse, engellense de. Çağrılmazsa
   * `Portal`'ın başlama sınırı devreye giriyor, ama o bir sigorta.
   */
  commercialBreak(olay: ReklamOlaylari): void;
  /** Açılış yüklemesi başladı — CrazyGames `loadingStart`. İsteğe bağlı. */
  yuklemeBasladi?(): void;
  /** Açılış yüklemesi bitti — Poki `gameLoadingFinished`, CrazyGames `loadingStop`. */
  yuklemeBitti?(): void;
  /**
   * Özel oyun olayı — **isteğe bağlı**.
   *
   * Poki `measure(category, what, action)` veriyor ve `start` /
   * `complete` / `fail` eylemlerine özel raporlama anlamı yüklüyor.
   * CrazyGames'in dokümanlarında karşılığı bulunamadı; o bağdaştırıcı
   * bunu **uygulamıyor** ve çağrı sessizce düşüyor. Hangi olayların
   * gönderildiği `systems/olcum.ts`'te.
   */
  measure?(kategori: string, ne: string, eylem: string): void;
}

/** SDK yokken kullanılan bağdaştırıcı — itch.io ve geliştirme. */
export const PORTAL_YOK: PortalAdapter = {
  ad: 'yok',
  gameplayStart() {},
  gameplayStop() {},
  commercialBreak(olay) {
    // Reklam yok: istek **aynı tikte** bitiyor, yani itch.io'da haritaya
    // giriş bugünkü kadar anlık. Ses kısma/açma `Portal`'da, iki dünyada
    // aynı kodla.
    olay.bitti();
  },
};

/**
 * Reklam **başlamazsa** oyunun bekleyeceği en uzun süre — `M178`.
 *
 * Oyun artık reklam bitince başlıyor; yani reklamın hiç başlamadığı ve
 * hiçbir geri çağrının gelmediği bir hâl oyuncuyu geçişte **kilitler**.
 * CrazyGames belgesi her isteğe bir geri çağrı garanti etmiyor
 * (*"does not explicitly guarantee"*), SDK'nın `init`'i hiç çözülmezse
 * de kapı (`portalAdapters.initKapisi`) isteği hiç iletmiyor. Reklam
 * **başladıysa** sınır yok — bitişi bekleniyor.
 *
 * **Ölçülmedi:** ağdan gelen bir video reklamın başlamasına yetecek ama
 * donmuş bir ekranda oyuncunun sabrını aşmayacak bir süre. Portal
 * panelinde reklam başlama süresi görülürse buradan ayarlanır.
 */
export const REKLAM_BASLAMA_SINIRI_MS = 5000;

/** Ertelenmiş iş; dönen fonksiyon iptal eder. Testte sahtesi veriliyor. */
export type Zamanlayici = (is: () => void, ms: number) => () => void;

const GERCEK_ZAMANLAYICI: Zamanlayici = (is, ms) => {
  const id = setTimeout(is, ms);
  return () => clearTimeout(id);
};

/**
 * Oyunun portal kapısı.
 *
 * Tek örnek (`portal`) dışa açılıyor; bağdaştırıcı `main.ts`'te bir kez
 * seçiliyor. Sahneler yalnız bu üç metodu biliyor.
 */
export class Portal {
  #adapter: PortalAdapter = PORTAL_YOK;
  readonly #zamanla: Zamanlayici;

  /**
   * Oyun sürüyor mu? **Çift tetikleme korumasının tamamı bu bayrak.**
   * `gameplayStart` yalnız `false`→`true` geçişinde, `gameplayStop`
   * yalnız `true`→`false` geçişinde SDK'ya ulaşıyor.
   */
  #oyundaMi = false;

  /**
   * Reklam istendi ve henüz kapanmadı — `M178`. Poki: *"It should not be
   * possible to fire any SDK events during midrolls"*; bu sırada gelen
   * `gameplayStart` yutuluyor.
   */
  #reklamda = false;

  #yukleme: 'once' | 'suruyor' | 'bitti' = 'once';

  /** Ölçüm için: SDK'ya **gerçekten** giden çağrı sayıları. */
  readonly sayac = { start: 0, stop: 0, reklam: 0, olcum: 0 };

  constructor(zamanla: Zamanlayici = GERCEK_ZAMANLAYICI) {
    this.#zamanla = zamanla;
  }

  get adapterAdi(): string {
    return this.#adapter.ad;
  }

  get oyundaMi(): boolean {
    return this.#oyundaMi;
  }

  get reklamda(): boolean {
    return this.#reklamda;
  }

  kur(adapter: PortalAdapter): void {
    this.#adapter = adapter;
  }

  /** Oyuncu oynamaya başladı. Yinelenen çağrı yutulur. */
  gameplayStart(): void {
    if (this.#oyundaMi || this.#reklamda) return;
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
   * **Seviye geçişinde reklam — `M178`.**
   *
   * `devam` reklam kapanınca **tam bir kez** çağrılıyor ve çağıran oyunu
   * orada başlatıyor. Reklam boyunca ses kısık (`sesiKis(true)` hemen,
   * `sesiKis(false)` kapanışta). `gameplayStart`'ı kendisi çağırmıyor:
   * o, oyuncunun haritadaki ilk etkileşiminde (`GameScene`).
   *
   * Üç kapanış yolu:
   * - Bağdaştırıcı `bitti` dedi → kapanış.
   * - Reklam `REKLAM_BASLAMA_SINIRI_MS` içinde **başlamadı** → kapanış;
   *   geçiş kilitlenmesin. Sonradan başlarsa oyun çoktan sürüyor, o
   *   reklam en azından sessiz oynuyor.
   * - Oyun sürerken ya da başka bir reklam açıkken istendi → reklam yok,
   *   `devam` **hemen**: yutulan bir istek de geçişi kilitlememeli.
   */
  commercialBreak(sesiKis: (kisik: boolean) => void, devam: () => void): void {
    if (this.#oyundaMi || this.#reklamda) {
      devam();
      return;
    }
    this.sayac.reklam++;
    this.#reklamda = true;
    sesiKis(true);

    let durum: 'bekliyor' | 'oynuyor' | 'kapandi' = 'bekliyor';
    let gecReklam = false;
    const kapat = (): void => {
      durum = 'kapandi';
      this.#reklamda = false;
      sesiKis(false);
      devam();
    };
    // Sınır bağdaştırıcıdan ÖNCE kuruluyor: reklamsız yol `bitti`'yi aynı
    // tikte çağırıyor ve iptal edecek bir şey bulmalı.
    const iptal = this.#zamanla(() => {
      if (durum === 'bekliyor') kapat();
    }, REKLAM_BASLAMA_SINIRI_MS);

    this.#adapter.commercialBreak({
      basladi: () => {
        if (durum === 'bekliyor') {
          durum = 'oynuyor';
        } else if (durum === 'kapandi' && !gecReklam) {
          gecReklam = true;
          sesiKis(true);
        }
      },
      bitti: () => {
        if (durum !== 'kapandi') {
          iptal();
          kapat();
        } else if (gecReklam) {
          gecReklam = false;
          sesiKis(false);
        }
      },
    });
  }

  /** Açılış yüklemesi başladı (`main.ts`). Bir kez. */
  yuklemeBasladi(): void {
    if (this.#yukleme !== 'once') return;
    this.#yukleme = 'suruyor';
    this.#adapter.yuklemeBasladi?.();
  }

  /**
   * İlk yükleme bitti (`PreloadScene.create`). Bir kez — sonraki tembel
   * yüklemeler (harita arka planı, oyun müziği) "oyun yükleniyor" değil.
   */
  yuklemeBitti(): void {
    if (this.#yukleme === 'bitti') return;
    this.#yukleme = 'bitti';
    this.#adapter.yuklemeBitti?.();
  }

  /**
   * Özel olay gönderir. Bağdaştırıcı desteklemiyorsa sessizce düşüyor.
   *
   * `gameplayStart`'ın aksine burada **çift tetikleme koruması yok**:
   * aynı olayın iki kez gönderilmesi Poki için hata değil, ve "dalga 8'de
   * iki kez kaybetti" gerçek bir sinyal.
   */
  olc(kategori: string, ne: string, eylem: string): void {
    this.sayac.olcum++;
    this.#adapter.measure?.(kategori, ne, eylem);
  }

  /** Sahne yeniden başlatmalarında sayaçlar sıfırlanmıyor — test için. */
  sayaclariSifirla(): void {
    this.sayac.start = 0;
    this.sayac.stop = 0;
    this.sayac.reklam = 0;
    this.sayac.olcum = 0;
    this.#oyundaMi = false;
    this.#reklamda = false;
  }
}

/** Oyunun tek portal kapısı. `main.ts` bağdaştırıcıyı bir kez kuruyor. */
export const portal = new Portal();
