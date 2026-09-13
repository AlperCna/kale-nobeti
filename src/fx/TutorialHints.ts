import Phaser from 'phaser';
import { createParchmentFrame } from './ParchmentFrame';

/**
 * `Y09` — öğretici ipucu balonu. `systems/TutorialSystem`'in `onShow`
 * callback'i bunu çağırıyor; **hangi ipucu ne zaman** kararı orada,
 * burada yalnız gösterim var.
 *
 * Kasıtlı basit: tween yok (`prefers-reduced-motion` ile hiç
 * çakışmıyor), zamanlayıcı yok (`GameClock`/2× hız/duraklatma ile hiç
 * etkileşmiyor — bir bilgi balonunun okunma süresi oyun hızına bağlı
 * OLMAMALI). Yalnız **kendi üstüne** tıklanınca kapanıyor
 * (`stopPropagation` — `#menuButonu`'yla aynı desen, alttaki tıklamayı
 * yutmuyor).
 */

const GENISLIK = 480;
/** Tek satırlık ipucunun yüksekliği; uzun metin (hedefleme modları, 3 satır) balonu büyütüyor. */
const ASGARI_YUKSEKLIK = 60;
const DIKEY_PAY = 24;

export class TutorialHints {
  readonly #scene: Phaser.Scene;
  #kok?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;
  }

  show(text: string): void {
    this.#kapat();

    const { width, height } = this.#scene.scale;
    const kap = this.#scene.add.container(width / 2, height - 90).setDepth(300);

    // Metin önce: balonun yüksekliği sarılmış metnin gerçek yüksekliğinden
    // çıkıyor. Eskiden 60 sabitti; üç satırlık ipucu (hedefleme modları)
    // çerçeveden taşardı.
    const etiket = this.#scene.add
      .text(0, 0, text, {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#14203A',
        align: 'center',
        wordWrap: { width: GENISLIK - 40 },
      })
      .setOrigin(0.5);
    const yukseklik = Math.max(ASGARI_YUKSEKLIK, Math.ceil(etiket.height) + DIKEY_PAY);
    const cerceve = createParchmentFrame(this.#scene, 0, 0, GENISLIK, yukseklik, 12);
    kap.add([cerceve, etiket]);

    kap.setSize(GENISLIK, yukseklik);
    kap.setInteractive(
      new Phaser.Geom.Rectangle(-GENISLIK / 2, -yukseklik / 2, GENISLIK, yukseklik),
      Phaser.Geom.Rectangle.Contains,
    );
    kap.on(
      Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
      (_p: unknown, _x: number, _y: number, olay: Phaser.Types.Input.EventData) => {
        olay.stopPropagation();
        this.#kapat();
      },
    );

    this.#kok = kap;
  }

  #kapat(): void {
    this.#kok?.destroy(true);
    this.#kok = undefined;
  }
}
