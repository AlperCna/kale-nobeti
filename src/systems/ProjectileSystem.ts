/**
 * Mermi hareketi, isabet ve alan hasarı. `M2-T06` + `M2-T09`.
 *
 * TIER 1 kural 3: mermiler havuzlu, `resetForPool` her şeyi sıfırlıyor.
 * TIER 1 kural 8: hareket `scaledDelta` ile.
 * TIER 1 kural 9: tüm yakınlık kontrolleri karesel.
 * TIER 1 kural 11: `entities/Projectile`'ı tanımaz, `ProjectileState` şeklini tanır.
 *
 * ## Tünelleme
 *
 * İsabet kontrolü **süpürülmüş**: önceki konum → yeni konum doğru parçasının
 * hedefe uzaklığına bakılıyor, son kare konumuna değil.
 *
 * Neden: 30 FPS'lik bir cihazda **2× hızda** `scaledDelta` 66 ms'e çıkıyor;
 * 600 px/sn mermi o karede **40 px** atlıyor. İsabet yarıçapı 12 px olduğu
 * için nokta-mesafe kontrolü mermiyi hedefin içinden geçirip ıskalatırdı.
 *
 * Sinsi olan yanı: yalnız düşük FPS **ve** 2× birleşince oluyor. Geliştirme
 * makinesinde (M0'da 145 FPS ölçüldü) asla görünmez; M7'de "bazen mermiler
 * ıskalıyor" diye bulunamayan bir hata olarak dönerdi.
 */

import type { DamageType, Targetable } from '../types/enemy';
import type { TowerEffect } from '../types/tower';
import type { ProjectileState } from '../types/projectile';
import type { Poolable } from '../util/pool';
import type { Pool } from '../util/pool';
import { distSq, merkezdenOran, moveToward, pointToSegmentDistSq } from '../util/math';
import { BALANCE } from '../data/balance';
import { applyDamage, yavaslatmaSinerjisi } from './combat';
import type { DamageResult } from './combat';

const MS_TO_S = 1 / 1000;

/**
 * Zincirleme sıçrama yarıçapı (kare). Birim: px².
 *
 * Kule menzilinin yaklaşık yarısı (85 px). Dokümanda yok; zincir hedeften
 * hedefe atladığı için kulenin menzili sınır olamaz, merminin isabet
 * yarıçapı (12 px) ise çok küçük kalır.
 */
const ZINCIR_YARICAP_KARE = 85 * 85;

/** Bir düşmanın hasar alması. Hasar sayısı üretimi çağıranın işi. */
export type DamageHandler<E extends Targetable> = (
  enemy: E,
  result: DamageResult,
  x: number,
  y: number,
  /**
   * `M8-T08` — isabet parıltısının rengi buna bağlı (fiziksel altın, büyü
   * lapis). `DamageResult`'a eklenmedi: o `combat.ts`'in **saf** çıktısı
   * ve hasar tipi zaten girdisi; sonuca kopyalamak aynı bilgiyi iki yerde
   * tutmak olurdu. Merminin özelliği, çağırana mermiden geçiyor.
   */
  damageType: DamageType,
) => void;

/** Süreli etkiyi düşmana uygular. `effects.ts` saf tarafı yapıyor. */
export type EffectHandler<E extends Targetable> = (enemy: E, effect: TowerEffect) => void;

/**
 * Merminin **mantıksal** durumunu sıfırlar — `M142`, TIER 1 kural 3.
 *
 * `resetEnemyState` (`movers.ts`) ve `resetSoldierState` (`BarracksSystem`)
 * ile aynı desen: havuzlanan üç varlığın üçünde de mantıksal sıfırlama
 * **saf ve Phaser'sız** bir fonksiyonda, görsel sıfırlama `entities/`
 * tarafında. Mermi `M142`'ye kadar bu desenin dışındaydı — sıfırlaması
 * entity'nin içinde satır satır duruyordu, yani `node`'da doğrudan
 * sınanamıyordu ve tamlığı hiçbir şeye bağlı değildi.
 *
 * `trail`/`trailColor` **burada değil**: onlar `ProjectileState`'in değil
 * görünümün alanı ve entity sıfırlıyor.
 */
export function resetProjectileState<E extends Targetable>(m: ProjectileState<E>): void {
  m.x = 0;
  m.y = 0;
  m.target = null;
  m.damage = 0;
  m.damageType = 'physical';
  m.speed = 0;
  m.splashRadius = 0;
  m.hitRadius = 0;
  m.effect = undefined;
  m.alive = false;
  m.lastKnownX = 0;
  m.lastKnownY = 0;
}

