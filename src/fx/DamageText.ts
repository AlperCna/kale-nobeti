import Phaser from 'phaser';
import type { Poolable } from '../util/pool';
import { Pool } from '../util/pool';
import { NUMBER_FONT_KEY } from './numberFont';

/**
 * Hasar sayısı. **`BitmapText`** — TIER 1 kural 7.
 *
 * `Phaser.GameObjects.Text` kullanılamaz: yoğun dalgada saniyede 30-60 sayı
 * üretiliyor ve `Text` her içerik değişiminde canvas yeniden üretip GPU'ya
 * yüklüyor (`research/02` §1). Havuzlamak bu cezayı kaldırmaz.
 *
 * **İki renk** (`GAME-DESIGN.md` §3) — kritik vuruş v1'den çıkarıldı (S56):
 * | Durum | Renk | Boyut |
 * | tabana düşmüş | gri + kalkan | %80 |
 * | normal | parşömen | %100 |
 */

const PARCHMENT = 0xe4d3a8;
const GREY = 0x9aa0a6;

/** Süzülme yüksekliği ve süresi. Yalnız görsel; denge sayısı değil. */
const RISE_PX = 34;
const LIFETIME_MS = 700;

export class DamageText extends Phaser.GameObjects.BitmapText implements Poolable {
  /** Kalan ömür, ms. `scaledDelta` ile azalıyor — 2× hızda da doğru. */
  #left = 0;
  #startY = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, NUMBER_FONT_KEY, '');
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    this.resetForPool();
  }

  show(x: number, y: number, amount: number, floored: boolean): void {
    // Sayı yuvarlanıyor: "1.5" okunmuyor, "2" okunuyor. En az 1 gösteriliyor
    // ki tabana düşen vuruş "0" gibi görünmesin (§3 geri bildirim şartı).
    this.setText(String(Math.max(1, Math.round(amount))));
    this.setPosition(x, y);
    this.#startY = y;
    this.#left = LIFETIME_MS;
    this.setTint(floored ? GREY : PARCHMENT);
    this.setScale(floored ? 0.8 : 1);
    this.setAlpha(1);
    this.setActive(true).setVisible(true);
  }

  /** @param scaledDelta `GameClock.scaledDelta`. @returns Ömrü bittiyse `true`. */
  step(scaledDelta: number): boolean {
    this.#left -= scaledDelta;
    if (this.#left <= 0) return true;

    const t = 1 - this.#left / LIFETIME_MS; // 0 → 1
    this.y = this.#startY - RISE_PX * t;
    this.setAlpha(1 - t * t); // geç sönümlenme: sayı okunacak kadar duruyor
    return false;
  }

  resetForPool(): void {
    this.#left = 0;
    this.#startY = 0;
    this.setActive(false).setVisible(false);
    this.setPosition(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.clearTint();
    this.setText('');
  }
}

/** Havuz + güncelleme döngüsü. Ön ayırma `research/02` §7: **60**. */
export class DamageTextSystem {
  constructor(private readonly pool: Pool<DamageText>) {}

  get activeCount(): number {
    return this.pool.activeCount;
  }

  /** Havuz doluysa sayı **çıkmaz** — sessizce büyümüyor (TIER 1 kural 3). */
  spawn(x: number, y: number, amount: number, floored: boolean): void {
    const t = this.pool.acquire();
    if (t === null) return;
    t.show(x, y, amount, floored);
  }

  update(scaledDelta: number): void {
    for (const t of this.pool.activeItems()) {
      if (t.step(scaledDelta)) this.pool.release(t);
    }
  }

  releaseAll(): void {
    this.pool.releaseAll();
  }
}
