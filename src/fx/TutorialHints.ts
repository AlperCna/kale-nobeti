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
const YUKSEKLIK = 60;

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

    const cerceve = createParchmentFrame(this.#scene, 0, 0, GENISLIK, YUKSEKLIK, 12);
    const etiket = this.#scene.add
      .text(0, 0, text, {
        fontFamily: 'Spectral, serif',
        fontSize: '18px',
        color: '#14203A',
        align: 'center',
        wordWrap: { width: GENISLIK - 40 },
      })
      .setOrigin(0.5);
    kap.add([cerceve, etiket]);

    kap.setSize(GENISLIK, YUKSEKLIK);
    kap.setInteractive(
      new Phaser.Geom.Rectangle(-GENISLIK / 2, -YUKSEKLIK / 2, GENISLIK, YUKSEKLIK),
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
