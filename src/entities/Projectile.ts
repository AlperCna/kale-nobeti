import Phaser from 'phaser';
import type { DamageType } from '../types/enemy';
import type { Enemy } from './Enemy';
import type { ProjectileState } from '../types/projectile';
import type { Poolable } from '../util/pool';
import type { TowerEffect } from '../types/tower';
import type { ProjectileLook } from '../data/projectileVisuals';

/** Gülle yay nabzı — `M8-T08`. Tepe ölçek ve yarım periyot. */
const ARC_TEPE = 1.25;
const ARC_MS = 260;

/**
 * Greybox mermi. **Havuzlu** — TIER 1 kural 3: oyun içinde asla `new` ile
 * mermi yaratılmaz.
 *
 * **İnce sınıf.** Hareket, isabet ve patlama `ProjectileSystem`'de ve
 * `node`'da test edilmiş; burada yalnız görüntü var. `x`/`y` Phaser'ın
 * kendi alanları, sistem onları doğrudan yazıyor.
 */
export class Projectile extends Phaser.GameObjects.Arc implements ProjectileState<Enemy>, Poolable {
  /** `Y08` — bkz. `Enemy.HAVUZ_ALANLARI`'ın başındaki gerekçe. */
  static readonly HAVUZ_ALANLARI: readonly string[] = [
    'Active',
    'Visible',
    'Position',
    'Alpha',
    'Scale',
    'FillStyle',
    'Angle', // `setLook` oku hedefe döndürüyor — havuza dönen mermi 0'a dönmeli
  ];

  target: Enemy | null = null;
  damage = 0;
  damageType: DamageType = 'physical';
  speed = 0;
  splashRadius = 0;
  hitRadius = 0;
  effect: TowerEffect | undefined = undefined;
  alive = false;
  lastKnownX = 0;
  lastKnownY = 0;

  readonly #baseColor: number;
  /**
   * `M8-T08` — bu mermi arkasında iz bırakıyor mu ve rengi ne.
   * `GameScene` uçuş sırasında okuyor; `Projectile`'ın kendi `update`'i
   * yok (ince sınıf, hareketi `ProjectileSystem` yapıyor).
   */
  trail = false;
  trailColor = 0xffffff;

  constructor(scene: Phaser.Scene, radius: number, color: number) {
    super(scene, 0, 0, radius, 0, 360, false, color);
    this.#baseColor = color;
    scene.add.existing(this);
    this.resetForPool();
  }

  /** Mermi göründü — `ProjectileSystem.fire` alanları doldurduktan sonra. */
  activate(): void {
    this.setActive(true).setVisible(true);
  }

  /**
   * Aileye/dala göre görünüm (`data/projectileVisuals.ts`) — oyuncu geri
   * bildirimi: "atış şekli hiç değişmiyor". `fire`'dan SONRA, `activate`'ten
   * ÖNCE: konum ve hedef dolu olmalı ki ok hedefe dönük çizilsin. Havuz
   * sıfırlaması ölçeği, rengi ve açıyı geri alıyor (kural 3).
   */
  setLook(look: ProjectileLook): void {
    this.setFillStyle(look.color);
    this.setScale(look.scaleX, look.scaleY);
    if (look.rotateToTarget && this.target !== null) {
      this.setRotation(Math.atan2(this.target.y - this.y, this.target.x - this.x));
    }

    this.trail = look.trail === true;
    this.trailColor = look.color;

    // Gülle yay nabzı. `yoyo` + `repeat: -1`: mermi kısa yaşıyor, tween'i
    // ömre göre ayarlamak yerine sonsuz döngü kuruluyor ve `resetForPool`
    // (`killTweensOf` + `setScale(1)`) onu **kesin** olarak kapatıyor —
    // kural 3'ün "sıfırlanmayan durum" tuzağına düşmemek için tek yol bu.
    if (look.arc === true) {
      this.scene.tweens.add({
        targets: this,
        scaleX: look.scaleX * ARC_TEPE,
        scaleY: look.scaleY * ARC_TEPE,
        duration: ARC_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * TIER 1 kural 3: **tüm** durum sıfırlanır.
   *
   * `target` sıfırlanmazsa havuzdaki mermi ölü düşmana referans tutar ve
   * düşman çöpe gitmez — kuralın metninde adı geçen tam senaryo.
   */
  resetForPool(): void {
    this.target = null;
    this.damage = 0;
    this.damageType = 'physical';
    this.speed = 0;
    this.splashRadius = 0;
    this.hitRadius = 0;
    this.effect = undefined;
    this.alive = false;
    this.lastKnownX = 0;
    this.lastKnownY = 0;
    // `M8-T08` — iz bayrağı da sıfırlanıyor: havuzdan çıkan bir ok,
    // önceki elde büyü mermisiyse iz bırakmaya devam ederdi (kural 3).
    this.trail = false;
    this.trailColor = this.#baseColor;

    this.scene?.tweens.killTweensOf(this);
    this.setActive(false).setVisible(false);
    this.setPosition(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.setAngle(0);
    this.setFillStyle(this.#baseColor);
  }
}
