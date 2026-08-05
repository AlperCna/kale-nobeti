/**
 * Dalga yaşam döngüsü: hazırlık → doğurma → bitiş → sonraki hazırlık.
 *
 * `M1`'in geçici `SpawnSystem`'inin yerini alıyor.
 *
 * TIER 1 kural 8: tüm zamanlayıcılar `scaledDelta` — 2× hızda dalga da hızlanır.
 * TIER 1 kural 11: `entities/Enemy`'yi tanımaz, `SpawnableEnemy` şeklini tanır.
 * TIER 1 kural 1: sayı yok; `BALANCE` ve `waves.ts`'ten geliyor.
 */

import type { EnemyDef, EnemyId, Mover, SpawnableEnemy } from '../types/enemy';
import type { Wave } from '../types/wave';
import type { Poolable } from '../util/pool';
import type { Pool } from '../util/pool';
import { BALANCE } from '../data/balance';
import { getEnemy } from '../data/enemies';
import type { EconomySystem } from './EconomySystem';
import type { EventBus } from './EventBus';

const MS_TO_S = 1 / 1000;

export type WavePhase = 'prep' | 'running' | 'done';

/**
 * Erken başlatma bonusu. `GAME-DESIGN.md` §6:
 * `kalanSaniye × ceil(dalgaNo / 2)`, **ilk 3 dalgada kapalı**.
 *
 * Gerekçe dokümanda: eski sabit `+1/saniye` bonusu dalga 1'de gelirin
 * %28'iydi ve yeni oyuncuya "telegrafı okuma, hemen bas" öğretiyordu —
 * telegrafı zorunlu kılan kararla doğrudan çelişiyordu.
 */
export function earlyStartBonus(remainingSec: number, waveNo: number): number {
  if (waveNo < BALANCE.earlyBonusFrom) return 0;
  if (!(remainingSec > 0)) return 0;
  return Math.floor(remainingSec) * Math.ceil(waveNo / 2);
}

/** Doğurma sırasında bekleyen tek bir düşman. */
interface Bekleyen {
  readonly def: EnemyDef;
  /** Dalga başından itibaren doğum anı. Birim: saniye. */
  readonly at: number;
}

export class WaveManager<T extends SpawnableEnemy & Poolable> {
  #phase: WavePhase = 'prep';
  /** 0 tabanlı; `waves[#index]` şu anki/gelecek dalga. */
  #index = 0;
  #prepLeftSec: number;
  #waveTimeSec = 0;
  /** Bu dalgada henüz doğmamış düşmanlar, `at`'a göre sıralı. */
  #kuyruk: Bekleyen[] = [];
  #spawnedThisWave = 0;

  constructor(
    private readonly pool: Pool<T>,
    /**
     * Düşman tipine göre hareket stratejisi seçer.
     *
     * Uçanlar `LineMover`, yürüyenler `PathMover` alıyor. Seçim burada
     * çünkü `Enemy` sınıfı hangi hareketle geldiğini bilmiyor ve
     * bilmemeli (`DEPENDENCIES.md` §2).
     */
    private readonly moverFor: (def: EnemyDef) => Mover,
    private readonly bus: EventBus,
    private readonly eco: EconomySystem,
    private readonly waves: readonly Wave[],
    private readonly hpMultiplier: number,
    private readonly resolveEnemy: (id: EnemyId) => EnemyDef | undefined = getEnemy,
    /**
     * Bir düşman kaleye vardığında, havuza dönmeden **önce** çağrılır.
     * `M3-T09` sızan HP'yi buradan ölçüyor.
     */
    private readonly onLeak?: (enemy: T) => void,
  ) {
    this.#prepLeftSec = BALANCE.prepSeconds;
    // Dalgasız harita hazırlık aşamasında beklemez — hazırlanacak bir şey yok.
    if (waves.length === 0) this.#phase = 'done';
  }

  get phase(): WavePhase {
    return this.#phase;
  }

