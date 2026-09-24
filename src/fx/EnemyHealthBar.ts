import Phaser from 'phaser';
import type { Poolable } from '../util/pool';

/**
 * `G05` — hasar görmüş düşman can çubuğu. Seçenek (b)
 * (`docs/plan/iyilestirme/G05-dusman-can-gostergesi.md`): tam canlı
 * düşmanda çubuk yok, ilk hasarla belirir ve **düşman ölene kadar
 * kalır** (Trol'ün yenilenmesi geri doldururken kaybolmaz — "bir kez
 * göründüyse kalır" kuralı, atama/yönetim `EnemyHealthBarSystem`'de).
 *
 * Renk **uzunluk** kanalıyla taşınıyor (kural 6) — `BossHealthBar` ile
 * aynı gerekçe, aynı vermilyon dolgu.
 */

const INK = 0x14203a;
const VERMILION = 0xb03a2e;

const BAR_W = 40;
const BAR_H = 6;
/** Düşmanın üstünde — çoğu düşman 64 px (`Enemy.ts`), yarısı + pay. */
const OFFSET_Y = 30;

export class EnemyHealthBar extends Phaser.GameObjects.Container implements Poolable {
  /** `Y08` — bkz. `entities/Enemy.HAVUZ_ALANLARI`'ın başındaki gerekçe. */
  /**
   * `M135` — **`Alpha` eksikti.** `show()` çubuğu `alfa` parametresiyle
   * sönümlendiriyor ve `resetForPool()` onu `setAlpha(1)` ile geri
   * alıyordu, ama manifesto bildirmediği için bekçi o satırı
   * korumuyordu: silinse geri dönüşen çubuk önceki düşmanın soluk
   * opaklığını miras alırdı. Bekçinin 26. kuralı artık bu yönü de
   * okuyor.
   *
   * **Dolgunun genişliği listede yok** ve olamaz: manifesto Phaser
   * setter adlarından oluşuyor, dolgu ise bir çocuk nesne
   * (`#dolgu.setSize`). `resetForPool()` onu elle sıfırlıyor.
   */
  static readonly HAVUZ_ALANLARI: readonly string[] = [
    'Active',
    'Visible',
    'Position',
    'Alpha',
  ];

  readonly #dolgu: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const zemin = scene.add.rectangle(0, 0, BAR_W, BAR_H, INK, 0.85);
    this.#dolgu = scene.add.rectangle(-BAR_W / 2, 0, BAR_W, BAR_H, VERMILION).setOrigin(0, 0.5);
    this.add([zemin, this.#dolgu]);
    scene.add.existing(this);
    this.resetForPool();
  }

  /**
   * @param alfa Düşmanın saydamlığı. **Çubuk düşmanla aynı saydamlıkta
   * olmalı** — `M12` Faz 1'de canlı ekranda yakalandı: gömülü düşman
   * %35 saydamken çubuğu tam opak kalıyordu ve hayaletin üstünde yüzen
   * bir çubuk gibi okunuyordu. Bilgi doğruydu, *sunum* yalan söylüyordu.
   */
  show(x: number, y: number, hp: number, maxHp: number, alfa = 1): void {
    this.setPosition(x, y - OFFSET_Y);
    const oran = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    this.#dolgu.setSize(Math.max(0, BAR_W * oran), BAR_H);
    this.setAlpha(alfa);
    this.setActive(true).setVisible(true);
  }

  resetForPool(): void {
    this.setActive(false).setVisible(false);
    this.setAlpha(1);
    this.setPosition(0, 0);
    this.#dolgu.setSize(BAR_W, BAR_H);
  }
}
