import type { Enemy } from '../entities/Enemy';
import type { Pool } from '../util/pool';
import { EnemyHealthBar } from './EnemyHealthBar';

/**
 * `G05` — hangi düşmanın çubuğu olduğunu izler, seçenek (b).
 *
 * Havuzun kendisi kararlı sıra taşımıyor (`Map`), ama bu yalnız görsel
 * atama — hedeflemeyi etkileyen bir sıra değil (`Y02`'nin araştırdığı
 * konu bu değil).
 *
 * ## Ömür sözleşmesi — neden bir zamanlayıcı değil, iki dış çağrı
 *
 * `DamageText`/`GoldCoin` kendi ömrünü sayar (`step()`, sabit süre).
 * Bu çubuğun ömrü **düşmanın ömrü** — süreye değil, "düşman öldü mü"ye
 * bağlı. İki ayrılma yolu var (`entities/Enemy` havuza dönmeden önce):
 * ölüm (`GameScene.#olumEfekti`) ve sızma (`WaveManager`'ın `onLeak`
 * kancası, `GameScene`'den bağlanıyor). `releaseFor` ikisinde de
 * **aynı senkron çağrıda**, düşman nesnesi başka bir düşman için asla
 * yeniden kullanılmadan önce çalışıyor — `Map`'in anahtarı düşmanın
 * kendisi olsa da (havuzlu, yeniden kullanılan bir referans) bayatlama
 * riski yok, çünkü kayıt tam bu noktada temizleniyor.
 */
export class EnemyHealthBarSystem {
  readonly #pool: Pool<EnemyHealthBar>;
  readonly #atanan = new Map<Enemy, EnemyHealthBar>();

  constructor(pool: Pool<EnemyHealthBar>) {
    this.#pool = pool;
  }

  /**
   * Her karede — boss hariç (kendi büyük çubuğu var, `BossHealthBar`),
   * hasar görmüş her canlı düşman için çubuk atar/günceller.
   *
   * "Bir kez göründüyse kalır": tam canlıya dönen (Trol yenilenmesi)
   * düşmanın **var olan** çubuğu güncellenmeye devam ediyor, gizlenmiyor
   * — yalnız henüz hiç hasar almamışsa çubuk hiç atanmıyor.
   */
  update(enemies: readonly Enemy[]): void {
    for (const e of enemies) {
      if (!e.alive || e.def?.id === 'ogreSef') continue;

      const varOlan = this.#atanan.get(e);
      if (varOlan === undefined) {
        if (e.hp >= e.maxHp) continue; // hiç hasar almamış — çubuk gerekmiyor
        const yeni = this.#pool.acquire();
        if (yeni === null) continue; // havuz dolu — sessizce atla (TIER 1 kural 3)
        this.#atanan.set(e, yeni);
        yeni.show(e.x, e.y, e.hp, e.maxHp);
      } else {
        varOlan.show(e.x, e.y, e.hp, e.maxHp);
      }
    }
  }

  /** Düşman öldüğünde/sızdığında — havuza dönmeden ÖNCE çağrılmalı. */
  releaseFor(e: Enemy): void {
    const bar = this.#atanan.get(e);
    if (bar === undefined) return;
    this.#atanan.delete(e);
    this.#pool.release(bar);
  }
}
