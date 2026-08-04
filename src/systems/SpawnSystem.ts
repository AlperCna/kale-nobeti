/**
 * **GEÇİCİ doğurucu — M3'te `WaveManager` bunun yerini alacak.**
 *
 * Sabit aralıkla düşman doğurur, kaleye varanı havuza döndürür ve can
 * eksiltir. Dalga kavramı, bütçe, tempo formülü burada **yok**; hepsi M3.
 * Bu sınıfın tek amacı M1'in bitiş durumunu ("düşmanlar yolu yürüyor ve
 * kaleye varınca can gidiyor") ayakta tutmak.
 *
 * TIER 1 kural 11: `entities/Enemy`'yi tanımaz — `SpawnableEnemy` şeklini
 * tanır. Testler o şekli uygulayan düz nesnelerle koşuyor.
 *
 * TIER 1 kural 8: zaman yalnız `scaledDelta` üzerinden gelir.
 */

import type { Mover, SpawnableEnemy } from '../types/enemy';
import type { Poolable } from '../util/pool';
import { Pool } from '../util/pool';
import { EventBus } from './EventBus';

export interface SpawnSystemOptions {
  readonly hp: number;
  /** Birim: px/sn. */
  readonly speed: number;
  /** Birim: saniye. */
  readonly intervalSeconds: number;
  readonly startingLives: number;
}

export class SpawnSystem<T extends SpawnableEnemy & Poolable> {
  /**
   * Birikim **ms cinsinden** tutuluyor, saniye değil.
   *
   * Her karede `delta/1000` toplansaydı 100 × 100 ms toplamı
   * `9.999999999999831` çıkardı ve 10 doğum yerine 9 olurdu — ölçüldü.
   * ms tarafında aynı toplam tam sayı aritmetiği ve kayıpsız. Sapma M1'de
   * görünmez ama M3'te dalga bütçesinden düşman eksiltirdi.
   */
  #birikenMs = 0;
  #aralikMs: number;
  #lives: number;

  constructor(
    private readonly pool: Pool<T>,
    private readonly mover: Mover,
    private readonly bus: EventBus,
    private readonly options: SpawnSystemOptions,
  ) {
    this.#aralikMs = options.intervalSeconds * 1000;
    this.#lives = options.startingLives;
  }

  get lives(): number {
    return this.#lives;
  }

  /** M3'te `WaveManager` devralacak. */
  setInterval(seconds: number): void {
    this.#aralikMs = Math.max(10, seconds * 1000);
  }

  /**
   * @param scaledDelta `GameClock.scaledDelta`, birim ms.
   *
   * **Sıra: önce ilerlet, sonra doğur.** Yeni doğan düşman doğduğu karede
   * hareket etmez; `remainingDistance` doğumdan hemen sonra tam yol
   * uzunluğuna eşittir. Ters sıra 2× hızda düşmanı doğar doğmaz bir kare
   * boyu ileri fırlatırdı ve doğum konumu ölçülemez hâle gelirdi.
   */
  update(scaledDelta: number): void {
    this.#ilerlet(scaledDelta);
    this.#dogur(scaledDelta);
  }

  #dogur(scaledDelta: number): void {
    if (this.#lives <= 0) return;

    this.#birikenMs += scaledDelta;
    // `while`, `if` değil: 2× hızda ve düşük FPS'te tek karede birden çok
    // doğum sırası gelebilir. `if` olsaydı fazlalık sessizce yutulur ve
    // dalga bütçesi eksik doğardı — M3'te fark edilmesi zor bir hata.
    while (this.#birikenMs >= this.#aralikMs) {
      this.#birikenMs -= this.#aralikMs;
      const dusman = this.pool.acquire();
      if (dusman === null) {
        // Havuz dolu. Sessizce büyümüyor (TIER 1 kural 3). Birikim sıfırlanır:
        // taşınsaydı havuz boşaldığı an biriken tüm sıra tek karede patlar ve
        // ekrana 30 düşman birden düşerdi.
        this.#birikenMs = 0;
        return;
      }
      dusman.spawn(this.mover, this.options.hp, this.options.speed);
    }
  }

  #ilerlet(scaledDelta: number): void {
    // `activeItems` kopya döner — döngü içinde `release` güvenli.
    for (const dusman of this.pool.activeItems()) {
      dusman.step(scaledDelta);
      if (!dusman.reachedEnd()) continue;

      // Kaleye varış: mesafe hesabı YOK. `remainingDistance <= 0` zaten
      // kesin cevabı veriyor; kaleye yakınlık ölçmek (TIER 1 kural 9'un
      // karesel karşılaştırması bile) hem gereksiz hem hatalı olurdu —
      // yoldan geçen ama varmayan düşman da kaleye yakın olabilir.
      this.#canKaybi();
      this.pool.release(dusman);
    }
  }

  #canKaybi(): void {
    if (this.#lives <= 0) return;
    this.#lives--;
    this.bus.emit('life:lost', { remaining: this.#lives });
  }
}
