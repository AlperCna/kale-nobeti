import Phaser from 'phaser';
import type { EventBus } from '../systems/EventBus';
import type { TowerId } from '../types/tower';
import type { Wave } from '../types/wave';
import { ENEMY_DEATH_THROTTLE_MS } from '../data/audio';

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

  constructor(scene: Phaser.Scene, bus: EventBus, waveList: readonly Wave[]) {
    this.#scene = scene;

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

  #cal(anahtar: string): void {
    this.#scene.sound.play(anahtar, { rate: rastgeleHiz() });
  }
}
