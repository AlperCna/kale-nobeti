import Phaser from 'phaser';
import { resetProjectileState } from '../systems/ProjectileSystem';
import type { DamageType } from '../types/enemy';
import type { Enemy } from './Enemy';
import type { ProjectileState } from '../types/projectile';
import type { Poolable } from '../util/pool';
import type { TowerEffect } from '../types/tower';
import type { ProjectileLook } from '../data/projectileVisuals';
import { konumIsinla, type AraDegerli } from '../util/araDeger';

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
export class Projectile extends Phaser.GameObjects.Arc implements ProjectileState<Enemy>, Poolable, AraDegerli {
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

  /**
   * Ara değer üretimi (`M65`, `util/araDeger.ts`). Çizim son iki
   * mantık durumu arasında yapılıyor; `x`/`y` hem mantığın hem
   * çizimin alanı olduğu için gerçek konum ayrıca saklanıyor.
   */
  oncekiX = 0;
  oncekiY = 0;
  gercekX = 0;
  gercekY = 0;

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
    // Havuz mirasını sil — yoksa nesne ilk karesinde ekranın öbür
    // ucundan süzülerek gelir (`M65`).
    konumIsinla(this);
  }

  /**
   * Aileye/dala göre görünüm (`data/projectileVisuals.ts`) — oyuncu geri
   * bildirimi: "atış şekli hiç değişmiyor". `fire`'dan SONRA, `activate`'ten
   * ÖNCE: konum ve hedef dolu olmalı ki ok hedefe dönük çizilsin. Havuz
   * sıfırlaması ölçeği, rengi ve açıyı geri alıyor (kural 3).
   */
  setLook(look: ProjectileLook, hareketOlcegi = 1): void {
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
    // `M105` — nabız genliği hareket ayarına bağlı. Bu tween `repeat: -1`
    // ile sürüklü çalışıyor, yani `prefers-reduced-motion` tercihinin en
    // doğrudan hedefi: sahadaki her gülle sürekli nabız atıyordu.
    // 0'da tween hiç kurulmuyor — merminin uçuşu ve isabeti değişmiyor.
    if (look.arc === true && hareketOlcegi > 0) {
      const tepe = 1 + (ARC_TEPE - 1) * hareketOlcegi;
      this.scene.tweens.add({
        targets: this,
        scaleX: look.scaleX * tepe,
        scaleY: look.scaleY * tepe,
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
    // `M142` — mantıksal sıfırlama saf fonksiyonda (Enemy ve Soldier ile
    // aynı desen); tamlığı `ProjectileSystem.test.ts` derleyiciye bağlıyor.
    resetProjectileState(this);
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
