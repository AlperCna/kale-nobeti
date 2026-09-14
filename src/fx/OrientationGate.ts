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
  /** Kaldırılabilmesi için saklanıyor — bkz. `destroy`. */
  readonly #resizeDinleyici: () => void;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;
    const { width, height } = scene.scale;

    this.#kok = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0).setVisible(false);

    /**
     * `M10-T04` — **bu kare oyunun ilk izlenimi.**
     *
     * Poki'nin gereksinim sayfası mobilde tam ekranı kaplamayı istiyor
     * ve *"portre uyumlu oyunlar daha çok etkileşim görüyor"* diyor.
     * Portre oynanışı kapsam dışı (1280×720 sabit tuval, beş haritanın
     * geometrisi yatay), ama portreye düşen oyuncunun gördüğü **tek
     * kare** bu — ve ölçülen hâli düz lacivert zemin üstünde iki gri
     * dikdörtgendi. Oyunun kimliğinden hiçbir şey taşımıyordu.
     *
     * `menu-bg` her zaman yüklü (`PreloadScene.queueBoot`, ilk
     * indirmenin parçası), yani bedava. Üstüne mürekkep perde:
     * arka plan kimliği veriyor, perde metnin kontrastını garantiliyor.
     */
    const zemin = scene.add.image(width / 2, height / 2, 'menu-bg');
    // `cover`: en-boy oranı korunarak kısa kenardan taşacak şekilde.
    const olcek = Math.max(width / zemin.width, height / zemin.height);
    zemin.setScale(olcek);
    this.#kok.add(zemin);
    this.#kok.add(scene.add.rectangle(0, 0, width, height, INK, 0.78).setOrigin(0));

    this.#kok.add(
      scene.add
        .text(width / 2, height / 2 - 96, t('rotateDevice'), {
          fontFamily: '"Grenze Gotisch", serif',
          fontSize: '36px',
          color: '#D4A032',
          align: 'center',
          wordWrap: { width: width - 120 },
        })
        .setOrigin(0.5),
    );
    this.#kok.add(
      scene.add
        .text(width / 2, height / 2 - 52, t('rotateHint'), {
          fontFamily: 'Spectral, serif',
          fontSize: '18px',
          color: '#E4D3A8',
          align: 'center',
          wordWrap: { width: width - 120 },
        })
        .setOrigin(0.5),
    );

    // Dönen telefon çizimi yerine iki dikdörtgen: dikey (soluk) → yatay
    // (altın). Sanat gerektirmiyor ve ne istendiğini tek bakışta söylüyor.
    // `M10-T04` — aralarına bir **ok** kondu: iki kutu tek başına "önce
    // bu, sonra şu" demiyor, yan yana iki nesne gibi duruyordu.
    const merkezY = height / 2 + 40;
    this.#kok.add(
      scene.add.rectangle(width / 2 - 92, merkezY, 44, 76, 0xe4d3a8, 0.35).setOrigin(0.5),
    );
    /**
     * Dönüş oku — iki kutunun **üstünden** geçen yay.
     *
     * Açılar ekran koordinatında (y aşağı): 0 sağ, `PI/2` **aşağı**,
     * `PI` sol. Yani üstten geçmek için açı `PI`'den `2PI`'ye
     * **artmalı** (`3PI/2` = yukarı). İlk yazımda `PI*0.85 → PI*0.15`
     * ters yönle verilmişti ve ok alttan geçip gülümseme gibi
     * çıkıyordu (ekran görüntüsüyle yakalandı).
     */
    const YARICAP = 46;
    const BAS_ACI = Math.PI * 1.18;
    const SON_ACI = Math.PI * 1.82;
    const ok = scene.add.graphics();
    ok.lineStyle(4, 0xd4a032, 1);
    ok.beginPath();
    ok.arc(width / 2, merkezY, YARICAP, BAS_ACI, SON_ACI, false);
    ok.strokePath();
    // Ok başı yayın bittiği noktada ve **teğet** yönünde: yayın yönünü
    // gösteriyor, sabit bir yöne bakmıyor.
    const ucX = width / 2 + Math.cos(SON_ACI) * YARICAP;
    const ucY = merkezY + Math.sin(SON_ACI) * YARICAP;
    const tegetX = -Math.sin(SON_ACI);
    const tegetY = Math.cos(SON_ACI);
    const dikX = -tegetY;
    const dikY = tegetX;
    ok.fillStyle(0xd4a032, 1);
    ok.fillTriangle(
      ucX + tegetX * 12,
      ucY + tegetY * 12,
      ucX + dikX * 7,
      ucY + dikY * 7,
      ucX - dikX * 7,
      ucY - dikY * 7,
    );
    this.#kok.add(ok);
    this.#kok.add(
      scene.add.rectangle(width / 2 + 92, merkezY, 76, 44, 0xd4a032, 1).setOrigin(0.5),
    );

    this.#resizeDinleyici = () => this.guncelle();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.#resizeDinleyici);
    this.guncelle();
  }

  /**
   * Sahne kapanırken çağrılmalı — `M8 doğrulama turu`.
   *
   * `scale` **oyun geneli** bir yayıcı: Phaser'ın sahne kapanışında
   * temizlediği şey sahnenin kendi olayları, bunlar değil. Ölçüldü: dil
   * her değiştiğinde (`Overlay` yeniden kuruluyor) `resize` dinleyici
   * sayısı **birer birer artıyordu** — 13 → 17 dört yeniden kurulumda.
   * `CLAUDE.md` Mimari kuralının adını koyduğu tuzak.
   */
  destroy(): void {
    this.#scene.scale.off(Phaser.Scale.Events.RESIZE, this.#resizeDinleyici);
    this.#kok.destroy();
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
