import Phaser from 'phaser';
import type { EventBus } from '../systems/EventBus';
import type { TowerId } from '../types/tower';
import type { Wave } from '../types/wave';
import { ENEMY_DEATH_THROTTLE_MS, SFX_POOL_PER_KEY } from '../data/audio';

/**
 * M6-T11 — `docs/plan/M6-ses-uretim-brifi.md`.
 *
 * Sistemler `EventBus` üzerinden konuşuyor (CLAUDE.md Mimari); bu sınıf
 * dinleyip sesi çalan **tek** yer, ses mantığı `GameScene`/`HudScene`'e
 * dağılmasın diye. `fx/` altında — TIER 1 kural 11'in Phaser sınırı
 * `systems/`'i kapsıyor, `fx/` zaten çalışma zamanında Phaser'a dokunan
 * dosyaların yaşadığı yer.
 *
 * **Perde kayması burada** (brif §1 "Perde kayması sizin işiniz değil"):
 * sanatçı tek temiz kayıt verdi, ±%8 rastgele `rate` kod tarafında.
 */
const PERDE_KAYMASI = 0.08;

function rastgeleHiz(): number {
  return 1 + (Math.random() * 2 - 1) * PERDE_KAYMASI;
}

const ATIS_SESI: Partial<Record<TowerId, string>> = {
  okcu: 'shot_okcu',
  top: 'shot_top',
  buyu: 'shot_buyu',
};

export class SoundSystem {
  readonly #scene: Phaser.Scene;
  /** Duvar saati — `enemy_death` kısıtlamasının son çalış zamanı (Y06). */
  #sonOlumSesi = -Infinity;
  /**
   * Anahtar başına önceden yaratılmış ses örnekleri, sırayla çalınıyor —
   * TIER 1 kural 3'ün ses hâli. Gerekçe `data/audio.ts`
   * `SFX_POOL_PER_KEY`'de. `SoundManager` oyun geneli (sahneye bağlı
   * değil), bu yüzden örnekler sahne kapanışında `destroy()` ile elle
   * yok ediliyor — yoksa her "tekrar dene" bir tur daha biriktirirdi.
   */
  readonly #havuz = new Map<string, { sesler: Phaser.Sound.BaseSound[]; sira: number }>();

  /**
   * `M8-T10` — ses efekti seviyesi. Çağrı anında okunuyor (kurucuda
   * kopyalanmıyor): oyuncu ayarı **oyun içinde** değiştirdiğinde bir
   * sonraki efekt doğru seviyede çalsın diye.
   */
  readonly #sfxScale: () => number;

