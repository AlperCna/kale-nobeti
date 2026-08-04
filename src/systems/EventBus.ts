import type { GameEvents, GameEventName } from '../types/events';

type Listener<K extends GameEventName> = (payload: GameEvents[K]) => void;

/**
 * Tipli olay veri yolu.
 *
 * ## Neden Phaser'ın EventEmitter'ı sarmalanmadı
 *
 * Plan (`M0-T03`) "Phaser.Events.EventEmitter üstüne tipli kabuk" diyordu.
 * Ama **TIER 1 kural 11** `systems/` içinde çalışma zamanı Phaser import'unu
 * yasaklıyor — testler `node` ortamında koşuyor ve Phaser orada `window`
 * arayıp patlar. Kural TIER 1, plandaki ifade uygulama detayı.
 *
 * Bağımlılık enjeksiyonu (dışarıdan emitter almak) da kuralı sağlardı ama
 * her tüketiciye bir kurucu argümanı ekliyordu; karşılığında yalnız
 * `on`/`off`/`emit` kazanıyorduk. Kendi Map tabanlı yayıcımız ~25 satır ve
 * hiçbir sahte nesne gerektirmiyor.
 */
export class EventBus {
  readonly #listeners = new Map<GameEventName, Set<Listener<GameEventName>>>();

  on<K extends GameEventName>(event: K, fn: Listener<K>): void {
    let set = this.#listeners.get(event);
    if (set === undefined) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(fn as Listener<GameEventName>);
  }

  off<K extends GameEventName>(event: K, fn: Listener<K>): void {
    this.#listeners.get(event)?.delete(fn as Listener<GameEventName>);
  }

  emit<K extends GameEventName>(event: K, payload: GameEvents[K]): void {
    const set = this.#listeners.get(event);
    if (set === undefined) return;
    // Kopya üzerinden geziliyor: dinleyici içinde off() çağrılırsa
    // yineleme bozulmasın.
    for (const fn of [...set]) {
      (fn as Listener<K>)(payload);
    }
  }

  /** Sahne kapanırken çağrılır — sızıntı önlemi. */
  clear(): void {
    this.#listeners.clear();
  }

  /** Yalnız test ve hata ayıklama için. */
  listenerCount(event: GameEventName): number {
    return this.#listeners.get(event)?.size ?? 0;
  }
}
