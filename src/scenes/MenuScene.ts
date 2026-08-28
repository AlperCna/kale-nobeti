import Phaser from 'phaser';
import { t } from '../util/i18n';
import { getSettings } from '../systems/Settings';
import { PreloadScene } from './PreloadScene';
import { createParchmentButton, addPressFeedback } from '../fx/ParchmentFrame';

/**
 * Dokunmatik hedef en az 44×44 px (CLAUDE.md Platform, 1280×720 ölçeğinde).
 * Buton bunun çok üstünde — tıklama alanı yazı kutusundan **belirgin
 * biçimde** büyük olsun diye.
 */
const BTN_W = 260;
const BTN_H = 64;

/** Minimum yazı 16 px. Poki 640×360'a küçültüyor (research/05 §1). */
const BTN_FONT_PX = 28;
const TITLE_FONT_PX = 72;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  /**
   * Yalnız atlas (`PreloadScene.queueAtlas`) — `#createPlayButton`'un
   * `createParchmentButton`'ı (`G01`) atlas karesi istiyor.
   * **Canlı testte yakalandı:** bu `preload()` yokken atlas hiç
   * istenmiyordu, "Oyna" butonu `__MISSING` dokusuyla (yeşil çapraz
   * çizgili kutu) çiziliyordu — bkz. `PreloadScene.queueAtlas`'ın
   * kendi yorumu. `queueGame`'in tamamı değil, yalnız bu — geri kalanı
   * (ses efektleri, harita 1 arka planı) hâlâ "Oyna"ya kadar bekliyor.
   */
  preload(): void {
    PreloadScene.queueAtlas(this);
  }

  create(): void {
    const { width, height } = this.scale;

    // M6-T05 — ilk izlenim ekranı. Kompozisyon üst-orta boşluk bırakacak
    // şekilde üretildi (bkz. görsel brifi): gökyüzü üstte açık, kale
    // alt yarıda — başlık/buton üstüne net oturuyor.
    this.add.image(width / 2, height / 2, 'menu-bg');

    // M6-T11 — menü müziği. `sound` sahneler arası paylaşılan tek
    // yönetici (Phaser); `isPlaying` koruması olmadan `Menu`ye her
    // dönüşte (ör. `GameOver`'dan "yeniden dene") ikinci bir kopya
    // üst üste binerdi.
    //
    // `Y05` — tembel yükleniyor: `GameScene.ts:504-517`'deki
    // `music_game` deseninin birebir kopyası (`filecomplete` olayı +
    // `load.start()`). `Y04`'ün bedava kazancı: ses kapalıysa
    // (`getSettings` artık `Menu`de de erişilebilir — bu da `Y04`'ün
    // eseri) dosya **hiç indirilmiyor**; `BootScene` zaten
    // `sound.mute`'u doğru kurdu, burada yalnız bant genişliği israfını
    // önlüyoruz.
    if (getSettings(this).state.sound && this.sound.get('music_menu')?.isPlaying !== true) {
      const calmayaBasla = (): void => {
        this.sound.play('music_menu', { loop: true, volume: 0.5 });
      };
      if (this.cache.audio.exists('music_menu')) {
        calmayaBasla();
      } else {
        this.load.once('filecomplete-audio-music_menu', calmayaBasla);
        PreloadScene.queueMenuMusic(this);
        this.load.start();
      }
    }

    // Başlık marka adı — çeviri sözlüğüne girmez (S63 istisnası).
    // Statik metin, bir kez yazılıp değişmiyor: `Text` serbest
    // (TIER 1 kural 7 istisnası, sonradan "ihlal mi" diye sorulmasın).
    this.add
      .text(width / 2, height / 2 - 120, 'Kale Nöbeti', {
        fontFamily: '"Grenze Gotisch", serif',
        fontSize: `${TITLE_FONT_PX}px`,
        color: '#D4A032',
      })
      .setOrigin(0.5);

    this.#createPlayButton(width / 2, height / 2 + 40);
  }

  /**
   * Buton = parşömen çerçeve (tıklama alanı) + üstünde etiket (`G01`).
   *
   * Etkileşim **çerçeveye** bağlanıyor, metne değil. Metne bağlansaydı
   * yalnız harflerin tam üstüne tıklandığında çalışırdı — bu görevin
   * "bitmedi sayılır eğer" maddesi tam olarak bu. `createParchmentButton`
   * bunu zaten garanti ediyor: hit-alanı `Container`'ın tamamı.
   */
  #createPlayButton(x: number, y: number): void {
    const cerceve = createParchmentButton(this, x, y, BTN_W, BTN_H, 16);
    addPressFeedback(cerceve);

    // Metin tıklamayı yutmasın: etkileşim yalnız çerçevede.
    this.add
      .text(x, y, t('play'), {
        fontFamily: 'Spectral, serif',
        fontSize: `${BTN_FONT_PX}px`,
        color: '#14203A',
      })
      .setOrigin(0.5);

    cerceve.on('pointerup', () => {
      this.#startGame();
    });
  }

  /**
   * `Hud`, `Game`'in **üstünde paralel** çalışır (CLAUDE.md Mimari).
   * `start` menüyü kapatıp oyunu açar; `launch` HUD'ı **durdurmadan**
   * yanına ekler — duraklatmada HUD'ın yaşamaya devam etmesi buna bağlı.
   */
  #startGame(): void {
    // M7: doğrudan oyuna değil, **seviye seçime**. Üç harita var artık.
    this.scene.start('LevelSelect');
  }
}
