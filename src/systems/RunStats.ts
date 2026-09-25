import type { EventBus } from './EventBus';

/**
 * `M8-T03` — bir elin istatistikleri.
 *
 * Oyun sonu ekranı bugüne kadar yalnız "kalan can" gösteriyordu; oyuncu
 * ne kadar düşman öldürdüğünü, parasını nereye harcadığını, ne kadar
 * sürdüğünü hiç görmüyordu. Bunlar aynı zamanda `M8-T07` başarımlarının
 * ve ileride portal metriklerinin girdisi.
 *
 * **Yalnız `EventBus` dinliyor** — hiçbir sisteme dokunmuyor, hiçbir
 * sistem bunu bilmiyor (`CLAUDE.md` Mimari: "sistemler birbirini doğrudan
 * çağırmaz"). `GameScene` bir tane yaratıp `HudScene`/`GameOverScene`'e
 * okutuyor.
 *
 * TIER 1 kural 11: Phaser'a dokunmaz.
 * TIER 1 kural 8: duvar saati **enjekte ediliyor** (`now`), bu dosyanın
 * içinde `Date.now()` yok — saf mantık zamanı kendi okumaz (bekçi k.8).
 * Süre oyun zamanı DEĞİL duvar saati: oyuncunun gerçekte kaç dakika
 * oynadığı, 2× hızın etkilememesi gereken tek sayı.
 */
export interface RunStatsData {
  readonly kills: number;
  readonly goldEarned: number;
  readonly goldSpent: number;
  readonly towersBuilt: number;
  /**
   * **Bugün hiçbir yer OKUMUYOR** (`M157`'de arandı): oyun sonu ekranı
   * kalan canı zaten `3 / 20 kalan can` biçiminde manşette gösteriyor,
   * yıldızlar da ondan türüyor. Alan tur kaydında duruyor ve dosyanın
   * başlığındaki "portal metrikleri" için tutuluyor — ama **yanlış**
   * durmasının gerekçesi yoktu.
   */
  readonly livesLost: number;
  /** Ulaşılan en yüksek dalga numarası. */
  readonly peakWave: number;
  readonly durationSec: number;
  /**
   * Bu elde **hiç** kule/kışla satıldı mı — `M8-T07` "satmadan bitir".
   *
   * `gold:changed`'in `sell` sebebinden okunuyor; ayrı bir olay
   * eklemeye gerek yok, sebep zaten tam bu bilgiyi taşıyordu.
   */
  readonly soldAny: boolean;
}

export class RunStats {
  #kills = 0;
  #goldEarned = 0;
  #goldSpent = 0;
  #towersBuilt = 0;
  #livesLost = 0;
  /**
   * **`M157` — eskiden `START_LIVES_TAHMINI = 20` diye SABİTTİ ve Zor'da
   * yanlış sayıyordu.** `life:lost` kalan canı taşıyor, kaybedileni
   * değil; taban bilinmezse fark alınamaz. Eski gerekçe *"`BALANCE
   * .startLives` içe aktarmak bu dosyayı denge verisine bağlardı"*
   * diyordu ve haklıydı — ama çaresi sabit yazmak değil, **tabanı
   * enjekte etmek**: `startGold` üç alan yukarıda tam olarak bu sebeple
   * zaten kurucu parametresi. `DIFFICULTY.zor.startLives` **12** olduğu
   * için tahmin ilk can kaybında `20 − 11 = 9` diyordu; Zor'da bir can
   * kaybeden oyuncu dokuz kaybetmiş sayılıyordu.
   */
  readonly #baslangicCan: number;
  #peakWave = 0;
  #soldAny = false;
  /** Önceki oturum(lar)da oynanan süre — `geriYukle` dolduruyor. */
  #devredenSure = 0;
  #sonToplam: number;
  readonly #baslangic: number;
  readonly #now: () => number;

