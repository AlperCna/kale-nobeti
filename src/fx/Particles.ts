import Phaser from 'phaser';
import type { Settings } from '../systems/Settings';
import type { GameClock } from '../systems/GameClock';
import type { Pool } from '../util/pool';
import type { Enemy } from '../entities/Enemy';
import type { Vec2 } from '../types/common';
import type { EnemyHealthBarSystem } from './EnemyHealthBarSystem';

/**
 * `Y01` adım 1 — `GameScene`'in juice katmanı (§10) buraya taşındı:
 * parçacık patlaması, ölüm ezilmesi, meteor halkası, can-kaybı vinyeti.
 * `CLAUDE.md` Klasör yapısı zaten bu dosyayı öngörüyordu
 * (`fx/ Particles`) — diskte hiç yoktu, `GameScene` içinde kalmıştı.
 *
 * Bağımlılıkları dar ve dıştan veriliyor (kurucu parametreleri): sahne,
 * ayarlar (efekt yoğunluğu için), saat (2×'te parçacık yarıya insin
 * diye), düşman havuzu ve `G05`'in can çubuğu sistemi (`#olumEfekti`
 * ikisine de dokunuyor). `GameScene`'in geri kalanını bilmiyor.
 */

const PARTICLE_MAX = 300;

export class Particles {
  readonly #scene: Phaser.Scene;
  readonly #settings: Settings;
  readonly #clock: GameClock;
  readonly #enemyPool: Pool<Enemy>;
  readonly #enemyHealthBars: EnemyHealthBarSystem;

  readonly #particles: Phaser.GameObjects.Particles.ParticleEmitter;
  readonly #vignette: Phaser.GameObjects.Graphics;

