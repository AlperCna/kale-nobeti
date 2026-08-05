import Phaser from 'phaser';
import type { AbilityId } from '../types/ability';
import { ABILITIES } from '../data/abilities';

const PARCHMENT = 0xe4d3a8;
const GOLD = 0xd4a032;
const INK = 0x14203a;

/** Dokunmatik hedef en az 44×44 px (`CLAUDE.md` Platform). */
const BTN = 64;

const ETIKET: Readonly<Record<AbilityId, string>> = {
  meteor: 'Meteor',
  takviye: 'Takviye',
};

interface Buton {
  readonly id: AbilityId;
  readonly kok: Phaser.GameObjects.Container;
  readonly gfx: Phaser.GameObjects.Graphics;
  readonly cerceve: Phaser.GameObjects.Rectangle;
  /** Hazır olma anında bir kez parlıyor (§8) — iki kez parlamasın diye. */
  parladi: boolean;
}

/**
 * İki yetenek butonu ve **dairesel bekleme dolumu** — `GAME-DESIGN.md` §8.
 *
 * "Bekleme süreleri HUD'da dairesel dolum ile gösterilir; hazır olunca
 * altın kenar bir kez parlar."
 *
 * ## TIER 1 kural 7 burada nasıl karşılanıyor
 *
 * Kalan süre **sayı olarak yazılmıyor**; bilgi dairesel dolumla veriliyor.
 * `setText` hiç çağrılmıyor, yani kuralın önlemek istediği canvas yeniden
 * üretimi hiç doğmuyor. Etiketler ("Meteor", "Takviye") statik.
 *
 * Sayı istenirse M6'da `BitmapText` ile eklenir — kuralın izin verdiği tek
 * yol o. `Text` ile eklemek saniyede bir canvas yeniden üretmek demekti.
 */
export class AbilityButtons {
  readonly #butonlar: Buton[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly onSelect: (id: AbilityId) => void,
  ) {
    ABILITIES.forEach((def, i) => {
      const bx = x + i * (BTN + 14);
      const kok = scene.add.container(bx, y);

      const cerceve = scene.add
        .rectangle(0, 0, BTN, BTN, PARCHMENT)
        .setStrokeStyle(2, GOLD)
        .setInteractive({ useHandCursor: true });
      cerceve.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.onSelect(def.id));

      // Dolum grafiği çerçevenin üstünde: bekleme sürerken butonu karartıyor.
      const gfx = scene.add.graphics();

      const yazi = scene.add
        .text(0, BTN / 2 + 12, ETIKET[def.id], {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // Platform: minimum 16 px
          color: '#8A7250',
        })
        .setOrigin(0.5);

      kok.add([cerceve, gfx, yazi]);
      this.#butonlar.push({ id: def.id, kok, gfx, cerceve, parladi: true });
    });
  }

  /**
   * @param progress `0`…`1` — `AbilitySystem.progress(id)`.
   * @param secili Tıkla-hedefle bekleyen yetenek.
   */
  update(progress: (id: AbilityId) => number, secili: AbilityId | null): void {
    for (const b of this.#butonlar) {
      const p = progress(b.id);
      const hazir = p >= 1;

      b.gfx.clear();
      if (!hazir) {
        // **Dairesel dolum:** kalan kısım mürekkeple örtülü. Saat yönünde
        // açılıyor, yani dolan pasta hazır olan kısım.
        b.gfx.fillStyle(INK, 0.62);
        b.gfx.slice(
          0,
          0,
          BTN * 0.62,
          Phaser.Math.DegToRad(-90 + 360 * p),
          Phaser.Math.DegToRad(270),
          false,
        );
        b.gfx.fillPath();
        b.parladi = false;
      } else if (!b.parladi) {
        // §8: hazır olunca altın kenar **bir kez** parlar.
        b.parladi = true;
        b.cerceve.setStrokeStyle(4, GOLD);
        b.kok.scene.tweens.add({
          targets: b.cerceve,
          scale: { from: 1.12, to: 1 },
          duration: 260,
          ease: 'Quad.easeOut',
          onComplete: () => b.cerceve.setStrokeStyle(2, GOLD),
        });
      }

      // Seçili yetenek belirgin: kalın altın kenar.
      if (b.id === secili) b.cerceve.setStrokeStyle(4, GOLD);
      else if (hazir && b.parladi) b.cerceve.setStrokeStyle(2, GOLD);
      else b.cerceve.setStrokeStyle(2, INK);
    }
  }
}