export class ProjectileSystem<E extends Targetable, T extends ProjectileState<E> & Poolable> {
  constructor(
    private readonly pool: Pool<T>,
    private readonly onDamage: DamageHandler<E>,
    private readonly onEffect?: EffectHandler<E>,
    /**
     * Patlama gerçekleşti — konum ve yarıçap. `GAME-DESIGN.md` §10 ekran
     * sarsıntısını **yalnız top patlamasında** istiyor; sistemin kendisi
     * kamerayı bilmiyor, sahneye haber veriyor (TIER 1 kural 11).
     */
    private readonly onExplode?: (x: number, y: number, radius: number) => void,
    /**
     * **Mermi boşa gitti** — hedef uçuş sırasında öldü ve mermi alan hasarı
     * taşımıyordu, yani hiç kimseye dokunmadan söndü. `S24`'ün
     * "odaklanma kaybı" dediği olay tam olarak bu (`M83`).
     *
     * Yalnız **ölçüm** için: `waveSim` bunu sayarak gerçek kaybı çıkarıyor.
     * Oyunun davranışına dokunmuyor — sahne bu geri çağrıyı vermiyor.
     */
    private readonly onBosaGiden?: (mermi: T) => void,
  ) {}

  get activeCount(): number {
    return this.pool.activeCount;
  }

  /** @returns Havuz doluysa `null` — sessizce büyümüyor (TIER 1 kural 3). */
  fire(init: Omit<ProjectileState<E>, 'alive' | 'lastKnownX' | 'lastKnownY'>): T | null {
    const m = this.pool.acquire();
    if (m === null) return null;

    m.x = init.x;
    m.y = init.y;
    m.target = init.target;
    m.damage = init.damage;
    m.damageType = init.damageType;
    m.speed = init.speed;
    m.splashRadius = init.splashRadius;
    m.hitRadius = init.hitRadius;
    m.effect = init.effect;
    m.alive = true;
    m.lastKnownX = init.target?.x ?? init.x;
    m.lastKnownY = init.target?.y ?? init.y;
    return m;
  }

  /** @param scaledDelta `GameClock.scaledDelta`, birim ms. */
  update(scaledDelta: number, enemies: readonly E[]): void {
    const adim = scaledDelta * MS_TO_S;
    if (!(adim > 0)) return;

    for (const m of this.pool.activeItems()) {
      if (!m.alive) {
        this.pool.release(m);
        continue;
      }

      const hedefCanli = m.target !== null && m.target.alive && m.target.def !== null;
      if (hedefCanli && m.target !== null) {
        m.lastKnownX = m.target.x;
        m.lastKnownY = m.target.y;
      }

      const hedefX = m.lastKnownX;
      const hedefY = m.lastKnownY;
      const mesafe = m.speed * adim;

      const oncekiX = m.x;
      const oncekiY = m.y;

      const kalanKare = distSq(m, { x: hedefX, y: hedefY });
      const vardi = kalanKare <= mesafe * mesafe;

      const yeni = moveToward(m, { x: hedefX, y: hedefY }, mesafe);
      m.x = yeni.x;
      m.y = yeni.y;

      if (hedefCanli && m.target !== null) {
        // SÜPÜRÜLMÜŞ kontrol — nokta-mesafe değil.
        const yolKare = pointToSegmentDistSq(
          m.target,
          { x: oncekiX, y: oncekiY },
          { x: m.x, y: m.y },
        );
        if (yolKare <= m.hitRadius * m.hitRadius) {
          this.#carp(m, enemies);
          continue;
        }
      } else if (vardi) {
        // Hedef öldü ve son bilinen konuma varıldı (S21).
        // Alan hasarlıysa yine de patlar — top mermisi boşa gitmez.
        if (m.splashRadius > 0) this.#patlat(m, enemies);
        else this.onBosaGiden?.(m); // S24 ölçümü — tek hedefli mermi söndü
        m.alive = false;
        this.pool.release(m);
      }
    }
  }

  #carp(m: T, enemies: readonly E[]): void {
    // Çarpma noktası **hedefin konumu**, merminin konumu değil.
    //
    // Süpürülmüş kontrol isabeti hedefe `hitRadius` kadar yaklaşınca
    // yakalıyor; mermi o anda hedefin 12 px berisinde olabiliyor. Patlama
    // oradan çözülseydi yarıçap hedefin arkasına doğru 12 px kayardı ve
    // "tam yarıçap sınırındaki düşman" sistematik olarak ıskalanırdı —
    // ölçüldü, sınır testi bu yüzden kırıldı.
    if (m.target !== null) {
      m.x = m.target.x;
      m.y = m.target.y;
    }

