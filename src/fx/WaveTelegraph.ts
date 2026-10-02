import Phaser from 'phaser';
import type { Wave } from '../types/wave';
import type { EnemyDef, EnemyId } from '../types/enemy';
import { NUMBER_FONT_KEY } from './numberFont';
import { enemyFrameKey } from '../data/spriteFrames';
import { enemySummary } from './enemyLabel';
import { kutularKesisiyor, type Kutu } from '../util/math';


/**
 * Dalga telegrafı — `GAME-DESIGN.md` §7, **zorunlu özellik**.
 *
 * "Hazırlık aşamasında gelecek dalganın kompozisyonu ikonlarla gösterilir.
 * Oyuncunun körlemesine oynaması türün en yaygın şikâyeti."
 *
 * Adetler `BitmapText` (TIER 1 kural 7) — bu dosya `Text` üretmiyor.
 */

const ICON = 22;
/** Dokunma hedefi — Platform alt sınırı; `SPACING` 74 olduğu için çakışmıyor. */
const HEDEF = 44;
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
  /** Bandın dokunma hedefleri dahil kapladığı alan — `menuyleKesisiyorsaGizle`. */
  #kutu: Kutu = { x0: 0, y0: 0, x1: 0, y1: 0 };

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
    /**
     * Ekran noktası bir yapı noktasının üstünde mi — `M171`. Öyleyse
     * telgrafın dokunma hedefi **isabet vermiyor**, tıklama alttaki
     * `Game`'e geçiyor (bkz. `#hedefYolVer`).
     */
    private readonly noktaUstunde: (x: number, y: number) => boolean = () => false,
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
    // kendi satırında (kart 216 px'ti, sığmıyordu ve dışarı taşıyordu —
    // oyuncu geri bildirimi turunun yan gözlemi). Bant tür sayısıyla
    // uzuyor: `n · 74 + 8` px. Burada "5 tipe kadar 370 px" yazıyordu;
    // `M169`'da ölçüldü — kampanyada bir dalgada en çok **6** tür (Sisli
    // Bataklık, 452 px), sonsuz modda dalga 11-200 arasında **9** (674 px).
    // Menüyle çakışmayı `menuyleKesisiyorsaGizle` çözüyor.
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
        /**
         * **Dokunma hedefi ikonun kendisi değil** — `M113`.
         *
         * İkon 22×22 çiziliyor ve Platform alt sınırı 44×44. İkonlar
         * arası adım `SPACING` (74), yani 44'lük bir hedef komşusuyla
         * **çakışmıyor** — burada şart tam karşılanabiliyor (kule
         * panelinin ikon şeridinde adım dar olduğu için karşılanamıyor,
         * S166'daki ölçülmüş istisna). Görünüş değişmiyor: hedef
         * ikonun arkasında görünmez bir dikdörtgen.
         */
        const hedef = this.#scene.add
          .rectangle(bx, 0, HEDEF, HEDEF, 0x000000, 0)
          .setInteractive({
            hitArea: new Phaser.Geom.Rectangle(0, 0, HEDEF, HEDEF),
            hitAreaCallback: this.#hedefYolVer,
            useHandCursor: true,
          });
        this.#kap.add(hedef);
        const goster = (): void => {
          for (const o of this.#ozetler) o.setVisible(false);
          ozet.setVisible(true);
        };
        hedef.on(Phaser.Input.Events.POINTER_OVER, goster);
        hedef.on(Phaser.Input.Events.POINTER_OUT, () => ozet.setVisible(false));
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
        hedef.on(Phaser.Input.Events.POINTER_DOWN, goster);
        this.#ozetler.push(ozet);
        this.#kap.add(ozet);
      }

      this.#kap.add([kare, yazi]);
      i++;
    }

    // Dokunma hedefleri dahil kapladığı alan (`M169`).
    this.#kutu = {
      x0: this.#kap.x - HEDEF / 2,
      y0: this.#kap.y - HEDEF / 2,
      x1: this.#kap.x + adet.size * SPACING,
      y1: this.#kap.y + HEDEF / 2,
    };
    this.#kap.setVisible(true);
  }

  /**
   * **Telgraf yapı noktalarına yol veriyor** — `M171`.
   *
   * Hedefler 44×44 (Platform alt sınırı) ve bant `y = 150-194`'te; bu
   * banda yarıçapı 24 olan **yedi** yapı noktası giriyor — beş haritada
   * (Değirmen Geçidi 0 · Taş Köprü 2 · Kül Ovası 0, 1 · Kar Geçidi 0, 10 ·
   * Kadim Harabe 1; dalganın tür sayısıyla ölçüldü). Telgraf yalnız
   * hazırlıkta görünüyor, yani tam **kule kurulan** anda: `Hud` üstte
   * olduğu için o noktalara basan oyuncu menü yerine düşman özetini
   * açıyordu. Kadim Harabe'de oynanırken görüldü — nokta hiç açılmadı.
   *
   * İşaretçi bir yapı noktasının üstündeyse hedef isabet vermiyor; ikonun
   * geri kalanı özeti açmaya devam ediyor.
   */
  readonly #hedefYolVer = (alan: Phaser.Geom.Rectangle, x: number, y: number): boolean => {
    if (!Phaser.Geom.Rectangle.Contains(alan, x, y)) return false;
    const p = this.#scene.input.activePointer;
    return !this.noktaUstunde(p.x, p.y);
  };

  /**
   * Açık bir yapı menüsüyle kesişiyorsa **bu kare** gizlen — `M169`.
   *
   * `show`'dan sonra her karede çağrılıyor: `show` görünürlüğü geri
   * açıyor, bu çağrı gerekiyorsa kapatıyor; çizim ikisinden sonra olduğu
   * için titreme yok. Bant yeniden kurulmuyor (`Text` yeniden üretmek
   * doku demek — TIER 1 k.7), yalnız görünürlük değişiyor.
   *
   * Taş Köprü'de oynanırken görüldü: gövdedeki alt noktanın menüsü yukarı
   * açılıyor ve telgrafın dördüncü ikonu menünün sol üst köşesine
   * biniyordu. `Hud` üstte olduğu için ikonun dokunma hedefi oradaki
   * düğmeyi örtüyordu.
   */
  menuyleKesisiyorsaGizle(menu: Kutu | null): void {
    if (menu === null || !this.#kap.visible) return;
    if (kutularKesisiyor(this.#kutu, menu)) this.#kap.setVisible(false);
  }
}
