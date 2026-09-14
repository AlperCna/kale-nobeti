import Phaser from 'phaser';
import { t } from '../util/i18n';
import { createParchmentFrame } from './ParchmentFrame';
import { getAchievement } from '../data/achievements';

const GENISLIK = 320;
const YUKSEKLIK = 76;
const SAG_BOSLUK = 16;
const UST = 190;
/** Ekranda kalma süresi. Birim: ms. */
const SURE_MS = 3000;
const KAYMA_MS = 320;

/**
 * Başarım bandı — `M8-T07`.
 *
 * Sağdan kayarak giriyor, 3 sn durup geri kayıyor.
 *
 * ## Neden `scene.time` ve `scene.tweens` (TIER 1 kural 8 ihlali değil)
 *
 * Kural 8 **oyun mantığının** ham `delta` kullanmasını yasaklıyor. Bu bir
 * bildirim: 2× hızda süresinin yarıya inmesi *istenen* davranış değil,
 * ama `GameClock.setScale` zaten `time.timeScale` ve `tweens.timeScale`'i
 * de ölçekliyor (kural 8'in üç özelliği) — yani bant da hızlanıyor ve
 * oyunun geri kalanıyla **tutarlı** kalıyor. Kendi sayacını tutmak bu
 * tutarlılığı bozardı.
 *
 * ## Kuyruk
 *
 * İki başarım aynı anda açılabiliyor (el sonunda üç tanesi birden).
 * Üst üste binmesinler diye kuyruk var; kuyruk **sınırlı** (en fazla 4),
 * çünkü 12 başarımın hepsi tek elde açılırsa oyuncu 36 saniye bant
 * izlemek zorunda kalırdı.
 */
const KUYRUK_TAVANI = 4;

export class AchievementToast {
  readonly #scene: Phaser.Scene;
  readonly #kuyruk: string[] = [];
  #calisiyor = false;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;
  }

  show(id: string): void {
    if (this.#kuyruk.length >= KUYRUK_TAVANI) return;
    this.#kuyruk.push(id);
    if (!this.#calisiyor) this.#sonraki();
  }

  #sonraki(): void {
    const id = this.#kuyruk.shift();
    if (id === undefined) {
      this.#calisiyor = false;
      return;
    }
    this.#calisiyor = true;

    const def = getAchievement(id);
    if (def === undefined) {
      this.#sonraki();
      return;
    }

    const genislik = this.#scene.scale.width;
    const hedefX = genislik - SAG_BOSLUK - GENISLIK / 2;
    const baslangicX = genislik + GENISLIK / 2;

    const kap = this.#scene.add.container(baslangicX, UST).setDepth(400);
    kap.add(createParchmentFrame(this.#scene, 0, 0, GENISLIK, YUKSEKLIK, 18));
    kap.add(
      this.#scene.add
        .text(0, -18, t('achUnlocked'), {
          fontFamily: 'Spectral, serif',
          fontSize: '16px', // Platform: minimum 16 px
          color: '#8A7250',
        })
        .setOrigin(0.5),
    );
    kap.add(
      this.#scene.add
        .text(0, 8, t(def.title), {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '24px',
          color: '#14203A',
        })
        .setOrigin(0.5),
    );

    this.#scene.tweens.add({
      targets: kap,
      x: hedefX,
      duration: KAYMA_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.#scene.time.delayedCall(SURE_MS, () => {
          this.#scene.tweens.add({
            targets: kap,
            x: baslangicX,
            duration: KAYMA_MS,
            ease: 'Quad.easeIn',
            onComplete: () => {
              kap.destroy();
              this.#sonraki();
            },
          });
        });
      },
    });
  }
}
