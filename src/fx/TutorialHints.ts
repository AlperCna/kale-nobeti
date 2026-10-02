import Phaser from 'phaser';
import { createParchmentFrame } from './ParchmentFrame';
import { IPUCU_BALONU, MENU_KACINILAN, MENU_YERLESIM } from '../data/panelLayout';
import { ipucuYerlesimi } from '../util/ipucuYerlesimi';
import type { Vec2 } from '../types/common';
import { DuraklatilabilirSayac, type ZamanOrtami } from '../util/duraklatilabilirSayac';
import type { EventBus } from '../systems/EventBus';

/**
 * `Y09` — öğretici ipucu balonu. `systems/TutorialSystem`'in `onShow`
 * callback'i bunu çağırıyor; **hangi ipucu ne zaman** kararı orada,
 * burada yalnız gösterim var.
 *
 * Tween yok — `prefers-reduced-motion` ile hiç çakışmıyor.
 *
 * ## Kapanma — `M10` oyuncu geri bildirimi
 *
 * İlk sürümde **hiç** zamanlayıcı yoktu ve balon yalnız üstüne
 * tıklanınca kapanıyordu. Gerekçe yazılıydı: *"bir bilgi balonunun
 * okunma süresi oyun hızına bağlı olmamalı."* Gerekçe doğruydu ama
 * sonuç yanlıştı — oyuncu bildirdi: *"uyardı ama full burada kaldı,
 * popuplar kendiliğinden kapanmıyor veya kapatamıyorum."* İki ayrı
 * kusur:
 *
 * 1. **Kendiliğinden kapanmıyordu.** Balon 480 px genişliğinde ve
 *    ekranın üst ortasını kapatıyor; oyuncu onu kapatmayı bilmezse
 *    dalga boyunca orada kalıyor.
 * 2. **Tıklanabilir olduğu belli değildi.** Hiçbir işaret yoktu.
 *
 * Çözüm ikisine de: **duvar saatiyle** kendiliğinden kapanma (oyun
 * hızına bağlı olmama gerekçesi korunuyor — `scene.time` 2×/3× hızda
 * ölçekleniyor, `setTimeout` ölçeklenmiyor; `fx/HitStop`'un `realMs`
 * gerekçesiyle aynı) ve köşede bir **×** işareti.
 *
 * Süre metnin uzunluğundan türüyor: tek satırlık ipucuyla üç satırlık
 * ipucunun okunma süresi aynı değil.
 *
 * ## `M104` — duvar saati DURAKLATMAYI da görmüyordu
 *
 * Yukarıdaki gerekçe (oyun hızına bağlı olmasın) doğruydu ama yarım
 * kalmıştı: `setTimeout` duraklatmada da işliyor. Tarayıcıda ölçüldü —
 * balon ekrandayken duraklatıp 11 sn sonra devam edilince balon **yok**,
 * perdenin arkasında süresi dolmuş. Bir popup'ı okumak için duraklamak
 * en doğal tepki ve ipucu bir kez gösterilip "görüldü" diye
 * kaydedildiği için oyuncu onu bir daha hiç görmüyordu. Sayaç artık
 * `util/duraklatilabilirSayac.ts` ve `game:paused` olayını dinliyor.
 */

const GENISLIK = IPUCU_BALONU.w;
/**
 * Okunma süresi — **duvar saati**, oyun saati değil.
 *
 * Taban + karakter başına pay. ~40 ms/karakter kabaca 300 kelime/dakika
 * demek; taban, gözün balonu bulup odaklanması için. Uçan ipucu (95
 * karakter) ≈ 7,8 sn, hedefleme ipucu (3 satır) tavana yakın.
 */
const OKUMA_TABAN_MS = 4000;
const OKUMA_KARAKTER_MS = 40;
const OKUMA_EN_AZ_MS = 6000;
const OKUMA_EN_COK_MS = 14000;
/** Tek satırlık ipucunun yüksekliği; uzun metin (hedefleme modları, 3 satır) balonu büyütüyor. */
const ASGARI_YUKSEKLIK = IPUCU_BALONU.asgariH;
const DIKEY_PAY = IPUCU_BALONU.dikeyPay;
/**
 * Balonun üst kenarı — üst-orta HUD kutusunun hemen altı.
 *
 * **`M168`:** eskiden `116`'ydı: *"geri sayım (48) + erken başlat butonu
 * (82+26=108) + 8"*. O hesap düğmenin altındaki **"N sahada" risk
 * satırını** (düğme merkezinin 46 px altı, `M25`) hiç saymıyordu; oyunda
 * hedefleme ipucu o satırın tam üstüne açılıp onu örtüyordu. Sayı artık
 * elle değil, `BuildMenu`'nun da kaçtığı kutudan türüyor.
 */
const UST_BOSLUK = IPUCU_BALONU.ustY;

/**
 * Duvar saati ortamı — `scene.time` **DEĞİL** (dosya başlığındaki gerekçe:
 * o 2×/3× hızda ölçekleniyor, okuma süresi ölçeklenmemeli).
 */
const ZAMAN: ZamanOrtami<ReturnType<typeof setTimeout>> = {
  simdi: () => Date.now(),
  zamanla: (f, ms) => setTimeout(f, ms),
  iptal: (k) => clearTimeout(k),
};

