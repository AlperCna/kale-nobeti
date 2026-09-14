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
  #peakWave = 0;
  #soldAny = false;
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
  constructor(bus: EventBus, now: () => number, startGold: number) {
    this.#now = now;
    this.#baslangic = now();
    this.#sonToplam = startGold;

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
      this.#livesLost = Math.max(this.#livesLost, START_LIVES_TAHMINI - remaining);
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

  get data(): RunStatsData {
    return {
      kills: this.#kills,
      goldEarned: this.#goldEarned,
      goldSpent: this.#goldSpent,
      towersBuilt: this.#towersBuilt,
      livesLost: this.#livesLost,
      peakWave: this.#peakWave,
      durationSec: Math.max(0, Math.round((this.#now() - this.#baslangic) / 1000)),
      soldAny: this.#soldAny,
    };
  }
}

/**
 * `life:lost` kalan canı taşıyor; kaybedileni bulmak için başlangıç
 * gerekiyor. `BALANCE.startLives` içe aktarmak bu dosyayı denge verisine
 * bağlardı ve `RunStats`'ın tek işi saymak — sabit burada, tek satır,
 * `GAME-DESIGN.md` §6 ile aynı değer.
 */
const START_LIVES_TAHMINI = 20;
