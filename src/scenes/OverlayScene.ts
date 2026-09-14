import Phaser from 'phaser';
import { t } from '../util/i18n';
import { OrientationGate } from '../fx/OrientationGate';
import { createParchmentButton, addPressFeedback } from '../fx/ParchmentFrame';

const MARGIN = 20;
const BTN = 56;

/**
 * Oyunun **üstünde sürekli çalışan** ince katman — `M8-T12`.
 *
 * İki iş: tam ekran düğmesi ve "cihazı yatay çevirin" perdesi. İkisi de
 * sahneden bağımsız olmalı:
 *
 * - Perde sahneye bağlansaydı her sahne geçişinde yok olup yeniden
 *   kurulurdu ve `GameOver` gibi ara ekranlarda hiç görünmezdi.
 * - Tam ekran düğmesi her ekranda aynı yerde durmalı; beş sahneye ayrı
 *   ayrı eklemek beş kopya ve beş kez unutma riski demekti.
 *
 * `MenuScene.create()` bunu `launch` ile başlatıyor ve **hiç
 * durdurulmuyor**. Sahne listesinde en sonda kayıtlı, yani her zaman en
 * üstte çiziliyor.
 *
 * **Kendi `preload`'u yok — bilerek.** `Menu.create()` çalıştığında atlas
 * zaten yüklü (o sahnenin kendi `preload`'u), yani bu sahnenin aynı
 * varlığı ikinci kez istemesine gerek yok. İlk yazımda `Boot`'tan
 * başlatılıyordu ve bu yüzden kendi `preload`'u vardı.
 *
 * TIER 1 kural 7: metin yok denecek kadar az ve bir kez yazılıyor.
 */
/**
 * Dil değişince katmanı yeniden kurar — `M8-T15` canlı kontrolü.
 *
 * `Overlay` bir kez başlatılıp hiç durdurulmuyor, yani dil değiştiğinde
 * **kendiliğinden yeniden kurulmuyordu**: üretim yapısında arayüz
 * İngilizceye geçerken tam ekran düğmesinin etiketi "Tam ekran" olarak
 * kalıyordu (ekran görüntüsüyle görüldü). Dil değişimini uygulayan iki
 * yer (`Menu` ve `Hud` ayar panelleri) bunu da çağırıyor.
 *
 * Sahnenin **dışında** duran bir fonksiyon: çağıranlar `Overlay`
 * sınıfını tanımak zorunda kalmasın, yalnız bu yardımcıyı.
 */
export function yenidenKurOverlay(scene: Phaser.Scene): void {
  if (scene.scene.isActive('Overlay')) scene.scene.get('Overlay').scene.restart();
}

export class OverlayScene extends Phaser.Scene {
  #gate?: OrientationGate;

  constructor() {
    super('Overlay');
  }

  create(): void {
    this.#tamEkranDugmesi();
    this.#gate = new OrientationGate(this);

    // Tarayıcı tam ekrandan çıkarsa (Esc) düğme etiketi zaten sabit;
    // yalnız perde yeniden ölçülmeli.
    const fsDinleyici = (): void => this.#gate?.guncelle();
    this.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, fsDinleyici);

    // `scale` oyun geneli bir yayıcı — sahne kapanışı onu temizlemiyor.
    // Bu sahne dil değişiminde yeniden kuruluyor, yani temizlenmeyen her
    // dinleyici her dil değişiminde bir tane daha birikirdi (ölçüldü).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, fsDinleyici);
      this.#gate?.destroy();
      this.#gate = undefined;
    });
  }

  /**
   * Tam ekran düğmesi — **sol üstte**.
   *
   * Sağ üst zaten dolu: hız (`1×`), ayarlar dişlisi ve `M8-T11` zorluk
   * rozeti orada. Sol üstte HUD kartuşu var ama o `y ≤ 156`; düğme onun
   * **altına** değil, menüde de oyunda da boş kalan **sol alt** köşeye
   * konamıyor (yetenek düğmeleri orada). Kalan tek sakin yer: sağ kenarın
   * ortası.
   */
  #tamEkranDugmesi(): void {
    if (!this.scale.fullscreen.available) return;

    const x = this.scale.width - MARGIN - BTN / 2;
    const y = this.scale.height / 2;
    const cerceve = createParchmentButton(this, x, y, BTN, BTN, 12);
    addPressFeedback(cerceve);
    this.add
      .text(x, y, '⛶', {
        fontFamily: 'Spectral, serif',
        fontSize: '26px',
        color: '#14203A',
      })
      .setOrigin(0.5);

    cerceve.on('pointerup', () => {
      // `startFullscreen` bir kullanıcı jesti istiyor; `pointerup` o.
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });

    // Erişilebilirlik: düğmenin ne olduğu yazıyla da anlaşılsın
    // (TIER 1 kural 6 "yalnız renge/ikona dayanmaz" ruhu).
    this.add
      .text(x, y + BTN / 2 + 12, t('fullscreen'), {
        fontFamily: 'Spectral, serif',
        fontSize: '16px', // Platform: minimum 16 px
        color: '#8A7250',
      })
      .setOrigin(0.5);
  }
}
