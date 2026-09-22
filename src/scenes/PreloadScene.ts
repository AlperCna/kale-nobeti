import Phaser from 'phaser';
import { queueNumberFont, NUMBER_FONT_KEY } from '../fx/numberFont';
import { ilkOturumMu, ILK_HARITA_ID } from '../systems/ilkOturum';
import { LocalStore } from '../util/storage';

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

/**
 * M6-T11 — `docs/plan/M6-ses-uretim-brifi.md` §1'in 12 dosyası, `M8-T14`'te
 * **ikiye bölündü**.
 *
 * `SFX_ERKEN` haritanın ilk saniyelerinde çalabilecek olanlar: kule kurma,
 * atışlar, ölüm, altın, hata, dalga başlangıcı.
 *
 * `SFX_GEC` oyunun ilk dakikasında **hiç** çalmıyor — `boss_intro` dalga
 * 10'da, `victory`/`defeat` harita bitince, `tower_upgrade` ilk
 * yükseltmede. Dosyaları `assets/lazy/sfx/` altında ve ilk dalga bitince
 * yükleniyorlar (müzikle aynı aşama). `report-size.mjs`'in "ilk indirme"
 * hesabı `assets/lazy/` klasörünü hariç tuttuğu için ölçüm kendiliğinden
 * doğru çıkıyor.
 *
 * Yükleme gecikirse `SoundSystem.#cal` eksik anahtarı **sessizce atlıyor**
 * (`Y14` deseni) — yani en kötü durum bir sesin kaçırılması, çökme değil.
 */
const SFX_ERKEN = [
  'shot_okcu', 'shot_top', 'shot_buyu', 'enemy_death', 'gold',
  'tower_place', 'error', 'wave_start',
  // `M8-P03` — hazırlık sayacının son 3 saniyesinde çalıyor, yani
  // haritanın ilk saniyelerinde. `SFX_ERKEN` tam olarak bu grup.
  'countdown_tick',
];

/**
 * `ui_click` — **menüyle birlikte** yükleniyor, `SFX_ERKEN` ile değil.
 *
 * `SFX_ERKEN` `queueGame`'de, yani harita açılırken iniyor. `ui_click`
 * ise ilk kez **ana menüde** duyuluyor (`ParchmentFrame.addPressFeedback`
 * menü/ayar/duraklatma düğmelerine takılı) — o grupta kalsaydı menü
 * düğmeleri sessiz olurdu ve `uiTiklamaSesi`'nin `cache.audio.has`
 * koruması bunu **sessizce** yutardı, yani hata da görünmezdi.
 *
 * 2 KB: `Y05`'in ilk indirme bütçesinde ölçülemeyecek kadar küçük.
 */
const SFX_MENU = ['ui_click'];

const SFX_GEC = ['tower_upgrade', 'boss_intro', 'victory', 'defeat'];

export class PreloadScene extends Phaser.Scene {
  #bar?: Phaser.GameObjects.Rectangle;
  /**
   * `preload()`'ta ölçülüyor, `create()`'te kullanılıyor. Alan
   * başlatıcısı değil çünkü `Preload` yeniden çalışmıyor; yine de
   * `preload()` her koşuda yazıyor (mimari kural: sahne alanları
   * `create()`/`preload()` içinde kuruluyor).
   */
  #dogrudanOyun = false;

  constructor() {
    super('Preload');
  }