    if (m.splashRadius > 0) {
      this.#patlat(m, enemies);
      this.onExplode?.(m.x, m.y, m.splashRadius);
    } else if (m.effect?.kind === 'chain') {
      this.#zincirle(m, enemies, m.effect.targets, m.effect.falloff);
    } else if (m.target !== null) {
      this.#vur(m.target, m);
    }
    m.alive = false;
    this.pool.release(m);
  }

  /**
   * **Yıldırım** — hedeften başlayarak en yakın düşmanlara sıçrıyor,
   * her sıçramada hasar `× falloff` (`GAME-DESIGN.md` §4.3).
   *
   * `// GEÇİCİ — S36`: **aynı hedefe iki kez sıçramıyor.** Dokümanda
   * yazmıyor; sıçrayabilseydi tek düşmanlı bir dalgada Yıldırım kendi
   * hasarını üçe katlar ve zincirleme "kalabalık cevabı" olmaktan çıkıp
   * tek hedef silahına dönüşürdü.
   *
   * Sıçrama menzili kulenin menzili değil; zincir hedeften hedefe
   * atlıyor. Menzil sınırı olarak merminin kendi `hitRadius`ı çok küçük
   * kalırdı — sıçrama yarıçapı kule menzilinin yarısı alındı.
   */
  #zincirle(m: T, enemies: readonly E[], targets: number, falloff: number): void {
    const vurulan = new Set<E>();
    let mevcut = m.target;
    let hasar = m.damage;

    for (let i = 0; i < targets; i++) {
      if (mevcut === null) break;
      this.#vur(mevcut, m, hasar);
      vurulan.add(mevcut);

      hasar *= falloff;
      // Bir sonraki sıçrama: vurulmamış en yakın düşman.
      let enYakin: E | null = null;
      let enYakinKare = ZINCIR_YARICAP_KARE;
      for (const e of enemies) {
        if (!e.alive || e.def === null || vurulan.has(e)) continue;
        const d = distSq(e, mevcut);
        if (d < enYakinKare) {
          enYakinKare = d;
          enYakin = e;
        }
      }
      mevcut = enYakin;
    }
  }

  /**
   * `M2-T09` — patlama.
   *
   * Yarıçap içindeki **tüm** düşmanlara hasar. Merkeze uzaklığa göre azalma
   * yok (`// GEÇİCİ — S22`; dokümanda tanımlı değil).
   *
   * Patlama konumu merminin **süpürülmüş kesişim anındaki** konumu —
   * `#carp` çağrılmadan önce `m.x/m.y` zaten o kareye taşınmış durumda.
   */
  #patlat(m: T, enemies: readonly E[]): void {
    const yaricapKare = m.splashRadius * m.splashRadius;
    const kenar = BALANCE.patlamaKenarOrani;
    for (const e of enemies) {
      if (!e.alive || e.def === null) continue;
      const d2 = distSq(e, m);
      if (d2 > yaricapKare) continue;
      // **Merkezden uzaklaştıkça azalıyor (S22).** Kural 9'un ikinci
      // istisnası `util/math.merkezdenOran`'da yazılı: yarıçap kontrolü
      // (yukarıda) karesel kalıyor, azalma **oranı** gerçek mesafeden.
      const oran = kenar + (1 - kenar) * merkezdenOran(d2, m.splashRadius);
      this.#vur(e, m, m.damage * oran);
    }
  }

  #vur(e: E, m: T, hasar = m.damage): void {
    if (e.def === null) return;
    // `M10-T05` — kule sinerjisi. Çarpan ham hasara, zırhtan ÖNCE;
    // gerekçe `combat.yavaslatmaSinerjisi`'nde.
    const sinerji = yavaslatmaSinerjisi(m.damageType, e);
    const sonuc = applyDamage(hasar * sinerji, m.damageType, e.def);
    this.onDamage(e, sonuc, e.x, e.y, m.damageType);
    // Süreli etki isabet anında uygulanıyor; zincirleme anlık olduğu için
    // burada geçilmiyor.
    if (m.effect !== undefined && m.effect.kind !== 'chain') this.onEffect?.(e, m.effect);
  }

  /** Sahne kapanışı / dalga sonu. */
  releaseAll(): void {
    this.pool.releaseAll();
  }
}
