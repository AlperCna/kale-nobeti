import Phaser from 'phaser';
import type { DamageType } from '../types/enemy';
import type { Enemy } from './Enemy';
import type { ProjectileState } from '../types/projectile';
import type { Poolable } from '../util/pool';
import type { TowerEffect } from '../types/tower';

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

    this.scene?.tweens.killTweensOf(this);
    this.setActive(false).setVisible(false);
    this.setPosition(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.setFillStyle(this.#baseColor);
  }
}
