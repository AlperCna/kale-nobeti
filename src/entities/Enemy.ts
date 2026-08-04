import Phaser from 'phaser';
import type { EnemyDef, EnemyState, Mover } from '../types/enemy';
import type { PathProgress } from '../types/path';
import type { Poolable } from '../util/pool';
import { resetEnemyState } from '../systems/movers';

/**
 * Greybox düşman. Nihai sprite M6'da (`docs/research/06-sanat-yonu.md` §2:
 * her varlığın önce tek renk silüeti yapılır).
 *
 * **Bu sınıf ince.** Hareket mantığı `Mover`'da, sıfırlamanın mantıksal
 * kısmı `resetEnemyState`'te — ikisi de Phaser'sız ve `node`'da test edilmiş
 * durumda (TIER 1 kural 11). Burada kalan tek şey Phaser'a bağlı olan kısım:
 * görüntü listesi, konum, görsel sıfırlama.
 *
 * `PathSystem`'e **doğrudan atıf yok** — yalnız `Mover` biliniyor. Uçanlar
 * M4'te `LineMover` alacak ve bu dosya değişmeyecek (`DEPENDENCIES.md` §2).
 */
export class Enemy extends Phaser.GameObjects.Rectangle implements Poolable, EnemyState {
  def: EnemyDef | null = null;
  hp = 0;
  maxHp = 0;
  /** Birim: px/sn. */
  speed = 0;
  progress: PathProgress = { segmentIndex: 0, tInSegment: 0, remainingDistance: 0 };
  blockedBy: object | null = null;
  alive = false;

  /** `null` yalnız havuzda beklerken. */
  mover: Mover | null = null;

  /**
   * Havuzdaki nesnenin kalıcı kimliği. `enemy:killed` olayı bunu taşıyor.
   *
   * Havuz nesneyi geri kullandığı için bu **düşman örneğinin** değil
   * **havuz yuvasının** kimliği; olay tüketicileri (M3 ekonomi) yalnız
   * "bir düşman öldü" bilgisini kullanıyor.
   */
  readonly id: number;

  static #sonrakiId = 1;

  readonly #baseColor: number;

  constructor(scene: Phaser.Scene, size: number, color: number) {
    super(scene, 0, 0, size, size, color);
    this.id = Enemy.#sonrakiId++;
    this.#baseColor = color;
    scene.add.existing(this);
  }

  /**
   * Havuzdan çıkarken çağrılır.
   *
   * @param hpMultiplier Harita çarpanı (`MapDef.hpMultiplier`,
   *   `GAME-DESIGN.md` §9). Hız çarpanla ölçeklenmiyor — yalnız HP ve altın.
   */
  spawn(mover: Mover, def: EnemyDef, hpMultiplier: number): void {
    const hp = def.hp * hpMultiplier;
    this.mover = mover;
    this.def = def;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = def.speed;
    this.blockedBy = null;
    this.alive = true;
    this.progress = mover.spawnProgress();
    this.setActive(true).setVisible(true);
    this.syncPosition();
  }

  /** @param scaledDelta `GameClock.scaledDelta` (TIER 1 kural 8). */
  step(scaledDelta: number): void {
    if (this.mover === null || !this.alive) return;
    this.mover.step(this, scaledDelta);
    this.syncPosition();
  }

  /** Hedeflemenin (`first`/`last`) bakacağı sayı. M2'de kullanılacak. */
  get remainingDistance(): number {
    return this.progress.remainingDistance;
  }

  reachedEnd(): boolean {
    return this.mover !== null && this.mover.reachedEnd(this);
  }

  private syncPosition(): void {
    if (this.mover === null) return;
    const p = this.mover.positionAt(this);
    this.setPosition(p.x, p.y);
  }

  /**
   * TIER 1 kural 3: **tüm** durum sıfırlanır.
   *
   * Mantıksal kısım `resetEnemyState`'te (test edilebilir olsun diye);
   * burada yalnız Phaser tarafı. `killTweensOf` atlanırsa havuza dönen
   * nesne eski ölüm animasyonunu yeni düşman üzerinde oynatır.
   */
  resetForPool(): void {
    resetEnemyState(this);
    this.mover = null;

    this.scene?.tweens.killTweensOf(this);
    this.setActive(false).setVisible(false);
    this.setPosition(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.setAngle(0);
    this.setFillStyle(this.#baseColor);
  }
}
