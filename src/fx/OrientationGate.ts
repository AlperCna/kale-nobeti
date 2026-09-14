import Phaser from 'phaser';
import { t } from '../util/i18n';

const INK = 0x14203a;

/**
 * "Cihazı yatay çevirin" perdesi — `M8-T12`.
 *
 * `CLAUDE.md` Platform: *"yalnızca yatay yönlendirme (mobilde çevirme
 * uyarısı platform tarafından yapılır)"*. Poki ve CrazyGames bu uyarıyı
 * kendileri gösteriyor; **itch.io ve doğrudan bağlantı göstermiyor** ve
 * orada oyun dikey ekranda 375 px genişliğe sıkışıp okunmaz hâle geliyor.
 * Bu perde o boşluğu kapatıyor.
 *
 * ## Neden Phaser sahnesi değil de her sahneye eklenen bir katman değil
 *
 * Tek bir yerde, `GameScene`/`MenuScene` gibi sahnelerin **dışında**
 * durmalı; sahneye bağlansaydı sahne geçişlerinde yok olur ve yeniden
 * kurulurdu. Phaser'ın ölçek yöneticisi zaten oyun geneli; perde de öyle.
 *
 * TIER 1 kural 7: metin bir kez yazılıyor, `setText` yok. Dil değişimi
 * sahneleri yeniden kuruyor ama bu perde onların dışında — o yüzden dil
 * değişiminde **yeniden yaratılıyor** (`ekle` tekrar çağrılabilir).
 */
export class OrientationGate {
  readonly #scene: Phaser.Scene;
  readonly #kok: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;
    const { width, height } = scene.scale;

    this.#kok = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0).setVisible(false);
    this.#kok.add(scene.add.rectangle(0, 0, width, height, INK, 1).setOrigin(0));
    this.#kok.add(
      scene.add
        .text(width / 2, height / 2 - 30, t('rotateDevice'), {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '36px',
          color: '#D4A032',
          align: 'center',
          wordWrap: { width: width - 120 },
        })
        .setOrigin(0.5),
    );
    // Dönen telefon çizimi yerine iki dikdörtgen: dikey (soluk) → yatay
    // (altın). Sanat gerektirmiyor ve ne istendiğini tek bakışta söylüyor.
    this.#kok.add(
      scene.add.rectangle(width / 2 - 70, height / 2 + 50, 44, 76, 0xe4d3a8, 0.35).setOrigin(0.5),
    );
    this.#kok.add(
      scene.add.rectangle(width / 2 + 70, height / 2 + 50, 76, 44, 0xd4a032, 1).setOrigin(0.5),
    );

    scene.scale.on(Phaser.Scale.Events.RESIZE, () => this.guncelle());
    this.guncelle();
  }

  /**
   * Dikeyse perdeyi açar.
   *
   * Ölçüt **tuvalin gerçek en-boy oranı**, `screen.orientation` değil:
   * `orientation` masaüstünde `undefined` olabiliyor ve gömülü çerçevede
   * (portal iframe'i) sayfanın yönü ile oyunun aldığı alan farklı olabiliyor.
   * Oyunun gerçekten dar kalıp kalmadığı tek doğru soru.
   */
  guncelle(): void {
    const g = this.#scene.scale.parentSize;
    const dikey = g.height > g.width;
    this.#kok.setVisible(dikey);
  }
}