  /** 1 tabanlı dalga numarası. Bitince son dalganın numarası kalır. */
  get waveNumber(): number {
    return Math.min(this.#index + 1, this.waves.length);
  }

  get prepRemainingSec(): number {
    return this.#phase === 'prep' ? this.#prepLeftSec : 0;
  }

  /** Hazırlık aşamasındaysa gelecek dalga; değilse `undefined`. */
  get upcomingWave(): Wave | undefined {
    return this.#phase === 'prep' ? this.waves[this.#index] : undefined;
  }

  get isComplete(): boolean {
    return this.#phase === 'done';
  }

  /** Erken başlatma butonu bu dalgada açık mı (§6: dalga 4'ten itibaren). */
  get earlyStartAvailable(): boolean {
    return this.#phase === 'prep' && this.waveNumber >= BALANCE.earlyBonusFrom;
  }

  /**
   * Oyuncu dalgayı erken başlattı.
   * @returns Kazanılan bonus altın. Hazırlık aşamasında değilse `0`.
   */
  startWaveEarly(): number {
    if (this.#phase !== 'prep') return 0;
    const bonus = earlyStartBonus(this.#prepLeftSec, this.waveNumber);
    this.eco.earn(bonus);
    this.#dalgayiBaslat();
    return bonus;
  }

  /** @param scaledDelta `GameClock.scaledDelta`, birim ms. */
  update(scaledDelta: number): void {
    const dt = scaledDelta * MS_TO_S;
    if (!(dt > 0)) return;

    if (this.#phase === 'prep') {
      this.#prepLeftSec -= dt;
      // Sayaç dolunca dalga **otomatik** başlıyor (S29). Erken başlatma
      // bir seçenek, zorunluluk değil — §6'nın bonus formülü zaten bunu
      // varsayıyor ("kalanSaniye × …" ancak sayaç işlerken anlamlı).
      if (this.#prepLeftSec <= 0) this.#dalgayiBaslat();
      return;
    }

    if (this.#phase === 'done') {
      this.#ilerlet(dt);
      return;
    }

    this.#waveTimeSec += dt;
    this.#dogur();
    this.#ilerlet(dt);
    this.#dalgaBittiMi();
  }

  #dalgayiBaslat(): void {
    const wave = this.waves[this.#index];
    if (wave === undefined) {
      this.#phase = 'done';
      return;
    }

    // Grupları tek bir zaman sıralı kuyruğa aç. Kuyruk sayesinde "havuz
    // doluysa ERTELE" davranışı doğal: doğmayan düşman kuyrukta kalıyor,
    // sessizce atlanmıyor.
    const kuyruk: Bekleyen[] = [];
    for (const g of wave.groups) {
      const def = this.resolveEnemy(g.enemy);
      if (def === undefined) continue;
      for (let i = 0; i < g.count; i++) {
        kuyruk.push({ def, at: g.startAt + i * g.spawnDelay });
      }
    }
    kuyruk.sort((a, b) => a.at - b.at);

    this.#kuyruk = kuyruk;
    this.#waveTimeSec = 0;
    this.#spawnedThisWave = 0;
    this.#phase = 'running';
    this.bus.emit('wave:started', { index: wave.index });
  }

  #dogur(): void {
    while (this.#kuyruk.length > 0) {
      const bas = this.#kuyruk[0];
      if (bas === undefined || bas.at > this.#waveTimeSec) break;

      const dusman = this.pool.acquire();
      if (dusman === null) {
        // Havuz dolu — **ertele, atlama**. Kuyruğun başındaki düşman
        // orada kalıyor ve yer açılınca doğuyor. Sessizce atlamak dalga
        // bütçesinden düşman eksiltirdi ve denge testleri bunu göremezdi.
        return;
      }
      this.#kuyruk.shift();
      dusman.spawn(this.moverFor(bas.def), bas.def, this.hpMultiplier);
      this.#spawnedThisWave++;
    }
  }

  #ilerlet(dt: number): void {
    const scaledDelta = dt / MS_TO_S;
    // `activeItems` kopya döner — döngü içinde `release` güvenli.
    for (const dusman of this.pool.activeItems()) {
      dusman.step(scaledDelta);
      if (!dusman.reachedEnd()) continue;

      // Kaleye varış: mesafe hesabı yok, `remainingDistance <= 0` kesin.
      this.onLeak?.(dusman);
      this.eco.loseLife(dusman.def?.leakDamage ?? 1);
      this.pool.release(dusman);
    }
  }

  #dalgaBittiMi(): void {
    if (this.#kuyruk.length > 0) return;
    if (this.pool.activeCount > 0) return;
    if (this.#spawnedThisWave === 0) return;

    const no = this.waveNumber;
    this.eco.awardWaveEnd(no);

    this.#index++;
    if (this.#index >= this.waves.length) {
      this.#phase = 'done';
      return;
    }
    this.#phase = 'prep';
    this.#prepLeftSec = BALANCE.prepSeconds;
  }
}
