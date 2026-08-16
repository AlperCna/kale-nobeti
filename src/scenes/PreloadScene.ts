import Phaser from 'phaser';

/**
 * Aşamalı yükleme.
 *
 * Poki'nin yaklaşımı (research/04 §6): "mümkün olan en küçük ilk oynanabilir
 * parçayı gönder, isteğe bağlı seviyeleri, müziği ve yüksek çözünürlüklü
 * varlıkları oyuncu başlayabildikten *sonra* yükle."
 *
 * M0'da yüklenecek varlık yok. Dört aşama **boş olsa da ayrı ayrı**
 * yazılıyor: tek blok `preload()` yazılırsa sonradan sökmek pahalı
 * (ROADMAP M0). İskelet şimdi kurulursa M6'da yalnız içleri dolar.
 */
export type LoadStage = 'boot' | 'game' | 'background' | 'lazy';

/** GAME-DESIGN §2 "Parşömen" — yükleme çubuğu, süsleme yok. */
const BAR_COLOR = 0xe4d3a8;
const BAR_BG_COLOR = 0x2f4a3c; // "Yosun"
const BAR_W = 400;
const BAR_H = 12;

export class PreloadScene extends Phaser.Scene {
  #bar?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Preload');
  }

  /**
   * **Yalnız `queueBoot` çağrılır.** `queueGame` buraya eklenirse oyun
   * varlıkları menüden önce iner ve ilk indirmeyi şişirir — bu görevin
   * "bitmedi sayılır eğer" maddesi.
   */
  preload(): void {
    this.#drawBar();
    this.queueBoot();
  }

  create(): void {
    this.#bar?.destroy();
    this.scene.start('Menu');
  }

  // ---------------------------------------------------------------------
  // Aşama 1 — açılış. Menü ve UI. İlk indirmenin tamamı bu.
  // ---------------------------------------------------------------------
  private queueBoot(): void {
    // M6-T05: menü arka planı — ilk indirmenin parçası, `Menu` UI atlası
    // beklemeden gösterilebilsin diye burada (`Menu` atlas kullanmıyor).
    // Fontlar M0-T05'te BootScene'de FontFace ile yükleniyor, buraya girmez.
    this.load.image('menu-bg', 'assets/menu-bg.webp');
  }

  // ---------------------------------------------------------------------
  // Aşama 2 — oyun. Atlas ve ses efektleri.
  // "Oyna"ya basıldığında çağrılır, açılışta değil.
  //
  // Plan bunu `private` yazmıştı ama hiçbir yerden çağrılmıyor ve
  // `noUnusedLocals` ölü üyeyi hata sayıyor. Diğer iki geç aşama gibi
  // `static` yapıldı: üçü de dışarıdan, sahnesi olmayan bir bağlamdan
  // çağrılıyor ve aynı şekli paylaşıyor.
  // ---------------------------------------------------------------------
  static queueGame(scene: Phaser.Scene): void {
    // `exists` koruması: `GameScene` yeniden başlatmada `preload()` tekrar
    // koşuyor (kaybedince tekrar dene, harita seçimden dönüş) — koruma
    // olmadan her seferinde ağdan yeniden istenirdi.
    if (!scene.textures.exists('atlas')) {
      scene.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
    }
    if (!scene.textures.exists('bg-degirmen-gecidi')) {
      scene.load.image('bg-degirmen-gecidi', 'assets/bg/degirmen-gecidi.webp');
    }
    // M6-T11: ses efektleri (.m4a) — ayrı, bu görevin kapsamı dışında.
  }

  // ---------------------------------------------------------------------
  // Aşama 3 — arka plan. Müzik.
  // İlk dalga bittikten sonra çağrılır (GAME-DESIGN §12).
  // ---------------------------------------------------------------------
  static queueBackground(scene: Phaser.Scene): void {
    void scene;
    // M6: 2 müzik parçası, .m4a 96 kbps mono.
  }

  // ---------------------------------------------------------------------
  // Aşama 4 — tembel. Harita 2-3 arka planları.
  // O harita seçildiğinde çağrılır.
  // ---------------------------------------------------------------------
  static queueLazy(scene: Phaser.Scene, mapId: string): void {
    // Harita 1 zaten `queueGame`'de yüklendi — M6-T03 kabul kriteri:
    // "harita 2-3 tembel, ilk indirmede yalnız harita 1".
    if (mapId === 'degirmen-gecidi') return;
    const key = `bg-${mapId}`;
    if (!scene.textures.exists(key)) {
      scene.load.image(key, `assets/lazy/${mapId}.webp`);
    }
  }

  /**
   * Yükleme çubuğu. Süsleme yok — tezhip çerçevesi M6'da HUD'a geliyor,
   * yükleme ekranına değil.
   */
  #drawBar(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, BAR_W, BAR_H, BAR_BG_COLOR);
    this.#bar = this.add.rectangle(width / 2 - BAR_W / 2, height / 2, 0, BAR_H, BAR_COLOR).setOrigin(0, 0.5);

    this.load.on('progress', (oran: number) => {
      this.#bar?.setSize(BAR_W * oran, BAR_H);
    });
  }
}
