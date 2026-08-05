import Phaser from 'phaser';
import { t } from '../util/i18n';

/** GAME-DESIGN §2 paleti. */
const INK = 0x14203a;
const PARCHMENT = 0xe4d3a8;
const GOLD = 0xd4a032;

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

  create(): void {
    const { width, height } = this.scale;

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
   * Buton = arka dikdörtgen (tıklama alanı) + üstünde etiket.
   *
   * Etkileşim **dikdörtgene** bağlanıyor, metne değil. Metne bağlansaydı
   * yalnız harflerin tam üstüne tıklandığında çalışırdı — bu görevin
   * "bitmedi sayılır eğer" maddesi tam olarak bu.
   */
  #createPlayButton(x: number, y: number): void {
    const arka = this.add
      .rectangle(x, y, BTN_W, BTN_H, PARCHMENT)
      .setStrokeStyle(2, GOLD)
      .setInteractive({ useHandCursor: true });

    // Metin tıklamayı yutmasın: etkileşim yalnız dikdörtgende.
    const etiket = this.add
      .text(x, y, t('play'), {
        fontFamily: 'Spectral, serif',
        fontSize: `${BTN_FONT_PX}px`,
        color: '#14203A',
      })
      .setOrigin(0.5);

    arka.on('pointerover', () => {
      arka.setFillStyle(GOLD);
      etiket.setColor('#14203A');
    });
    arka.on('pointerout', () => {
      arka.setFillStyle(PARCHMENT);
      etiket.setColor('#14203A');
    });
    arka.on('pointerdown', () => {
      arka.setFillStyle(INK);
      etiket.setColor('#E4D3A8');
    });
    arka.on('pointerup', () => {
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
