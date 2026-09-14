/**
 * Başarım takibi — `M8-T07`.
 *
 * TIER 1 kural 10: `localStorage`'a `KeyValueStore` arkasından dokunuyor.
 * TIER 1 kural 11: Phaser'a dokunmaz; `node`'da test ediliyor.
 *
 * Kayıt `EndlessRecords` ve `TutorialSystem` ile aynı deseni izliyor:
 * paylaşılan `kale-nobeti-save-v1` anahtarının **ayrı bir üst alanı**
 * (`achievements`), `progress.version` hiç değişmiyor.
 *
 * ## Neden `RunStats`'tan ayrı
 *
 * `RunStats` **bir elin** özeti ve el bitince atılıyor. Başarımlar eller
 * arası birikiyor ve diske yazılıyor. İkisini birleştirmek "bu sayı
 * kalıcı mı" sorusunu her alan için ayrı ayrı sordururdu.
 */

import type { EventBus } from './EventBus';
import type { KeyValueStore } from '../util/storage';
import { SAVE_KEY } from '../util/storage';
import { ACHIEVEMENTS } from '../data/achievements';

/** El bitince değerlendirilen durum. */
export interface RunEndContext {
  readonly won: boolean;
  /** Kalan can — `flawless` buna bakıyor. */
  readonly lives: number;
  readonly startLives: number;
  /** Bu elde kule satıldı mı — `noSell`. */
  readonly sold: boolean;
  /** Kaç harita bitirildi / toplam harita — `allMaps`. */
  readonly mapsCompleted: number;
  readonly mapCount: number;
  /** Toplam yıldız / azami — `allStars`. */
  readonly stars: number;
  readonly maxStars: number;
  /** Sonsuz elde ulaşılan dalga; normal elde 0 — `endless20`. */
  readonly endlessWave: number;
}

interface Kayit {
  readonly unlocked: readonly string[];
  readonly kills: number;
}

const BOS: Kayit = { unlocked: [], kills: 0 };

export class AchievementSystem {
  #kayit: Kayit;
  readonly #store: KeyValueStore;
  readonly #onUnlock?: (id: string) => void;

  /**
   * @param bus Verilirse el içi tetikleyiciler dinlenir. `GameOverScene`
   *   gibi yalnız `runEnd` değerlendiren çağıranlar `undefined` geçiyor.
   * @param onUnlock Yeni açılan başarım için çağrılır (bant/toast).
   */
  constructor(store: KeyValueStore, bus?: EventBus, onUnlock?: (id: string) => void) {
    this.#store = store;
    this.#onUnlock = onUnlock;
    this.#kayit = this.#oku();
    if (bus !== undefined) this.#dinle(bus);
  }

  get unlocked(): readonly string[] {
    return this.#kayit.unlocked;
  }

  get kills(): number {
    return this.#kayit.kills;
  }

  has(id: string): boolean {
    return this.#kayit.unlocked.includes(id);
  }

  /**
   * Bir başarımı açar.
   * @returns **Yeni** açıldıysa `true`; zaten açıksa `false`.
   */
  unlock(id: string): boolean {
    if (this.has(id)) return false;
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return false; // tanımsız id yazılmıyor
    this.#kayit = { ...this.#kayit, unlocked: [...this.#kayit.unlocked, id] };
    this.#yaz();
    this.#onUnlock?.(id);
    return true;
  }

  /** El bitince çağrılır. @returns Bu çağrıda açılan başarımlar. */
  checkRunEnd(ctx: RunEndContext): readonly string[] {
    const acilan: string[] = [];
    const dene = (id: string, kosul: boolean): void => {
      if (kosul && this.unlock(id)) acilan.push(id);
    };

    dene('firstWin', ctx.won);
    dene('allMaps', ctx.mapCount > 0 && ctx.mapsCompleted >= ctx.mapCount);
    dene('allStars', ctx.maxStars > 0 && ctx.stars >= ctx.maxStars);
    // "Kusursuz": kazanıldı **ve** hiç can gitmedi. Kaybedilen elde
    // kalan can zaten 0, o yüzden `won` şartı olmazsa anlamsızlaşırdı.
    dene('flawless', ctx.won && ctx.lives >= ctx.startLives);
    dene('noSell', ctx.won && !ctx.sold);
    dene('endless20', ctx.endlessWave >= 20);
    return acilan;
  }

  /**
   * El içi olaylar.
   *
   * `once` kullanılmıyor: `bus` sahneyle birlikte `clear()` ediliyor ve
   * dinleyici zaten sahne ömrü kadar yaşıyor. Ayrıca `kill100` sayacı her
   * ölümü görmek zorunda.
   */
  #dinle(bus: EventBus): void {
    bus.on('tower:placed', () => this.unlock('firstTower'));
    bus.on('barracks:placed', () => this.unlock('firstBarracks'));
    bus.on('tower:upgraded', ({ tier }) => {
      // Kademe indeksi 0 tabanlı: 2 ve 3 = T3a/T3b.
      if (tier >= 2) this.unlock('firstTier3');
    });
    bus.on('ability:cast', ({ id, hits }) => {
      if (id === 'meteor' && hits >= 5) this.unlock('meteor5');
    });
    bus.on('enemy:killed', () => this.#oldurmeSay());
  }

  /**
   * Öldürme sayacı.
   *
   * **Her ölümde diske yazmıyor.** Yoğun bir dalgada saniyede ~20 ölüm
   * oluyor ve her biri `JSON.parse` + `JSON.stringify` + `localStorage.set`
   * demekti — `M8-T01`'de 2× kasmasının kök nedeni tam olarak bu sınıf
   * (kare başına tahsis/senkron iş) olmuştu. Yazma yalnız bir **eşik
   * geçildiğinde** oluyor; sayaç ara değerleri bellekte.
   */
  #oldurmeSay(): void {
    const oncekiKills = this.#kayit.kills;
    const yeni = oncekiKills + 1;
    this.#kayit = { ...this.#kayit, kills: yeni };

    let esikGecti = false;
    for (const a of ACHIEVEMENTS) {
      if (a.kind !== 'counter') continue;
      if (oncekiKills < a.threshold && yeni >= a.threshold) {
        esikGecti = true;
        this.unlock(a.id); // `unlock` zaten yazıyor
      }
    }
    // Eşik geçilmediyse de sayaç arada bir diske inmeli, yoksa oyuncu
    // sekmeyi kapatınca ilerleme kayboluyor. 25'te bir yazmak 1000'lik
    // eşikte en fazla 24 öldürme kaybettiriyor ve yazma sayısını 40'a
    // düşürüyor.
    if (!esikGecti && yeni % 25 === 0) this.#yaz();
  }

  #oku(): Kayit {
    const ham = this.#store.get(SAVE_KEY);
    if (ham === null) return BOS;
    try {
      const nesne = JSON.parse(ham) as { achievements?: { unlocked?: unknown; kills?: unknown } };
      const a = nesne.achievements;
      if (a === undefined) return BOS;
      const unlocked = Array.isArray(a.unlocked)
        ? a.unlocked.filter(
            (x): x is string => typeof x === 'string' && ACHIEVEMENTS.some((d) => d.id === x),
          )
        : [];
      const kills = typeof a.kills === 'number' && Number.isFinite(a.kills) && a.kills > 0
        ? Math.floor(a.kills)
        : 0;
      return { unlocked, kills };
    } catch {
      return BOS;
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
    mevcut['achievements'] = { unlocked: this.#kayit.unlocked, kills: this.#kayit.kills };
    this.#store.set(SAVE_KEY, JSON.stringify(mevcut));
  }
}