  /**
   * @param startGold Haritanın başlangıç altını (`MapDef.startGold`).
   *   **Zorunlu**: `gold:changed` olayı *toplamı* taşıyor, miktarı değil;
   *   taban bilinmezse ilk olay "değişim" olarak sayılamaz ve **ilk satın
   *   alma kaybolur**. Canlı testte yakalandı: iki kule (70 + 110)
   *   kurulduğunda `goldSpent` 110 diyordu.
   */
  constructor(bus: EventBus, now: () => number, startGold: number, startLives: number) {
    this.#now = now;
    this.#baslangic = now();
    this.#sonToplam = startGold;
    this.#baslangicCan = startLives;

    bus.on('enemy:killed', () => {
      this.#kills++;
    });
    bus.on('tower:placed', () => {
      this.#towersBuilt++;
    });
    bus.on('barracks:placed', () => {
      this.#towersBuilt++;
    });
    bus.on('life:lost', ({ remaining }) => {
      // Olay kalan canı taşıyor, kaybedileni değil — fark tutuluyor.
      // Boss sızması tek seferde 10 can götürüyor (§5), o yüzden
      // "her olay 1 can" varsayımı yanlış olurdu.
      this.#livesLost = Math.max(this.#livesLost, this.#baslangicCan - remaining);
    });
    bus.on('wave:started', ({ index }) => {
      if (index > this.#peakWave) this.#peakWave = index;
    });

    // Altın: olay **toplamı** taşıyor, miktarı değil — fark alınıyor.
    // `reason` yönü zaten söylüyor (`spend` her zaman azaltıyor), ama
    // farkı almak hem kazancı hem harcamayı tek yerden veriyor.
    bus.on('gold:changed', ({ total, reason }) => {
      if (reason === 'sell') this.#soldAny = true;
      const fark = total - this.#sonToplam;
      if (fark > 0) this.#goldEarned += fark;
      else this.#goldSpent += -fark;
      this.#sonToplam = total;
    });
  }

  /**
   * Kaydedilmiş turdan dönüş — `M10-T02`.
   *
   * Süre **devam ettirilmiyor, sıfırdan sayılıyor**: `durationSec` duvar
   * saati ve oyuncunun kapalı geçirdiği saatleri "oynadı" saymak yanlış
   * olurdu. Kaydedilen süre yine de toplanıyor (`#devredenSure`), yani
   * iki oturumda oynanan tur ikisinin toplamını gösteriyor.
   *
   * Eksik alan **korunuyor, sıfırlanmıyor**: `RunStatsData`'ya yarın bir
   * alan eklenirse eski turlar o alanı taşımıyor ve burada `??` ile
   * mevcut değerde kalıyor.
   */
  geriYukle(kayit: Readonly<Record<string, number | boolean>>): void {
    const sayi = (ad: string, simdiki: number): number => {
      const v = kayit[ad];
      return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : simdiki;
    };
    this.#kills = sayi('kills', this.#kills);
    this.#goldEarned = sayi('goldEarned', this.#goldEarned);
    this.#goldSpent = sayi('goldSpent', this.#goldSpent);
    this.#towersBuilt = sayi('towersBuilt', this.#towersBuilt);
    this.#livesLost = sayi('livesLost', this.#livesLost);
    this.#peakWave = sayi('peakWave', this.#peakWave);
    this.#devredenSure = sayi('durationSec', 0);
    this.#soldAny = kayit['soldAny'] === true || this.#soldAny;
  }

  /**
   * Altın farkının tabanı — geri yüklemeden **sonra** çağrılıyor.
   *
   * `gold:changed` toplamı taşıyor ve fark alınıyor; tur geri
   * yüklenince bakiye tek hamlede değişiyor ama bu bir harcama değil.
   * Taban güncellenmezse o sıçrama sahte bir kazanç/harcama olarak
   * sayılırdı.
   */
  altinTabaniniAyarla(toplam: number): void {
    this.#sonToplam = toplam;
  }

  get data(): RunStatsData {
    return {
      kills: this.#kills,
      goldEarned: this.#goldEarned,
      goldSpent: this.#goldSpent,
      towersBuilt: this.#towersBuilt,
      livesLost: this.#livesLost,
      peakWave: this.#peakWave,
      durationSec:
        this.#devredenSure + Math.max(0, Math.round((this.#now() - this.#baslangic) / 1000)),
      soldAny: this.#soldAny,
    };
  }
}

