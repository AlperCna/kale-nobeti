import Phaser from 'phaser';
import type { Wave } from '../types/wave';
import type { EnemyDef, EnemyId } from '../types/enemy';
import { NUMBER_FONT_KEY } from './numberFont';
import { enemyFrameKey } from '../data/spriteFrames';
import { enemySummary } from './enemyLabel';


/**
 * Dalga telegrafı — `GAME-DESIGN.md` §7, **zorunlu özellik**.
 *
 * "Hazırlık aşamasında gelecek dalganın kompozisyonu ikonlarla gösterilir.
 * Oyuncunun körlemesine oynaması türün en yaygın şikâyeti."
 *
 * Adetler `BitmapText` (TIER 1 kural 7) — bu dosya `Text` üretmiyor.
 */

const ICON = 22;
const SPACING = 74;
const INK = 0x14203a;
/** Şeridin arkasındaki koyu bant — ikon + sayı açık zeminde (harita 1 çimeni) okunsun. */
const BANT_PAY = 8;

export class WaveTelegraph {
  readonly #kap: Phaser.GameObjects.Container;
  readonly #scene: Phaser.Scene;
  /** `M8-T02` — ikon başına özet satırı; aynı anda en çok biri görünür. */
  readonly #ozetler: Phaser.GameObjects.Text[] = [];
  #gosterilenDalga = -1;

  /**
   * @param cozumle Düşman kimliğini **haritaya göre** tanıma çeviren
   * fonksiyon. Zorunlu parametre, çünkü bu tam olarak S80'in hata
   * sınıfı: telgraf `getEnemy` (haritasız) kullanıyordu ve oyuncuya
   * **dövüşmeyeceği** düşmanı gösteriyordu — harita 6'nın bossu zırh
   * 2 ve çağırma yeteneğiyle geliyor, telgraf ise "zırh 10, yetenek
   * yok" yazıyordu. Tipi zorunlu yapmak, yeni bir çağıran tarafın aynı
   * hatayı sessizce tekrarlamasını engelliyor.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly cozumle: (id: EnemyId) => EnemyDef | undefined,
  ) {
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
    this.#ozetler.length = 0; // `removeAll(true)` nesneleri yok etti

    // Aynı düşman birden çok grupta olabilir — tek satırda topla.
    const adet = new Map<EnemyId, number>();
    for (const g of wave.groups) adet.set(g.enemy, (adet.get(g.enemy) ?? 0) + g.count);

    // M8-T01 — kendi bandı: telgraf artık HUD kartının DIŞINDA, altında
    // kendi satırında (5 tipe kadar 370 px; kart 216 px'ti, sığmıyordu ve
    // dışarı taşıyordu — oyuncu geri bildirimi turunun yan gözlemi).
    const bant = this.#scene.add
      .rectangle(-BANT_PAY, 0, adet.size * SPACING + BANT_PAY, ICON + 12, INK, 0.55)
      .setOrigin(0, 0.5);
    this.#kap.add(bant);

    let i = 0;
    for (const [enemy, sayi] of adet) {
      const bx = i * SPACING;
      const kare = this.#scene.add
        .image(bx, 0, 'atlas', enemyFrameKey(enemy))
        .setDisplaySize(ICON, ICON);
      const yazi = this.#scene.add
        .bitmapText(bx + ICON, 0, NUMBER_FONT_KEY, String(sayi))
        .setOrigin(0, 0.5)
        .setTint(0xe4d3a8);

      // `M8-T02` — ikonun üstüne gelince "Zırhlı Ork — zırh 8" satırı.
      // Her tip için ayrı statik `Text`, yalnız görünürlük değişiyor
      // (TIER 1 kural 7; bu dosya zaten `setText` çağırmıyor).
      const def = this.cozumle(enemy);
      if (def !== undefined) {
        const ozet = this.#scene.add
          .text(0, ICON, enemySummary(def), {
            fontFamily: 'Spectral, serif',
            fontSize: '16px', // bekçi k.13
            color: '#E4D3A8',
          })
          .setOrigin(0, 0)
          .setVisible(false);
        kare.setInteractive({ useHandCursor: true });
        const goster = (): void => {
          for (const o of this.#ozetler) o.setVisible(false);
          ozet.setVisible(true);
        };
        kare.on(Phaser.Input.Events.POINTER_OVER, goster);
        kare.on(Phaser.Input.Events.POINTER_OUT, () => ozet.setVisible(false));
        /**
         * **`M112` — dokunmatikte imleç yok.**
         *
         * Bu özet `M8-T02`'den beri yalnız **üzerine gelmeyle** açılıyordu,
         * yani portal trafiğinin büyük kısmı (dokunmatik) “bu düşman
         * nedir” cevabına **hiç** ulaşamıyordu. `M87`'nin duraklatma
         * düğmesiyle aynı sınıf: kanal vardı, kapısı yalnız fareydi.
         * Dokunuşta özet açık kalıyor; başka bir ikona dokunmak
         * öncekini kapatıyor (`goster` hepsini gizleyip birini açıyor).
         */
        kare.on(Phaser.Input.Events.POINTER_DOWN, goster);
        this.#ozetler.push(ozet);
        this.#kap.add(ozet);
      }

      this.#kap.add([kare, yazi]);
      i++;
    }

    this.#kap.setVisible(true);
  }
}
