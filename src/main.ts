import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';

/**
 * Sahne kaydı yalnız burada yapılır (CLAUDE.md Klasör yapısı).
 *
 * Zincir: Boot → Preload → Menu → Game (+ Hud paralel).
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

  scene: [BootScene, PreloadScene, MenuScene, GameScene, HudScene],
};

new Phaser.Game(config);
