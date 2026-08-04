import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';

/**
 * GEÇİCİ oyun alanı yer tutucusu — M0-T08 bunu `GameScene` ile,
 * M0-T09 da üstüne `HudScene` ile değiştirecek.
 *
 * M0-T05'in font doğrulaması buradan kaldırıldı: `MenuScene` başlığı
 * zaten Grenze Gotisch ve "Kale Nöbeti" Türkçe karakter taşıyor.
 */
class BootstrapScene extends Phaser.Scene {
  constructor() {
    super('Bootstrap');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'oyun alanı — M0-T08 (geçici)', {
        fontFamily: 'Spectral, serif',
        fontSize: '20px',
        color: '#8A7250', // GAME-DESIGN §2 yol rengi
      })
      .setOrigin(0.5);
  }
}

/**
 * Sahne kaydı yalnız burada yapılır (CLAUDE.md Klasör yapısı).
 */
const config: Phaser.Types.Core.GameConfig = {
  // research/02 §4: AUTO (WebGL öncelikli). Canvas'a düşme kararı
  // ölçmeden verilmiyor — M6'da hedef cihazda FPS ölçülünce bakılacak.
  type: Phaser.AUTO,

  // CLAUDE.md Teknoloji: mantıksal çözünürlük 1280×720 (16:9).
  // Poki 16:9 zorunlu kılıyor ve 640×360'a orantılı küçültüyor
  // (research/05 §1) — UI o ölçekte de okunur kalmalı.
  width: 1280,
  height: 720,

  // GAME-DESIGN §2 "Mürekkep". Letterbox şeritleri de aynı renk:
  // index.html gövdesi aynı değeri taşıyor.
  backgroundColor: '#14203A',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  // CLAUDE.md Platform: yayın yapısında konsol çıktısı bulunmaz.
  // Phaser varsayılan olarak sürüm başlığını basıyor ve bu üretimde de
  // görünür — kapatılıyor.
  banner: false,

  scene: [BootScene, PreloadScene, MenuScene, BootstrapScene],
};

new Phaser.Game(config);