  /**
   * `M10-T01` — **ilk oturumda oyuncu menüyü hiç görmüyor.**
   *
   * Karar `preload()`'ta veriliyor, `create()`'te değil: doğrudan oyuna
   * gidilecekse oyun varlıkları da **bu çubuğun altında** insin. Aksi
   * hâlde `GameScene.preload()` atlas + arka plan + ses efektlerini
   * çubuksuz yükler ve oyuncu boş ekrana bakar — hem de akışın tam
   * "ilk birkaç dakika kaderi belirliyor" denen yerinde.
   *
   * ## "Yalnız `queueBoot` çağrılır" kuralına ne oldu
   *
   * O kuralın gerekçesi yazılıydı: *oyun varlıkları **menüden önce**
   * inerse ilk indirmeyi şişirir.* Bu dalda menü **yok** — oyun
   * varlıkları zaten oyuncunun bir saniye sonra ihtiyaç duyduğu ilk
   * oynanabilir parça. Yani kuralın sebebi bu dalda geçerli değil,
   * kuralın kendisi diğer dalda aynen duruyor.
   *
   * `menu-bg` yine de iniyor (104 KB, `queueBoot`): menüyü bu oturumda
   * görmese de duraklatma → ana menü yolu açık ve orada eksik doku
   * `__MISSING` yeşil kutusu demek — atlasta bir kez yaşanmış hata.
   */
  preload(): void {
    this.#drawBar();
    // `Y12` — `index.html`'in HTML/CSS açılış perdesi (`#acilis`)
    // Phaser'ın kendi yükleme çubuğu görünür olur olmaz kalkıyor; ikisi
    // asla üst üste binmiyor çünkü ikisi de bu **aynı senkron tikte**
    // çiziliyor (tarayıcı yalnız tikin sonunda boyuyor).
    document.getElementById('acilis')?.remove();
    this.queueBoot();

    this.#dogrudanOyun = ilkOturumMu(new LocalStore());
    if (this.#dogrudanOyun) PreloadScene.queueGame(this);
  }

  create(): void {
    this.#bar?.destroy();
    if (this.#dogrudanOyun) {
      // `LevelSelectScene`'in açılış sırasının birebir aynısı.
      // Zorluk verilmiyor: `GameScene` onu ayarlardan okuyor ve ilk
      // oturumda ayar varsayılanı (Normal) zaten doğru cevap.
      this.scene.start('Game', { mapId: ILK_HARITA_ID });
      this.scene.launch('Hud');
      return;
    }
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
    // `music_menu` **burada değil** — `Y05`: 244,5 sn'lik dosya tek
    // başına ilk indirmenin %75'iydi. `queueMenuMusic`'e taşındı,
    // `Menu` gösterildikten sonra tembel yükleniyor.
  }

  // ---------------------------------------------------------------------
  // Menü müziği — `queueBoot`'un DIŞINDA (`Y05`). `Menu.create()`
  // gösterildikten sonra çağrılıyor; `music_game` (`queueBackground`)
  // ile aynı `filecomplete` deseni, `GameScene.ts:504-517`'de zaten
  // çalışan örneğin birebir kopyası.
  // ---------------------------------------------------------------------
  static queueMenuMusic(scene: Phaser.Scene): void {
    // `lazy/` altında — `report-size.mjs`'in "ilk indirme" hariç tutma
    // yolu tam bu klasör adına bakıyor, `music_game`'le aynı sebep.
    if (!scene.cache.audio.exists('music_menu')) {
      scene.load.audio('music_menu', 'assets/lazy/music_menu.m4a');
    }
  }

  /**
   * `M8-P03` — menü düğme sesi.
   *
   * `queueMenuMusic`'ten **ayrı** duruyor ve bu bilerek: o yalnız
   * `musicScale > 0` iken çağrılıyor (`MenuScene`), yani müziği kapalı
   * bir oyuncuda `ui_click` hiç inmezdi ve `uiTiklamaSesi`'nin
   * `cache.audio.has` koruması bunu **sessizce** yutardı — hata bile
   * görünmezdi.
   *
   * Ses efekti tercihine de bağlanmadı: ayar oyun içinde değişebiliyor
   * ve 2 KB için koşullu yükleme kurmanın değeri yok.
   */
  static queueMenuSfx(scene: Phaser.Scene): void {
    for (const ad of SFX_MENU) {
      if (!scene.cache.audio.exists(ad)) {
        scene.load.audio(ad, `assets/audio/sfx/${ad}.m4a`);
      }
    }
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
  /**
   * Yalnız atlas — `queueGame`'in geri kalanından (arka plan, ses
   * efektleri, sayı fontu) **kasıtlı ayrı**. `MenuScene`'in "Oyna"
   * butonu `createParchmentButton` kullanıyor (`G01`) ve bu, `atlas`
   * karesi istiyor — ama `Menu` `queueGame`'in tamamını çekerse M6'nın
   * "aşamalı yükleme" hedefine geri döner (12 ses efekti + harita 1
   * arka planı, oyuncu daha "Oyna"ya basmadan iner).
   *
   * **Canlı testte yakalandı:** `Menu`'nün hiç `preload()`'u yoktu, yani
   * atlas hiçbir zaman istenmemişti — ilk ziyarette "Oyna" butonu
   * `corner`/`edge-strip`/`middle-texture` karelerini `__MISSING`
   * dokusundan okumaya çalışıyor, konsola üç uyarı basıyor ve buton
   * Phaser'ın varsayılan "doku yok" deseniyle (yeşil çapraz çizgili
   * kutu) çiziliyordu — oyuncunun gördüğü **ilk** etkileşimli öğe.
   */
  static queueAtlas(scene: Phaser.Scene): void {
    // `exists` koruması: sahne yeniden başlatmada (kaybedince tekrar dene,
    // harita seçimden dönüş, `Menu`'ye geri dönüş) tekrar istenmesin.
    if (!scene.textures.exists('atlas')) {
      scene.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
    }
  }

  /**
   * `Hud`'un **gerçekten kullandığı** iki varlık: atlas (parşömen
   * çerçeveler, yetenek ikonları) ve sayı bitmap fontu (`HudReadout`,
   * hız etiketi). Arka planı hiç çizmiyor, ses de çalmıyor — yalnız
   * `sound.mute` yazıyor.
   *
   * `queueGame`'den ayrı olmasının sebebi **niyet**, ölçülmüş bir hata
   * değil: `Hud`'un `queueGame` çağırması, hiç çizmediği bir arka planı
   * ve hiç çalmadığı 12 ses efektini kendi yükleme listesine koyması
   * demekti.
   *
   * `HudScene.preload()`'un eski yorumu "`exists()` koruması sayesinde
   * çakışmıyor" diyordu; bu gerekçe **sağlam değil** — `exists()`
   * kuyruğa atarken bakıyor, oysa `Game` ve `Hud` aynı tikte başlıyor
   * (`scene.start('Game')` + `launch('Hud')`) ve ikisinin `preload()`'u
   * da yükleme bitmeden koşuyor, yani ikisi de "yok" görebilir.
   *
   * **Gerçek akışta bu yarış oluşmuyor** (ölçüldü: tek `atlas.png`, tek
   * `numbers.png`, konsol temiz) çünkü `LevelSelectScene.preload()`
   * zaten `queueGame` çağırıyor ve kartlar çizilmeden önce yükleme
   * bitiyor. Yine de doğru gerekçeyle durmak, yanlış gerekçeyle doğru
   * sonuca varmaktan iyi.
   *
   * **`M123`: "konsol temiz" İDDİASI ÇÜRÜDÜ — ama sebep bu yarış değil.**
   * Ölçüldü (tarayıcı, soğuk açılış, üretim yolunun aynısı): konsolda
   * her açılışta bir Phaser hatası var — `Texture key already in use:
   * atlas`. Yarış **değil**: `queueAtlas` sayaçla izlendi ve tur başına
   * **tek kez** çağrılıyor (`Menu`, `exists=false`), kod tabanında tek
   * bir `load.atlas` var. Atlas da doğru yükleniyor — 36 kare, tek
   * kaynak, her şey çiziliyor. Yani hata **zararsız ama gerçek** ve
   * platform kuralını ("yayın yapısında konsol çıktısı bulunmaz")
   * deliyor. Kök sebep özel Phaser yapımının dosya tipi katmanında
   * görünüyor (`MultiFile` üyesinin dokuyu bir kez, `addAtlas`'ın ikinci
   * kez eklemesi) ve ayrı bir işe bırakıldı. Yukarıdaki yarış gerekçesi
   * kendi başına hâlâ geçerli, yalnız "konsol temiz" cümlesi değil.
   */
  static queueHud(scene: Phaser.Scene): void {
    PreloadScene.queueAtlas(scene);
    queueNumberFont(scene);
  }

  static queueGame(scene: Phaser.Scene): void {
    PreloadScene.queueAtlas(scene);
    if (!scene.textures.exists('bg-degirmen-gecidi')) {
      scene.load.image('bg-degirmen-gecidi', 'assets/bg/degirmen-gecidi.webp');
    }
    queueNumberFont(scene);
    for (const ad of SFX_ERKEN) {
      if (!scene.cache.audio.exists(ad)) {
        scene.load.audio(ad, `assets/audio/sfx/${ad}.m4a`);
      }
    }
  }

  /**
   * `Y14` — bu iki varlık **kritik**: olmadan oyun oynanamaz hâle geliyor
   * (`atlas` — bütün kuleler/düşmanlar/HUD çerçevesi; `numbers` bitmap
   * fontu — bütün hasar/altın/can/dalga sayıları). Geri kalan (müzik,
   * ses efektleri, arka planlar) kritik değil, sessizce eksik kalabilir.
   *
   * Yükleme hatasını **dinleyerek değil, sonucu ölçerek** yakalıyor:
   * `loaderror` olayının hangi alt dosya için ateşlendiğini (`atlas.png`
   * mi `atlas.json` mı) ayırt etmek kırılgan bir varsayım gerektirirdi;
   * bunun yerine `LevelSelectScene.create()` çalıştığında kritik
   * kaynakların **gerçekten kullanılabilir olup olmadığı** doğrudan
   * soruluyor — yükleyicinin iç olaylarına bağımlı değil.
   */
  static kritikVarliklarHazir(scene: Phaser.Scene): boolean {
    return scene.textures.exists('atlas') && scene.cache.bitmapFont.has(NUMBER_FONT_KEY);
  }

  // ---------------------------------------------------------------------
  // Aşama 3 — arka plan. Müzik.
  // İlk dalga bittikten sonra çağrılır (GAME-DESIGN §12).
  // ---------------------------------------------------------------------
  static queueBackground(scene: Phaser.Scene): void {
    // `lazy/` altında — `report-size.mjs`'in "ilk indirme" hariç tutma
    // yolu tam bu klasör adına bakıyor, harita 2-3 arka planlarıyla aynı.
    if (!scene.cache.audio.exists('music_game')) {
      scene.load.audio('music_game', 'assets/lazy/music_game.m4a');
    }
    // `M8-P03` — boss müziği. Boss dalga 10'da çıkıyor, yani bu aşamada
    // yüklemek fazlasıyla erken; ama `music_game` ile aynı istek
    // grubunda gitmesi bir bağlantı kurulumu tasarruf ediyor ve
    // `GameScene.#bossMuzigi` zaten `cache.audio.exists` ile korunuyor
    // (dosya gelmemişse sessizce atlıyor).
    if (!scene.cache.audio.exists('boss_music')) {
      scene.load.audio('boss_music', 'assets/lazy/boss_music.m4a');
    }
    // `M8-T14` — geç sesler de bu aşamada (ilk dalga bitince).
    for (const ad of SFX_GEC) {
      if (!scene.cache.audio.exists(ad)) {
        scene.load.audio(ad, `assets/lazy/sfx/${ad}.m4a`);
      }
    }
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
