import Phaser from 'phaser';
import { t } from '../util/i18n';
import { createParchmentFrame } from './ParchmentFrame';

const GENISLIK = 420;
const YUKSEKLIK = 92;
/** Ekranda kalma süresi. Birim: ms (ölçekli zaman). */
const SURE_MS = 1400;
const GIRIS_MS = 260;

/**
 * Boss giriş bandı — `M8-T09`.
 *
 * Boss zaten kendi can çubuğunu getiriyor ama **geldiğini** haber veren
 * bir şey yoktu: dalga 10 telgrafında bir satır olarak geçip sahaya
 * giriyordu ve oyuncu çoğu zaman onu ilk vuruşta fark ediyordu.
 *
 * TIER 1 kural 7: metin **bir kez** yazılıyor, `setText` yok — her
 * gösterimde yeni bir bant kuruluyor ve sonunda yok ediliyor. Bant nadir
 * (harita başına bir kez), yani havuzlamanın anlamı yok.
 */
export class BossBanner {
  readonly #scene: Phaser.Scene;
  #acik = false;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;
  }

  /**
   * @param sarsintiyiTetikle Bandın açılışıyla eşzamanlı ekran sarsıntısı.
   *   Sarsıntı **çağıranın** işi: `ScreenShake` ayarlara ve `GameClock`'a
   *   bağlı ve bu sınıf ikisini de tanımıyor.
   */
  goster(sarsintiyiTetikle?: () => void): void {
    // Aynı dalgada iki boss yok ama sahne yeniden başlatmada olay
    // tekrarlanabiliyor; üst üste binen iki bant okunmuyor.
    if (this.#acik) return;
    this.#acik = true;

    const { width, height } = this.#scene.scale;
    const kap = this.#scene.add.container(width / 2, height / 2 - 90).setDepth(380);
    kap.add(createParchmentFrame(this.#scene, 0, 0, GENISLIK, YUKSEKLIK, 20));
    kap.add(
      this.#scene.add
        .text(0, 0, t('bossIncoming'), {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '40px',
          color: '#B03A2E',
        })
        .setOrigin(0.5),
    );

    kap.setScale(0.7).setAlpha(0);
    sarsintiyiTetikle?.();

    this.#scene.tweens.add({
      targets: kap,
      scale: 1,
      alpha: 1,
      duration: GIRIS_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.#scene.time.delayedCall(SURE_MS, () => {
          this.#scene.tweens.add({
            targets: kap,
            alpha: 0,
            duration: GIRIS_MS,
            onComplete: () => {
              kap.destroy();
              this.#acik = false;
            },
          });
        });
      },
    });
  }
}