  constructor(
    scene: Phaser.Scene,
    bus: EventBus,
    waveList: readonly Wave[],
    sfxScale: () => number = () => 1,
  ) {
    this.#scene = scene;
    this.#sfxScale = sfxScale;

    bus.on('enemy:killed', () => this.#olumSesiCal());
    bus.on('tower:placed', () => this.#cal('tower_place'));
    bus.on('tower:upgraded', () => this.#cal('tower_upgrade'));
    bus.on('purchase:denied', () => this.#cal('error'));

    // `Y06` — `reason` yönü zaten söylüyor (`earn()` yalnız pozitif
    // miktarla çağrılıyor, `spend()` her zaman azaltıyor), eski
    // "önceki toplamla karşılaştır" tahmini gereksizleşti. `kill`
    // kasıtlı sessiz: görsel karşılığı zaten var (altın uçuşu,
    // `GoldFlight`) ve her ölümde `enemy_death` ile aynı anda çalıp
    // ikisini de anlamsızlaştırıyordu.
    bus.on('gold:changed', ({ reason }) => {
      if (reason === 'kill' || reason === 'spend') return;
      this.#cal('gold');
    });

    bus.on('wave:started', ({ index }) => {
      const dalga = waveList.find((w) => w.index === index);
      const bossVar = dalga?.groups.some((g) => g.enemy === 'ogreSef') ?? false;
      this.#cal(bossVar ? 'boss_intro' : 'wave_start');
    });
  }

  /**
   * `enemy_death`'i duvar saatiyle kısıtlar (`data/audio.ts`) — tepe
   * dalgada saniyede birkaç ölüm olduğunda 1,5 sn'lik ses üst üste
   * binip doyuma gitmesin diye.
   */
  #olumSesiCal(): void {
    const simdi = performance.now();
    if (simdi - this.#sonOlumSesi < ENEMY_DEATH_THROTTLE_MS) return;
    this.#sonOlumSesi = simdi;
    this.#cal('enemy_death');
  }

  /** `TowerSystem`'in ateş geri çağrısından — bus olayı değil, kule ailesine bağlı. */
  playTowerShot(familyId: TowerId): void {
    const anahtar = ATIS_SESI[familyId];
    if (anahtar !== undefined) this.#cal(anahtar);
  }

  /** Harita bitişi — `HudScene` çağırıyor, tek seferlik geçiş. */
  playOutcome(kazandi: boolean): void {
    this.#cal(kazandi ? 'victory' : 'defeat');
  }

  /**
   * Hazırlık sayacının son saniyeleri — `M8-T10`, `M8-P03`.
   *
   * Ses dosyası **henüz üretilmedi**; `#cal` eksik anahtarı sessizce
   * atlıyor (`Y14` deseni), yani bu çağrı bugün hiçbir şey yapmıyor ve
   * dosya geldiğinde koda dokunmadan çalışmaya başlıyor.
   */
  playCountdownTick(): void {
    this.#cal('countdown_tick');
  }

  /**
   * `Y14` — anahtar önbellekte yoksa (yükleme başarısız olduysa) sessizce
   * çıkıyor. **Kontrolsüz çağırmak `throw` eder:** Phaser'ın
   * `WebAudioSound` kurucusu `cache`'te olmayan bir anahtarla
   * çağrıldığında `Error('Audio key "..." not found in cache')`
   * fırlatıyor (`node_modules/phaser/src/sound/webaudio/WebAudioSound.js`)
   * — yakalanmazsa bu, TIER 1 Platform'un yasakladığı konsol çıktısına
   * (ve muhtemelen olay işleyicisinin geri kalanının çalışmamasına)
   * yol açardı. Ses efektleri kritik değil (`Y14` sınıflandırması);
   * eksikse oyun sessizce sessiz kalmalı, çökmemeli.
   */
  #cal(anahtar: string): void {
    if (!this.#scene.cache.audio.has(anahtar)) return;
    let kayit = this.#havuz.get(anahtar);
    if (kayit === undefined) {
      kayit = { sesler: [], sira: 0 };
      for (let i = 0; i < SFX_POOL_PER_KEY; i++) kayit.sesler.push(this.#scene.sound.add(anahtar));
      this.#havuz.set(anahtar, kayit);
    }
    // `M8-T10` — seviye 0 ise hiç çalmıyoruz. `volume: 0` ile çalmak da
    // sessiz olurdu ama boşuna bir WebAudio düğümü kurardı; kapalı ses
    // hiç iş yapmamalı.
    const seviye = this.#sfxScale();
    if (seviye <= 0) return;

    const ses = kayit.sesler[kayit.sira];
    kayit.sira = (kayit.sira + 1) % kayit.sesler.length;
    // Çalmakta olan örnek yeniden başlıyor (Phaser `play` durdurup başlatır)
    // — kısa efektlerde duyulmuyor, tahsis hiç yok.
    ses?.play({ rate: rastgeleHiz(), volume: seviye });
  }

  /** `GameScene` kapanışında — bkz. `#havuz`. */
  destroy(): void {
    for (const kayit of this.#havuz.values()) {
      for (const ses of kayit.sesler) ses.destroy();
    }
    this.#havuz.clear();
  }
}
