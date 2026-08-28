import Phaser from 'phaser';
import { createParchmentFrame } from './ParchmentFrame';

/**
 * `G05` — boss can çubuğu. Seçenek (d)'nin boss kısmı
 * (`docs/plan/iyilestirme/G05-dusman-can-gostergesi.md`).
 *
 * **Tek nesne, havuz yok.** Aynı anda en fazla bir boss sahnede
 * (dalga tasarımı) — TIER 1 kural 3'ün havuzlama zorunluluğu, tekrar
 * doğan/ölen nesneler için. Bu, sahnenin ömrü boyunca **bir kez**
 * yaratılıp görünürlüğü açılıp kapanan tek bir `Container`.
 *
 * Renk **uzunluk** kanalıyla taşınıyor (kural 6: ayrım renge dayanmaz
 * olmalı) — dolgu vermilyon ama asıl bilgi çubuğun `width`'i.
 */

const INK = 0x14203a;
const VERMILION = 0xb03a2e;
const GOLD = 0xd4a032;

const BAR_W = 360;
const BAR_H = 20;

export class BossHealthBar {
  readonly #kok: Phaser.GameObjects.Container;
  readonly #dolgu: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.#kok = scene.add.container(x, y).setDepth(150).setVisible(false);

    const cerceve = createParchmentFrame(scene, 0, 0, BAR_W + 20, BAR_H + 20, 12);
    const zemin = scene.add.rectangle(0, 0, BAR_W, BAR_H, INK).setStrokeStyle(1, GOLD, 0.5);
    // Sol kenardan büyüyen dolgu — `PreloadScene`'in yükleme çubuğuyla
    // aynı desen (`setSize`, germe yok).
    this.#dolgu = scene.add.rectangle(-BAR_W / 2, 0, BAR_W, BAR_H, VERMILION).setOrigin(0, 0.5);

    this.#kok.add([cerceve, zemin, this.#dolgu]);
  }

  /** @param hp/maxHp `GameScene.bossInfo`'dan — `null` ise `hide()` çağrılmalı. */
  show(hp: number, maxHp: number): void {
    this.#kok.setVisible(true);
    const oran = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    this.#dolgu.setSize(Math.max(0, BAR_W * oran), BAR_H);
  }

  hide(): void {
    this.#kok.setVisible(false);
  }
}
