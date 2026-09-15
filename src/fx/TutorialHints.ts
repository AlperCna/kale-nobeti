import Phaser from 'phaser';
import { createParchmentFrame } from './ParchmentFrame';

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
 */

const GENISLIK = 480;
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
const ASGARI_YUKSEKLIK = 60;
const DIKEY_PAY = 24;
/** Balonun üst kenarı: geri sayım (48) + erken başlat butonu (82+26=108) + 8. */
const UST_BOSLUK = 116;

export class TutorialHints {
  readonly #scene: Phaser.Scene;
  #kok?: Phaser.GameObjects.Container;
  /** `setTimeout` kimliği — `#kapat` temizliyor, yoksa ölü nesneye ateşlerdi. */
  #sayac?: ReturnType<typeof setTimeout>;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;
  }

  show(text: string): void {
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
    // yapı noktasını örtüyordu. Üst-orta üç haritada da boş (harita 1'in
    // yolu y≈100'ün üstünde, balon 116'dan başlıyor).
    kap.setY(UST_BOSLUK + yukseklik / 2);

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

    // Duvar saati: `scene.time` 2×/3× hızda ölçekleniyor ve balonun
    // okunma süresi oyun hızına bağlı olmamalı (dosyanın başlık notu).
    const sure = Math.min(
      OKUMA_EN_COK_MS,
      Math.max(OKUMA_EN_AZ_MS, OKUMA_TABAN_MS + text.length * OKUMA_KARAKTER_MS),
    );
    this.#sayac = setTimeout(() => this.#kapat(), sure);
  }

  /** Sahne kapanışında çağrılıyor — bekleyen sayaç ölü nesneye ateşlemesin. */
  destroy(): void {
    this.#kapat();
  }

  #kapat(): void {
    if (this.#sayac !== undefined) {
      clearTimeout(this.#sayac);
      this.#sayac = undefined;
    }
    this.#kok?.destroy(true);
    this.#kok = undefined;
  }
}
