import Phaser from 'phaser';
import type { Poolable } from '../util/pool';
import { Pool } from '../util/pool';
import { quadraticBezier } from '../util/math';

/**
 * Altın uçuşu — `GAME-DESIGN.md` §10, `M6-T10`.
 *
 * Düşman ölünce bir altın ikonu HUD sayacına doğru bezier ile uçuyor.
 * Gerçek altın sanatı yok (`P02`'de üretilmedi) — GREYBOX (`CLAUDE.md`
 * "Üretim kuralı"): tek renk daire, nihai sanat oynanışta kanıtlandıktan
 * sonra gelir.
 */

const GOLD = 0xd4a032;
const RADIUS = 6;
const LIFETIME_MS = 500;
/** Düz çizgi yerine yukarı kabaran kavis — "bezier ile uçar" (§10). */
const ARC_HEIGHT = 70;

export class GoldCoin extends Phaser.GameObjects.Arc implements Poolable {
  /** Kalan ömür, ms. `scaledDelta` ile azalıyor — 2× hızda da doğru (k.8). */
  #left = 0;
  #startX = 0;
  #startY = 0;
  #ctrlX = 0;
  #ctrlY = 0;
  #endX = 0;
  #endY = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, RADIUS, 0, 360, false, GOLD, 1);
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
    this.setScale(1);
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
    this.setScale(1 - 0.4 * t);
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
    this.setScale(1);
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