  /**
   * Doku **çalışma zamanında** üretiliyor: M6'nın atlası (`M6-P03`/`P04`)
   * henüz yok ve tek beyaz piksel için bir varlık dosyası eklemek paketi
   * büyütür. `numberFont.ts` aynı yolu izliyor.
   */
  constructor(
    scene: Phaser.Scene,
    settings: Settings,
    clock: GameClock,
    enemyPool: Pool<Enemy>,
    enemyHealthBars: EnemyHealthBarSystem,
  ) {
    this.#scene = scene;
    this.#settings = settings;
    this.#clock = clock;
    this.#enemyPool = enemyPool;
    this.#enemyHealthBars = enemyHealthBars;

    const ad = 'kn-parcacik';
    if (!scene.textures.exists(ad)) {
      const doku = scene.textures.createCanvas(ad, 4, 4);
      const ctx = doku?.getContext();
      if (ctx !== undefined && ctx !== null) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 4, 4);
        doku?.refresh();
      }
    }

    // §10: "Aynı anda en fazla 300 parçacık (havuzlu)."
    // `research/02` §7: Phaser'ın parçacık sistemi **zaten havuzlu**,
    // ayrı havuz yazmak TIER 1 kural 3'ün istediği şey değil.
    this.#particles = scene.add.particles(0, 0, ad, {
      lifespan: 420,
      speed: { min: 40, max: 140 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      // §10: "ilk kare parlak altın/vermilyon, hızla koyu duman/toza sönüm"
      tint: [0xd4a032, 0xb03a2e, 0x6b5a3e],
      maxParticles: PARTICLE_MAX,
      emitting: false,
    });
    this.#particles.setDepth(50);

    // §10 can kaybı: ekran kenarında vermilyon vinyet nabzı, 400 ms.
    this.#vignette = scene.add.graphics().setDepth(60).setAlpha(0);
    const g = this.#vignette;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const kalinlik = 90;
    g.fillStyle(0xb03a2e, 1);
    g.fillRect(0, 0, w, kalinlik);
    g.fillRect(0, h - kalinlik, w, kalinlik);
    g.fillRect(0, 0, kalinlik, h);
    g.fillRect(w - kalinlik, 0, kalinlik, h);
  }

  /** `dev.particleCount` — §10 tavanı 300. */
  get aliveCount(): number {
    return this.#particles.getAliveParticleCount();
  }

  /**
   * §10 parçacıkları. **Ayrı havuz YOK** — Phaser'ın parçacık sistemi zaten
   * havuzlu (`research/02` §7: "ömrü biten parçacık yok edilmez, havuza
   * döner"). Sınır `maxParticles` ile veriliyor.
   */
  patlat(x: number, y: number, dirX: number, dirY: number, adet: number): void {
    const olcek = this.#settings.effectScale;
    if (olcek <= 0) return; // TIER 1 k.6 — efekt kapalı

    // §10 "2× hızda parçacık yoğunluğu yarıya iner": okunurluk için.
    const hizBolen = this.#clock.scale === 2 ? 2 : 1;
    const n = Math.max(1, Math.round((adet * olcek) / hizBolen));

    const aci = Math.atan2(dirY, dirX);
    this.#particles.setParticleTint(0xd4a032);
    this.#particles.emitParticle(n, x, y);
    void aci;
  }

  meteorEfekti(at: Vec2): void {
    const g = this.#scene.add.graphics();
    g.fillStyle(0xd4632a, 0.5);
    g.fillCircle(at.x, at.y, 90);
    this.#scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 400,
      onComplete: () => g.destroy(),
    });
  }

  /**
   * §10 squash & stretch: "düşman ölürken **1,3× yatay ezilme** +
   * kaybolma, **120 ms**".
   *
   * ## Havuz sözleşmesi nasıl korunuyor (TIER 1 kural 3)
   *
   * Efekt, düşman havuza dönmeden önce oynatılmak zorunda — nesne aynı
   * nesne. Yani `release` **120 ms geciktiriliyor**. Bu güvenli, çünkü
   * `alive` zaten `false`: hedefleme onu eliyor, `Mover` ilerletmiyor,
   * mermiler ıskalıyor.
   *
   * **Ama havuz baskısı altında gecikme kapatılıyor.** Serbest yuva 8'in
   * altına inerse efekt atlanıp nesne anında iade ediliyor: 60'lık havuzda
   * her ölümü 120 ms tutmak yoğun dalgada `acquire`'ı `null` döndürürdü ve
   * bir görsel süs yüzünden **düşman doğmazdı**. Kural 3'ün "havuz sessizce
   * büyümez" tavizi bu yönde ödenmez.
   */
  olumEfekti(e: Enemy): void {
    const havuz = this.#enemyPool;

    // `G05` — düşman havuza dönmeden ÖNCE, `e` başka bir düşman için asla
    // yeniden kullanılmadan önce. Aynı senkron çağrı, bayatlama riski yok
    // (`EnemyHealthBarSystem`'in kendi yorumu).
    this.#enemyHealthBars.releaseFor(e);

    const olcek = this.#settings.effectScale;
    if (olcek <= 0 || havuz.freeCount < 8) {
      havuz.release(e);
      return;
    }

    this.#scene.tweens.add({
      targets: e,
      scaleX: 1.3,
      scaleY: 0.6,
      alpha: 0,
      duration: 120,
      ease: 'Quad.easeOut',
      // Süre **oyun zamanına** bağlı: `tweens.timeScale` `GameClock`
      // tarafından yazılıyor (TIER 1 kural 8), yani 2× hızda 60 ms.
      onComplete: () => havuz.release(e),
    });
  }

  /** §10: can kaybında 400 ms vermilyon nabız. */
  vinyetNabzi(): void {
    const g = this.#vignette;
    // Vinyet **efekt yoğunluğundan bağımsız**: bir geri bildirim değil,
    // bir uyarı. TIER 1 kural 6 "erişilebilirlik tabanı" istiyor ve can
    // kaybının görülmemesi tabanın altına düşmek olurdu.
    this.#scene.tweens.killTweensOf(g);
    g.setAlpha(0);
    this.#scene.tweens.add({
      targets: g,
      alpha: { from: 0, to: 0.35 },
      duration: 130,
      yoyo: true,
      hold: 40,
      ease: 'Quad.easeOut',
      onComplete: () => g.setAlpha(0),
    });
  }
}