export class TutorialHints {
  readonly #scene: Phaser.Scene;
  #kok?: Phaser.GameObjects.Container;
  /**
   * Okuma süresi — `M104`'ten beri **duraklatılabilir**. Önce düz bir
   * `setTimeout`tu ve duraklatmayı görmüyordu: balon perdenin arkasında
   * süresini doldurup kayboluyordu, üstelik ipucu “görüldü” diye
   * kaydedildiği için bir daha hiç görünmüyordu. Tarayıcıda ölçüldü.
   */
  readonly #sayac = new DuraklatilabilirSayac(ZAMAN);
  /** `game:paused` dinleyicisi — `destroy()` kaldırıyor (mimari kural). */
  readonly #bus?: EventBus;
  readonly #duraklatDinleyici = (yuk: { readonly paused: boolean }): void => {
    if (yuk.paused) this.#sayac.duraklat();
    else this.#sayac.surdur();
  };

  /**
   * Açık balon bir eylem mi bekliyor — `M180`
   * (`TutorialSystem.EYLEM_BEKLEYEN_IPUCLARI`). Öyleyse süre sayacı
   * kurulmuyor; balon eylem yapılınca ya da oyuncu dokununca kapanıyor.
   */
  #eylemBekliyor = false;
  /** Kule ya da kışla kuruldu — bekleyen "ilk kuleni kur" balonu kapanıyor. */
  readonly #yapiDinleyici = (): void => {
    if (this.#eylemBekliyor) this.#kapat();
  };

  /**
   * @param bus Verilirse balon `game:paused` olayını dinliyor. `M104`'e
   *   kadar o olayın **hiçbir dinleyicisi yoktu** — HUD yayıyor,
   *   kimse duymuyordu.
   */
  /** Haritanın yapı noktaları — balon onları örtmüyor (`M180`). */
  readonly #noktalar: readonly Vec2[];

  constructor(scene: Phaser.Scene, bus?: EventBus, noktalar: readonly Vec2[] = []) {
    this.#scene = scene;
    this.#bus = bus;
    this.#noktalar = noktalar;
    bus?.on('game:paused', this.#duraklatDinleyici);
    bus?.on('tower:placed', this.#yapiDinleyici);
    bus?.on('barracks:placed', this.#yapiDinleyici);
  }

  /**
   * @param eylemBekliyor `true` ise balon süreyle kapanmıyor; ilk kule ya
   *   da kışla kurulunca (ya da dokununca) kapanıyor — `M180`.
   */
  show(text: string, eylemBekliyor = false): void {
    this.#kapat();

    const { width } = this.#scene.scale;
    // Konum aşağıda, yükseklik ölçüldükten sonra veriliyor.
    const kap = this.#scene.add.container(width / 2, 0).setDepth(300);

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

    // Kapatma işareti — **süs değil, tek keşif yolu**. Balonun tamamı
    // zaten tıklanabilir (480 px, dokunmatik alt sınırın çok üstünde);
    // bu × yalnız "bu kapatılabilir" diyor. Ayrı bir tıklama hedefi
    // DEĞİL, çünkü iki iç içe hedef küçük olanı ıskalamayı davet eder.
    kap.add(
      this.#scene.add
        .text(GENISLIK / 2 - 18, -yukseklik / 2 + 16, '×', {
          fontFamily: 'Spectral, serif',
          fontSize: '20px',
          color: '#8A7250',
        })
        .setOrigin(0.5),
    );
    // Üst-orta, "Dalgayı başlat" butonunun (HUD, y 82±26) altında —
    // oyuncu geri bildirimi (2026-09-14): alt-ortadayken harita 3'ün iki
    // yapı noktasını örtüyordu. Üst kenar `UST_BOSLUK` — üst-orta HUD
    // kutusunun (düğme + risk satırı) hemen altı (`M168`).
    //
    // `M180` — tercih edilen yer bu; haritanın bir yapı noktasını ya da
    // bir HUD kutusunu örtüyorsa en yakın boş yere kayıyor
    // (`util/ipucuYerlesimi`). Değirmen Geçidi'nde "ilk kuleni kur" balonu
    // (480, 213) noktasını örtüyordu.
    const yer = ipucuYerlesimi({
      genislik: GENISLIK,
      yukseklik,
      x: width / 2,
      ustY: UST_BOSLUK,
      ekranW: width,
      ekranH: this.#scene.scale.height,
      kenarPay: MENU_YERLESIM.kenarPay,
      noktalar: this.#noktalar,
      kartusYari: MENU_YERLESIM.kartusYari,
      kacinilan: MENU_KACINILAN.map((k) => k.kutu),
      adim: IPUCU_BALONU.adim,
    });
    kap.setPosition(yer.x, yer.y);

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

    if (eylemBekliyor) {
      this.#eylemBekliyor = true;
      return;
    }

    // Duvar saati: `scene.time` 2×/3× hızda ölçekleniyor ve balonun
    // okunma süresi oyun hızına bağlı olmamalı (dosyanın başlık notu).
    const sure = Math.min(
      OKUMA_EN_COK_MS,
      Math.max(OKUMA_EN_AZ_MS, OKUMA_TABAN_MS + text.length * OKUMA_KARAKTER_MS),
    );
    this.#sayac.basla(sure, () => this.#kapat());
  }

  /** Sahne kapanışında çağrılıyor — bekleyen sayaç ölü nesneye ateşlemesin. */
  destroy(): void {
    this.#bus?.off('game:paused', this.#duraklatDinleyici);
    this.#bus?.off('tower:placed', this.#yapiDinleyici);
    this.#bus?.off('barracks:placed', this.#yapiDinleyici);
    this.#kapat();
  }

  #kapat(): void {
    this.#eylemBekliyor = false;
    this.#sayac.iptal();
    this.#kok?.destroy(true);
    this.#kok = undefined;
  }
}
