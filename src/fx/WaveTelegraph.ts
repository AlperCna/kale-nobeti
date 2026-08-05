import Phaser from 'phaser';
import type { Wave } from '../types/wave';
import type { EnemyId } from '../types/enemy';
import { NUMBER_FONT_KEY } from './numberFont';

/**
 * Dalga telegrafı — `GAME-DESIGN.md` §7, **zorunlu özellik**.
 *
 * "Hazırlık aşamasında gelecek dalganın kompozisyonu ikonlarla gösterilir.
 * Oyuncunun körlemesine oynaması türün en yaygın şikâyeti."
 *
 * M6'da ikonlar sprite olacak; şimdilik greybox renkli kareler + adet.
 * Adetler `BitmapText` (TIER 1 kural 7) — bu dosya `Text` üretmiyor.
 */

/** Greybox ikon renkleri. M6'da sprite gelince düşecek. */
const ICON_COLOR: Readonly<Record<string, number>> = {
  goblin: 0x2f4a3c, // yosun — en zayıf
  orkSavasci: 0x8a7250, // yol tonu — zırhlı
  kurtBinicisi: 0xb03a2e, // vermilyon — hızlı
  harpi: 0x3e5ca8, // lapis — uçan
  ogreSef: 0xd4a032, // altın — boss
};

const ICON = 22;
const SPACING = 74;

export class WaveTelegraph {
  readonly #kap: Phaser.GameObjects.Container;
  readonly #scene: Phaser.Scene;
  #gosterilenDalga = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.#scene = scene;
    this.#kap = scene.add.container(x, y).setVisible(false);
  }

  /**
   * @param wave Hazırlık aşamasındaki dalga; `undefined` ise telegraf söner.
   *
   * **Dalga başlayınca sönüyor** — görevin "bitmedi sayılır eğer" maddesi.
   */
  show(wave: Wave | undefined): void {
    if (wave === undefined) {
      this.#kap.setVisible(false);
      this.#gosterilenDalga = -1;
      return;
    }
    if (wave.index === this.#gosterilenDalga) {
      this.#kap.setVisible(true);
      return;
    }

    this.#gosterilenDalga = wave.index;
    this.#kap.removeAll(true);

    // Aynı düşman birden çok grupta olabilir — tek satırda topla.
    const adet = new Map<EnemyId, number>();
    for (const g of wave.groups) adet.set(g.enemy, (adet.get(g.enemy) ?? 0) + g.count);

    let i = 0;
    for (const [enemy, sayi] of adet) {
      const bx = i * SPACING;
      const kare = this.#scene.add
        .rectangle(bx, 0, ICON, ICON, ICON_COLOR[enemy] ?? 0xffffff)
        .setStrokeStyle(2, 0xd4a032);
      const yazi = this.#scene.add
        .bitmapText(bx + ICON, 0, NUMBER_FONT_KEY, String(sayi))
        .setOrigin(0, 0.5)
        .setTint(0xe4d3a8);
      this.#kap.add([kare, yazi]);
      i++;
    }

    this.#kap.setVisible(true);
  }
}
