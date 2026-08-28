import Phaser from 'phaser';
import type { Poolable } from '../util/pool';
import { Pool } from '../util/pool';
import { quadraticBezier } from '../util/math';
import { FRAME_GOLD_COIN } from '../data/spriteFrames';

/**
 * Altın uçuşu — `GAME-DESIGN.md` §10, `M6-T10`.
 *
 * Düşman ölünce bir altın ikonu HUD sayacına doğru bezier ile uçuyor.
 * Görsel iyileştirme turunda gerçek sanata geçti (`assets-src/hud/gold-coin.png`,
 * `scripts/prep-assets.mjs` atlas manifestine eklendi) — eski greybox
 * (düz renkli daire) kalktı. Boyut de büyüdü (12 px çap → 20 px): eski
 * çap zaten hiçbir iç detay taşımıyordu, yeni sprite'ın okunması için
 * biraz daha yer gerekiyor.
 */

const DISPLAY_SIZE = 20;
const LIFETIME_MS = 500;
/** Düz çizgi yerine yukarı kabaran kavis — "bezier ile uçar" (§10). */
const ARC_HEIGHT = 70;

export class GoldCoin extends Phaser.GameObjects.Image implements Poolable {
  /** `Y08` — bkz. `entities/Enemy.HAVUZ_ALANLARI`'ın başındaki gerekçe. */
  static readonly HAVUZ_ALANLARI: readonly string[] = ['Active', 'Visible', 'Position', 'Scale', 'Alpha'];

  /** `setDisplaySize`'ın hesapladığı gerçek ölçek — `setScale(1)` bunu
   * ezip sprite'ı kaynak boyutuna (48 px) geri döndürürdü. Küçülme
   * efekti ve sıfırlama hep bu tabana göre orantılı çalışıyor. */
  readonly #baseScale: number;

  /** Kalan ömür, ms. `scaledDelta` ile azalıyor — 2× hızda da doğru (k.8). */
  #left = 0;
  #startX = 0;
  #startY = 0;
  #ctrlX = 0;
  #ctrlY = 0;
  #endX = 0;
  #endY = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'atlas', FRAME_GOLD_COIN);
    this.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
    this.#baseScale = this.scaleX;
    scene.add.existing(this);
    this.resetForPool();
  }

  fly(x: number, y: number, hedefX: number, hedefY: number): void {
    this.#startX = x;
    this.#startY = y;
    this.#endX = hedefX;
    this.#endY = hedefY;
    this.#ctrlX = (x + hedefX) / 2;
    this.#ctrlY = Math.min(y, hedefY) - ARC_HEIGHT;
    this.#left = LIFETIME_MS;
    this.setPosition(x, y);
    this.setScale(this.#baseScale);
    this.setAlpha(1);
    this.setActive(true).setVisible(true);
  }

  /** @param scaledDelta `GameClock.scaledDelta`. @returns Vardıysa `true`. */
  step(scaledDelta: number): boolean {
    this.#left -= scaledDelta;
    if (this.#left <= 0) {
      this.setPosition(this.#endX, this.#endY);
      return true;
    }

    const t = 1 - this.#left / LIFETIME_MS; // 0 → 1
    const p = quadraticBezier(
      { x: this.#startX, y: this.#startY },
      { x: this.#ctrlX, y: this.#ctrlY },
      { x: this.#endX, y: this.#endY },
      t,
    );
    this.setPosition(p.x, p.y);
    // Sayaca yaklaşırken küçülerek "emiliyor" hissi.
    this.setScale(this.#baseScale * (1 - 0.4 * t));
    return false;
  }

  resetForPool(): void {
    this.#left = 0;
    this.#startX = 0;
    this.#startY = 0;
    this.#ctrlX = 0;
    this.#ctrlY = 0;
    this.#endX = 0;
    this.#endY = 0;
    this.setActive(false).setVisible(false);
    this.setPosition(0, 0);
    this.setScale(this.#baseScale);
    this.setAlpha(1);
  }
}

/** Havuz + güncelleme döngüsü — `DamageTextSystem` ile aynı desen. */
export class GoldFlightSystem {
  constructor(
    private readonly pool: Pool<GoldCoin>,
    private readonly hedefX: number,
    private readonly hedefY: number,
  ) {}

  get activeCount(): number {
    return this.pool.activeCount;
  }

  /** Havuz doluysa ikon **çıkmaz** — sessizce büyümüyor (TIER 1 kural 3). */
  spawn(x: number, y: number): void {
    const c = this.pool.acquire();
    if (c === null) return;
    c.fly(x, y, this.hedefX, this.hedefY);
  }

  update(scaledDelta: number): void {
    for (const c of this.pool.activeItems()) {
      if (c.step(scaledDelta)) this.pool.release(c);
    }
  }
}
