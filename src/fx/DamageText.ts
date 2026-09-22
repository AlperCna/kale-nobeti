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
 * | Durum | Renk | Boyut | İşaret |
 * | tabana düşmüş | gri | %80 | **kalkan** |
 * | normal | parşömen | %100 | — |
 *
 * ## `M106` — kalkan bu tabloda vardı, ekranda YOKTU
 *
 * Tablo `M106`'ya kadar “gri + kalkan” yazıyordu ama kod yalnız
 * `setTint(GREY)` ve `setScale(0.8)` yapıyordu; kalkan hiç
 * çizilmemişti. Yani §3'ün *“oyuncu kulesinin işe yaramadığını
 * görmeli”* sözü pratikte **renge** kalıyordu: ayrı ayrı süzülen iki
 * sayıda %80 ölçek farkı karşılaştırma noktası olmadan okunmuyor.
 * TIER 1 kural 6 bilginin yalnız renge dayanmamasını istiyor.
 *
 * İşaret **tek bir `Graphics`**'e her karede yeniden çiziliyor
 * (`ciz`) — `fx/EnemyStatus` ve `GameScene.#kalkanlariCiz` ile aynı
 * desen. Havuzlanan nesneye şekil eklenseydi sahibi olmayan bir durum
 * daha doğardı (kural 3).
 */

const PARCHMENT = 0xe4d3a8;
const GREY = 0x9aa0a6;
/** Kalkan işaretinin mürekkep konturu — açık zeminde de okunsun. */
const INK = 0x14203a;
/** İşaret ölçüleri: yarı genişlik, yarı yükseklik, sayıya uzaklık. */
const ISARET_W = 3.5;
const ISARET_H = 4.5;
const ISARET_ARA = 5;

/** Süzülme yüksekliği ve süresi. Yalnız görsel; denge sayısı değil. */
const RISE_PX = 34;
const LIFETIME_MS = 700;

export class DamageText extends Phaser.GameObjects.BitmapText implements Poolable {
  /** `Y08` — bkz. `entities/Enemy.HAVUZ_ALANLARI`'ın başındaki gerekçe. */
  static readonly HAVUZ_ALANLARI: readonly string[] = [
    'Active',
    'Visible',
    'Position',
    'Alpha',
    'Scale',
    'Tint',
    'Text',
  ];

  /** Kalan ömür, ms. `scaledDelta` ile azalıyor — 2× hızda da doğru. */
  #left = 0;
  #startY = 0;
  /**
   * Vuruş hasar tabanına düştü mü (`M106`). Kalkan işaretini çizen
   * `DamageTextSystem.ciz` bunu okuyor. `resetForPool` sıfırlıyor —
   * havuza dönen nesne durum taşımamalı (kural 3).
   */
  emildi = false;

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
    this.emildi = floored;
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
    this.emildi = false;
    this.setActive(false).setVisible(false);
    this.setPosition(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.clearTint();

    // Sahne yıkılırken font verisi düşmüş olabiliyor; o durumda `setText`
    // Phaser'ın içinde `null.chars` okuyup çöküyor (ölçüldü). Metin zaten
    // görünmez bir nesnede duruyor ve nesne birazdan yok edilecek.
    if (this.fontData !== null && this.fontData !== undefined) this.setText('');
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

  /**
   * **Kalkan işareti** — `M106`. Tabana düşen her sayının soluna küçük
   * bir kalkan çiziyor: bilgi renkten başka bir kanalda da taşınsın
   * (TIER 1 kural 6).
   *
   * Durum tutmuyor; `clear()` + canlı havuzdan yeniden türetme
   * (`fx/EnemyStatus`'ın gerekçesi birebir geçerli). Sayı sönümlenirken
   * işaret de sönüyor — alfa nesnenin kendisinden okunuyor, ikinci bir
   * yerde hesaplanmıyor.
   */
  ciz(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    for (const t of this.pool.activeItems()) {
      if (!t.emildi) continue;
      // Sayının origin'i (0.5, 1): sol kenarı `x - width/2`, tabanı `y`.
      const cx = t.x - t.width / 2 - ISARET_ARA;
      const cy = t.y - t.height / 2;
      const a = t.alpha;
      g.fillStyle(GREY, a);
      g.lineStyle(1, INK, a);
      g.beginPath();
      g.moveTo(cx - ISARET_W, cy - ISARET_H);
      g.lineTo(cx + ISARET_W, cy - ISARET_H);
      g.lineTo(cx + ISARET_W, cy + ISARET_H * 0.2);
      g.lineTo(cx, cy + ISARET_H);
      g.lineTo(cx - ISARET_W, cy + ISARET_H * 0.2);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
  }

  releaseAll(): void {
    this.pool.releaseAll();
  }
}
